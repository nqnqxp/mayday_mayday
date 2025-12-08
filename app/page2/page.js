'use client'

import { useState, useEffect, useRef } from 'react'
import Scene, { GizmoModeContext } from '@/components/Scene'
import RoomConnector from '@/components/RoomConnector'
import ChatConnection from '@/components/ChatConnection'
import USMap from '@/components/USMap'
import Cockpit from '@/components/Cockpit'
import { Realtime } from 'ably'

export default function Page2() {
  const [sessionReady, setSessionReady] = useState(false)
  const [checkedItems, setCheckedItems] = useState({})
  const [roomCode, setRoomCode] = useState('')
  const [countdown, setCountdown] = useState(null)
  const countdownStartedRef = useRef(false)
  const [smokeAffectedEngines, setSmokeAffectedEngines] = useState([]) // ['engine1', 'engine2'] or both
  const [vibrationAffectedEngines, setVibrationAffectedEngines] = useState([]) // ['engine1', 'engine2'] or both
  const [turnedOffEngines, setTurnedOffEngines] = useState([]) // Engines that are turned off
  const [originalSmokeAffected, setOriginalSmokeAffected] = useState([]) // Store original smoke affected engines
  const [originalVibrationAffected, setOriginalVibrationAffected] = useState([]) // Store original vibration affected engines
  const [hasEverHadSmoke, setHasEverHadSmoke] = useState(false) // Track if smoke was ever applied to any engine
  const [hasEverHadEffects, setHasEverHadEffects] = useState(false) // Track if any effects (smoke or vibration) were ever applied
  const [latitude, setLatitude] = useState(null) // Current latitude
  const [longitude, setLongitude] = useState(null) // Current longitude
  const [heading, setHeading] = useState(null) // Current heading in degrees (0-360)
  const [speed, setSpeed] = useState(null) // Speed in knots
  const [flightId, setFlightId] = useState('') // Flight ID number
  const [flightPath, setFlightPath] = useState([]) // Flight path history
  const flightDataClientRef = useRef(null)
  const flightDataChannelRef = useRef(null)
  const smokeAffectedEnginesRef = useRef(smokeAffectedEngines)
  const vibrationAffectedEnginesRef = useRef(vibrationAffectedEngines)
  const hasEverHadEffectsRef = useRef(hasEverHadEffects)
  const coordinateIntervalRef = useRef(null)
  const latitudeRef = useRef(null)
  const longitudeRef = useRef(null)
  const headingRef = useRef(null)
  const speedRef = useRef(null)
  const [gizmoMode, setGizmoMode] = useState(false)
  const [isCloseUp, setIsCloseUp] = useState(false)
  const [shaderEnabled, setShaderEnabled] = useState(true)
  const [hoveredButton, setHoveredButton] = useState(null) // 'button20', 'button21', 'monitorscreen02', 'monitorscreen06', 'monitorscreen02-exit', or null
  const [closeUpMonitor, setCloseUpMonitor] = useState(null) // 'monitorscreen06', 'monitorscreen02', or null
  const exitCommsRef = useRef(null) // Ref to store the exitComms function from Cockpit
  const exitNavigationRef = useRef(null) // Ref to store the exitNavigation function from Cockpit
  const [notesCollapsed, setNotesCollapsed] = useState(false) // For collapsing notes

  // Format coordinates for display
  const formatCoordinates = (lat, lon) => {
    const latDir = lat >= 0 ? 'N' : 'S'
    const lonDir = lon >= 0 ? 'E' : 'W'
    const latAbs = Math.abs(lat)
    const lonAbs = Math.abs(lon)
    
    // Convert to degrees, minutes, seconds
    const latDeg = Math.floor(latAbs)
    const latMin = Math.floor((latAbs - latDeg) * 60)
    const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(2)
    
    const lonDeg = Math.floor(lonAbs)
    const lonMin = Math.floor((lonAbs - lonDeg) * 60)
    const lonSec = ((lonAbs - lonDeg - lonMin / 60) * 3600).toFixed(2)
    
    return `${latDeg}°${latMin}'${latSec}" ${latDir}, ${lonDeg}°${lonMin}'${lonSec}" ${lonDir}`
  }

  // Keep refs in sync with state
  useEffect(() => {
    latitudeRef.current = latitude
  }, [latitude])

  useEffect(() => {
    longitudeRef.current = longitude
  }, [longitude])

  useEffect(() => {
    headingRef.current = heading
  }, [heading])

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  // Generate flight ID
  const generateFlightId = () => {
    // Common airline codes (2-3 letters)
    const airlineCodes = ['AA', 'UA', 'DL', 'WN', 'AS', 'B6', 'NK', 'F9', 'SY', 'G4']
    const airline = airlineCodes[Math.floor(Math.random() * airlineCodes.length)]
    // Flight number: 1000-9999
    const flightNumber = Math.floor(1000 + Math.random() * 9000)
    return `${airline}${flightNumber}`
  }

  // Initialize coordinates and flight ID when session starts
  useEffect(() => {
    if (sessionReady && latitude === null) {
      // Generate random flight ID
      const newFlightId = generateFlightId()
      setFlightId(newFlightId)
      
      // Generate random starting coordinates within the continental US
      // Latitude: 24.396308 to 49.384358 (continental US)
      // Longitude: -125.0 to -66.93457 (continental US)
      const startLat = 24.396308 + Math.random() * (49.384358 - 24.396308)
      const startLon = -125.0 + Math.random() * (-66.93457 - (-125.0))
      
      // Generate random heading (0-360 degrees)
      const randomHeading = Math.random() * 360
      
      // Generate random speed (450-500 knots, typical cruise speed for commercial jets)
      const randomSpeed = 450 + Math.random() * 50
      
      setLatitude(startLat)
      setLongitude(startLon)
      setHeading(randomHeading)
      setSpeed(randomSpeed)
      
      // Initialize flight path with starting position
      setFlightPath([{ lat: startLat, lon: startLon, timestamp: Date.now() }])
    } else if (!sessionReady) {
      // Reset coordinates and flight ID when session ends
      setLatitude(null)
      setLongitude(null)
      setHeading(null)
      setSpeed(null)
      setFlightId('')
      setFlightPath([])
      if (coordinateIntervalRef.current) {
        clearInterval(coordinateIntervalRef.current)
        coordinateIntervalRef.current = null
      }
    }
  }, [sessionReady, latitude])

  // Update coordinates based on heading and speed
  useEffect(() => {
    if (sessionReady && latitude !== null && longitude !== null && heading !== null && speed !== null) {
      // Update coordinates every second
      coordinateIntervalRef.current = setInterval(() => {
        const prevLat = latitudeRef.current
        const prevLon = longitudeRef.current
        const currentHeading = headingRef.current
        const currentSpeed = speedRef.current
        
        if (prevLat === null || prevLon === null || currentHeading === null || currentSpeed === null) {
          return
        }
        
        // Convert heading to radians
        const headingRad = (currentHeading * Math.PI) / 180
        
        // Calculate distance traveled in one second
        // 1 knot = 1 nautical mile per hour = 1852 meters per hour = 0.514 m/s
        // 1 degree of latitude ≈ 111 km = 111000 m
        // 1 degree of longitude ≈ 111 km * cos(latitude) = 111000 * cos(latitude) m
        const distanceMeters = currentSpeed * 0.514 // meters per second
        const latAdjustment = Math.cos((prevLat * Math.PI) / 180)
        
        // Calculate distance in degrees
        const distanceLatDegrees = distanceMeters / 111000 // degrees latitude
        const distanceLonDegrees = distanceMeters / (111000 * latAdjustment) // degrees longitude
        
        // Calculate new position using heading
        // Heading: 0° = North, 90° = East, 180° = South, 270° = West
        const northComponent = distanceLatDegrees * Math.cos(headingRad)
        const eastComponent = distanceLonDegrees * Math.sin(headingRad)
        
        const newLat = prevLat + northComponent
        const newLon = prevLon + eastComponent
        
        // Keep within reasonable US bounds (with some buffer)
        const boundedLat = Math.max(24, Math.min(50, newLat))
        const boundedLon = Math.max(-125, Math.min(-66, newLon))
        
        // Update state (refs will be updated by the sync useEffect)
        setLatitude(boundedLat)
        setLongitude(boundedLon)
      }, 1000) // Update every second
      
      return () => {
        if (coordinateIntervalRef.current) {
          clearInterval(coordinateIntervalRef.current)
          coordinateIntervalRef.current = null
        }
      }
    }
  }, [sessionReady, latitude, longitude, heading, speed])

  // Set up Ably channel for flight data broadcasting
  useEffect(() => {
    if (!sessionReady || !roomCode || !flightId) return

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

        // Attach channel
        if (channel.state !== 'attached' && channel.state !== 'attaching') {
          await channel.attach()
        }
      } catch (error) {
        console.error('Failed to set up flight data channel', error)
      }
    }

    setupFlightDataChannel()

    return () => {
      isMounted = false
      if (flightDataChannelRef.current) {
        try {
          flightDataChannelRef.current.detach().catch(() => {})
        } catch (e) {}
        flightDataChannelRef.current = null
      }
    }
  }, [sessionReady, roomCode, flightId])

  // Publish flight data when coordinates update - publish every time coordinates change
  useEffect(() => {
    if (flightDataChannelRef.current && latitude !== null && longitude !== null && heading !== null && speed !== null && flightId) {
      const channel = flightDataChannelRef.current
      
      // Only publish if channel is attached
      if (channel.state === 'attached') {
        // Publish flight data immediately when coordinates change
        channel.publish('flight-update', {
          flightId,
          latitude,
          longitude,
          heading,
          speed,
          timestamp: Date.now(),
        }).catch(err => console.error('Failed to publish flight data', err))
        
        // Add to flight path (keep last 100 points, add point every 5 seconds to avoid too many points)
        setFlightPath((prev) => {
          const now = Date.now()
          const lastPoint = prev[prev.length - 1]
          // Only add point if last point is more than 5 seconds old, or if this is the first point
          if (!lastPoint || (now - lastPoint.timestamp) > 5000) {
            const newPath = [...prev, { lat: latitude, lon: longitude, timestamp: now }]
            return newPath.slice(-100) // Keep last 100 points
          }
          return prev
        })
      }
    }
  }, [latitude, longitude, heading, speed, flightId])

  // Start countdown when session becomes ready
  useEffect(() => {
    if (sessionReady && !countdownStartedRef.current) {
      countdownStartedRef.current = true
      setCountdown(8)
      
      const timeout = setTimeout(() => {
        // Countdown finished - check ENG in note 2
        const engItemKey = `Cockpit Warning System-1` // ENG is at index 1
        
        // Randomly check items in note 5 (Sensory cues)
        // Each item has a 50% chance of being checked independently
        const note5Items = ['Presence of Smoke', 'Vibration']
        const itemsToCheck = note5Items
          .map((item, index) => ({ item, index, shouldCheck: Math.random() < 0.5 }))
          .filter(({ shouldCheck }) => shouldCheck)
        
        setCheckedItems((prev) => {
          const updated = { ...prev }
          
          // Check ENG if not already checked
          if (!updated[engItemKey]) {
            updated[engItemKey] = true
          }
          
          // Check randomly selected items in note 5
          itemsToCheck.forEach(({ index }) => {
            const itemKey = `Sensory cues-${index}`
            if (!updated[itemKey]) {
              updated[itemKey] = true
            }
          })
          
          return updated
        })
        
        // Check if smoke is checked and randomly affect engines
        const smokeChecked = itemsToCheck.some(({ item }) => item === 'Presence of Smoke')
        if (smokeChecked) {
          const affectedEngines = []
          if (Math.random() < 0.5) affectedEngines.push('engine1')
          if (Math.random() < 0.5) affectedEngines.push('engine2')
          // If neither was selected, randomly pick one
          if (affectedEngines.length === 0) {
            affectedEngines.push(Math.random() < 0.5 ? 'engine1' : 'engine2')
          }
          setSmokeAffectedEngines(affectedEngines)
          setOriginalSmokeAffected(affectedEngines) // Store original state
          setHasEverHadSmoke(true) // Mark that smoke was ever applied
          setHasEverHadEffects(true) // Mark that effects were ever applied
        }
        
        // Check if vibration is checked and randomly affect engines
        const vibrationChecked = itemsToCheck.some(({ item }) => item === 'Vibration')
        if (vibrationChecked) {
          const affectedEngines = []
          if (Math.random() < 0.5) affectedEngines.push('engine1')
          if (Math.random() < 0.5) affectedEngines.push('engine2')
          // If neither was selected, randomly pick one
          if (affectedEngines.length === 0) {
            affectedEngines.push(Math.random() < 0.5 ? 'engine1' : 'engine2')
          }
          setVibrationAffectedEngines(affectedEngines)
          setOriginalVibrationAffected(affectedEngines) // Store original state
          setHasEverHadEffects(true) // Mark that effects were ever applied
        }
        
        setCountdown(null)
      }, 8000)
      
      return () => {
        clearTimeout(timeout)
      }
    } else if (!sessionReady) {
      // Reset countdown when session is not ready
      countdownStartedRef.current = false
      setCountdown(null)
      setSmokeAffectedEngines([])
      setVibrationAffectedEngines([])
      setTurnedOffEngines([])
      setOriginalSmokeAffected([])
      setOriginalVibrationAffected([])
      setHasEverHadSmoke(false) // Reset smoke history when session resets
      setHasEverHadEffects(false) // Reset effects history when session resets
    }
  }, [sessionReady])

  // Keep refs in sync with state
  useEffect(() => {
    smokeAffectedEnginesRef.current = smokeAffectedEngines
  }, [smokeAffectedEngines])

  useEffect(() => {
    vibrationAffectedEnginesRef.current = vibrationAffectedEngines
  }, [vibrationAffectedEngines])

  useEffect(() => {
    hasEverHadEffectsRef.current = hasEverHadEffects
  }, [hasEverHadEffects])

  // Sync note 5 checkboxes (smoke/vibration) with actual engine states
  // But also allow checkbox to control smoke (bidirectional sync)
  useEffect(() => {
    const hasSmoke = smokeAffectedEngines.length > 0
    const hasVibration = vibrationAffectedEngines.length > 0

    setCheckedItems((prevItems) => {
      const updatedItems = { ...prevItems }
      
      // Update smoke checkbox based on actual engine state
      // Only check if smoke is currently active (engines are on and producing smoke)
      if (hasSmoke) {
        // If smoke is active, ensure checkbox is checked
        updatedItems['Sensory cues-0'] = true // Presence of Smoke
      } else {
        // If smoke is not active (engines are off), uncheck the checkbox
        // This prevents smoke from reappearing when engines are off
        delete updatedItems['Sensory cues-0']
      }
      
      // Update vibration checkbox based on actual engine state
      if (hasVibration) {
        updatedItems['Sensory cues-1'] = true // Vibration
      } else {
        delete updatedItems['Sensory cues-1']
      }
      
      return updatedItems
    })
  }, [smokeAffectedEngines, vibrationAffectedEngines, originalSmokeAffected, turnedOffEngines])

  // Sync note 2 ENG checkbox with engine states
  useEffect(() => {
    const allEngines = ['engine1', 'engine2']
    const enginesWithSmoke = allEngines.filter((e) => smokeAffectedEngines.includes(e))
    const enginesWithVibration = allEngines.filter((e) => vibrationAffectedEngines.includes(e))
    
    // ENG should NEVER uncheck if smoke was ever applied (even if all engines are off)
    // ENG should never uncheck if smoke is currently applied to any engine
    // If only vibration is applied, only uncheck if vibration is not applied anymore
    // So: uncheck ENG only if smoke was never applied AND no engines have smoke AND no engines have vibration
    setCheckedItems((prevItems) => {
      const updatedItems = { ...prevItems }
      if (hasEverHadSmoke || enginesWithSmoke.length > 0 || enginesWithVibration.length > 0) {
        updatedItems['Cockpit Warning System-1'] = true // Ensure ENG is checked if smoke was ever applied or any effects exist
      } else {
        delete updatedItems['Cockpit Warning System-1'] // ENG is at index 1
      }
      return updatedItems
    })
  }, [smokeAffectedEngines, vibrationAffectedEngines, hasEverHadSmoke])

  // Randomly select note 5 effects every 3 seconds if ENG is checked but no effects were ever applied
  useEffect(() => {
    const engChecked = checkedItems['Cockpit Warning System-1'] // ENG is at index 1
    const hasSmoke = smokeAffectedEngines.length > 0
    const hasVibration = vibrationAffectedEngines.length > 0
    const hasAnyEffects = hasSmoke || hasVibration

    // If ENG is checked but no effects were ever applied, randomly select effects every 3 seconds
    // Once effects are applied (even if removed later), stop random selection
    // Also check that at least one engine is on (don't trigger effects if all engines are off)
    const allEngines = ['engine1', 'engine2']
    const allEnginesOff = allEngines.every(e => turnedOffEngines.includes(e))
    const atLeastOneEngineOn = !allEnginesOff
    
    if (engChecked && !hasEverHadEffects && !hasAnyEffects && sessionReady && atLeastOneEngineOn) {
      const interval = setInterval(() => {
        // Check if effects were ever applied (using ref to get latest value)
        if (hasEverHadEffectsRef.current) {
          return // Stop if effects were ever applied
        }
        
        // Check current engine states using refs (to get latest values)
        const currentHasSmoke = smokeAffectedEnginesRef.current.length > 0
        const currentHasVibration = vibrationAffectedEnginesRef.current.length > 0
        
        // If effects were applied elsewhere, stop the interval
        if (currentHasSmoke || currentHasVibration) {
          return
        }
        
        // Don't add effects if all engines are turned off
        // Check turnedOffEngines by checking if smoke/vibration arrays are empty
        // and if we have any turned off engines, don't add new effects
        // (This is a safeguard - the outer condition already checks atLeastOneEngineOn)

        // Randomly check items in note 5
        const note5Items = ['Presence of Smoke', 'Vibration']
        const itemsToCheck = note5Items
          .map((item, index) => ({ item, index, shouldCheck: Math.random() < 0.5 }))
          .filter(({ shouldCheck }) => shouldCheck)

        // If nothing was selected, randomly pick one
        if (itemsToCheck.length === 0) {
          const randomIndex = Math.floor(Math.random() * note5Items.length)
          itemsToCheck.push({ item: note5Items[randomIndex], index: randomIndex, shouldCheck: true })
        }

        // Apply effects to engines based on what was selected
        const smokeChecked = itemsToCheck.some(({ item }) => item === 'Presence of Smoke')
        const vibrationChecked = itemsToCheck.some(({ item }) => item === 'Vibration')

        if (smokeChecked) {
          const affectedEngines = []
          if (Math.random() < 0.5) affectedEngines.push('engine1')
          if (Math.random() < 0.5) affectedEngines.push('engine2')
          if (affectedEngines.length === 0) {
            affectedEngines.push(Math.random() < 0.5 ? 'engine1' : 'engine2')
          }
          setSmokeAffectedEngines(affectedEngines)
          setOriginalSmokeAffected(affectedEngines)
          setHasEverHadSmoke(true) // Mark that smoke was ever applied
          setHasEverHadEffects(true) // Mark that effects were ever applied
          // Checkboxes will be synced by the sync useEffect
        }

        if (vibrationChecked) {
          const affectedEngines = []
          if (Math.random() < 0.5) affectedEngines.push('engine1')
          if (Math.random() < 0.5) affectedEngines.push('engine2')
          if (affectedEngines.length === 0) {
            affectedEngines.push(Math.random() < 0.5 ? 'engine1' : 'engine2')
          }
          setVibrationAffectedEngines(affectedEngines)
          setOriginalVibrationAffected(affectedEngines)
          setHasEverHadEffects(true) // Mark that effects were ever applied
          // Checkboxes will be synced by the sync useEffect
        }
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [checkedItems, smokeAffectedEngines, vibrationAffectedEngines, sessionReady, hasEverHadEffects, turnedOffEngines])

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
            display: notesCollapsed ? 'none' : 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: '16px',
            padding: '64px 24px 20px',
            minHeight: '32vh',
            background: 'transparent',
            position: 'relative',
            zIndex: 2,
          }}
        >
                 {[
                   { title: 'Flight Instruments', text: 'Altimeter\nAirspeed Indicator\nHeading Indicator\nAttitude Indicator\nTurn Coordinator\nVertical Speed Indicator', hasCheckboxes: false },
                   { title: 'Cockpit Warning System', text: 'ANTI ICE\nENG\nHYD\nOVERHEAD\nDOORS\nAIR COND', hasCheckboxes: true },
                   { title: 'Engine Instruments', text: 'Tachometers\nTemperature Gauges\nFuel Quantity\nOil Quantity\nEngine pressure gauges', hasCheckboxes: false },
                   { 
                     title: 'Navigation Instruments', 
                     text: latitude !== null && longitude !== null 
                       ? `Compass\nRadio location Device\nGPS Location Device\n\nPosition: ${formatCoordinates(latitude, longitude)}\nHeading: ${Math.round(heading)}°\nSpeed: ${Math.round(speed)} kts`
                       : 'Compass\nRadio location Device\nGPS Location Device', 
                     hasCheckboxes: false 
                   },
                   { title: 'Sensory cues', text: 'Presence of Smoke\nVibration', hasCheckboxes: true },
                 ].map((note) => (
            <div
              key={note.title}
              style={{
                background: '#1f2937',
                color: '#f8fafc',
                padding: '18px 16px',
                borderRadius: '14px',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.2)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  fontSize: '16px',
                  textTransform: 'uppercase',
                  opacity: 1,
                  flexShrink: 0,
                }}
              >
                {note.title}
              </span>
              {note.hasCheckboxes ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {note.text.split('\n').map((item, index) => {
                    const itemKey = `${note.title}-${index}`
                    const isChecked = checkedItems[itemKey] || false
                    return (
                      <label
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          cursor: 'default',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled
                          readOnly
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'not-allowed',
                            accentColor: '#60a5fa',
                            opacity: 0.7,
                          }}
                        />
                        <span style={{ flex: 1 }}>{item}</span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{note.text}</p>
              )}
            </div>
          ))}
        </header>
      )}

      {/* Scene positioned absolutely to cover full viewport */}
      {sessionReady && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
          <GizmoModeContext.Provider value={{ gizmoMode, setGizmoMode, isCloseUp, setIsCloseUp }}>
            <Scene
              cameraProps={{
                position: [0, 0.85, 2.1],
                fov: 38,
              }}
              controlsProps={{
              enablePan: false,
              enableZoom: false,
              minDistance: 2.1,
              maxDistance: 2.1,
              target: [0, 0.9, -0.35],
            }}
            enablePointerEvents={true}
            enableShader={shaderEnabled}
            smokeAffectedEngines={smokeAffectedEngines}
            turnedOffEngines={turnedOffEngines}
          >
            <Cockpit 
              position={[0, 1, 1.2]}
              rotation={[0, -Math.PI, 0]}
              scale={0.75}
              onButtonHover={setHoveredButton}
              vibrationAffectedEngines={vibrationAffectedEngines}
              smokeAffectedEngines={smokeAffectedEngines}
              onCloseUpMonitorChange={setCloseUpMonitor}
              onExitComms={(exitFn) => { exitCommsRef.current = exitFn }}
              onExitNavigation={(exitFn) => { exitNavigationRef.current = exitFn }}
              chatComponent={sessionReady && roomCode ? (
                <ChatConnection roomCode={roomCode} pageId="Page 2" position="inline" />
              ) : null}
              navigationData={{
                latitude,
                longitude,
                heading,
                speed
              }}
              formatCoordinates={formatCoordinates}
              checkedItems={checkedItems}
            />
          </Scene>
          </GizmoModeContext.Provider>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
        <RoomConnector
          pageId="Page 2"
          onSessionReady={(state) => {
            setSessionReady(Boolean(state?.started))
            if (state?.roomCode) {
              setRoomCode(state.roomCode)
            }
          }}
        />
        {/* Chat is now only displayed on monitorscreen02 as a texture, never as UI */}
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
        Pilot
      </div>

      {sessionReady && flightId && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            zIndex: 1000,
            color: '#0f172a',
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '0.1em',
          }}
        >
          {flightId}
        </div>
      )}

      {/* Debug buttons */}
      {sessionReady && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            display: 'flex',
            gap: '12px',
          }}
        >
          {/* Notes collapse button */}
          <button
            onClick={() => setNotesCollapsed(!notesCollapsed)}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: '2px solid #0f172a',
              background: notesCollapsed ? '#0f172a' : '#ffffff',
              color: notesCollapsed ? '#ffffff' : '#0f172a',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            {notesCollapsed ? 'Notes: Hidden' : 'Notes: Shown'}
          </button>
          {/* Shader toggle button */}
          <button
            onClick={() => setShaderEnabled(!shaderEnabled)}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: '2px solid #0f172a',
              background: shaderEnabled ? '#0f172a' : '#ffffff',
              color: shaderEnabled ? '#ffffff' : '#0f172a',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            {shaderEnabled ? 'Shader: ON' : 'Shader: OFF'}
          </button>
        </div>
      )}

      {/* Button hover text display */}
      {sessionReady && hoveredButton && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            pointerEvents: 'none',
          }}
        >
          {hoveredButton === 'button20' ? 'Engine 1' : 
           hoveredButton === 'button21' ? 'Engine 2' : 
           hoveredButton === 'monitorscreen02' ? 'Communication' : 
           hoveredButton === 'monitorscreen06' ? 'Navigation Instruments' :
           hoveredButton === 'button18' ? 'ANTI ICE' :
           hoveredButton === 'button27' ? 'ENG' :
           hoveredButton === 'button28' ? 'ANTI ICE' :
           hoveredButton === 'butotn28' ? 'HYD' :
           hoveredButton === 'button31' ? 'OVERHEAD' :
           hoveredButton === 'button32' ? 'DOORS' :
           hoveredButton === 'button29' ? 'AIR COND' : ''}
        </div>
      )}

      {/* Exit comms button when in close-up for monitorscreen02 */}
      {sessionReady && isCloseUp && closeUpMonitor === 'monitorscreen02' && (
        <button
          onClick={() => {
            if (exitCommsRef.current) {
              exitCommsRef.current()
            }
          }}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(15, 23, 42, 1)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
          }}
        >
          Exit Comms
        </button>
      )}

      {/* Exit navigation button when in close-up for monitorscreen06 */}
      {sessionReady && isCloseUp && closeUpMonitor === 'monitorscreen06' && (
        <button
          onClick={() => {
            if (exitNavigationRef.current) {
              exitNavigationRef.current()
            }
          }}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(15, 23, 42, 1)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
          }}
        >
          Exit Navigation
        </button>
      )}

      {/* Engine buttons - only show after session is ready */}
      {sessionReady && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {['engine1', 'engine2'].map((engine) => {
            const isTurnedOff = turnedOffEngines.includes(engine)
            const isSmokeAffected = !isTurnedOff && smokeAffectedEngines.includes(engine)
            const isVibrationAffected = !isTurnedOff && vibrationAffectedEngines.includes(engine)
            const isAffected = isSmokeAffected || isVibrationAffected
            const engineNumber = engine === 'engine1' ? '1' : '2'
            
            // Determine color based on effect type
            let buttonColor = '#000000' // Default black for unaffected
            if (isSmokeAffected && !isVibrationAffected) {
              buttonColor = '#000000' // Start with black, will pulse to light grey
            } else if (isVibrationAffected) {
              buttonColor = '#000000' // Black for vibration (with or without smoke)
            }
            
            // Combine animations if both smoke and vibration are present (only if not turned off)
            const animations = []
            if (isVibrationAffected) animations.push('shake 0.1s infinite')
            if (isSmokeAffected) animations.push('smokePulse 1.5s ease-in-out infinite')
            
            const handleEngineClick = () => {
              if (isTurnedOff) {
                // Turning engine back on
                setTurnedOffEngines((prev) => prev.filter((e) => e !== engine))
                
                // Restore effects based on original state
                const wasSmokeAffected = originalSmokeAffected.includes(engine)
                const wasVibrationAffected = originalVibrationAffected.includes(engine)
                
                // If smoke was the original effect, always restore it when engine is turned back on
                // (checkbox will be checked automatically by the sync logic)
                if (wasSmokeAffected) {
                  setSmokeAffectedEngines((prev) => {
                    if (!prev.includes(engine)) {
                      return [...prev, engine]
                    }
                    return prev
                  })
                  // Note: hasEverHadSmoke is already true, so ENG will stay checked
                }
                
                // If vibration was the original effect, randomly decide whether to restore it (50/50 chance)
                if (wasVibrationAffected) {
                  if (Math.random() < 0.5) {
                    // Restore vibration
                    setVibrationAffectedEngines((prev) => {
                      if (!prev.includes(engine)) {
                        return [...prev, engine]
                      }
                      return prev
                    })
                  } else {
                    // Remove vibration permanently
                    setVibrationAffectedEngines((prev) => prev.filter((e) => e !== engine))
                    setOriginalVibrationAffected((prevOrig) => prevOrig.filter((e) => e !== engine))
                  }
                }
              } else {
                // Turning engine off
                setTurnedOffEngines((prev) => [...prev, engine])
                
                // Check if this engine had smoke before removing it
                const hadSmoke = smokeAffectedEngines.includes(engine)
                
                // Check if this engine had vibration before removing it
                const hadVibration = vibrationAffectedEngines.includes(engine)
                
                // Remove smoke from active list - this will trigger fade-out in Smoke component
                setSmokeAffectedEngines((prev) => prev.filter((e) => e !== engine))
                
                // Remove vibration immediately
                setVibrationAffectedEngines((prev) => prev.filter((e) => e !== engine))
              }
            }
            
            return (
              <button
                key={engine}
                onClick={handleEngineClick}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '2px solid #0f172a',
                  background: '#ffffff',
                  color: buttonColor,
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  position: 'relative',
                  animation: animations.join(', ') || 'none',
                  transition: 'color 0.3s',
                  textDecoration: isTurnedOff ? 'line-through' : 'none',
                }}
              >
                Engine {engineNumber}
              </button>
            )
          })}
        </div>
      )}

      {/* Shake animation for vibration and pulse animation for smoke */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shake {
            0%, 100% { transform: translateY(0); }
            25% { transform: translateY(-2px); }
            75% { transform: translateY(2px); }
          }
          @keyframes smokePulse {
            0%, 100% { color: #000000; }
            50% { color: #d1d5db; }
          }
        `
      }} />
    </main>
  )
}
