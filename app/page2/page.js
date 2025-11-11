'use client'

import { useState, useEffect, useRef } from 'react'
import Scene from '@/components/Scene'
import RoomConnector from '@/components/RoomConnector'
import ChatConnection from '@/components/ChatConnection'

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
  const smokeAffectedEnginesRef = useRef(smokeAffectedEngines)
  const vibrationAffectedEnginesRef = useRef(vibrationAffectedEngines)

  // Start countdown when session becomes ready
  useEffect(() => {
    if (sessionReady && !countdownStartedRef.current) {
      countdownStartedRef.current = true
      setCountdown(2)
      
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
        }
        
        setCountdown(null)
      }, 2000)
      
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
    }
  }, [sessionReady])

  // Keep refs in sync with state
  useEffect(() => {
    smokeAffectedEnginesRef.current = smokeAffectedEngines
  }, [smokeAffectedEngines])

  useEffect(() => {
    vibrationAffectedEnginesRef.current = vibrationAffectedEngines
  }, [vibrationAffectedEngines])

  // Sync note 5 checkboxes (smoke/vibration) with actual engine states
  useEffect(() => {
    const hasSmoke = smokeAffectedEngines.length > 0
    const hasVibration = vibrationAffectedEngines.length > 0

    setCheckedItems((prevItems) => {
      const updatedItems = { ...prevItems }
      
      // Update smoke checkbox based on actual engine state
      if (hasSmoke) {
        updatedItems['Sensory cues-0'] = true // Presence of Smoke
      } else {
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
  }, [smokeAffectedEngines, vibrationAffectedEngines])

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

  // Randomly select note 5 effects every 3 seconds if ENG is checked but no engines have effects
  useEffect(() => {
    const engChecked = checkedItems['Cockpit Warning System-1'] // ENG is at index 1
    const hasSmoke = smokeAffectedEngines.length > 0
    const hasVibration = vibrationAffectedEngines.length > 0
    const hasAnyEffects = hasSmoke || hasVibration

    // If ENG is checked but no engines have effects, randomly select effects every 3 seconds
    if (engChecked && !hasAnyEffects && sessionReady) {
      const interval = setInterval(() => {
        // Check current engine states using refs (to get latest values)
        const currentHasSmoke = smokeAffectedEnginesRef.current.length > 0
        const currentHasVibration = vibrationAffectedEnginesRef.current.length > 0
        
        // If effects were applied elsewhere, stop the interval
        if (currentHasSmoke || currentHasVibration) {
          return
        }

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
          // Checkboxes will be synced by the sync useEffect
        }
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [checkedItems, smokeAffectedEngines, vibrationAffectedEngines, sessionReady])

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
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: '16px',
            padding: '64px 24px 20px',
            minHeight: '32vh',
            background: 'linear-gradient(180deg, rgba(241, 245, 249, 1) 0%, rgba(226, 232, 240, 0.85) 100%)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 12px 30px rgba(148, 163, 184, 0.25)',
          }}
        >
          {[
            { title: 'Flight Instruments', text: 'Altimeter\nAirspeed Indicator\nHeading Indicator\nAttitude Indicator\nTurn Coordinator\nVertical Speed Indicator', hasCheckboxes: false },
            { title: 'Cockpit Warning System', text: 'ANTI ICE\nENG\nHYD\nOVERHEAD\nDOORS\nAIR COND', hasCheckboxes: true },
            { title: 'Engine Instruments', text: 'Tachometers\nTemperature Gauges\nFuel Quantity\nOil Quantity\nEngine pressure gauges', hasCheckboxes: false },
            { title: 'Navigation Instruments', text: 'Compass\nRadio location Device\nGPS Location Device', hasCheckboxes: false },
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

      <div style={{ flex: 1, position: 'relative' }}>
        <RoomConnector
          pageId="Page 2"
          onSessionReady={(state) => {
            setSessionReady(Boolean(state?.started))
            if (state?.roomCode) {
              setRoomCode(state.roomCode)
            }
          }}
        />
              {sessionReady && roomCode && <ChatConnection roomCode={roomCode} pageId="Page 2" position="bottom-right" />}
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
        >
          {/* Visualization intentionally removed */}
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
        Pilot
      </div>

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
                
                // If smoke was the original effect, always restore it (smoke cannot be removed by restarting)
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
                
                // Remove all effects (checkboxes will be synced by useEffect)
                setSmokeAffectedEngines((prev) => prev.filter((e) => e !== engine))
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
