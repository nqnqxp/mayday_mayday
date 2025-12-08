'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { createContext, useContext } from 'react'
import Clouds from './Clouds'
import RetroShader from './RetroShader'
import Skybox from './Skybox'
import Smoke from './Smoke'

// Context to share gizmo mode state
export const GizmoModeContext = createContext({ gizmoMode: false, setGizmoMode: () => {} })

export default function Scene({ children, cameraProps, controlsProps, enablePointerEvents = false, showClouds = true, enableShader = true, smokeAffectedEngines = [] }) {
  const { gizmoMode, isCloseUp } = useContext(GizmoModeContext)
  
  // Only render OrbitControls when NOT in gizmo mode AND NOT in close-up mode
  const shouldShowOrbitControls = !gizmoMode && !isCloseUp
  
  return (
    <Canvas
      style={{ width: '100%', height: '100%', pointerEvents: enablePointerEvents ? 'auto' : 'none' }}
      gl={{ antialias: false, alpha: true }}
    >
      <PerspectiveCamera
        makeDefault
        position={[0, 0, 5]}
        {...cameraProps}
      />
      {/* Ambient light for general scene illumination */}
      <ambientLight intensity={0.3} />
      {/* Sunlight - directional light from above and slightly in front */}
      <directionalLight 
        position={[5, 15, 10]} 
        intensity={1.0}
        color={0xfff5e6}
        castShadow={false}
      />
      {/* Additional sunlight from opposite angle for more natural lighting */}
      <directionalLight 
        position={[-3, 12, 8]} 
        intensity={0.4}
        color={0xfff5e6}
        castShadow={false}
      />
      {/* Hemisphere light for sky/ground color simulation */}
      <hemisphereLight 
        skyColor={0xffffff}
        groundColor={0x444444}
        intensity={0.4}
      />
      {shouldShowOrbitControls && (
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          {...controlsProps}
        />
      )}
      <Skybox />
      {showClouds && <Clouds />}
      <Smoke enabled={smokeAffectedEngines.length > 0} />
      {children}
      <EffectComposer>
        {enableShader && <RetroShader pixelSize={2} ditherIntensity={0.08} />}
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  )
}
