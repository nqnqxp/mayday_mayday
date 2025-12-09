'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
const fetchNearbyAirports = async (lat, lon, radiusMiles = 130) => {
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
    // Search for airports using aeroway tags (most common in OSM)
    // We query nodes, ways, and relations to catch all airport types
    // Using simple equality checks instead of regex for better compatibility
    const radiusMeters = Math.round(radiusMiles * 1609.34) // Convert miles to meters
    const query = `[out:json][timeout:25];
(
  node["aeroway"="aerodrome"]${bbox};
  node["aeroway"="airport"]${bbox};
  way["aeroway"="aerodrome"]${bbox};
  way["aeroway"="airport"]${bbox};
  relation["aeroway"="aerodrome"]${bbox};
  relation["aeroway"="airport"]${bbox};
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
          console.log(`🌐 [Overpass] Trying endpoint: ${endpoint}`)
          console.log(`📤 [Overpass] Query length: ${query.length} chars`)
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout
          
          const fetchStartTime = Date.now()
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          })
          const fetchDuration = Date.now() - fetchStartTime
          console.log(`⏱️ [Overpass] Request took ${fetchDuration}ms, status: ${response.status}`)
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Overpass API error (${endpoint}):`, response.status, errorText.substring(0, 500))
            
            // Handle rate limiting (429) - don't try other endpoints, we'll hit the same limit
            if (response.status === 429) {
              lastError = new Error('Rate limited (429) - Too many requests. Please wait 30 seconds before trying again.')
              console.warn('Overpass API rate limited. This is a free service with rate limits.')
              // Break out of the endpoint loop - no point trying other endpoints
              break
            }
            
            lastError = new Error(`Failed to fetch airports: ${response.status}`)
            lastResponse = { status: response.status, error: errorText.substring(0, 200) }
            // Try next endpoint for other errors
          } else {
            const data = await response.json()
            console.log('Overpass API response structure:', {
              hasElements: !!data.elements,
              elementsLength: data.elements?.length || 0,
              hasRemark: !!data.remark,
              remark: data.remark?.substring(0, 500),
              version: data.version,
              generator: data.generator,
              fullResponse: data
            })
            
            // Check for API errors in response
            // Overpass API always returns an elements array (can be empty)
            if (!data || typeof data !== 'object') {
              console.error('Invalid response from Overpass API:', data)
              lastError = new Error('Invalid response from Overpass API')
              lastResponse = data
              // Try next endpoint
            } else if (data.remark && (data.remark.includes('runtime error') || data.remark.includes('error') || data.remark.includes('timeout'))) {
              // Runtime error or timeout - don't try other endpoints
              console.error('Overpass API error:', data.remark)
              lastError = new Error(`Overpass API error: ${data.remark.substring(0, 300)}`)
              lastResponse = data
              break
            } else if (Array.isArray(data.elements)) {
              // Success - process the data (even if empty array)
              console.log(`✓ Overpass API returned ${data.elements.length} elements`)
              if (data.elements.length === 0) {
                console.warn('⚠️ Empty result - no airports found in bounding box')
                console.warn(`  Center: ${lat.toFixed(4)}, ${lon.toFixed(4)}`)
                console.warn(`  Bbox: ${bbox}`)
                console.warn(`  Bbox span: ${((north - south) * 69).toFixed(1)} mi x ${((east - west) * 69 * Math.cos(lat * Math.PI / 180)).toFixed(1)} mi`)
                console.warn('  This might indicate:')
                console.warn('    1. No airports in OSM data for this area')
                console.warn('    2. Airports use different tags than queried')
                console.warn('    3. Query syntax issue')
                console.warn('  Try testing the query at: https://overpass-turbo.eu/')
              } else {
                console.log('✅ Found airports! Sample of first element:', {
                  type: data.elements[0].type,
                  id: data.elements[0].id,
                  tags: data.elements[0].tags ? Object.keys(data.elements[0].tags).slice(0, 10) : 'no tags',
                  name: data.elements[0].tags?.name || data.elements[0].tags?.iata || data.elements[0].tags?.icao || 'unnamed',
                  hasCenter: !!data.elements[0].center,
                  hasLat: !!data.elements[0].lat,
                  center: data.elements[0].center,
                  lat: data.elements[0].lat,
                  lon: data.elements[0].lon
                })
              }
              lastResponse = data
              success = true
            } else if (data.elements === undefined && data.remark) {
              // Has remark but no elements - might be an error or info message
              console.warn('Overpass API response has remark but no elements:', data.remark.substring(0, 300))
              lastError = new Error(`Overpass API: ${data.remark.substring(0, 200)}`)
              lastResponse = data
              // Try next endpoint
            } else {
              console.warn('⚠️ Unexpected response format from Overpass API')
              console.warn('Response keys:', Object.keys(data || {}))
              console.warn('Response sample:', JSON.stringify(data, null, 2).substring(0, 1000))
              lastResponse = data
              // Try next endpoint
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
      // Allow empty responses as valid (no airports in area)
      if (!success && lastResponse === null) {
        console.error('No successful response from any Overpass endpoint')
        console.error('Last error:', lastError)
        console.error('Last response:', lastResponse)
        throw lastError || new Error('No airports data received from Overpass API')
      }
      
      // If we have a response, use it (even if empty)
      const data = lastResponse || { elements: [] }
      
      // Ensure elements is an array
      if (!Array.isArray(data.elements)) {
        console.warn('Response elements is not an array, setting to empty array')
        data.elements = []
      }
      
      console.log('Processing Overpass response with', data.elements?.length || 0, 'elements')
      
      const airports = []
      
      // Process results
      if (data.elements && Array.isArray(data.elements)) {
        console.log(`Found ${data.elements.length} airport elements from Overpass`)
        
        if (data.elements.length === 0) {
          console.warn('No airport elements found in bounding box. This could mean:')
          console.warn('1. No airports in this area')
          console.warn('2. Query syntax issue')
          console.warn('3. Overpass API data coverage issue')
          console.warn('Bbox:', bbox, 'Center:', lat, lon)
        } else {
          console.log('Sample elements (first 3):', data.elements.slice(0, 3).map(el => ({
            type: el.type,
            id: el.id,
            tags: el.tags ? Object.keys(el.tags).slice(0, 5).reduce((acc, key) => {
              acc[key] = el.tags[key]
              return acc
            }, {}) : {},
            hasCenter: !!el.center,
            hasLat: !!el.lat,
            hasLon: !!el.lon,
            lat: el.lat || el.center?.lat,
            lon: el.lon || el.center?.lon,
            geometry: el.geometry ? `${el.geometry.length} points` : 'none'
          })))
        }
        
        let processedCount = 0
        let skippedCount = 0
        let outsideRadiusCount = 0
        
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
          } else if (element.type === 'way' || element.type === 'relation') {
            // For ways/relations without center, try to calculate from geometry if available
            if (element.geometry && element.geometry.length > 0) {
              // Calculate center from geometry points
              const lats = element.geometry.map(p => p.lat).filter(v => !isNaN(v))
              const lons = element.geometry.map(p => p.lon).filter(v => !isNaN(v))
              if (lats.length > 0 && lons.length > 0) {
                airportLat = lats.reduce((a, b) => a + b, 0) / lats.length
                airportLon = lons.reduce((a, b) => a + b, 0) / lons.length
              }
            }
            
            if (!airportLat || !airportLon) {
              console.log(`Skipping ${element.type} without coordinates:`, element.id, element.tags?.name || 'no name')
              skippedCount++
              continue
            }
          } else {
            console.log('Skipping unknown element type:', element.type, element.id)
            skippedCount++
            continue
          }
          
          // Skip if coordinates are invalid
          if (!airportLat || !airportLon || isNaN(airportLat) || isNaN(airportLon)) {
            console.log('Skipping element with invalid coordinates:', element.type, element.id, {
              lat: airportLat,
              lon: airportLon,
              tags: element.tags?.name || 'no name'
            })
            skippedCount++
            continue
          }
          
          const distance = calculateDistance(lat, lon, airportLat, airportLon)
          
          // Log all airports found, even if outside radius, for debugging (limit to first 5)
          if (distance > radiusMiles) {
            if (outsideRadiusCount < 5) {
              console.log(`Airport outside radius (${distance.toFixed(1)} mi):`, 
                element.tags?.name || element.tags?.iata || element.tags?.icao || 'Unknown', 
                'at', airportLat.toFixed(4), airportLon.toFixed(4))
            }
            outsideRadiusCount++
          }
          
          if (distance <= radiusMiles) {
            const airportName = element.tags?.name || 
                                element.tags?.iata || 
                                element.tags?.icao || 
                                element.tags?.['name:en'] ||
                                element.tags?.ref ||
                                `Airport ${element.id}`
            
            airports.push({
              lat: airportLat,
              lon: airportLon,
              name: airportName,
              iata: element.tags?.iata || '',
              icao: element.tags?.icao || '',
              distance: distance,
            })
            
            console.log(`✓ [${processedCount + 1}] Added airport:`, airportName, 
              'at', airportLat.toFixed(4), airportLon.toFixed(4), 
              'distance:', distance.toFixed(1), 'miles')
            processedCount++
          }
        }
        
        console.log(`📊 Processing summary: ${processedCount} added, ${outsideRadiusCount} outside radius, ${skippedCount} skipped`)
        
        if (processedCount === 0 && data.elements.length > 0) {
          console.warn('⚠️ All airports were filtered out! Reasons:')
          console.warn(`  - ${outsideRadiusCount} outside ${radiusMiles} mile radius`)
          console.warn(`  - ${skippedCount} skipped (missing coordinates)`)
          if (outsideRadiusCount > 0) {
            console.warn('  💡 Consider: The bbox might be too large, or distance calculation might be incorrect')
          }
        }
      } else {
        console.warn('No elements in response or invalid response structure')
        console.warn('Response keys:', Object.keys(data || {}))
        console.warn('Response sample:', JSON.stringify(data, null, 2).substring(0, 2000))
      }
      
      console.log(`✅ Final result: Found ${airports.length} airports within ${radiusMiles} miles of ${lat.toFixed(4)}, ${lon.toFixed(4)}`)
      
      // Sort by distance (closest first)
      airports.sort((a, b) => a.distance - b.distance)
      
      // If we got airports, return them
      if (airports.length > 0) {
        return airports
      }
      
      // If no airports found, log a warning but still return empty array
      // This could be legitimate (remote area) or an API issue
      console.warn('⚠️ [fetchNearbyAirports] No airports found after processing all elements')
      console.warn('  This could mean:')
      console.warn('    1. No airports in OSM data for this area (legitimate)')
      console.warn('    2. API returned partial/incomplete data')
      console.warn('    3. All airports were filtered out (outside radius or missing coordinates)')
      
      return airports
    } catch (error) {
      console.error('❌ [fetchNearbyAirports] Error fetching from Overpass API (all endpoints failed):', error)
      // Return empty array on error - the UI will show "No airports found"
      // The caller should handle retries if needed
      throw error // Re-throw so caller knows it was an error, not just empty results
    }
  } catch (outerError) {
    console.error('❌ [fetchNearbyAirports] Outer error:', outerError)
    throw outerError // Re-throw so caller can handle it
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
  showCoordinates = true,
  showAutopilotButton = false,
  onAutopilotRecommendation = null
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

  // Cache for airport data to avoid redundant API calls
  const airportCacheRef = useRef(new Map())
  const lastFetchRef = useRef({ lat: null, lon: null, timestamp: 0 })
  const fetchTimeoutRef = useRef(null)

  // Fetch nearby airports when coordinates change (with rate limiting)
  // This uses the plane's current position (from page 2) to find airports within 130 miles
  useEffect(() => {
    if (!latitude || !longitude || !isClient) {
      console.log('USMap: Skipping airport fetch - missing coordinates or client not ready', { latitude, longitude, isClient })
      setNearbyAirports([])
      return
    }
    
    console.log('USMap: Starting airport fetch for plane position:', { latitude, longitude })

    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    let isMounted = true

    // Check if we have cached data for this location (within 0.05 degrees ≈ 3.5 miles)
    // Use finer cache key to avoid sharing empty results across large areas
    const cacheKey = `${Math.round(latitude * 20) / 20},${Math.round(longitude * 20) / 20}`
    const cached = airportCacheRef.current.get(cacheKey)
    const now = Date.now()
    
    // Cache validity: 5 minutes for results with airports, 1 minute for empty results
    const cacheAge = cached ? (now - cached.timestamp) : Infinity
    const cacheValid = cached && (
      cached.isEmpty 
        ? cacheAge < 60000  // 1 minute for empty results
        : cacheAge < 300000 // 5 minutes for results with airports
    )

    if (cacheValid) {
      // Only use cached data if it has airports OR if it's very recent (< 1 minute)
      // This prevents using stale empty results
      const isRecent = (now - cached.timestamp) < 60000 // 1 minute
      const hasAirports = cached.airports && cached.airports.length > 0
      
      if (hasAirports || isRecent) {
        console.log('✅ Using cached airport data for:', cacheKey, `(${cached.airports.length} airports)`)
        setNearbyAirports(cached.airports)
        setLoadingAirports(false)
        setAirportError(null)
        return
      } else {
        console.log('⚠️ Ignoring stale empty cache for:', cacheKey, '- will refetch')
        // Remove stale empty cache entry
        airportCacheRef.current.delete(cacheKey)
      }
    }

    // Rate limiting: Don't fetch if we fetched in the last 15 seconds for a similar location
    // Reduced from 30 seconds to 15 seconds for better responsiveness
    const timeSinceLastFetch = now - lastFetchRef.current.timestamp
    const minTimeBetweenFetches = 15000 // 15 seconds minimum between fetches
    const lastLat = lastFetchRef.current.lat
    const lastLon = lastFetchRef.current.lon
    const distanceFromLastFetch = lastLat && lastLon 
      ? calculateDistance(latitude, longitude, lastLat, lastLon)
      : Infinity

    // If we fetched recently and we're close to that location, use cache or wait
    // But only if the cached result has airports - don't block on empty results
    if (timeSinceLastFetch < minTimeBetweenFetches && distanceFromLastFetch < 5) {
      const cachedHasAirports = cached && cached.airports && cached.airports.length > 0
      
      if (cachedHasAirports) {
        console.log('✅ Rate limiting: Using cached airports (recent fetch nearby)')
        setNearbyAirports(cached.airports)
        setLoadingAirports(false)
        return
      } else {
        // If cached result is empty, allow fetch if we've moved significantly (> 2 miles)
        if (distanceFromLastFetch > 2) {
          console.log('🔄 Rate limiting: Cached result empty, but moved >2mi, allowing fetch')
          // Continue to fetch
        } else {
          console.log('⏸️ Rate limiting: Waiting before next fetch. Time since last:', timeSinceLastFetch, 'ms')
          setLoadingAirports(false)
          // Schedule fetch for later
          fetchTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              // Retry after rate limit period
              lastFetchRef.current = { lat: latitude, lon: longitude, timestamp: Date.now() }
            }
          }, minTimeBetweenFetches - timeSinceLastFetch)
          return
        }
      }
    }

    setLoadingAirports(true)

    const fetchAirports = async () => {
      try {
        console.log('🔍 [USMap] Starting airport fetch for coordinates:', latitude, longitude)
        setAirportError(null)
        
        // Update last fetch time
        lastFetchRef.current = { lat: latitude, lon: longitude, timestamp: Date.now() }
        
        const airports = await fetchNearbyAirports(latitude, longitude, 130)
        console.log('✅ [USMap] Airport fetch completed. Found:', airports.length, 'airports')
        
        if (isMounted) {
          // Only cache results that have airports, or cache empty results with shorter TTL
          // This prevents caching empty results that might be due to API issues
          if (airports.length > 0) {
            // Cache successful results with airports
            airportCacheRef.current.set(cacheKey, {
              airports,
              timestamp: now,
            })
            console.log('💾 Cached', airports.length, 'airports for location:', cacheKey)
          } else {
            // Cache empty results with shorter validity (1 minute instead of 5)
            // This allows retry if it was a temporary API issue
            airportCacheRef.current.set(cacheKey, {
              airports: [],
              timestamp: now,
              isEmpty: true, // Mark as empty for shorter TTL
            })
            console.log('💾 Cached empty result (short TTL) for location:', cacheKey)
          }
          
          // Limit cache size (keep last 15 entries)
          if (airportCacheRef.current.size > 15) {
            const firstKey = airportCacheRef.current.keys().next().value
            airportCacheRef.current.delete(firstKey)
          }
          
          setNearbyAirports(airports)
          setLoadingAirports(false)
          // Don't set error if airports.length === 0 - this is valid (no airports in area)
          // Only set error if there was an actual API error
          setAirportError(null)
          
          if (airports.length === 0) {
            console.warn('⚠️ [USMap] No airports found within 130 miles of', latitude.toFixed(4), longitude.toFixed(4))
            console.warn('  This might be normal if the area is remote. Check console for Overpass API response details.')
            console.warn('  Empty result cached with short TTL - will retry on next coordinate change')
          } else {
            console.log('✅ [USMap] Successfully loaded', airports.length, 'airports')
          }
        }
      } catch (error) {
        console.error('❌ [USMap] Error fetching airports:', error)
        if (isMounted) {
          // Don't set empty array immediately - check if we have cached data to use
          const fallbackCache = airportCacheRef.current.get(cacheKey)
          if (fallbackCache && fallbackCache.airports && fallbackCache.airports.length > 0) {
            console.log('🔄 [USMap] Using cached airports as fallback after error')
            setNearbyAirports(fallbackCache.airports)
          } else {
            setNearbyAirports([])
          }
          
          setLoadingAirports(false)
          
          // Check if it's a rate limit error
          if (error.message && error.message.includes('429')) {
            setAirportError('Rate limited - waiting before retry. Please wait 15 seconds.')
            console.warn('⚠️ [USMap] Overpass API rate limited. Please wait 15 seconds.')
            // Don't clear cache - keep existing data
            lastFetchRef.current = { lat: latitude, lon: longitude, timestamp: Date.now() }
          } else if (error.message && error.message.includes('timeout')) {
            setAirportError('Request timed out - will retry on next update')
            console.warn('⚠️ [USMap] Overpass API request timed out')
            // Don't cache timeout errors - allow retry
          } else {
            setAirportError(error.message || 'Failed to fetch airports')
            console.error('❌ [USMap] Airport fetch failed:', error.message)
          }
        }
      }
    }

    // Debounce airport fetching (wait 3 seconds after coordinate change to reduce API calls)
    // Reduced from 10 seconds to 3 seconds for faster initial load
    fetchTimeoutRef.current = setTimeout(() => {
      if (isMounted) {
        console.log('⏰ [USMap] Debounce complete, starting airport fetch...')
        fetchAirports()
      }
    }, 3000) // Reduced from 10 to 3 seconds for faster response

    return () => {
      isMounted = false
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
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
    console.log('USMap: No coordinates provided - latitude:', latitude, 'longitude:', longitude)
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
  
  console.log('USMap: Rendering map with coordinates from Page 2:', { latitude, longitude, heading, flightId })

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
          
          {/* Airport markers - within 130 miles, sorted by distance (closest first) */}
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
                    {showAutopilotButton && onAutopilotRecommendation && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('[USMap] Autopilot recommendation button clicked for:', airport.name)
                          onAutopilotRecommendation(airport.name, airport.lat, airport.lon)
                        }}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(96, 165, 250, 0.9)',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          width: '100%',
                          pointerEvents: 'auto',
                        }}
                      >
                        Autopilot Recommendation
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
          
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
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
                Airport Data
              </div>
              <div>Airports Found: <strong>{nearbyAirports.length}</strong></div>
              <div>Loading: {loadingAirports ? <span style={{ color: '#60a5fa' }}>Yes</span> : <span style={{ color: '#10b981' }}>No</span>}</div>
              <div>Icon Created: {airportIcon ? <span style={{ color: '#10b981' }}>Yes</span> : <span style={{ color: '#ef4444' }}>No</span>}</div>
              <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.8, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '4px' }}>
                <div><strong>Plane Position:</strong></div>
                <div>Lat: {latitude?.toFixed(4) ?? 'null'}</div>
                <div>Lon: {longitude?.toFixed(4) ?? 'null'}</div>
                <div style={{ marginTop: '4px', fontSize: '9px', opacity: 0.7 }}>
                  Searching within 130 miles of plane
                </div>
              </div>
               {airportError && (
                 <div style={{ marginTop: '6px', padding: '4px', background: 'rgba(239,68,68,0.3)', borderRadius: '3px', fontSize: '10px', color: '#fca5a5' }}>
                   Error: {airportError}
                 </div>
               )}
               {nearbyAirports.length === 0 && !loadingAirports && !airportError && latitude && longitude && (
                 <div style={{ marginTop: '6px', padding: '4px', background: 'rgba(251,191,36,0.3)', borderRadius: '3px', fontSize: '10px', color: '#fde047' }}>
                   No airports found. Check console for API response details.
                 </div>
               )}
              {nearbyAirports.length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '10px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '4px' }}>
                  <div><strong>Closest:</strong> {nearbyAirports[0]?.name}</div>
                  <div>Distance: {nearbyAirports[0]?.distance.toFixed(1)} mi</div>
                  {nearbyAirports[0]?.iata && <div>IATA: {nearbyAirports[0].iata}</div>}
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
