import Scene from '@/components/Scene'
import Box from '@/components/Box'
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <Scene>
        <Box position={[0, 0, 0]} color="orange" />
      </Scene>
      <div style={{
        position: 'absolute',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.75)',
        color: 'white',
        padding: '24px 32px',
        borderRadius: '12px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minWidth: '280px',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0' }}>Mayday, Mayday</h2>
          <p style={{ margin: 0, opacity: 0.85 }}>Choose your role</p>
        </div>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
          <Link
            href="/page2"
            style={{
              color: 'white',
              textDecoration: 'none',
              padding: '10px 22px',
              background: 'rgba(100, 180, 255, 0.85)',
              borderRadius: '6px',
              fontWeight: 600,
            }}
          >
            Pilot
          </Link>
          <Link
            href="/page3"
            style={{
              color: 'white',
              textDecoration: 'none',
              padding: '10px 22px',
              background: 'rgba(100, 180, 255, 0.85)',
              borderRadius: '6px',
              fontWeight: 600,
            }}
          >
            Air Traffic Controller
          </Link>
        </div>
      </div>
    </main>
  )
}
