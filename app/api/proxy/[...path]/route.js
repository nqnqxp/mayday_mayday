export async function GET(request, { params }) {
  return handleProxy(request, params)
}

export async function POST(request, { params }) {
  return handleProxy(request, params)
}

export async function PUT(request, { params }) {
  return handleProxy(request, params)
}

export async function DELETE(request, { params }) {
  return handleProxy(request, params)
}

export async function PATCH(request, { params }) {
  return handleProxy(request, params)
}

async function handleProxy(request, params) {
  const targetUrl = process.env.API_SERVER_URL || 'http://localhost:3001'
  const path = params.path ? params.path.join('/') : ''
  const searchParams = request.nextUrl.searchParams.toString()
  
  const url = `${targetUrl}/${path}${searchParams ? `?${searchParams}` : ''}`
  
  try {
    const headers = new Headers()
    request.headers.forEach((value, key) => {
      // Forward relevant headers, but skip host and connection
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers.set(key, value)
      }
    })

    const options = {
      method: request.method,
      headers,
    }

    // Include body for POST, PUT, PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const body = await request.text()
      if (body) {
        options.body = body
      }
    }

    const response = await fetch(url, options)
    const data = await response.text()
    
    return new Response(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to proxy request', message: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
