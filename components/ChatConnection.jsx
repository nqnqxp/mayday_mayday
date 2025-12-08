'use client'

import { useState, useEffect, useRef } from 'react'
import { Realtime } from 'ably'
import Chat from './Chat'

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Generate a flight identifier
const generateFlightId = () => {
  const prefixes = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu', 'Epsilon']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const number = Math.floor(Math.random() * 9000) + 1000
  return `${prefix} ${number}`
}

export default function ChatConnection({ roomCode, pageId, position = 'bottom-right', onConnectionChange }) {
  const [connectionState, setConnectionState] = useState('idle') // idle, requesting, requested, pending, connected
  const [flightId, setFlightId] = useState('')
  const [pendingFlightId, setPendingFlightId] = useState('')
  const realtimeRef = useRef(null)
  const channelRef = useRef(null)
  const actorIdRef = useRef(createId())
  const chatRef = useRef(null)
  const connectingRef = useRef(false)
  const messageHandlerRef = useRef(null)
  const connectionStateRef = useRef(connectionState)
  
  // Keep ref in sync with state
  useEffect(() => {
    connectionStateRef.current = connectionState
  }, [connectionState])

  useEffect(() => {
    if (!roomCode || !roomCode.trim()) {
      return
    }

    let isMounted = true

    const setupChannel = async () => {
      // Prevent concurrent setup attempts
      if (connectingRef.current) {
        return
      }
      connectingRef.current = true

      try {
        if (!realtimeRef.current) {
          const client = new Realtime({
            authUrl: `/api/ably-token?clientId=${encodeURIComponent(actorIdRef.current)}`,
            echoMessages: false,
            transports: ['web_socket'],
          })

          client.connection.on('connected', () => {
            console.log(`[${pageId}] ChatConnection: Ably client connected`)
          })

          client.connection.on('disconnected', () => {
            console.log(`[${pageId}] ChatConnection: Ably client disconnected`)
          })

          client.connection.on('failed', (error) => {
            console.error(`[${pageId}] ChatConnection: Ably connection failed:`, error)
          })

          client.connection.on('suspended', () => {
            console.warn(`[${pageId}] ChatConnection: Ably connection suspended`)
          })

          realtimeRef.current = client
        }

        const client = realtimeRef.current
        const channelName = `rooms:${roomCode.trim().toUpperCase()}`
        const channel = client.channels.get(channelName)
        const currentChannel = channel
        channelRef.current = channel

        // Unsubscribe any existing subscriptions first
        try {
          channel.unsubscribe('connection-request')
        } catch (error) {
          // Ignore unsubscribe errors
        }

        // Wait for channel to be in a stable state before proceeding
        let attempts = 0
        while ((channel.state === 'attaching' || channel.state === 'detaching') && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          attempts++
        }

        // Only detach if channel is attached (not if it's attaching/detaching)
        if (channel.state === 'attached') {
          try {
            await channel.detach()
            // Wait for detach to complete
            attempts = 0
            while (channel.state !== 'detached' && channel.state !== 'initialized' && attempts < 10) {
              await new Promise((resolve) => setTimeout(resolve, 50))
              attempts++
            }
          } catch (error) {
            // Ignore detach errors
          }
        } else if (channel.state === 'attaching') {
          // If still attaching, wait for it to complete then detach
          try {
            await new Promise((resolve) => setTimeout(resolve, 200))
            if (channel.state === 'attached') {
              await channel.detach()
              attempts = 0
              while (channel.state !== 'detached' && channel.state !== 'initialized' && attempts < 10) {
                await new Promise((resolve) => setTimeout(resolve, 50))
                attempts++
              }
            }
          } catch (error) {
            // Ignore errors
          }
        }

        // Attach channel first (required before subscribing)
        if (channel.state !== 'attached' && channel.state !== 'attaching') {
          try {
            await channel.attach()
            console.log(`[${pageId}] Channel attached, state:`, channel.state)
          } catch (error) {
            if (isMounted) {
              console.warn(`[${pageId}] Channel attach failed`, error)
            }
          }
        } else {
          console.log(`[${pageId}] Channel already attached/attaching, state:`, channel.state)
        }
        
        // Wait for channel to be attached before subscribing
        let attachAttempts = 0
        while (channel.state !== 'attached' && attachAttempts < 20) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          attachAttempts++
        }
        
        if (channel.state !== 'attached') {
          console.error(`[${pageId}] Channel failed to attach after waiting`)
        }
        
        // Subscribe to connection requests - use ref to persist handler
        if (!messageHandlerRef.current) {
          const processedMessages = new Set()
          messageHandlerRef.current = (message) => {
            const payload = message?.data
            if (!payload) return
            
            // Prevent duplicate processing
            const messageKey = `${payload.from}-${payload.action || 'request'}-${payload.timestamp}`
            if (processedMessages.has(messageKey)) {
              console.log(`[${pageId}] Ignoring duplicate message:`, messageKey)
              return
            }
            processedMessages.add(messageKey)
            
            // Clean up old message keys (keep last 10)
            if (processedMessages.size > 10) {
              const keys = Array.from(processedMessages)
              keys.slice(0, keys.length - 10).forEach(key => processedMessages.delete(key))
            }
            
            console.log(`[${pageId}] Received connection-request message:`, payload)
            
            // Page 3 receives connection request from Page 2
            if (payload.from === 'Page 2' && pageId === 'Page 3' && !payload.action) {
              console.log('[Page 3] Setting state to pending')
              setPendingFlightId(payload.flightId)
              setConnectionState('pending')
            } 
            // Page 2 receives accept from Page 3
            else if (payload.from === 'Page 3' && pageId === 'Page 2' && payload.action === 'accept') {
              console.log('[Page 2] Received accept message, setting state to connected')
              setConnectionState('connected')
            }
          }
        }
        
        // Unsubscribe first to prevent duplicates
        try {
          channel.unsubscribe('connection-request', messageHandlerRef.current)
        } catch (e) {
          // Ignore if not subscribed
        }
        
        channel.subscribe('connection-request', messageHandlerRef.current)
        console.log(`[${pageId}] Subscribed to connection-request, channel state:`, channel.state)
      } catch (error) {
        if (isMounted) {
          console.error('Connection request setup failed', error)
        }
      } finally {
        connectingRef.current = false
      }
    }

    setupChannel()

    return () => {
      isMounted = false
      connectingRef.current = false
      // Don't cleanup channel if we're waiting for accept (page 2 in 'requested' state)
      // or if we're connected (Chat will take over)
      const currentState = connectionStateRef.current
      if (currentState === 'requested' || currentState === 'connected') {
        console.log(`[${pageId}] Skipping cleanup in useEffect - state: ${currentState}`)
        return
      }
      
      if (channelRef.current) {
        const channel = channelRef.current
        // Clear the ref first to prevent any new operations
        channelRef.current = null
        
        // Cleanup in a safe way
        const cleanup = async () => {
          try {
            // Unsubscribe first
            try {
              if (messageHandlerRef.current) {
                channel.unsubscribe('connection-request', messageHandlerRef.current)
              } else {
                channel.unsubscribe('connection-request')
              }
            } catch (e) {
              // Ignore unsubscribe errors
            }
            
            // Wait a bit for any pending operations
            await new Promise((resolve) => setTimeout(resolve, 50))
            
            // Check state again before detaching
            const state = channel.state
            if (state === 'attached') {
              try {
                await channel.detach()
              } catch (e) {
                // Ignore detach errors
              }
            } else if (state === 'attaching') {
              // If attaching, wait a bit and try to detach
              try {
                await new Promise((resolve) => setTimeout(resolve, 100))
                if (channel.state === 'attached') {
                  await channel.detach()
                }
              } catch (e) {
                // Ignore errors
              }
            }
          } catch (error) {
            // Ignore all cleanup errors
          }
        }
        
        cleanup()
      }
    }
  }, [roomCode, pageId])
  
  // Ensure channel stays attached when waiting for accept (page 2 in 'requested' state)
  useEffect(() => {
    if (pageId === 'Page 2' && connectionState === 'requested' && channelRef.current) {
      const ensureAttached = async () => {
        const channel = channelRef.current
        if (!channel) return
        
        console.log('[Page 2] Checking channel state while waiting for accept:', channel.state)
        
        if (channel.state !== 'attached' && channel.state !== 'attaching') {
          console.log('[Page 2] Re-attaching channel while waiting for accept')
          try {
            await channel.attach()
            console.log('[Page 2] Channel re-attached, state:', channel.state)
            
            // Re-subscribe if subscription was lost
            if (messageHandlerRef.current) {
              try {
                channel.subscribe('connection-request', messageHandlerRef.current)
                console.log('[Page 2] Re-subscribed to connection-request')
              } catch (e) {
                console.warn('[Page 2] Re-subscribe error:', e)
              }
            }
          } catch (error) {
            console.error('[Page 2] Failed to re-attach channel', error)
          }
        } else {
          // Verify subscription is still active
          if (messageHandlerRef.current) {
            try {
              channel.subscribe('connection-request', messageHandlerRef.current)
              console.log('[Page 2] Ensured subscription is active')
            } catch (e) {
              // Subscription might already exist, that's okay
            }
          }
        }
      }
      ensureAttached()
      
      // Set up periodic check to ensure channel stays attached
      const interval = setInterval(() => {
        if (channelRef.current && connectionState === 'requested') {
          const channel = channelRef.current
          if (channel.state !== 'attached' && channel.state !== 'attaching') {
            console.log('[Page 2] Channel detached, re-attaching...')
            channel.attach().then(() => {
              // Re-subscribe after re-attach
              if (messageHandlerRef.current) {
                try {
                  channel.subscribe('connection-request', messageHandlerRef.current)
                } catch (e) {
                  // Ignore
                }
              }
            }).catch(err => console.error('[Page 2] Re-attach failed', err))
          }
        }
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [connectionState, pageId])

  const handleRequestConnection = async (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (!channelRef.current || connectionState !== 'idle') {
      console.log('Cannot request connection:', { channelRef: !!channelRef.current, connectionState })
      return
    }

    const newFlightId = generateFlightId()
    setFlightId(newFlightId)
    setConnectionState('requesting')

    try {
      await channelRef.current.publish('connection-request', {
        from: pageId,
        flightId: newFlightId,
        timestamp: Date.now(),
      })
      setConnectionState('requested')
    } catch (error) {
      console.error('Failed to send connection request', error)
      setConnectionState('idle')
    }
  }

  const handleAcceptConnection = async () => {
    if (!channelRef.current || connectionState !== 'pending') {
      console.log('[Page 3] Cannot accept:', { hasChannel: !!channelRef.current, state: connectionState })
      return
    }

    try {
      // Ensure channel is attached before publishing
      if (channelRef.current.state !== 'attached' && channelRef.current.state !== 'attaching') {
        console.log('[Page 3] Attaching channel before accepting')
        await channelRef.current.attach()
      }
      
      // Wait a bit to ensure channel is ready
      if (channelRef.current.state === 'attaching') {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      
      const acceptMessage = {
        from: pageId,
        action: 'accept',
        flightId: pendingFlightId,
        timestamp: Date.now(),
      }
      
      console.log('[Page 3] Publishing accept message:', acceptMessage)
      await channelRef.current.publish('connection-request', acceptMessage)
      console.log('[Page 3] Accept message published, setting state to connected')
      setConnectionState('connected')
    } catch (error) {
      console.error('[Page 3] Failed to accept connection', error)
    }
  }

  const setConnectChat = (fn) => {
    chatRef.current = fn
  }

  // Update connection status callback when state changes
  useEffect(() => {
    if (onConnectionChange) {
      // Only report connected when actually connected
      onConnectionChange(connectionState === 'connected')
    }
  }, [connectionState, onConnectionChange])

  // When connected, show Chat using the same client and channel that's already connected
  if (connectionState === 'connected') {
    return (
      <div style={{ 
        ...(position === 'bottom-right' && { 
          position: 'absolute',
          bottom: 340,
          right: 20,
          zIndex: 1500 
        }), 
        ...(position === 'inline' && { 
          position: 'relative', 
          width: '100%', 
          height: '100%',
          minHeight: 0,
          maxHeight: '100%',
          pointerEvents: 'auto',
          zIndex: 102,
          overflow: 'hidden',
        }) 
      }}>
        <Chat
          roomCode={roomCode}
          pageId={pageId}
          position={position}
          onConnectionChange={onConnectionChange}
          autoConnect={true}
          onConnectReady={setConnectChat}
          sharedClient={realtimeRef.current}
          sharedChannel={channelRef.current}
        />
      </div>
    )
  }


  if (pageId === 'Page 2') {
    const bottomRightStyle = {
      position: 'absolute',
      bottom: 340,
      right: 20,
      width: '320px',
      height: '240px',
      zIndex: 1500,
    }

    if (connectionState === 'requested') {
      return (
        <div
          style={{
            ...(position === 'bottom-right' ? bottomRightStyle : {
              width: '100%',
              height: '100%',
            }),
            background: 'rgba(31, 41, 55, 0.95)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f8fafc',
            fontSize: '14px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          Connection request sent
        </div>
      )
    }

    return (
      <div
        style={{
          ...(position === 'bottom-right' ? bottomRightStyle : {
            width: '100%',
            height: '100%',
          }),
          background: 'rgba(31, 41, 55, 0.95)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <button
          onClick={handleRequestConnection}
          disabled={connectionState !== 'idle'}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: connectionState === 'idle' ? 'rgba(96, 165, 250, 0.8)' : 'rgba(148, 163, 184, 0.3)',
            color: '#f8fafc',
            fontSize: '14px',
            fontWeight: 600,
            cursor: connectionState === 'idle' ? 'pointer' : 'not-allowed',
            pointerEvents: connectionState === 'idle' ? 'auto' : 'none',
            marginTop: '10px', // Slight downward adjustment
          }}
        >
          Connect to ATC
        </button>
      </div>
    )
  }

  if (pageId === 'Page 3') {
    if (connectionState === 'pending') {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
            overflow: 'auto',
          }}
        >
          <button
            onClick={handleAcceptConnection}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(96, 165, 250, 0.8)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            Connection request: {pendingFlightId}
          </button>
        </div>
      )
    }

    return null
  }

  return null
}

