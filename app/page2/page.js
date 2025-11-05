import Scene from '@/components/Scene'
import Link from 'next/link'

export default function Page2() {
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
        <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
        <Link href="/page2" style={{ color: 'white', textDecoration: 'underline' }}>Page 2</Link>
        <Link href="/page3" style={{ color: 'white', textDecoration: 'none' }}>Page 3</Link>
      </div>
      <Scene>
        {/* Add your Three.js content for page 2 here */}
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
        <h2>Page 2</h2>
        <p>This is the second page of your site.</p>
      </div>
    </main>
  )
}
