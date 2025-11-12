'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false })

// Custom aircraft icon creator
const createAircraftIcon = (heading) => {
  if (typeof window === 'undefined') return null
  
  try {
    const L = require('leaflet')
    
    return L.divIcon({
      className: 'aircraft-marker',
      html: `
        <div style="
          transform: rotate(${heading}deg);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 20px solid #ef4444;
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 20px;
            left: -4px;
            width: 8px;
            height: 8px;
            background: #ef4444;
            border-radius: 50%;
            border: 2px solid #ffffff;
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
  } catch (e) {
    return null
  }
}

// Calculate distance between two coordinates in miles (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Fetch airports from Overpass API (OpenStreetMap)
const fetchNearbyAirports = async (lat, lon, radiusMiles = 100) => {
  try {
    // Convert radius from miles to degrees (approximate)
    // 1 degree latitude ≈ 69 miles
    // 1 degree longitude ≈ 69 * cos(latitude) miles
    const latRadius = radiusMiles / 69
    const cosLat = Math.cos(lat * Math.PI / 180)
    const lonRadius = radiusMiles / (69 * cosLat)
    
    // Overpass API bbox format: (south, west, north, east) - must be in parentheses
    const south = lat - latRadius
    const west = lon - lonRadius
    const north = lat + latRadius
    const east = lon + lonRadius
    
    const bbox = `(${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)})`
    
    console.log('Fetching airports for bbox:', bbox, 'at position:', lat, lon, 'radius:', radiusMiles, 'miles')
    
    // Query Overpass API for all airports (aerodromes) in the bounding box
    // Overpass query syntax: bbox format is (south,west,north,east)
    // Query for all aerodrome types - use simpler query that matches any aerodrome tag
    const query = `[out:json][timeout:45];
(
  node["aerodrome"]${bbox};
  way["aerodrome"]${bbox};
  relation["aerodrome"]${bbox};
);
out center;`
    
    console.log('Overpass query:', query)
    console.log('Bbox values:', { south, west, north, east, lat, lon, latRadius, lonRadius })
    console.log('Calculated bbox span:', { 
      latSpan: (north - south) * 69, 
      lonSpan: (east - west) * 69 * Math.cos(lat * Math.PI / 180),
      latSpanMiles: ((north - south) * 69).toFixed(1),
      lonSpanMiles: ((east - west) * 69 * Math.cos(lat * Math.PI / 180)).toFixed(1)
    })
    
    try {
      // Try multiple Overpass API endpoints in case one is down
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
      ]
      
      let lastError = null
      let lastResponse = null
      let success = false
      
      for (const endpoint of endpoints) {
        if (success) break
        
        try {
          console.log(`Trying Overpass endpoint: ${endpoint}`)
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Overpass API error (${endpoint}):`, response.status, errorText.substring(0, 500))
            lastError = new Error(`Failed to fetch airports: ${response.status}`)
            lastResponse = { status: response.status, error: errorText.substring(0, 200) }
            // Try next endpoint
          } else {
            const data = await response.json()
            console.log('Overpass API response structure:', {
              hasElements: !!data.elements,
              elementsLength: data.elements?.length || 0,
              hasRemark: !!data.remark,
              remark: data.remark?.substring(0, 200),
              version: data.version,
              generator: data.generator
            })
            
            // Check for API errors in response
            if (data.elements === undefined) {
              if (data.remark) {
                console.error('Overpass API remark:', data.remark)
                lastError = new Error(`Overpass API error: ${data.remark.substring(0, 200)}`)
                lastResponse = data
                // Try next endpoint
              } else {
                console.warn('Overpass API returned no elements and no remark:', data)
                lastResponse = data
                // Try next endpoint
              }
            } else {
              // Success - process the data
              lastResponse = data
              success = true
            }
          }
        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            console.error(`Overpass API timeout (${endpoint})`)
            lastError = new Error('Overpass API request timed out')
          } else {
            console.error(`Error fetching from ${endpoint}:`, fetchError)
            lastError = fetchError
          }
          // Try next endpoint
        }
      }
      
      // Process the last successful response (if any)
      if (!success || !lastResponse || !lastResponse.elements) {
        console.error('No successful response from any Overpass endpoint')
        console.error('Last error:', lastError)
        console.error('Last response:', lastResponse)
        throw lastError || new Error('No airports data received from Overpass API')
      }
      
      const data = lastResponse
      console.log('Processing Overpass response with', data.elements?.length || 0, 'elements')
      
      const airports = []
      
      // Process results
      if (data.elements && Array.isArray(data.elements)) {
        console.log(`Found ${data.elements.length} airport elements from Overpass`)
        
        for (const element of data.elements) {
          let airportLat, airportLon
          
          if (element.type === 'node') {
            airportLat = element.lat
            airportLon = element.lon
          } else if (element.type === 'way' && element.center) {
            airportLat = element.center.lat
            airportLon = element.center.lon
          } else if (element.type === 'relation' && element.center) {
            airportLat = element.center.lat
            airportLon = element.center.lon
          } else {
            console.log('Skipping element without coordinates:', element.type, element)
            continue
          }
          
          // Skip if coordinates are invalid
          if (!airportLat || !airportLon || isNaN(airportLat) || isNaN(airportLon)) {
            console.log('Skipping element with invalid coordinates:', element)
            continue
          }
          
          const distance = calculateDistance(lat, lon, airportLat, airportLon)
          
          if (distance <= radiusMiles) {
            const airportName = element.tags?.name || 
                                element.tags?.iata || 
                                element.tags?.icao || 
                                element.tags?.['name:en'] ||
                                'Airport'
            
            airports.push({
              lat: airportLat,
              lon: airportLon,
              name: airportName,
              iata: element.tags?.iata || '',
              icao: element.tags?.icao || '',
              distance: distance,
            })
            
            console.log('Added airport:', airportName, 'at', airportLat, airportLon, 'distance:', distance.toFixed(1), 'miles')
          } else {
            console.log('Airport too far:', element.tags?.name, 'distance:', distance.toFixed(1), 'miles')
          }
        }
      } else {
        console.warn('No elements in response or invalid response structure:', data)
      }
      
      console.log(`Found ${airports.length} airports within ${radiusMiles} miles`)
      
      // Sort by distance (closest first)
      airports.sort((a, b) => a.distance - b.distance)
      
      return airports
    } catch (error) {
      console.error('Error fetching from Overpass API (all endpoints failed):', error)
      // Return empty array on error - the UI will show "No airports found"
      return []
    }
  } catch (outerError) {
    console.error('Error in fetchNearbyAirports:', outerError)
    return []
  }
}

// Custom airport icon creator
const createAirportIcon = () => {
  if (typeof window === 'undefined') return null
  
  try {
    const L = require('leaflet')
    
    return L.divIcon({
      className: 'airport-marker',
      html: `
        <div style="
          width: 16px;
          height: 16px;
          background: #10b981;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 3px 6px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 6px;
            height: 6px;
            background: #ffffff;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })
  } catch (e) {
    console.error('Error creating airport icon:', e)
    return null
  }
}

export default function USMap({ 
  latitude, 
  longitude, 
  heading, 
  flightId, 
  flightPath = [], 
  showCoordinates = true
}) {
  const [isClient, setIsClient] = useState(false)
  const [nearbyAirports, setNearbyAirports] = useState([])
  const [loadingAirports, setLoadingAirports] = useState(false)
  const [airportError, setAirportError] = useState(null)

  // Create airport icon - MUST be called before any conditional returns (Rules of Hooks)
  const airportIcon = useMemo(() => {
    if (!isClient) return null
    return createAirportIcon()
  }, [isClient])

  useEffect(() => {
    setIsClient(true)
    // Import Leaflet CSS dynamically
    import('leaflet/dist/leaflet.css')
  }, [])

  // Fetch nearby airports when coordinates change
  useEffect(() => {
    if (!latitude || !longitude || !isClient) {
      setNearbyAirports([])
      return
    }

    let isMounted = true
    setLoadingAirports(true)

    const fetchAirports = async () => {
      try {
        console.log('Fetching airports for:', latitude, longitude)
        setAirportError(null)
        const airports = await fetchNearbyAirports(latitude, longitude, 100)
        console.log('Airports fetched:', airports.length, airports)
        if (isMounted) {
          setNearbyAirports(airports)
          if (airports.length === 0) {
            setAirportError('No airports found - check console for details')
          }
        }
      } catch (error) {
        console.error('Error fetching airports:', error)
        if (isMounted) {
          setNearbyAirports([])
          setAirportError(error.message || 'Failed to fetch airports')
        }
      } finally {
        if (isMounted) {
          setLoadingAirports(false)
        }
      }
    }

    // Fetch immediately and also debounce for updates
    fetchAirports()
    
    // Debounce airport fetching (wait 5 seconds after coordinate change for updates)
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        fetchAirports()
      }
    }, 5000)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [latitude, longitude, isClient])
  
  // Log airport data for debugging
  useEffect(() => {
    console.log('Airport state update:', {
      count: nearbyAirports.length,
      airports: nearbyAirports,
      airportIcon: airportIcon !== null,
      loading: loadingAirports,
      coordinates: { lat: latitude, lon: longitude }
    })
  }, [nearbyAirports, airportIcon, loadingAirports, latitude, longitude])

  if (latitude === null || longitude === null) {
    return (
      <div style={{ 
        width: '100%', 
        height: '200px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#9ca3af',
        background: '#1e293b',
        borderRadius: '8px',
      }}>
        No position data
      </div>
    )
  }

  if (!isClient) {
    return (
      <div style={{ 
        width: '100%', 
        height: '200px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#9ca3af',
        background: '#1e293b',
        borderRadius: '8px',
      }}>
        Loading map...
      </div>
    )
  }

  const position = [latitude, longitude]
  const zoom = 7

  // Convert flight path to array of [lat, lon] tuples
  const pathCoordinates = flightPath.map(point => [point.lat, point.lon])
  const aircraftIcon = createAircraftIcon(heading || 0)

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ width: '100%', height: '100%', minHeight: '400px', flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(148, 163, 184, 0.3)', position: 'relative' }}>
        <MapContainer
          center={position}
          zoom={zoom}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          scrollWheelZoom={true}
          zoomControl={true}
          attributionControl={true}
          dragging={true}
          touchZoom={true}
          doubleClickZoom={true}
          boxZoom={true}
        >
          {/* Dark theme tile layer - using CartoDB dark tiles (free, no API key needed) */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />
          
          {/* Flight path polyline */}
          {pathCoordinates.length > 1 && (
            <Polyline
              key={`path-${pathCoordinates.length}`}
              positions={pathCoordinates}
              pathOptions={{
                color: '#60a5fa',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 5',
              }}
            />
          )}
          
          {/* Airport markers - within 100 miles, sorted by distance (closest first) */}
          {nearbyAirports.length > 0 && airportIcon && nearbyAirports.map((airport, idx) => {
            if (!airport.lat || !airport.lon || isNaN(airport.lat) || isNaN(airport.lon)) {
              console.warn('Invalid airport coordinates:', airport)
              return null
            }
            return (
              <Marker
                key={`airport-${airport.lat}-${airport.lon}-${idx}`}
                position={[Number(airport.lat), Number(airport.lon)]}
                icon={airportIcon}
              >
                <Popup>
                  <div style={{ textAlign: 'center', color: '#1f2937', minWidth: '120px' }}>
                    <strong>{airport.name}</strong>
                    {airport.iata && <div style={{ fontSize: '12px', marginTop: '4px' }}>IATA: {airport.iata}</div>}
                    {airport.icao && <div style={{ fontSize: '12px' }}>ICAO: {airport.icao}</div>}
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      {airport.distance.toFixed(1)} mi away
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
          
          {/* Debug info - show closest airport */}
          {process.env.NODE_ENV === 'development' && nearbyAirports.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              background: 'rgba(0,0,0,0.9)',
              color: 'white',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              zIndex: 1000,
              maxWidth: '300px',
              fontFamily: 'monospace',
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '4px' }}>
                Closest Airport
              </div>
              <div><strong>{nearbyAirports[0]?.name}</strong></div>
              <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.9 }}>
                Distance: {nearbyAirports[0]?.distance.toFixed(1)} mi
              </div>
              {nearbyAirports[0]?.iata && (
                <div style={{ marginTop: '2px', fontSize: '10px', opacity: 0.8 }}>
                  IATA: {nearbyAirports[0].iata}
                </div>
              )}
              {nearbyAirports[0]?.icao && (
                <div style={{ marginTop: '2px', fontSize: '10px', opacity: 0.8 }}>
                  ICAO: {nearbyAirports[0].icao}
                </div>
              )}
            </div>
          )}
          
          {/* Aircraft marker */}
          {aircraftIcon && (
            <Marker
              key={`marker-${latitude}-${longitude}-${heading}`}
              position={position}
              icon={aircraftIcon}
            >
              {flightId && (
                <Popup>
                  <div style={{ textAlign: 'center', color: '#1f2937' }}>
                    <strong>{flightId}</strong>
                    <br />
                    {showCoordinates && (
                      <>
                        Lat: {latitude.toFixed(4)}°
                        <br />
                        Lon: {longitude.toFixed(4)}°
                        <br />
                        {heading !== null && `Hdg: ${Math.round(heading)}°`}
                      </>
                    )}
                  </div>
                </Popup>
              )}
            </Marker>
          )}
        </MapContainer>
      </div>
      
      {/* Coordinates display - only show if showCoordinates is true */}
      {showCoordinates && (
        <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
          Lat: {latitude.toFixed(4)}°<br />
          Lon: {longitude.toFixed(4)}°<br />
          {heading !== null && `Hdg: ${Math.round(heading)}°`}
        </div>
      )}
    </div>
  )
}
