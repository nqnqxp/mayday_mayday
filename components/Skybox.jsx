'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Skybox() {
  const meshRef = useRef()

  // Create gradient sky material
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x1E4A7A) }, // Dark blue for top of sky
      bottomColor: { value: new THREE.Color(0xF0F8FF) }, // Very light blue/almost white
      offset: { value: 0.0 },
      exponent: { value: 0.5 } // Lower exponent for more contrast transition
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float f = clamp(pow(max(h + offset, 0.0), exponent), 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, f), 1.0);
      }
    `,
    side: THREE.BackSide
  })

  return (
    <mesh ref={meshRef} material={skyMaterial}>
      <sphereGeometry args={[500, 32, 32]} />
    </mesh>
  )
}

