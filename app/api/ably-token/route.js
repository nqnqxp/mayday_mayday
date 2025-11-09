import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  const apiKey = process.env.ABLY_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Ably API key is not configured' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  }

  const [keyName, keySecret] = apiKey.split(':')

  if (!keyName || !keySecret) {
    return new Response(JSON.stringify({ error: 'Invalid Ably API key format' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') ?? undefined
  const nonce = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now()
  const ttl = 60 * 60 * 1000 // 1 hour
  const capability = JSON.stringify({
    '*': ['publish', 'subscribe', 'presence'],
  })

  const signingParts = [
    keyName,
    ttl.toString(),
    capability,
    clientId ?? '',
    timestamp.toString(),
    nonce,
  ]

  const stringToSign = `${signingParts.join('\n')}\n`

  const mac = crypto.createHmac('sha256', keySecret).update(stringToSign).digest('base64')

  const tokenRequest = {
    keyName,
    ttl,
    capability,
    timestamp,
    nonce,
    mac,
  }

  if (clientId) {
    tokenRequest.clientId = clientId
  }

  try {
    return new Response(JSON.stringify(tokenRequest), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[ably-token] failed to generate token request', error)
    return new Response(JSON.stringify({ error: 'Failed to generate Ably token' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  }
}

