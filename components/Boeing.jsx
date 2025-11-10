'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

export default function Boeing({ position = [0, 0, 0] }) {
  const { scene } = useGLTF('/Boeing 787-8.glb')
  const modelRef = useRef(null)

  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.2
    }
  })

  return <primitive ref={modelRef} object={scene} position={position} scale={0.1} />
}

useGLTF.preload('/Boeing 787-8.glb')

