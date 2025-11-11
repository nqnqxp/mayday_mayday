'use client'

import { useState } from 'react'
import Scene from '@/components/Scene'
import RoomConnector from '@/components/RoomConnector'
import ChatConnection from '@/components/ChatConnection'

export default function Page2() {
  const [sessionReady, setSessionReady] = useState(false)
  const [checkedItems, setCheckedItems] = useState({})
  const [roomCode, setRoomCode] = useState('')

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
    </main>
  )
}
