'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Individual cloud component made of multiple overlapping spheres for a fluffy appearance
function CloudPuff({ position, scale, material }) {
  // Create a cloud from multiple overlapping spheres with more variation
  const puffPositions = [
    [0, 0, 0],
    [0.4, 0.25, 0.15],
    [-0.3, 0.2, 0.25],
    [0.25, -0.15, -0.2],
    [-0.2, 0.15, -0.25],
    [0.35, 0.3, 0.1],
    [-0.15, -0.2, 0.15],
    [0.2, 0.1, 0.3],
    [-0.25, 0.25, -0.1],
    [0.15, -0.1, 0.2],
  ]

  return (
    <group position={position} scale={scale}>
      {puffPositions.map((puffPos, index) => (
        <mesh key={index} position={puffPos} material={material}>
          <sphereGeometry args={[0.6, 16, 16]} />
        </mesh>
      ))}
    </group>
  )
}

export default function Clouds() {
  const groupRef = useRef()

  // Create shared cloud material - brighter white, more opaque for realistic cockpit view
  const cloudMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85, // More opaque for realistic cloud appearance
        roughness: 1.0, // Fully rough for matte cloud look
        metalness: 0.0,
        fog: false, // Don't let fog affect clouds
      }),
    []
  )

  // Create cloud layer below the cockpit - positioned like you'd see from a plane window
  // Clouds should be below the cockpit (negative Y) and extend far into the distance (negative Z)
  // The cockpit is at roughly y=1, so clouds should be around y=-1 to y=0.5
  const cloudConfigs = [
    // Near horizon clouds (far distance, lower)
    { position: [0, -0.5, -15], scale: [8, 3, 4] },
    { position: [5, -0.3, -18], scale: [6, 2.5, 3.5] },
    { position: [-5, -0.4, -17], scale: [7, 2.8, 3.8] },
    { position: [8, -0.2, -20], scale: [5, 2, 3] },
    { position: [-8, -0.35, -19], scale: [6.5, 2.6, 3.6] },
    
    // Mid-distance clouds
    { position: [2, -0.1, -12], scale: [7, 2.8, 3.5] },
    { position: [-3, -0.2, -13], scale: [6.5, 2.6, 3.2] },
    { position: [6, 0, -14], scale: [5.5, 2.2, 3] },
    { position: [-6, -0.15, -11], scale: [7.5, 3, 4] },
    { position: [10, -0.1, -16], scale: [5, 2, 2.8] },
    { position: [-10, -0.25, -15], scale: [6, 2.4, 3.2] },
    
    // Closer clouds (still below but visible through windows)
    { position: [3, 0.2, -8], scale: [4, 1.8, 2.5] },
    { position: [-4, 0.1, -9], scale: [5, 2, 2.8] },
    { position: [7, 0.3, -10], scale: [3.5, 1.5, 2] },
    { position: [-7, 0.15, -7], scale: [4.5, 1.9, 2.6] },
    
    // Side clouds (left and right views)
    { position: [12, -0.2, -12], scale: [5, 2.2, 3] },
    { position: [-12, -0.3, -13], scale: [5.5, 2.4, 3.2] },
    { position: [15, 0, -15], scale: [4, 1.8, 2.5] },
    { position: [-15, -0.1, -14], scale: [4.5, 2, 2.8] },
    
    // Additional scattered clouds for depth
    { position: [1, -0.3, -22], scale: [6, 2.5, 3.5] },
    { position: [-2, -0.4, -21], scale: [7, 2.8, 3.8] },
    { position: [4, -0.2, -25], scale: [5.5, 2.2, 3] },
    { position: [-5, -0.35, -24], scale: [6.5, 2.6, 3.5] },
    
    // Very far horizon clouds
    { position: [0, -0.5, -30], scale: [10, 3.5, 5] },
    { position: [8, -0.3, -32], scale: [7, 2.8, 4] },
    { position: [-8, -0.4, -31], scale: [8, 3, 4.5] },
  ]

  // Slow drift animation - clouds move slowly across the view
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Very slow forward movement to simulate plane/cloud movement
      groupRef.current.position.z += delta * 0.05
      // Reset position when clouds move too far forward
      if (groupRef.current.position.z > 5) {
        groupRef.current.position.z = -5
      }
    }
  })

  return (
    <group ref={groupRef}>
      {cloudConfigs.map((config, index) => (
        <CloudPuff
          key={index}
          position={config.position}
          scale={config.scale}
          material={cloudMaterial}
        />
      ))}
    </group>
  )
}

