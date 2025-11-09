import Ably from 'ably/promises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const getRestClient = (() => {
  let client = null
  return () => {
    if (client) {
      return client
    }
    const key = process.env.ABLY_API_KEY
    if (!key) {
      return null
    }
    client = new Ably.Rest({ key })
    return client
  }
})()

export async function GET(request) {
  const rest = getRestClient()

  if (!rest) {
    return new Response(JSON.stringify({ error: 'Ably API key is not configured' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') ?? undefined

  try {
    const tokenRequest = await rest.auth.createTokenRequest({ clientId })

    return new Response(JSON.stringify(tokenRequest), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[ably-token] failed to create token request', error)
    return new Response(JSON.stringify({ error: 'Failed to generate Ably token' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  }
}

