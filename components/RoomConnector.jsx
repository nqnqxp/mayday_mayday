'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const STATUS_LABEL = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  closed: 'Disconnected',
  error: 'Error - check console',
}

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function warmUpWebSocketEndpoint() {
  try {
    await fetch('/api/connect', { method: 'GET' })
  } catch (error) {
    console.warn('Failed to warm up websocket endpoint', error)
  }
}

export default function RoomConnector({ pageId }) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [logs, setLogs] = useState([])
  const [creating, setCreating] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    warmUpWebSocketEndpoint()
  }, [])

  const appendLog = (entry) => {
    setLogs((prev) => {
      const next = [...prev, { id: createId(), timestamp: Date.now(), entry }]
      return next.slice(-12)
    })
  }

  const closeExistingSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'User requested disconnect')
    }
  }

  const handleCreateRoom = async () => {
    setCreating(true)
    closeExistingSocket()
    setStatus('idle')

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

  const handleConnect = () => {
    const trimmed = code.trim()
    if (!trimmed) {
      appendLog('Enter a room code to connect')
      setStatus('idle')
      return
    }

    closeExistingSocket()

    setStatus('connecting')
    appendLog(`Connecting to room “${trimmed.toUpperCase()}”…`)

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    const ws = new WebSocket(`${protocol}://${host}/ws?code=${encodeURIComponent(trimmed)}`)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      appendLog('Connected. Waiting for partner…')
      ws.send(
        JSON.stringify({
          type: 'presence',
          page: pageId,
          timestamp: Date.now(),
        })
      )
    }

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        if (parsed.type === 'system') {
          appendLog(parsed.message)
        } else if (parsed.type === 'relay') {
          try {
            const inner = JSON.parse(parsed.payload)
            if (inner.type === 'presence') {
              appendLog(`Presence signal from ${inner.page}`)
            } else if (inner.type === 'chat') {
              appendLog(`${inner.page}: ${inner.message}`)
            } else {
              appendLog(`Received message: ${parsed.payload}`)
            }
          } catch (parseError) {
            appendLog(`Received: ${parsed.payload}`)
          }
        } else {
          appendLog(`Message: ${event.data}`)
        }
      } catch (error) {
        appendLog(`Raw message: ${event.data}`)
      }
    }

    ws.onclose = () => {
      if (status !== 'idle') {
        setStatus('closed')
        appendLog('Connection closed')
      }
    }

    ws.onerror = () => {
      setStatus('error')
      appendLog('WebSocket error – check console for details')
    }
  }

  const handleDisconnect = () => {
    closeExistingSocket()
    setStatus('idle')
    appendLog('Disconnected')
  }

  const handleSendPing = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      appendLog('Not connected')
      return
    }
    wsRef.current.send(
      JSON.stringify({
        type: 'presence',
        page: pageId,
        timestamp: Date.now(),
      })
    )
    appendLog('Presence signal sent')
  }

  const statusLabel = useMemo(() => STATUS_LABEL[status] ?? status, [status])

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [])

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
      <h3 style={{ marginTop: 0 }}>Room Connector</h3>
      <p style={{ fontSize: '12px', marginTop: 0 }}>
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
