import { ensureRoom, deleteRoom } from '@/lib/roomStore'

export const runtime = 'edge'

const WS_OPEN = 1

const getRoomLabel = (room) => room.code

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const rawCode = searchParams.get('code')
  const upgradeHeader = request.headers.get('upgrade')

  if (!rawCode) {
    return new Response(JSON.stringify({ error: 'Missing room code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const code = rawCode.trim().toUpperCase()

  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response(JSON.stringify({ ok: true, message: 'Ready to accept WebSocket upgrade' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  const { 0: client, 1: server } = new WebSocketPair()
  server.accept()

  const room = ensureRoom(code)
  const { clients } = room
  clients.add(server)

  const broadcast = (payload, exclude) => {
    clients.forEach((peer) => {
      if (peer === exclude) return
      try {
        if (peer.readyState === WS_OPEN) {
          peer.send(JSON.stringify(payload))
        }
      } catch (error) {
        console.error('[connect] broadcast error', error)
      }
    })
  }

  try {
    server.send(
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
      server
    )
  } catch (error) {
    console.error('[connect] initial send failed', error)
  }

  server.addEventListener('message', (event) => {
    broadcast({ type: 'relay', payload: event.data }, server)
  })

  const cleanup = (reason) => {
    clients.delete(server)
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
        server
      )
    }
  }

  server.addEventListener('close', (event) => {
    console.log('[connect] socket closed', { code: room.code, closeCode: event.code, reason: event.reason })
    cleanup(event.reason)
  })

  server.addEventListener('error', (event) => {
    console.error('[connect] websocket error', event.message)
    cleanup(event.message)
  })

  return new Response(null, { status: 101, webSocket: client })
}
