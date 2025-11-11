'use client'

import { useState, useEffect, useRef } from 'react'
import { Realtime } from 'ably'

// Inject scrollbar and input styles
if (typeof document !== 'undefined') {
  const styleId = 'chat-scrollbar-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .chat-messages::-webkit-scrollbar {
        width: 8px;
      }
      .chat-messages::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.3);
        border-radius: 4px;
      }
      .chat-messages::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.5);
        border-radius: 4px;
      }
      .chat-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(148, 163, 184, 0.7);
      }
            .chat-input::placeholder {
              color: rgba(248, 250, 252, 0.6);
            }
            .chat-input:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
    `
    document.head.appendChild(style)
  }
}

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const getDisplayName = (pageId) => {
  if (pageId === 'Page 2') return 'Pilot'
  if (pageId === 'Page 3') return 'ATC'
  return pageId
}

export default function Chat({ roomCode, pageId, position = 'bottom-right', onConnectionChange, autoConnect = false, onConnectReady, sharedClient, sharedChannel }) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [chatConnected, setChatConnected] = useState(false)
  const realtimeRef = useRef(sharedClient || null)
  const channelRef = useRef(sharedChannel || null)
  const actorIdRef = useRef(createId())
  const sentMessageIdsRef = useRef(new Set())
  const connectingRef = useRef(false)
  const onConnectionChangeRef = useRef(onConnectionChange)
  const messagesContainerRef = useRef(null)
  
  // Update ref when callback changes
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange
  }, [onConnectionChange])
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])
  
  // If shared client/channel provided, use them
  useEffect(() => {
    if (sharedClient) {
      realtimeRef.current = sharedClient
    }
    if (sharedChannel) {
      channelRef.current = sharedChannel
    }
  }, [sharedClient, sharedChannel])

  useEffect(() => {
    if (!roomCode || !roomCode.trim() || !autoConnect) {
      return
    }

    let isMounted = true
    let currentChannel = null

    const connect = async () => {
      // Prevent concurrent connection attempts
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
            if (isMounted) {
              setIsConnected(true)
              if (onConnectionChangeRef.current) {
                onConnectionChangeRef.current(true)
              }
            }
          })

          client.connection.on('disconnected', () => {
            if (isMounted) {
              setIsConnected(false)
              if (onConnectionChangeRef.current) {
                onConnectionChangeRef.current(false)
              }
            }
          })

          realtimeRef.current = client
        }

        const client = realtimeRef.current
        const channelName = `rooms:${roomCode.trim().toUpperCase()}`
        const channel = client.channels.get(channelName)
        currentChannel = channel
        channelRef.current = channel

        // Unsubscribe any existing subscriptions first
        try {
          channel.unsubscribe()
        } catch (error) {
          // Ignore unsubscribe errors
        }

        // Wait for channel to be in a stable state before attaching
        if (channel.state === 'attached' || channel.state === 'attaching') {
          try {
            await channel.detach()
            // Wait a bit for detach to complete
            await new Promise((resolve) => setTimeout(resolve, 100))
          } catch (error) {
            // Ignore detach errors
          }
        }

        // Subscribe to messages
        channel.subscribe('chat', (message) => {
          if (!isMounted) return
          const payload = message?.data
          if (payload) {
            // Create a unique message ID to prevent duplicates
            const messageId = `${payload.timestamp}-${payload.actorId}-${payload.text}`
            
            // Skip if we've already added this message (sent by us)
            if (sentMessageIdsRef.current.has(messageId)) {
              return
            }
            
            setMessages((prev) => {
              // Check if message already exists in state
              const exists = prev.some((msg) => 
                msg.timestamp === payload.timestamp && 
                msg.sender === payload.sender && 
                msg.text === payload.text
              )
              if (exists) return prev
              
              return [
                ...prev,
                {
                  id: createId(),
                  text: payload.text,
                  sender: payload.sender,
                  timestamp: payload.timestamp || Date.now(),
                },
              ]
            })
          }
        })

        // Attach channel if not already attached
        if (channel.state !== 'attached' && channel.state !== 'attaching') {
          try {
            await channel.attach()
          } catch (error) {
            if (isMounted) {
              console.warn('Channel attach failed', error)
            }
          }
        }
        
        // Report initial connection status
        if (isMounted && onConnectionChangeRef.current) {
          const connected = client.connection.state === 'connected'
          setChatConnected(connected)
          onConnectionChangeRef.current(connected)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Chat connection failed', error)
        }
      } finally {
        connectingRef.current = false
      }
    }

    connect()

    return () => {
      isMounted = false
      connectingRef.current = false
      if (currentChannel) {
        try {
          currentChannel.unsubscribe()
          if (currentChannel.state === 'attached' || currentChannel.state === 'attaching') {
            currentChannel.detach().catch(() => {
              // Ignore detach errors during cleanup
            })
          }
        } catch (error) {
          // Ignore cleanup errors
        }
        channelRef.current = null
      }
    }
  }, [roomCode, autoConnect])

  // Expose connect method via ref
  const connectChat = async () => {
    if (chatConnected || connectingRef.current || !roomCode || !roomCode.trim()) {
      return
    }

    connectingRef.current = true
    let isMounted = true

    try {
      // If shared client/channel provided, use them (already connected)
      if (sharedClient && sharedChannel) {
        console.log(`[Chat ${pageId}] Using shared client/channel`)
        realtimeRef.current = sharedClient
        channelRef.current = sharedChannel
        
        // Set up connection status - check current state and wait if connecting
        const checkConnection = () => {
          const state = sharedClient.connection.state
          console.log(`[Chat ${pageId}] Shared client connection state:`, state)
          
          if (state === 'connected') {
            setIsConnected(true)
            setChatConnected(true)
            if (onConnectionChangeRef.current) {
              onConnectionChangeRef.current(true)
            }
          } else if (state === 'connecting' || state === 'initialized') {
            // Wait for connection
            sharedClient.connection.once('connected', () => {
              if (isMounted) {
                setIsConnected(true)
                setChatConnected(true)
                if (onConnectionChangeRef.current) {
                  onConnectionChangeRef.current(true)
                }
              }
            })
          }
        }
        
        checkConnection()
        
        // Listen for connection changes
        sharedClient.connection.on('connected', () => {
          if (isMounted) {
            console.log(`[Chat ${pageId}] Shared client connected`)
            setIsConnected(true)
            setChatConnected(true)
            if (onConnectionChangeRef.current) {
              onConnectionChangeRef.current(true)
            }
          }
        })

        sharedClient.connection.on('disconnected', () => {
          if (isMounted) {
            console.log(`[Chat ${pageId}] Shared client disconnected`)
            setIsConnected(false)
            setChatConnected(false)
            if (onConnectionChangeRef.current) {
              onConnectionChangeRef.current(false)
            }
          }
        })
        
        // Subscribe to chat messages on the shared channel
        const channel = sharedChannel
        channel.subscribe('chat', (message) => {
          if (!isMounted) return
          const payload = message?.data
          if (payload) {
            const messageId = `${payload.timestamp}-${payload.actorId}-${payload.text}`
            
            if (sentMessageIdsRef.current.has(messageId)) {
              return
            }
            
            setMessages((prev) => {
              const exists = prev.some((msg) => 
                msg.timestamp === payload.timestamp && 
                msg.sender === payload.sender && 
                msg.text === payload.text
              )
              if (exists) return prev
              
              return [
                ...prev,
                {
                  id: createId(),
                  text: payload.text,
                  sender: payload.sender,
                  timestamp: payload.timestamp || Date.now(),
                },
              ]
            })
          }
        })
      } else {
        // Create new client if not shared
        if (!realtimeRef.current) {
          const client = new Realtime({
            authUrl: `/api/ably-token?clientId=${encodeURIComponent(actorIdRef.current)}`,
            echoMessages: false,
            transports: ['web_socket'],
          })

          client.connection.on('connected', () => {
            if (isMounted) {
              setIsConnected(true)
              setChatConnected(true)
              if (onConnectionChangeRef.current) {
                onConnectionChangeRef.current(true)
              }
            }
          })

          client.connection.on('disconnected', () => {
            if (isMounted) {
              setIsConnected(false)
              setChatConnected(false)
              if (onConnectionChangeRef.current) {
                onConnectionChangeRef.current(false)
              }
            }
          })

          realtimeRef.current = client
        }

        const client = realtimeRef.current
        const channelName = `rooms:${roomCode.trim().toUpperCase()}`
        const channel = client.channels.get(channelName)
        channelRef.current = channel

        console.log(`[Chat ${pageId}] Starting connection, channel state:`, channel.state)

        try {
          channel.unsubscribe('chat')
        } catch (error) {
          // Ignore unsubscribe errors
        }

        // Wait for channel to be in a stable state before proceeding
        let attempts = 0
        while ((channel.state === 'attaching' || channel.state === 'detaching') && attempts < 20) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          attempts++
        }

        console.log(`[Chat ${pageId}] Channel state after wait:`, channel.state)

        // Only detach if channel is attached (not if it's attaching/detaching)
        if (channel.state === 'attached') {
          try {
            console.log(`[Chat ${pageId}] Detaching channel before re-attaching`)
            await channel.detach()
            // Wait for detach to complete
            attempts = 0
            while (channel.state !== 'detached' && channel.state !== 'initialized' && attempts < 20) {
              await new Promise((resolve) => setTimeout(resolve, 100))
              attempts++
            }
            console.log(`[Chat ${pageId}] Channel detached, state:`, channel.state)
          } catch (error) {
            console.warn(`[Chat ${pageId}] Detach error:`, error)
          }
        } else if (channel.state === 'attaching') {
          // If still attaching, wait for it to complete then detach
          try {
            await new Promise((resolve) => setTimeout(resolve, 300))
            if (channel.state === 'attached') {
              await channel.detach()
              attempts = 0
              while (channel.state !== 'detached' && channel.state !== 'initialized' && attempts < 20) {
                await new Promise((resolve) => setTimeout(resolve, 100))
                attempts++
              }
            }
          } catch (error) {
            console.warn(`[Chat ${pageId}] Detach error (after attach wait):`, error)
          }
        } else if (channel.state === 'detaching') {
          // If detaching, wait for it to complete
          attempts = 0
          while (channel.state === 'detaching' && attempts < 20) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            attempts++
          }
          console.log(`[Chat ${pageId}] Detach complete, state:`, channel.state)
        }

        // Additional wait to ensure channel is fully stable
        await new Promise((resolve) => setTimeout(resolve, 200))

        // Attach channel if not already attached
        if (channel.state !== 'attached' && channel.state !== 'attaching') {
          try {
            console.log(`[Chat ${pageId}] Attaching channel, current state:`, channel.state)
            await channel.attach()
            console.log(`[Chat ${pageId}] Channel attached, state:`, channel.state)
          } catch (error) {
            if (isMounted) {
              console.warn(`[Chat ${pageId}] Channel attach failed:`, error)
            }
          }
        } else {
          console.log(`[Chat ${pageId}] Channel already attached/attaching, state:`, channel.state)
        }
      }

      // Subscribe to chat messages (only if not using shared channel, as it's already subscribed above)
      if (!sharedClient || !sharedChannel) {
        const channel = channelRef.current
        const client = realtimeRef.current
        if (channel) {
          channel.subscribe('chat', (message) => {
            if (!isMounted) return
            const payload = message?.data
            if (payload) {
              const messageId = `${payload.timestamp}-${payload.actorId}-${payload.text}`
              
              if (sentMessageIdsRef.current.has(messageId)) {
                return
              }
              
              setMessages((prev) => {
                const exists = prev.some((msg) => 
                  msg.timestamp === payload.timestamp && 
                  msg.sender === payload.sender && 
                  msg.text === payload.text
                )
                if (exists) return prev
                
                return [
                  ...prev,
                  {
                    id: createId(),
                    text: payload.text,
                    sender: payload.sender,
                    timestamp: payload.timestamp || Date.now(),
                  },
                ]
              })
            }
          })
        }
        
        if (isMounted && client && onConnectionChangeRef.current) {
          const connected = client.connection.state === 'connected'
          setChatConnected(connected)
          onConnectionChangeRef.current(connected)
        }
      }
    } catch (error) {
      if (isMounted) {
        console.error('Chat connection failed', error)
      }
    } finally {
      connectingRef.current = false
    }
  }

  // Expose connectChat via callback
  useEffect(() => {
    if (onConnectReady) {
      onConnectReady(connectChat)
    }
  }, [onConnectReady])

  // Auto-connect when enabled - add delay to ensure ChatConnection cleanup is complete
  useEffect(() => {
    if (autoConnect && roomCode && roomCode.trim()) {
      // If using shared client/channel, connect immediately
      if (sharedClient && sharedChannel) {
        console.log(`[Chat ${pageId}] Auto-connect with shared resources`)
        connectChat()
      } else if (!chatConnected) {
        // Add a delay to ensure ChatConnection cleanup is complete
        const timer = setTimeout(() => {
          console.log(`[Chat ${pageId}] Auto-connect triggered`)
          connectChat()
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [autoConnect, roomCode, chatConnected, pageId, sharedClient, sharedChannel])

  const sendMessage = async () => {
    if (!inputValue.trim() || !channelRef.current) {
      return
    }

    const messageText = inputValue.trim()
    const messageTimestamp = Date.now()
    const messageId = `${messageTimestamp}-${actorIdRef.current}-${messageText}`

    // Mark this message as sent to prevent duplicates
    sentMessageIdsRef.current.add(messageId)

    // Add message to local state immediately
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        text: messageText,
        sender: pageId,
        timestamp: messageTimestamp,
      },
    ])

    try {
      await channelRef.current.publish('chat', {
        text: messageText,
        sender: pageId,
        timestamp: messageTimestamp,
        actorId: actorIdRef.current,
      })
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message', error)
      // Remove the message from local state if sending failed
      sentMessageIdsRef.current.delete(messageId)
      setMessages((prev) => prev.filter((msg) => msg.timestamp !== messageTimestamp))
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const positionStyles = {
    'bottom-right': {
      position: 'absolute',
      bottom: 340,
      right: 20,
    },
    'inline': {
      position: 'relative',
      width: '100%',
      height: '100%',
      maxHeight: '100%',
      borderRadius: 0,
      boxShadow: 'none',
      border: 'none',
      overflow: 'hidden',
    },
  }

  const style = positionStyles[position] || positionStyles['bottom-right']

  return (
    <div
      style={{
        ...style,
        zIndex: position === 'inline' ? 102 : 1500,
        display: 'flex',
        flexDirection: 'column',
        width: position === 'inline' ? '100%' : '320px',
        height: position === 'inline' ? '100%' : '240px',
        background: 'rgba(31, 41, 55, 0.95)',
        borderRadius: position === 'inline' ? '0 0 14px 14px' : '12px',
        boxShadow: position === 'inline' ? 'none' : '0 8px 24px rgba(0, 0, 0, 0.3)',
        border: position === 'inline' ? 'none' : '1px solid rgba(148, 163, 184, 0.2)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'auto',
        cursor: 'default',
        position: position === 'inline' ? 'relative' : undefined,
        ...(position === 'inline' && {
          height: '100%',
          minHeight: 0,
          maxHeight: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }),
      }}
    >
      {position !== 'inline' && (
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase' }}>
            Chat
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: isConnected ? '#34c759' : '#ff453a',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? '#34c759' : '#ff453a',
              }}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      )}

      <div
          ref={messagesContainerRef}
          className="chat-messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: position === 'inline' ? '8px 12px' : '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: 0,
            maxHeight: '100%',
          }}
        >
        {messages.length === 0 ? (
          <div style={{ color: 'rgba(248, 250, 252, 0.5)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
            No messages yet. Start a conversation...
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignSelf: msg.sender === pageId ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: 'rgba(248, 250, 252, 0.6)',
                  padding: '0 4px',
                }}
              >
                {getDisplayName(msg.sender)}
              </div>
              <div
                style={{
                  background: msg.sender === pageId ? 'rgba(96, 165, 250, 0.3)' : 'rgba(148, 163, 184, 0.2)',
                  color: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  wordWrap: 'break-word',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          padding: position === 'inline' ? '8px 12px 10px 2px' : '12px',
          borderTop: position === 'inline' ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid rgba(148, 163, 184, 0.2)',
          display: 'flex',
          gap: position === 'inline' ? '0px' : '8px',
          flexShrink: 0,
          background: 'rgba(31, 41, 55, 0.95)',
          alignItems: 'center',
          minHeight: position === 'inline' ? '40px' : 'auto',
          boxSizing: 'border-box',
        }}
      >
        {position === 'bottom-right' ? (
          <div
            style={{
              flex: 1,
              borderRadius: '25px',
              border: '2px solid rgba(148, 163, 184, 0.5)',
              background: 'rgba(30, 41, 59, 0.9)',
              overflow: 'hidden',
            }}
          >
            <input
              type="text"
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={!isConnected}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                minHeight: '20px',
                cursor: isConnected ? 'text' : 'not-allowed',
              }}
            />
          </div>
        ) : (
          <input
            type="text"
            className="chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            style={{
              flex: '0 1 auto',
              width: 'calc(100% - 35px)',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '2px solid rgba(148, 163, 184, 0.5)',
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
              minHeight: '20px',
              maxHeight: '30px',
              cursor: isConnected ? 'text' : 'not-allowed',
              marginRight: '10px',
            }}
          />
        )}
        <button
          onClick={sendMessage}
          disabled={!isConnected || !inputValue.trim()}
          style={{
            padding: position === 'inline' ? '6px 12px' : '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: isConnected && inputValue.trim() ? 'rgba(96, 165, 250, 0.8)' : 'rgba(148, 163, 184, 0.3)',
            color: '#f8fafc',
            fontSize: position === 'inline' ? '11px' : '13px',
            fontWeight: 600,
            cursor: isConnected && inputValue.trim() ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            height: position === 'inline' ? '32px' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: position === 'inline' ? '-5px' : '0',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

