'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Individual smoke puff component made of multiple overlapping spheres for a billowing appearance
function SmokePuff({ position, scale, material }) {
  // Create smoke from multiple overlapping spheres with variation
  const puffPositions = [
    [0, 0, 0],
    [0.3, 0.2, 0.1],
    [-0.25, 0.15, 0.2],
    [0.2, -0.1, -0.15],
    [-0.15, 0.1, -0.2],
    [0.25, 0.25, 0.05],
    [-0.1, -0.15, 0.1],
    [0.15, 0.05, 0.25],
    [-0.2, 0.2, -0.08],
    [0.1, -0.08, 0.15],
  ]

  return (
    <group position={position} scale={scale}>
      {puffPositions.map((puffPos, index) => (
        <mesh key={index} position={puffPos} material={material}>
          <sphereGeometry args={[0.5, 16, 16]} />
        </mesh>
      ))}
    </group>
  )
}

export default function Smoke({ enabled = false }) {
  const groupRef = useRef()
  const smokeStartTimeRef = useRef(null)
  const fadeInDuration = 8 // seconds to fully fade in
  const maxOpacity = 0.85
  const baseScale = 1.0

  // Track when smoke becomes enabled
  useEffect(() => {
    if (enabled && smokeStartTimeRef.current === null) {
      smokeStartTimeRef.current = Date.now()
    } else if (!enabled) {
      smokeStartTimeRef.current = null
    }
  }, [enabled])

  // Create shared smoke material - dark gray/black with transparency
  const smokeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1a1a1a, // Darker black smoke for more visibility
        transparent: true,
        opacity: 0, // Start at 0, will be animated
        roughness: 1.0, // Fully rough for matte smoke look
        metalness: 0.0,
        fog: false, // Don't let fog affect smoke
      }),
    []
  )

  // Create smoke clouds in the sky - positioned to be visible from cockpit
  // Smoke should appear in the distance, visible through windows
  const smokeConfigs = [
    // Far distance smoke (behind the plane) - made larger
    { position: [0, 0.5, -20], scale: [7.5, 5, 6] },
    { position: [4, 0.6, -22], scale: [6.5, 4.5, 5.5] },
    { position: [-4, 0.4, -21], scale: [7, 4.8, 5.8] },
    { position: [7, 0.7, -25], scale: [5.5, 4, 5] },
    { position: [-7, 0.5, -24], scale: [6.5, 4.5, 5.5] },
    
    // Mid-distance smoke - made larger
    { position: [2, 0.8, -15], scale: [6.5, 4.5, 5] },
    { position: [-3, 0.6, -16], scale: [7, 4.8, 5.5] },
    { position: [6, 0.9, -18], scale: [6, 4.2, 4.8] },
    { position: [-6, 0.7, -17], scale: [7, 4.8, 5.5] },
    { position: [9, 0.8, -19], scale: [5.5, 4, 4.5] },
    { position: [-9, 0.6, -20], scale: [6.5, 4.5, 5] },
    
    // Closer smoke (more visible) - made larger and more prominent
    { position: [3, 1.0, -12], scale: [5.5, 4, 4.5] },
    { position: [-4, 0.8, -13], scale: [6, 4.2, 4.8] },
    { position: [7, 1.1, -14], scale: [5, 3.5, 4] },
    { position: [-7, 0.9, -11], scale: [6, 4.2, 5] },
    // Additional close smoke for more visibility
    { position: [0, 1.2, -10], scale: [5.5, 4, 4.5] },
    { position: [5, 0.9, -9], scale: [4.5, 3.5, 4] },
    { position: [-5, 1.0, -8], scale: [5, 3.8, 4.5] },
    
    // Side smoke (left and right views)
    { position: [11, 0.7, -15], scale: [4, 3, 3.5] },
    { position: [-11, 0.5, -16], scale: [4.5, 3.2, 3.8] },
    { position: [14, 0.9, -18], scale: [3.5, 2.8, 3.2] },
    { position: [-14, 0.7, -17], scale: [4, 3, 3.5] },
    
    // Additional scattered smoke for depth
    { position: [1, 0.5, -26], scale: [5, 3.5, 4.5] },
    { position: [-2, 0.4, -25], scale: [5.5, 3.8, 4.8] },
    { position: [4, 0.6, -28], scale: [4.5, 3.2, 4] },
    { position: [-5, 0.5, -27], scale: [5, 3.5, 4.5] },
    
    // Very far horizon smoke
    { position: [0, 0.4, -35], scale: [7, 4.5, 6] },
    { position: [8, 0.6, -37], scale: [6, 4, 5.5] },
    { position: [-8, 0.5, -36], scale: [6.5, 4.2, 5.8] },
  ]

  // Slow drift and billow animation - smoke moves and expands slowly
  // Also handles gradual fade-in and intensity increase
  useFrame((state, delta) => {
    if (groupRef.current && enabled && smokeStartTimeRef.current !== null) {
      // Calculate fade-in progress (0 to 1)
      const elapsed = (Date.now() - smokeStartTimeRef.current) / 1000 // seconds
      const fadeProgress = Math.min(elapsed / fadeInDuration, 1)
      
      // Gradually increase opacity using easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - fadeProgress, 3) // Cubic ease-out
      const currentOpacity = easedProgress * maxOpacity
      
      // Update material opacity - update all meshes in the group
      if (smokeMaterial) {
        smokeMaterial.opacity = currentOpacity
        smokeMaterial.needsUpdate = true
      }
      
      // Also update any cloned materials in the scene
      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((mat) => {
            if (mat && mat.transparent !== undefined) {
              mat.opacity = currentOpacity
              mat.needsUpdate = true
            }
          })
        }
      })
      
      // Gradually increase scale intensity (smoke gets denser over time)
      const scaleMultiplier = baseScale + (easedProgress * 0.3) // Scale up to 30% larger
      groupRef.current.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier)
      
      // Very slow forward movement to simulate plane/smoke movement
      groupRef.current.position.z += delta * 0.03
      // Reset position when smoke moves too far forward
      if (groupRef.current.position.z > 5) {
        groupRef.current.position.z = -5
      }
      
      // Subtle vertical drift for billowing effect
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5) * delta * 0.02
    } else if (groupRef.current && !enabled) {
      // Reset scale and opacity when disabled
      groupRef.current.scale.set(1, 1, 1)
      if (smokeMaterial) {
        smokeMaterial.opacity = 0
        smokeMaterial.needsUpdate = true
      }
      // Also reset all cloned materials
      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((mat) => {
            if (mat && mat.transparent !== undefined) {
              mat.opacity = 0
              mat.needsUpdate = true
            }
          })
        }
      })
    }
  })

  // Always render the group, but it will be invisible when not enabled or during fade-in
  // This allows smooth transitions

  return (
    <group ref={groupRef} scale={[1, 1, 1]}>
      {smokeConfigs.map((config, index) => (
        <SmokePuff
          key={index}
          position={config.position}
          scale={config.scale}
          material={smokeMaterial}
        />
      ))}
    </group>
  )
}

