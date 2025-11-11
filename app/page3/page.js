'use client'

import { useState } from 'react'
import Scene from '@/components/Scene'
import RoomConnector from '@/components/RoomConnector'
import ChatConnection from '@/components/ChatConnection'

export default function Page3() {
  const [sessionReady, setSessionReady] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [chatConnected, setChatConnected] = useState(false)

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
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 100,
          }}
        >
          {[
            { title: 'Radars', text: 'Primary Surveillance Radar\nSecondary Surveillance Radar' },
            { title: 'Communication Systems', isChat: true },
            { title: 'Navigation Aids', text: 'VOR\nILS\nGPS' },
            { title: 'Surveillance Systems', text: 'ADS-B (Satellite Data)' },
            { title: 'Software Platforms', text: 'Flight Planning\nConflict Detection\nWeather Monitor' },
          ].map((note, index) => (
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
                gap: note.isChat ? '0' : '12px',
                position: 'relative',
                overflow: note.isChat ? 'visible' : 'hidden',
                zIndex: note.isChat ? 101 : 'auto',
                pointerEvents: 'auto',
                height: '100%',
                minHeight: 0,
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
              ) : (
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
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{note.text}</p>
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
