import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { Rest } = require('ably')

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
    client = new Rest(key)
    return client
  }
})()

const createTokenRequest = (rest, params) =>
  new Promise((resolve, reject) => {
    rest.auth.createTokenRequest(params, (error, tokenRequest) => {
      if (error) {
        reject(error)
        return
      }
      resolve(tokenRequest)
    })
  })

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
    const tokenRequest = await createTokenRequest(rest, { clientId })

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

