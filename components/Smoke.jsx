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
  const smokeStopTimeRef = useRef(null)
  const previousEnabledRef = useRef(enabled)
  const lastFadeOutStartRef = useRef(null) // Track when fade-out last started
  const fadeInDuration = 30 // seconds to fully fade in (increased for slower appearance)
  const fadeOutDuration = 10 // seconds to fully fade out (faster dissipation)
  const minTimeBetweenFadeOutAndFadeIn = 0.5 // Minimum seconds between fade-out start and fade-in start
  const maxOpacity = 0.85
  const baseScale = 1.0

  // Track when smoke becomes enabled and disabled
  useEffect(() => {
    const wasEnabled = previousEnabledRef.current
    previousEnabledRef.current = enabled
    
    if (enabled && !wasEnabled) {
      // Smoke just became enabled - start fade-in
      // Only start fade-in if not currently fading out, or if fade-out is complete
      const now = Date.now()
      const timeSinceStop = smokeStopTimeRef.current !== null 
        ? (now - smokeStopTimeRef.current) / 1000 
        : Infinity
      const timeSinceLastFadeOut = lastFadeOutStartRef.current !== null
        ? (now - lastFadeOutStartRef.current) / 1000
        : Infinity
      
      // Only start fade-in if:
      // 1. Fade-out is complete (has been running for at least fadeOutDuration), OR
      // 2. No fade-out was in progress, AND enough time has passed since last fade-out start
      // This prevents new smoke from appearing immediately after fade-out starts
      const canStartFadeIn = (smokeStopTimeRef.current === null || timeSinceStop >= fadeOutDuration) &&
                              (timeSinceLastFadeOut >= minTimeBetweenFadeOutAndFadeIn)
      
      if (canStartFadeIn) {
        // Fade-out is complete or not in progress - start fade-in
        smokeStartTimeRef.current = now
        smokeStopTimeRef.current = null // Clear stop time when starting
        lastFadeOutStartRef.current = null // Clear last fade-out start time
      }
      // If fade-out is still in progress or too soon after fade-out start, don't start fade-in
      // This prevents the "double smoke" effect where new smoke appears during fade-out
    } else if (!enabled && wasEnabled) {
      // Smoke just became disabled - start fade-out
      // Always start fade-out if smoke was enabled
      if (smokeStopTimeRef.current === null) {
        const now = Date.now()
        smokeStopTimeRef.current = now
        lastFadeOutStartRef.current = now // Track when fade-out started
        // If smoke was never properly started, assume it was fully faded in for fade-out calculation
        if (smokeStartTimeRef.current === null) {
          smokeStartTimeRef.current = now - (fadeInDuration * 1000)
        }
      }
    } else if (!enabled && !wasEnabled && smokeStartTimeRef.current === null && smokeStopTimeRef.current === null) {
      // Smoke is disabled and was never started - ensure everything is reset
      if (groupRef.current) {
        groupRef.current.scale.set(1, 1, 1)
        if (smokeMaterial) {
          smokeMaterial.opacity = 0
          smokeMaterial.needsUpdate = true
        }
      }
    }
  }, [enabled, fadeOutDuration, fadeInDuration])

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
  // Also handles gradual fade-in, fade-out, and intensity changes
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Check if we're in fade-out phase (smoke disabled but fade-out not complete)
      const isFadingOut = !enabled && smokeStopTimeRef.current !== null
      // Only treat as active if enabled OR actively fading out
      // Don't use previousEnabledRef here to avoid race conditions
      const isActive = enabled || isFadingOut
      
      // Don't allow re-enabling during fade-out - let fade-out complete first
      // This prevents the "double smoke" effect
      
      if (isActive) {
        // Calculate fade-in progress (0 to 1) when starting
        let fadeInProgress = 0.0
        if (enabled) {
          if (smokeStartTimeRef.current === null) {
            // Start time not set yet - initialize it
            smokeStartTimeRef.current = Date.now()
            fadeInProgress = 0.0
          } else {
            const elapsed = (Date.now() - smokeStartTimeRef.current) / 1000 // seconds
            fadeInProgress = Math.min(elapsed / fadeInDuration, 1)
          }
        } else if (isFadingOut) {
          // If fading out, assume we were fully faded in
          fadeInProgress = 1.0
        }
        
        // Gradually increase opacity using easing function (ease-out) for fade-in
        const easedFadeIn = 1 - Math.pow(1 - fadeInProgress, 3) // Cubic ease-out
        
        // Calculate fade-out progress (1 to 0) when stopping
        let fadeOutProgress = 1.0
        if (isFadingOut && smokeStopTimeRef.current !== null) {
          const elapsed = (Date.now() - smokeStopTimeRef.current) / 1000 // seconds
          const fadeOutProgressRaw = Math.min(elapsed / fadeOutDuration, 1)
          
          // Use ease-in curve for fade-out (inverse of fade-in)
          // fadeOutProgressRaw goes from 0 to 1, we want fadeOutProgress to go from 1 to 0
          const easedFadeOutRaw = Math.pow(fadeOutProgressRaw, 3) // Cubic ease-in
          fadeOutProgress = 1 - easedFadeOutRaw // Invert to go from 1 to 0
          
          // If fade-out is complete, reset everything
          if (elapsed >= fadeOutDuration) {
            smokeStartTimeRef.current = null
            smokeStopTimeRef.current = null
            groupRef.current.scale.set(1, 1, 1)
            if (smokeMaterial) {
              smokeMaterial.opacity = 0
              smokeMaterial.needsUpdate = true
            }
            // Reset all cloned materials
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
            return
          }
        }
        
        // Combine fade-in and fade-out factors
        const opacityFactor = easedFadeIn * fadeOutProgress
        const currentOpacity = opacityFactor * maxOpacity
        
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
        
        // Gradually increase/decrease scale intensity (smoke gets denser/lighter over time)
        const scaleMultiplier = baseScale + (opacityFactor * 0.3) // Scale up to 30% larger based on opacity
        groupRef.current.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier)
        
        // Very slow forward movement to simulate plane/smoke movement
        groupRef.current.position.z += delta * 0.03
        // Reset position when smoke moves too far forward
        if (groupRef.current.position.z > 5) {
          groupRef.current.position.z = -5
        }
        
        // Subtle vertical drift for billowing effect
        groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5) * delta * 0.02
      } else {
        // No smoke and not fading out - only reset if fade-out has completed
        // Don't reset if we're in the middle of a fade-out (smokeStopTimeRef is set)
        // Also don't reset if we just became disabled (give useEffect time to set smokeStopTimeRef)
        const timeSinceStop = smokeStopTimeRef.current !== null 
          ? (Date.now() - smokeStopTimeRef.current) / 1000 
          : Infinity
        
        // Only reset if fade-out is complete (has been running for at least fadeOutDuration)
        // OR if smoke was never enabled (smokeStartTimeRef is null and smokeStopTimeRef is null)
        const wasNeverEnabled = smokeStartTimeRef.current === null && smokeStopTimeRef.current === null
        const fadeOutComplete = smokeStopTimeRef.current !== null && timeSinceStop >= fadeOutDuration
        
        if (wasNeverEnabled || fadeOutComplete) {
          // Fade-out is complete or never started - reset everything
          groupRef.current.scale.set(1, 1, 1)
          if (smokeMaterial) {
            smokeMaterial.opacity = 0
            smokeMaterial.needsUpdate = true
          }
          // Reset all cloned materials
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
          // Clear refs after reset
          if (fadeOutComplete) {
            smokeStartTimeRef.current = null
            smokeStopTimeRef.current = null
          }
        }
        // If we just became disabled but fade-out hasn't started yet, don't reset
        // The useEffect will set smokeStopTimeRef, and then isActive will become true
      }
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

