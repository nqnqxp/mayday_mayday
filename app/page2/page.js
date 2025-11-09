import Scene from '@/components/Scene'
import RoomConnector from '@/components/RoomConnector'

export default function Page2() {
  return (
    <main style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <RoomConnector pageId="Page 2" />
      <Scene>
        {/* Add your Three.js content for page 2 here */}
      </Scene>
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
        color: '#000',
        fontSize: '24px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '2px'
      }}>
        Pilot
      </div>
    </main>
  )
}
