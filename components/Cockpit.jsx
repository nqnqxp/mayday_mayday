'use client'

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

export default function Cockpit({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const { scene } = useGLTF('/lambda_cockpit_version_1.glb')
  const groupRef = useRef()
  const { raycaster, gl, camera, size } = useThree()
  const [hoveredElement, setHoveredElement] = useState(null)
  const monitorscreen06Ref = useRef(null)
  const originalMaterialsRef = useRef(new Map())
  const mousePositionRef = useRef({ x: 0, y: 0 })

  // Track mouse position using window events (more reliable)
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!gl.domElement) return
      
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Check if mouse is over the canvas
      const isOverCanvas = event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom
      
      if (isOverCanvas) {
        mousePositionRef.current = { x, y }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [gl.domElement])

  // Find and store reference to monitorscreen06 element
  useEffect(() => {
    if (!scene) return

    const findElement = (object, name) => {
      if (object.name === name) {
        return object
      }
      for (const child of object.children) {
        const found = findElement(child, name)
        if (found) return found
      }
      return null
    }

    const element = findElement(scene, 'monitorscreen06')
    if (element) {
      monitorscreen06Ref.current = element
      
      // Store original materials for all meshes in this element
      element.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          originalMaterialsRef.current.set(child, materials.map(mat => mat.clone()))
        }
      })
    }
  }, [scene])

  // Apply highlight effect
  useEffect(() => {
    if (!monitorscreen06Ref.current) return

    const isHovered = hoveredElement === monitorscreen06Ref.current

    const applyHighlight = (highlight) => {
      monitorscreen06Ref.current.traverse((child) => {
        // Make sure this child is actually part of monitorscreen06 hierarchy
        let current = child
        let isPartOfMonitorscreen06 = false
        while (current) {
          if (current === monitorscreen06Ref.current) {
            isPartOfMonitorscreen06 = true
            break
          }
          if (current === scene || !current.parent) break
          current = current.parent
        }
        
        if (!isPartOfMonitorscreen06) return
        
        if (child.isMesh && child.material) {
          let materials = Array.isArray(child.material) ? child.material : [child.material]
          
          // Clone materials if highlighting to avoid affecting shared materials
          if (highlight) {
            // Check if we've already cloned these materials
            if (!child.userData.clonedMaterials) {
              materials = materials.map(mat => mat.clone())
              child.userData.clonedMaterials = materials
              child.material = Array.isArray(child.material) ? materials : materials[0]
            } else {
              materials = child.userData.clonedMaterials
            }
          } else {
            // Restore original materials when not highlighting
            if (child.userData.clonedMaterials) {
              const originalMaterials = originalMaterialsRef.current.get(child)
              if (originalMaterials) {
                child.material = Array.isArray(child.material) ? originalMaterials : originalMaterials[0]
                child.userData.clonedMaterials = null
              }
            }
            materials = Array.isArray(child.material) ? child.material : [child.material]
          }
          
          materials.forEach((material) => {
            if (highlight) {
              // Create very visible highlight effect
              material.emissive = new THREE.Color(0x00ffff) // Bright cyan
              material.emissiveIntensity = 2.0
              // Make it much brighter
              if (material.color) {
                material.color.setHex(0x88ccff) // Light blue
              }
              // Make sure material is visible
              material.needsUpdate = true
            } else {
              // Material will be restored by replacing with original above
              material.needsUpdate = true
            }
          })
        }
      })
    }

    applyHighlight(isHovered)
  }, [hoveredElement])

  // Raycast for hover detection
  useFrame(() => {
    if (!monitorscreen06Ref.current || !gl.domElement || !groupRef.current) return

    // Use manually tracked mouse position instead of useThree mouse
    const mousePos = mousePositionRef.current
    raycaster.setFromCamera(mousePos, camera)

    // Get all meshes in the monitorscreen06 element and update their world matrices
    const meshes = []
    monitorscreen06Ref.current.traverse((child) => {
      if (child.isMesh) {
        // Update world matrix to account for group transforms
        child.updateMatrixWorld(true)
        meshes.push(child)
      }
    })

    if (meshes.length === 0) {
      return
    }

    // Also try raycasting against the entire group to account for transforms
    // First try direct meshes, then try the group
    let allIntersects = raycaster.intersectObjects(meshes, true)
    
    // If no intersections with meshes directly, try the group
    if (allIntersects.length === 0) {
      allIntersects = raycaster.intersectObject(groupRef.current, true)
      // Filter to only monitorscreen06
      allIntersects = allIntersects.filter(intersect => {
        let current = intersect.object
        while (current) {
          if (current === monitorscreen06Ref.current) return true
          if (current === scene || !current.parent) break
          current = current.parent
        }
        return false
      })
    }
    
    // Since we're raycasting directly against monitorscreen06 meshes, all intersections are relevant
    const relevantIntersects = allIntersects
    
    if (relevantIntersects.length > 0) {
      if (hoveredElement !== monitorscreen06Ref.current) {
        setHoveredElement(monitorscreen06Ref.current)
        gl.domElement.style.cursor = 'pointer'
      }
    } else {
      if (hoveredElement === monitorscreen06Ref.current) {
        setHoveredElement(null)
        gl.domElement.style.cursor = 'default'
      }
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

// Preload the model for better performance
useGLTF.preload('/lambda_cockpit_version_1.glb')

