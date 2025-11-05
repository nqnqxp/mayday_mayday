import Scene from '@/components/Scene'
import Box from '@/components/Box'
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '20px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        <Link href="/" style={{ color: 'white', textDecoration: 'underline' }}>Home</Link>
        <Link href="/page2" style={{ color: 'white', textDecoration: 'none' }}>Page 2</Link>
        <Link href="/page3" style={{ color: 'white', textDecoration: 'none' }}>Page 3</Link>
      </div>
      <Scene>
        <Box position={[0, 0, 0]} color="orange" />
      </Scene>
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <h2>Welcome to Mayday Mayday</h2>
        <p>Your Next.js + Three.js site</p>
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <Link href="/page2" style={{ 
            color: 'white', 
            textDecoration: 'none',
            padding: '10px 20px',
            background: 'rgba(255, 165, 0, 0.8)',
            borderRadius: '5px',
            display: 'inline-block',
            width: 'fit-content'
          }}>
            Go to Page 2 →
          </Link>
          <Link href="/page3" style={{ 
            color: 'white', 
            textDecoration: 'none',
            padding: '10px 20px',
            background: 'rgba(255, 165, 0, 0.8)',
            borderRadius: '5px',
            display: 'inline-block',
            width: 'fit-content'
          }}>
            Go to Page 3 →
          </Link>
        </div>
      </div>
    </main>
  )
}
