import { ensureRoom, deleteRoom } from '@/lib/roomStore'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const WS_OPEN = 1

const getRoomLabel = (room) => room.code

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const rawCode = searchParams.get('code')
  const upgradeHeader = request.headers.get('upgrade')

  console.log('[connect] incoming request', {
    url: request.url,
    upgrade: upgradeHeader,
    headers: Object.fromEntries(request.headers.entries()),
  })

  if (!rawCode) {
    return new Response(JSON.stringify({ error: 'Missing room code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const code = rawCode.trim().toUpperCase()

  let upgraded
  try {
    upgraded = Deno.upgradeWebSocket(request)
  } catch (error) {
    console.log('[connect] upgrade not attempted', {
      reason: error?.message ?? String(error),
      upgrade: upgradeHeader,
    })
    return new Response(JSON.stringify({ ok: true, message: 'Ready to accept WebSocket upgrade' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  const { socket, response } = upgraded

  const room = ensureRoom(code)
  const { clients } = room
  clients.add(socket)

  const broadcast = (payload, exclude) => {
    clients.forEach((peer) => {
      if (peer === exclude) return
      try {
        const readyState = peer.readyState
        if (readyState === WS_OPEN || readyState === peer.OPEN) {
          peer.send(JSON.stringify(payload))
        }
      } catch (error) {
        console.error('[connect] broadcast error', error)
      }
    })
  }

  const sendInitialMessages = () => {
    try {
      socket.send(
        JSON.stringify({
          type: 'system',
          message: `Connected to room ${getRoomLabel(room)}`,
          peers: clients.size,
        })
      )

      broadcast(
        {
          type: 'system',
          message: 'Another participant joined the room',
          peers: clients.size,
        },
        socket
      )
    } catch (error) {
      console.error('[connect] initial send failed', error)
    }
  }

  if (socket.readyState === WS_OPEN || socket.readyState === socket.OPEN) {
    sendInitialMessages()
  } else {
    socket.addEventListener('open', sendInitialMessages, { once: true })
  }

  socket.addEventListener('message', (event) => {
    broadcast({ type: 'relay', payload: event.data }, socket)
  })

  const cleanup = (reason) => {
    clients.delete(socket)
    if (clients.size === 0) {
      deleteRoom(room.code)
    } else {
      broadcast(
        {
          type: 'system',
          message: 'A participant left the room',
          peers: clients.size,
          reason,
        },
        socket
      )
    }
  }

  socket.addEventListener('close', (event) => {
    console.log('[connect] socket closed', { code: room.code, closeCode: event.code, reason: event.reason })
    cleanup(event.reason)
  })

  socket.addEventListener('error', (event) => {
    console.error('[connect] websocket error', event.message)
    cleanup(event.message)
  })

  return response
}
