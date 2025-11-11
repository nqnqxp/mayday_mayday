'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'

export default function Scene({ children, cameraProps, controlsProps }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100vh', pointerEvents: 'none' }}
      gl={{ antialias: true, alpha: true }}
    >
      <PerspectiveCamera
        makeDefault
        position={[0, 0, 5]}
        {...cameraProps}
      />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        {...controlsProps}
      />
      {children}
    </Canvas>
  )
}
