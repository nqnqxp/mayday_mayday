import { parse } from 'url'
import { WebSocketServer } from 'ws'
import { ensureRoom, deleteRoom } from '@/lib/roomStore'

const SERVER_SYMBOL = Symbol.for('mayday.websocketServer')
const UPGRADE_SYMBOL = Symbol.for('mayday.websocketUpgradeRegistered')

export const config = {
  api: {
    bodyParser: false,
  },
}

function getOrCreateServer(res) {
  const server = res.socket.server

  if (!server[SERVER_SYMBOL]) {
    server[SERVER_SYMBOL] = new WebSocketServer({ noServer: true, perMessageDeflate: false })
  }

  if (!server[UPGRADE_SYMBOL]) {
    server[UPGRADE_SYMBOL] = true

    server.on('upgrade', (request, socket, head) => {
      const { pathname, query } = parse(request.url, true)
      if (pathname !== '/api/ws') {
        return
      }

      server[SERVER_SYMBOL].handleUpgrade(request, socket, head, (ws) => {
        server[SERVER_SYMBOL].emit('connection', ws, request, query)
      })
    })

    server[SERVER_SYMBOL].on('connection', (ws, request, query) => {
      const { query: params } = parse(request.url, true)
      const rawCode = params?.code
      const code = typeof rawCode === 'string'
        ? rawCode.trim().toUpperCase()
        : Array.isArray(rawCode)
          ? rawCode[0].trim().toUpperCase()
          : ''

      console.log('[ws] connection request', { code })

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
              console.error('[ws] broadcast error', error)
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
        console.error('[ws] initial send failed', error)
      }

      ws.on('message', (message) => {
        broadcast({ type: 'relay', payload: message.toString() }, ws)
      })

      const cleanup = () => {
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

      ws.on('close', () => {
        console.log('[ws] socket closed', { code: room.code })
        cleanup()
      })
      ws.on('error', (error) => {
        console.error('[ws] websocket error', error)
        cleanup()
      })
    })
  }

  return server[SERVER_SYMBOL]
}

export default function handler(req, res) {
  getOrCreateServer(res)

  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    return
  }

  res.status(200).json({ ok: true, message: 'WebSocket endpoint ready' })
}
