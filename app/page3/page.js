'use client'

import { useState, useEffect, useRef } from 'react'
import Scene from '@/components/Scene'
import RoomConnector from '@/components/RoomConnector'
import ChatConnection from '@/components/ChatConnection'
import USMap from '@/components/USMap'
import { Realtime } from 'ably'

// Inject scrollbar styles for note 5
if (typeof document !== 'undefined') {
  const styleId = 'note5-scrollbar-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .note5-content::-webkit-scrollbar {
        width: 8px;
      }
      .note5-content::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.3);
        border-radius: 4px;
      }
      .note5-content::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.5);
        border-radius: 4px;
      }
      .note5-content::-webkit-scrollbar-thumb:hover {
        background: rgba(148, 163, 184, 0.7);
      }
    `
    document.head.appendChild(style)
  }
}

export default function Page3() {
  const [sessionReady, setSessionReady] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [chatConnected, setChatConnected] = useState(false)
  const [note5Heading, setNote5Heading] = useState('')
  const [note5Description, setNote5Description] = useState('')
  const [flightNumberInput, setFlightNumberInput] = useState('')
  const [trackedFlightId, setTrackedFlightId] = useState('')
  const [flightData, setFlightData] = useState(null) // { latitude, longitude, heading, speed }
  const [flightPath, setFlightPath] = useState([])
  const [showNoFlightFound, setShowNoFlightFound] = useState(false)
  const flightDataClientRef = useRef(null)
  const flightDataChannelRef = useRef(null)
  const flightDataCheckTimeoutRef = useRef(null)
  const hasReceivedDataRef = useRef(false)
  const lastFlightUpdateRef = useRef(null)
  const trackedFlightIdRef = useRef('')

  // Handle flight number submission
  const handleFlightNumberSubmit = (flightNum) => {
    if (!flightNum || !flightNum.trim()) {
      setTrackedFlightId('')
      setFlightData(null)
      setFlightPath([])
      setShowNoFlightFound(false)
      hasReceivedDataRef.current = false
      lastFlightUpdateRef.current = null
      if (flightDataCheckTimeoutRef.current) {
        clearTimeout(flightDataCheckTimeoutRef.current)
        flightDataCheckTimeoutRef.current = null
      }
      return
    }

    const trimmedFlightNum = flightNum.trim().toUpperCase()
    // Update ref immediately so subscription handler can use it
    trackedFlightIdRef.current = trimmedFlightNum
    setTrackedFlightId(trimmedFlightNum)
    setFlightData(null)
    setFlightPath([])
    setShowNoFlightFound(false)
    hasReceivedDataRef.current = false
    lastFlightUpdateRef.current = Date.now()
    
    // Clear any existing timeout
    if (flightDataCheckTimeoutRef.current) {
      clearTimeout(flightDataCheckTimeoutRef.current)
    }
    
    // Check immediately if data has already been received
    // Give a very short delay (100ms) to allow any in-transit messages to arrive
    flightDataCheckTimeoutRef.current = setTimeout(() => {
      // Only show error if we still haven't received data and the flight ID matches
      if (!hasReceivedDataRef.current && trackedFlightIdRef.current === trimmedFlightNum) {
        setShowNoFlightFound(true)
      }
    }, 100)
  }

  // Set up Ably channel to listen for flight data
  useEffect(() => {
    if (!sessionReady || !roomCode) return

    let isMounted = true

    const setupFlightDataChannel = async () => {
      try {
        if (!flightDataClientRef.current) {
          const createId = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
              return crypto.randomUUID()
            }
            return `${Date.now()}-${Math.random().toString(16).slice(2)}`
          }

          const client = new Realtime({
            authUrl: `/api/ably-token?clientId=${encodeURIComponent(createId())}`,
            echoMessages: false,
            transports: ['web_socket'],
          })

          flightDataClientRef.current = client
        }

        const client = flightDataClientRef.current
        const channelName = `rooms:${roomCode.trim().toUpperCase()}:flight-data`
        const channel = client.channels.get(channelName)
        flightDataChannelRef.current = channel

        // Unsubscribe any existing subscriptions
        try {
          channel.unsubscribe('flight-update')
        } catch (e) {}

        // Attach channel
        if (channel.state !== 'attached' && channel.state !== 'attaching') {
          await channel.attach()
        }

        // Subscribe to flight updates - use ref to get current trackedFlightId
        const messageHandler = (message) => {
          if (!isMounted) return
          
          const data = message?.data
          if (!data || !data.flightId) return

          // Get current trackedFlightId from ref to avoid stale closure
          const currentTrackedId = trackedFlightIdRef.current

          // Only update if this matches the tracked flight ID (case-insensitive)
          if (currentTrackedId && data.flightId && data.flightId.toUpperCase() === currentTrackedId.toUpperCase()) {
            // Mark that we've received data immediately
            hasReceivedDataRef.current = true
            lastFlightUpdateRef.current = Date.now()
            
            // Clear the "no flight found" message and timeout immediately
            setShowNoFlightFound(false)
            if (flightDataCheckTimeoutRef.current) {
              clearTimeout(flightDataCheckTimeoutRef.current)
              flightDataCheckTimeoutRef.current = null
            }
            
            // Update flight data immediately - create new object to force React re-render
            // This ensures the map updates even if coordinates change slightly
            setFlightData((prev) => {
              // Always return new object to trigger re-render
              if (prev && 
                  prev.latitude === data.latitude && 
                  prev.longitude === data.longitude && 
                  prev.heading === data.heading) {
                // Even if values are the same, return new object to ensure update
                return {
                  latitude: data.latitude,
                  longitude: data.longitude,
                  heading: data.heading,
                  speed: data.speed,
                }
              }
              return {
                latitude: data.latitude,
                longitude: data.longitude,
                heading: data.heading,
                speed: data.speed,
              }
            })

            // Add to flight path - update more frequently for smoother trail
            setFlightPath((prev) => {
              const now = data.timestamp || Date.now()
              const lastPoint = prev[prev.length - 1]
              // Add point if it's significantly different from last point (at least 0.001 degrees apart)
              // This ensures smooth trail while avoiding too many duplicate points
              if (!lastPoint || 
                  Math.abs(lastPoint.lat - data.latitude) > 0.001 || 
                  Math.abs(lastPoint.lon - data.longitude) > 0.001) {
                const newPath = [...prev, { lat: data.latitude, lon: data.longitude, timestamp: now }]
                return newPath.slice(-200) // Keep last 200 points for smoother trail
              }
              return prev
            })
          }
        }
        
        channel.subscribe('flight-update', messageHandler)
        
        console.log('[Page 3] Subscribed to flight-update messages on channel:', channelName)
      } catch (error) {
        console.error('Failed to set up flight data channel', error)
      }
    }

    setupFlightDataChannel()

    return () => {
      isMounted = false
      if (flightDataChannelRef.current) {
        try {
          flightDataChannelRef.current.unsubscribe('flight-update')
          // Don't detach - keep channel attached so we can receive updates
          // flightDataChannelRef.current.detach().catch(() => {})
        } catch (e) {}
        // Don't null the ref - keep it for continuous updates
        // flightDataChannelRef.current = null
      }
    }
  }, [sessionReady, roomCode]) // Removed trackedFlightId dependency - subscription stays active

  // Reset flight data when tracked flight ID changes
  useEffect(() => {
    if (!trackedFlightId) {
      setFlightData(null)
      setFlightPath([])
      setShowNoFlightFound(false)
      hasReceivedDataRef.current = false
      lastFlightUpdateRef.current = null
      if (flightDataCheckTimeoutRef.current) {
        clearTimeout(flightDataCheckTimeoutRef.current)
        flightDataCheckTimeoutRef.current = null
      }
    }
  }, [trackedFlightId])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (flightDataCheckTimeoutRef.current) {
        clearTimeout(flightDataCheckTimeoutRef.current)
      }
    }
  }, [])

  return (
    <main
      style={{
        margin: 0,
        padding: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        color: '#0f172a',
      }}
    >
      {sessionReady && (
        <header
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr repeat(4, 1fr)',
            gridTemplateRows: '1fr',
            gap: '16px',
            padding: '64px 24px 20px',
            minHeight: '60vh',
            background: 'linear-gradient(180deg, rgba(241, 245, 249, 1) 0%, rgba(226, 232, 240, 0.85) 100%)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 12px 30px rgba(148, 163, 184, 0.25)',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 100,
          }}
        >
                 {[
                   { title: 'Navigation Aids', isFlightTracker: true },
                   { title: 'Radars', text: 'Primary Surveillance Radar\nSecondary Surveillance Radar' },
                   { title: 'Communication Systems', isChat: true },
                   { title: 'Emergency protocols', text: 'ANTI ICE\nENG\nHYD\nOVERHEAD\nDOORS\nAIR COND', isClickable: true },
                   { title: note5Heading, text: note5Description },
                 ].map((note, index) => (
            <div
              key={note.title}
              className={index === 4 ? 'note5-container' : ''}
              style={{
                background: '#1f2937',
                color: '#f8fafc',
                padding: '18px 16px',
                borderRadius: '14px',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.2)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: note.isChat ? '0' : '12px',
                position: 'relative',
                overflow: note.isChat ? 'visible' : (index === 4 ? 'hidden' : 'hidden'),
                zIndex: note.isChat ? 101 : 'auto',
                pointerEvents: 'auto',
                height: '100%',
                minHeight: index === 0 ? '550px' : 'auto',
              }}
            >
              {note.isChat ? (
                <>
                  <div
                    style={{
                      padding: 0,
                      marginTop: '-18px',
                      marginLeft: '-16px',
                      marginRight: '-16px',
                      paddingTop: '20px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        fontSize: '16px',
                        textTransform: 'uppercase',
                        opacity: 1,
                      }}
                    >
                      {note.title}
                    </span>
                    {roomCode && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '10px',
                          color: chatConnected ? '#34c759' : '#ff453a',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: chatConnected ? '#34c759' : '#ff453a',
                          }}
                        />
                        {chatConnected ? 'Connected' : 'Disconnected'}
                      </div>
                    )}
                  </div>
                  {roomCode && (
                    <div style={{ flex: 1, minHeight: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '-18px', paddingBottom: '20px' }}>
                      <ChatConnection
                        roomCode={roomCode}
                        pageId="Page 3"
                        position="inline"
                        onConnectionChange={setChatConnected}
                      />
                    </div>
                  )}
                </>
                     ) : note.isFlightTracker ? (
                       <>
                         <span
                           style={{
                             fontWeight: 700,
                             letterSpacing: '0.08em',
                             fontSize: '16px',
                             textTransform: 'uppercase',
                             opacity: 1,
                             margin: 0,
                             flexShrink: 0,
                           }}
                         >
                           {note.title}
                         </span>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                             <input
                               type="text"
                               value={flightNumberInput}
                               onChange={(e) => setFlightNumberInput(e.target.value.toUpperCase())}
                               onKeyPress={(e) => {
                                 if (e.key === 'Enter') {
                                   handleFlightNumberSubmit(flightNumberInput)
                                 }
                               }}
                               placeholder="Enter flight number..."
                               style={{
                                 padding: '8px 12px',
                                 borderRadius: '6px',
                                 border: '2px solid rgba(148, 163, 184, 0.3)',
                                 background: 'rgba(30, 41, 59, 0.9)',
                                 color: '#f8fafc',
                                 fontSize: '13px',
                                 outline: 'none',
                               }}
                             />
                             <button
                               onClick={() => handleFlightNumberSubmit(flightNumberInput)}
                               style={{
                                 padding: '8px 12px',
                                 borderRadius: '6px',
                                 border: 'none',
                                 background: 'rgba(96, 165, 250, 0.8)',
                                 color: '#f8fafc',
                                 fontSize: '13px',
                                 fontWeight: 600,
                                 cursor: 'pointer',
                               }}
                             >
                               Track Flight
                             </button>
                           </div>
                           {trackedFlightId && flightData && (
                             <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                               <USMap
                                 latitude={flightData.latitude}
                                 longitude={flightData.longitude}
                                 heading={flightData.heading}
                                 flightId={trackedFlightId}
                                 flightPath={flightPath}
                                 showCoordinates={false}
                               />
                             </div>
                           )}
                           {trackedFlightId && showNoFlightFound && !flightData && (
                             <div style={{ color: '#ef4444', fontSize: '13px', padding: '8px', textAlign: 'center' }}>
                               No matching flight found
                             </div>
                           )}
                         </div>
                       </>
                     ) : note.isClickable ? (
                       <>
                         <span
                           style={{
                             fontWeight: 700,
                             letterSpacing: '0.08em',
                             fontSize: '16px',
                             textTransform: 'uppercase',
                             opacity: 1,
                             margin: 0,
                           }}
                         >
                           {note.title}
                         </span>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                           {note.text.split('\n').map((item, itemIndex) => (
                             <span
                               key={itemIndex}
                               onClick={() => {
                                 setNote5Heading(item)
                                 // Set description based on clicked item
                                 if (item === 'ENG') {
                                   setNote5Description('In the event of smoke, check which one is affected, and shut down the affected engine\n\nIn the event of vibration, check which one is affected, and restart the affected engine\n\nIf both engines are smoking, turn them both off. The Aircraft can still fly 60 miles, but may not gain altitude. Confirm location and altitude. Guide pilot to a water landing if nearest open runway is more than 60 miles away. Guide pilot to nearest runway if it is less than 60 miles away.')
                                 } else {
                                   setNote5Description('')
                                 }
                               }}
                               style={{
                                 margin: 0,
                                 fontSize: '13px',
                                 lineHeight: 1.5,
                                 cursor: 'pointer',
                                 padding: '4px 8px',
                                 borderRadius: '4px',
                                 transition: 'background-color 0.2s',
                               }}
                               onMouseEnter={(e) => {
                                 e.target.style.backgroundColor = 'rgba(148, 163, 184, 0.2)'
                               }}
                               onMouseLeave={(e) => {
                                 e.target.style.backgroundColor = 'transparent'
                               }}
                             >
                               {item}
                             </span>
                           ))}
                         </div>
                       </>
                     ) : (
                       <>
                         {note.title && (
                           <span
                             style={{
                               fontWeight: 700,
                               letterSpacing: '0.08em',
                               fontSize: '16px',
                               textTransform: 'uppercase',
                               opacity: 1,
                               margin: 0,
                               flexShrink: 0,
                             }}
                           >
                             {note.title}
                           </span>
                         )}
                         {note.text && (
                           <div
                             className={index === 4 ? 'note5-content' : ''}
                             style={{ 
                               margin: 0, 
                               fontSize: '13px', 
                               lineHeight: 1.5, 
                               whiteSpace: 'pre-line',
                               overflowY: index === 4 ? 'auto' : 'visible',
                               overflowX: 'hidden',
                               flex: index === 4 ? '1 1 auto' : 'none',
                               minHeight: 0,
                               maxHeight: index === 4 ? '100%' : 'none',
                             }}
                           >
                             {note.text}
                           </div>
                         )}
                       </>
                     )}
            </div>
          ))}
        </header>
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        <RoomConnector
          pageId="Page 3"
          onSessionReady={(state) => {
            setSessionReady(Boolean(state?.started))
            if (state?.roomCode) {
              setRoomCode(state.roomCode)
            }
          }}
        />
      <Scene>
          {/* The controller page does not render the cockpit visuals */}
      </Scene>
      </div>

      <div
        style={{
        position: 'absolute',
          top: 24,
          left: 24,
        zIndex: 1000,
          color: '#0f172a',
          fontSize: '26px',
          fontWeight: 700,
          letterSpacing: '0.18em',
        textTransform: 'uppercase',
        }}
      >
        Air Traffic Controller
      </div>
    </main>
  )
}
