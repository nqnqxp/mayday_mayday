export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Calculate distance between two coordinates using Haversine formula (returns miles)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate bounding box for 100 mile radius (rough approximation)
function getBoundingBox(lat, lon, radiusMiles) {
  // 1 degree latitude ≈ 69 miles
  // 1 degree longitude ≈ 69 * cos(latitude) miles
  const latDelta = radiusMiles / 69
  const lonDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180))
  
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat'))
    const lon = parseFloat(searchParams.get('lon'))
    
    if (isNaN(lat) || isNaN(lon)) {
      return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      })
    }
    
    // Calculate bounding box (100 miles radius + buffer)
    const bbox = getBoundingBox(lat, lon, 120) // 120 miles to ensure we get all within 100
    
    // Overpass API query for airports within bounding box
    // Query for aeroway=aerodrome (airports) and aeroway=airstrip
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["aeroway"~"^(aerodrome|aeroway)$"]["aerodrome"!~"^(heliport|helipad)$"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
        way["aeroway"~"^(aerodrome|aeroway)$"]["aerodrome"!~"^(heliport|helipad)$"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
        relation["aeroway"~"^(aerodrome|aeroway)$"]["aerodrome"!~"^(heliport|helipad)$"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
      );
      out center;
    `
    
    const overpassUrl = 'https://overpass-api.de/api/interpreter'
    
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    })
    
    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Process results and calculate distances
    const airports = []
    
    if (data.elements) {
      for (const element of data.elements) {
        let airportLat, airportLon, name, code
        
        // Handle different element types (node, way, relation)
        if (element.type === 'node') {
          airportLat = element.lat
          airportLon = element.lon
        } else if (element.center) {
          airportLat = element.center.lat
          airportLon = element.center.lon
        } else if (element.lat && element.lon) {
          airportLat = element.lat
          airportLon = element.lon
        } else {
          continue // Skip if no coordinates
        }
        
        // Get airport name and code
        name = element.tags?.name || element.tags?.['name:en'] || 'Unknown Airport'
        code = element.tags?.iata || element.tags?.icao || element.tags?.ref || ''
        
        // Skip if no name or code
        if (!name || name === 'Unknown Airport') {
          continue
        }
        
        // Calculate distance from aircraft
        const distance = calculateDistance(lat, lon, airportLat, airportLon)
        
        // Only include airports within 100 miles
        if (distance <= 100) {
          airports.push({
            lat: airportLat,
            lon: airportLon,
            name,
            code,
            distance,
          })
        }
      }
    }
    
    // Sort by distance (closest first)
    airports.sort((a, b) => a.distance - b.distance)
    
    return new Response(JSON.stringify({ airports }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Airport API error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch airports', details: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  }
}

