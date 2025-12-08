'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function CameraLight() {
  const pointLightRef = useRef()
  const spotLightRef = useRef()
  const { camera } = useThree()

  // Update light positions to follow camera
  useFrame(() => {
    if (camera) {
      // Get camera world position
      const cameraWorldPosition = new THREE.Vector3()
      camera.getWorldPosition(cameraWorldPosition)
      
      // Get camera's forward direction
      const forward = new THREE.Vector3(0, 0, -1)
      forward.applyQuaternion(camera.quaternion)
      
      // Position point light slightly in front of camera
      if (pointLightRef.current) {
        pointLightRef.current.position.copy(cameraWorldPosition)
        const forwardOffset = forward.clone().multiplyScalar(0.3)
        pointLightRef.current.position.add(forwardOffset)
        pointLightRef.current.position.y += 0.1 // Slightly above camera
      }
      
      // Position spot light at camera position, pointing forward
      if (spotLightRef.current) {
        spotLightRef.current.position.copy(cameraWorldPosition)
        // Make spot light point in camera's forward direction
        const target = cameraWorldPosition.clone().add(forward.multiplyScalar(5))
        spotLightRef.current.target.position.copy(target)
        spotLightRef.current.target.updateMatrixWorld()
      }
    }
  })

  return (
    <>
      {/* Point light near camera for general illumination */}
      <pointLight
        ref={pointLightRef}
        intensity={1.5}
        distance={10}
        decay={2}
        color={0xffffff}
      />
      {/* Additional spot light for focused illumination */}
      <spotLight
        ref={spotLightRef}
        angle={Math.PI / 3}
        penumbra={0.5}
        intensity={1.2}
        distance={15}
        decay={2}
        color={0xffffff}
        castShadow={false}
      />
    </>
  )
}

