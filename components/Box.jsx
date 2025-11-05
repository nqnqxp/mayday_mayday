'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function Box({ position = [0, 0, 0], color = 'orange' }) {
  const meshRef = useRef(null)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
