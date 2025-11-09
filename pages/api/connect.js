import { parse } from 'url'
import { WebSocketServer } from 'ws'
import { ensureRoom, deleteRoom } from '@/lib/roomStore'

const SERVER_SYMBOL = Symbol.for('mayday.websocketServer')

export const config = {
  api: {
    bodyParser: false,
  },
}

function getOrCreateServer(res) {
  const server = res.socket.server
  if (!server[SERVER_SYMBOL]) {
    const wss = new WebSocketServer({
      server,
      path: '/ws',
      perMessageDeflate: false,
    })

    wss.on('connection', (ws, request) => {
      const { query } = parse(request.url, true)
      const rawCode = query?.code
      const code = typeof rawCode === 'string'
        ? rawCode.trim().toUpperCase()
        : Array.isArray(rawCode)
          ? rawCode[0].trim().toUpperCase()
          : ''

      console.log('[connect] socket connected', { code })

      if (!code) {
        ws.close(1008, 'Missing room code')
        return
      }

      const room = ensureRoom(code)
      const { clients } = room
      clients.add(ws)

      const broadcast = (payload, exclude) => {
        clients.forEach((client) => {
          if (client !== exclude && client.readyState === client.OPEN) {
            try {
              client.send(JSON.stringify(payload))
            } catch (error) {
              console.error('[connect] broadcast error', error)
            }
          }
        })
      }

      try {
        ws.send(
          JSON.stringify({
            type: 'system',
            message: `Connected to room ${room.code}`,
            peers: clients.size,
          })
        )

        broadcast(
          {
            type: 'system',
            message: 'Another participant joined the room',
            peers: clients.size,
          },
          ws
        )
      } catch (error) {
        console.error('[connect] initial send failed', error)
      }

      ws.on('message', (message) => {
        broadcast({ type: 'relay', payload: message.toString() }, ws)
      })

      const cleanup = (event) => {
        console.log('[connect] socket closing', { code, reason: event?.message })
        clients.delete(ws)
        if (clients.size === 0) {
          deleteRoom(room.code)
        } else {
          broadcast(
            {
              type: 'system',
              message: 'A participant left the room',
              peers: clients.size,
            },
            ws
          )
        }
      }

      ws.on('close', (closeCode, reason) => {
        console.log('[connect] socket closed', { code: room.code, closeCode, reason: reason.toString() })
        cleanup()
      })

      ws.on('error', (error) => {
        console.error('[connect] websocket error', error)
        cleanup({ message: error?.message })
      })
    })

    server[SERVER_SYMBOL] = wss
  }

  return server[SERVER_SYMBOL]
}

export default function handler(req, res) {
  getOrCreateServer(res)

  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    return
  }

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ok: true })
}
