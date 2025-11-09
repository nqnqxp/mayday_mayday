'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Realtime } from 'ably'

const STATUS_LABEL = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  closed: 'Disconnected',
  error: 'Error - check console',
}

const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY ?? ''

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function RoomConnector({ pageId }) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [logs, setLogs] = useState([])
  const [creating, setCreating] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const realtimeRef = useRef(null)
  const channelRef = useRef(null)
  const actorIdRef = useRef(createId())

  useEffect(() => {
    if (status === 'connected') {
      setCollapsed(true)
    } else if (status === 'idle' || status === 'connecting' || status === 'error') {
      setCollapsed(false)
    }
  }, [status])

  const appendLog = (entry) => {
    setLogs((prev) => {
      const next = [...prev, { id: createId(), timestamp: Date.now(), entry }]
      return next.slice(-12)
    })
  }

  const ensureRealtime = () => {
    if (!ABLY_KEY) {
      throw new Error('Ably key is not configured – set NEXT_PUBLIC_ABLY_KEY')
    }

    if (!realtimeRef.current) {
      const client = new Realtime({
        key: ABLY_KEY,
        clientId: actorIdRef.current,
        echoMessages: false,
        transports: ['web_socket'],
      })

      client.connection.on('failed', (event) => {
        console.error('Ably connection failed', event)
        setStatus('error')
        appendLog('Realtime connection failed – check console')
      })

      realtimeRef.current = client
    }

    return realtimeRef.current
  }

  const teardownChannel = async ({ logMessage, resetStatus = true } = {}) => {
    const channel = channelRef.current
    if (!channel) {
      if (resetStatus) {
        setStatus('idle')
      }
      if (logMessage) {
        appendLog(logMessage)
      }
      return
    }

    channelRef.current = null

    try {
      channel.unsubscribe()
      channel.presence.unsubscribe()
      channel.off()
    } catch (error) {
      console.warn('Failed to unsubscribe from Ably channel', error)
    }

    try {
      await channel.presence.leave({ actorId: actorIdRef.current })
    } catch (error) {
      if (error?.code !== 91000) {
        console.warn('Failed to leave Ably presence', error)
      }
    }

    try {
      await channel.detach()
    } catch (error) {
      if (error?.code !== 90001) {
        console.warn('Failed to detach Ably channel', error)
      }
    }

    if (resetStatus) {
      setStatus('idle')
      setCollapsed(false)
    }

    if (logMessage) {
      appendLog(logMessage)
    }
  }

  const handleCreateRoom = async () => {
    setCreating(true)
    await teardownChannel({ resetStatus: true })

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: code.trim() ? JSON.stringify({ code }) : undefined,
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message = payload?.error || 'Unable to create room'
        appendLog(message)
        setStatus('error')
        return
      }

      const createdCode = payload.code
      setCode(createdCode)
      appendLog(`Room “${createdCode}” opened. Share this code with your partner.`)
    } catch (error) {
      console.error('Room creation failed:', error)
      appendLog('Failed to create room – check console for details')
      setStatus('error')
    } finally {
      setCreating(false)
    }
  }

  const handleConnect = async () => {
    const trimmed = code.trim()
    if (!trimmed) {
      appendLog('Enter a room code to connect')
      setStatus('idle')
      return
    }

    const normalized = trimmed.toUpperCase()
    await teardownChannel({ resetStatus: false })

    setStatus('connecting')
    setCollapsed(false)
    appendLog(`Connecting to room “${normalized}”…`)

    try {
      const client = ensureRealtime()
      const channelName = `rooms:${normalized}`
      const channel = client.channels.get(channelName)
      channelRef.current = channel

      channel.unsubscribe()
      channel.presence.unsubscribe()
      channel.off()

      channel.on((stateChange) => {
        if (stateChange.current === 'failed') {
          console.error('Ably channel failed', stateChange)
          setStatus('error')
          appendLog('Realtime channel failed – check console')
        } else if (stateChange.current === 'suspended') {
          appendLog('Connection issues detected – retrying…')
          setStatus('connecting')
        } else if (stateChange.current === 'detached') {
          if (stateChange.reason) {
            appendLog('Channel detached – attempting to reconnect')
            setStatus('connecting')
          }
        }
      })

      channel.subscribe('relay', (message) => {
        const payload = message?.data
        if (!payload) {
          appendLog('Received empty message')
          return
        }

        if (payload.actorId === actorIdRef.current) {
          return
        }

        if (payload.type === 'presence') {
          appendLog(`Presence signal from ${payload.page ?? 'partner'}`)
        } else if (payload.type === 'chat') {
          appendLog(`${payload.page ?? 'Partner'}: ${payload.message}`)
        } else {
          appendLog(`Message: ${JSON.stringify(payload)}`)
        }
      })

      channel.presence.subscribe(['enter', 'leave'], async (presenceMsg) => {
        const data = presenceMsg?.data || {}
        if (data.actorId === actorIdRef.current) {
          return
        }

        let message =
          presenceMsg.action === 'enter'
            ? 'Another participant joined the room'
            : 'A participant left the room'

        try {
          const members = await channel.presence.get()
          if (Array.isArray(members) && members.length > 0) {
            message += ` (now ${members.length})`
          }
        } catch (error) {
          console.warn('Unable to fetch presence member count', error)
        }

        appendLog(message)
      })

      await channel.attach()

      setStatus('connected')
      appendLog('Connected. Waiting for partner…')

      await channel.presence.enter({
        actorId: actorIdRef.current,
        page: pageId,
        timestamp: Date.now(),
      })

      await channel.publish('relay', {
        type: 'presence',
        page: pageId,
        actorId: actorIdRef.current,
        timestamp: Date.now(),
        note: 'joined',
      })
    } catch (error) {
      console.error('Failed to connect via Ably', error)
      appendLog('Failed to establish realtime connection – check console for details')
      setStatus('error')
      await teardownChannel({ resetStatus: false })
    }
  }

  const handleDisconnect = async () => {
    await teardownChannel({ logMessage: 'Disconnected' })
  }

  const handleSendPing = async () => {
    const channel = channelRef.current
    if (!channel) {
      appendLog('Not connected')
      return
    }

    try {
      await channel.publish('relay', {
        type: 'presence',
        page: pageId,
        actorId: actorIdRef.current,
        timestamp: Date.now(),
        note: 'ping',
      })
      appendLog('Presence signal sent')
    } catch (error) {
      console.error('Failed to send presence signal', error)
      appendLog('Failed to send presence signal – check console for details')
    }
  }

  const statusLabel = useMemo(() => STATUS_LABEL[status] ?? status, [status])

  useEffect(() => {
    return () => {
      const cleanup = async () => {
        await teardownChannel({ resetStatus: false })
        if (realtimeRef.current) {
          try {
            realtimeRef.current.connection.close()
          } catch (error) {
            console.warn('Failed to close Ably connection', error)
          }
          realtimeRef.current = null
        }
      }

      cleanup()
    }
  }, [])

  const collapsedBadge = (
    <div
      style={{
        position: 'absolute',
        top: 80,
        right: 20,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '999px',
        background: 'rgba(0, 0, 0, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: 'white',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
      }}
      onClick={() => setCollapsed(false)}
    >
      <span
        style={{
          display: 'inline-block',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background:
            status === 'connected'
              ? '#34C759'
              : status === 'connecting'
                ? '#FF9500'
                : '#FF453A',
        }}
      />
      <span style={{ fontSize: '12px' }}>{statusLabel}</span>
      <span style={{ fontSize: '12px', opacity: 0.8 }}>(click to expand)</span>
    </div>
  )

  if (collapsed) {
    return collapsedBadge
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        right: 20,
        zIndex: 1200,
        width: '320px',
        background: 'rgba(0, 0, 0, 0.75)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Room Connector</h3>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Minimize
        </button>
      </div>
      <p style={{ fontSize: '12px', marginTop: '6px' }}>
        Create a room code or join an existing one.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Enter room code"
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <button
          onClick={handleCreateRoom}
          disabled={creating}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: creating ? 'rgba(0, 122, 255, 0.4)' : 'rgba(0, 122, 255, 0.8)',
            color: 'white',
            cursor: creating ? 'not-allowed' : 'pointer',
          }}
        >
          {creating ? 'Opening…' : 'Open Room'}
        </button>
        <button
          onClick={handleConnect}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: 'rgba(52, 199, 89, 0.8)',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Join Room
        </button>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <button
          onClick={handleDisconnect}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: 'rgba(255, 69, 58, 0.85)',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Disconnect
        </button>
        <button
          onClick={handleSendPing}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: 'rgba(255, 165, 0, 0.8)',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Send Ping
        </button>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '12px' }}>
        <strong>Status:</strong> {statusLabel}
      </div>
      <div
        style={{
          maxHeight: '180px',
          overflowY: 'auto',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '10px',
          borderRadius: '6px',
          fontSize: '12px',
          lineHeight: 1.4,
        }}
      >
        {logs.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No events yet.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={{ marginBottom: '6px' }}>
              {new Date(log.timestamp).toLocaleTimeString()} — {log.entry}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
