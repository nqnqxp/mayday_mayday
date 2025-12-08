'use client'

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useState, useContext } from 'react'
import * as THREE from 'three'
import { GizmoModeContext } from './Scene'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'

export default function Cockpit({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, onButtonHover = null, vibrationAffectedEngines = [], smokeAffectedEngines = [], onCloseUpMonitorChange = null, chatComponent = null, onExitComms = null, onExitNavigation = null, navigationData = null, formatCoordinates = null, checkedItems = {}, onEngine1SwitchToggle = null, onEngine1SwitchChange = null, onEngine2SwitchToggle = null, onEngine2SwitchChange = null }) {
  const { scene } = useGLTF('/lambda_cockpit_version_1.glb')
  const groupRef = useRef()
  const { raycaster, gl, camera, size, controls } = useThree()
  const { gizmoMode, setGizmoMode, isCloseUp: contextIsCloseUp, setIsCloseUp: setContextIsCloseUp } = useContext(GizmoModeContext)
  const [hoveredElement, setHoveredElement] = useState(null)
  const [isCloseUp, setIsCloseUp] = useState(false)
  const [closeUpMonitor, setCloseUpMonitor] = useState(null) // 'monitorscreen06' or 'monitorscreen02' or null
  const [engine1SwitchOn, setEngine1SwitchOn] = useState(false) // Track engine 1 switch state
  const [engine2SwitchOn, setEngine2SwitchOn] = useState(false) // Track engine 2 switch state
  const monitorscreen06Ref = useRef(null)
  const monitorscreen02Ref = useRef(null)
  const button20Ref = useRef(null)
  const button21Ref = useRef(null)
  const button18Ref = useRef(null)
  const button27Ref = useRef(null)
  const button28Ref = useRef(null)
  const butotn28Ref = useRef(null) // Note: typo in model name is intentional
  const button29Ref = useRef(null)
  const button31Ref = useRef(null)
  const button32Ref = useRef(null)
  const handle01Ref = useRef(null)
  const handlebase02Ref = useRef(null)
  const engine1SwitchGroupRef = useRef(null)
  const handle02Ref = useRef(null)
  const handlebase01Ref = useRef(null)
  const engine2SwitchGroupRef = useRef(null)
  const originalMaterialsRef = useRef(new Map())
  const originalMaterials02Ref = useRef(new Map())
  const originalMaterialsButton20Ref = useRef(new Map())
  const originalMaterialsButton21Ref = useRef(new Map())
  const originalMaterialsButton18Ref = useRef(new Map())
  const originalMaterialsButton27Ref = useRef(new Map())
  const originalMaterialsButton28Ref = useRef(new Map())
  const originalMaterialsButotn28Ref = useRef(new Map())
  const originalMaterialsButton29Ref = useRef(new Map())
  const originalMaterialsButton31Ref = useRef(new Map())
  const originalMaterialsButton32Ref = useRef(new Map())
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const originalCameraPositionRef = useRef(null)
  const originalCameraDirectionRef = useRef(null)
  const isAnimatingRef = useRef(false)
  const originalControlsConstraintsRef = useRef({ minDistance: null, maxDistance: null })
  const keysPressedRef = useRef({ w: false, a: false, s: false, d: false, e: false, x: false })
  const lastLogTimeRef = useRef(0)
  
  // Expose exitComms function to parent via callback
  useEffect(() => {
    if (onExitComms) {
      const exitComms = () => {
        if (closeUpMonitor === 'monitorscreen02' && originalCameraPositionRef.current && originalCameraDirectionRef.current && !isAnimatingRef.current) {
          isAnimatingRef.current = true
          animateCamera(
            camera.position,
            originalCameraPositionRef.current,
            originalCameraDirectionRef.current,
            () => {
              isAnimatingRef.current = false
              setIsCloseUp(false)
              if (setContextIsCloseUp) setContextIsCloseUp(false)
              setCloseUpMonitor(null)
              if (onCloseUpMonitorChange) onCloseUpMonitorChange(null)
              originalCameraPositionRef.current = null
              originalCameraDirectionRef.current = null
              // Re-enable controls and restore constraints after animation completes
              if (controls) {
                if (controls.enabled !== undefined) {
                  controls.enabled = true
                }
                // Restore original distance constraints
                if (originalControlsConstraintsRef.current.minDistance !== null) {
                  controls.minDistance = originalControlsConstraintsRef.current.minDistance
                }
                if (originalControlsConstraintsRef.current.maxDistance !== null) {
                  controls.maxDistance = originalControlsConstraintsRef.current.maxDistance
                }
              }
            }
          )
        }
      }
      onExitComms(exitComms)
    }
  }, [onExitComms, closeUpMonitor, camera, controls, onCloseUpMonitorChange, setContextIsCloseUp])

  // Expose engine 1 switch toggle function to parent via callback
  useEffect(() => {
    if (onEngine1SwitchToggle) {
      const toggleEngine1Switch = () => {
        setEngine1SwitchOn(prev => !prev)
      }
      onEngine1SwitchToggle(toggleEngine1Switch)
    }
  }, [onEngine1SwitchToggle])

  // Expose engine 2 switch toggle function to parent via callback
  useEffect(() => {
    if (onEngine2SwitchToggle) {
      const toggleEngine2Switch = () => {
        setEngine2SwitchOn(prev => !prev)
      }
      onEngine2SwitchToggle(toggleEngine2Switch)
    }
  }, [onEngine2SwitchToggle])

  // Expose exitNavigation function to parent via callback
  useEffect(() => {
    if (onExitNavigation) {
      const exitNavigation = () => {
        if (closeUpMonitor === 'monitorscreen06' && originalCameraPositionRef.current && originalCameraDirectionRef.current && !isAnimatingRef.current) {
          isAnimatingRef.current = true
          animateCamera(
            camera.position,
            originalCameraPositionRef.current,
            originalCameraDirectionRef.current,
            () => {
              isAnimatingRef.current = false
              setIsCloseUp(false)
              if (setContextIsCloseUp) setContextIsCloseUp(false)
              setCloseUpMonitor(null)
              if (onCloseUpMonitorChange) onCloseUpMonitorChange(null)
              originalCameraPositionRef.current = null
              originalCameraDirectionRef.current = null
              // Re-enable controls and restore constraints after animation completes
              if (controls) {
                if (controls.enabled !== undefined) {
                  controls.enabled = true
                }
                // Restore original distance constraints
                if (originalControlsConstraintsRef.current.minDistance !== null) {
                  controls.minDistance = originalControlsConstraintsRef.current.minDistance
                }
                if (originalControlsConstraintsRef.current.maxDistance !== null) {
                  controls.maxDistance = originalControlsConstraintsRef.current.maxDistance
                }
              }
            }
          )
        }
      }
      onExitNavigation(exitNavigation)
    }
  }, [onExitNavigation, closeUpMonitor, camera, controls, onCloseUpMonitorChange, setContextIsCloseUp])

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

    const handleClick = (event) => {
      if (!gl.domElement || isAnimatingRef.current) return
      
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Check if click is over the canvas
      const isOverCanvas = event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom
      
      // Check for engine 1 switch click
      if (isOverCanvas && engine1SwitchGroupRef.current && handle01Ref.current && handlebase02Ref.current) {
        raycaster.setFromCamera({ x, y }, camera)
        
        const meshes = []
        handle01Ref.current.traverse((child) => {
          if (child.isMesh) {
            child.updateMatrixWorld(true)
            meshes.push(child)
          }
        })
        handlebase02Ref.current.traverse((child) => {
          if (child.isMesh) {
            child.updateMatrixWorld(true)
            meshes.push(child)
          }
        })
        
        const intersects = raycaster.intersectObjects(meshes, true)
        
        if (intersects.length > 0) {
          // Check if it's one of the engine switch meshes
          let current = intersects[0].object
          let isEngineSwitch = false
          while (current) {
            if (current === handle01Ref.current || current === handlebase02Ref.current) {
              isEngineSwitch = true
              break
            }
            if (current === scene || !current.parent) break
            current = current.parent
          }
          
          if (isEngineSwitch) {
            // Toggle engine switch position
            setEngine1SwitchOn(prev => !prev)
            return // Prevent other click handlers from firing
          }
        }
      }

      // Check for engine 2 switch click
      if (isOverCanvas && engine2SwitchGroupRef.current && handle02Ref.current && handlebase01Ref.current) {
        raycaster.setFromCamera({ x, y }, camera)
        
        const meshes = []
        handle02Ref.current.traverse((child) => {
          if (child.isMesh) {
            child.updateMatrixWorld(true)
            meshes.push(child)
          }
        })
        handlebase01Ref.current.traverse((child) => {
          if (child.isMesh) {
            child.updateMatrixWorld(true)
            meshes.push(child)
          }
        })
        
        const intersects = raycaster.intersectObjects(meshes, true)
        
        if (intersects.length > 0) {
          // Check if it's one of the engine switch meshes
          let current = intersects[0].object
          let isEngineSwitch = false
          while (current) {
            if (current === handle02Ref.current || current === handlebase01Ref.current) {
              isEngineSwitch = true
              break
            }
            if (current === scene || !current.parent) break
            current = current.parent
          }
          
          if (isEngineSwitch) {
            // Toggle engine switch position
            setEngine2SwitchOn(prev => !prev)
            return // Prevent other click handlers from firing
          }
        }
      }
      
      if (isOverCanvas && (monitorscreen06Ref.current || monitorscreen02Ref.current)) {
        // Raycast to check if monitorscreen06 or monitorscreen02 was clicked
        raycaster.setFromCamera({ x, y }, camera)
        
        // Check both monitorscreen06 and monitorscreen02
        // Include monitorscreen02 even in close-up so we can forward clicks to chatbox
        const elementsToCheck = [
          { ref: monitorscreen06Ref, name: 'monitorscreen06' },
          { ref: monitorscreen02Ref, name: 'monitorscreen02' }
        ]
        
        let clickedElement = null
        for (const { ref, name } of elementsToCheck) {
          if (!ref.current) continue
          
          const meshes = []
          ref.current.traverse((child) => {
            if (child.isMesh) {
              child.updateMatrixWorld(true)
              meshes.push(child)
            }
          })
          
          const intersects = raycaster.intersectObjects(meshes, true)
          
          if (intersects.length > 0) {
            // Check if it's the element we're looking for
            let current = intersects[0].object
            while (current) {
              if (current === ref.current) {
                clickedElement = ref.current
                break
              }
              if (current === scene || !current.parent) break
              current = current.parent
            }
            if (clickedElement) break
          }
        }
        
        if (clickedElement) {
          // Handle click for either monitorscreen06 or monitorscreen02
          // Determine which monitor was clicked and use appropriate close-up position
          const isMonitorscreen06 = clickedElement === monitorscreen06Ref.current
          const isMonitorscreen02 = clickedElement === monitorscreen02Ref.current
          
          // If clicking on monitorscreen02 while in close-up, forward click to chatbox (don't exit close-up)
          if (isCloseUp && closeUpMonitor === 'monitorscreen02' && isMonitorscreen02 && chatContainerRef.current) {
            // Get the intersection point on the monitor
            const intersects = raycaster.intersectObject(monitorscreen02Ref.current, true)
            if (intersects.length > 0) {
              const intersection = intersects[0]
              const uv = intersection.uv
              
              if (uv) {
                // Convert UV coordinates (0-1) to pixel coordinates in the container
                // Texture is rotated 90° counter-clockwise (Math.PI/2 - 3°) and flipped horizontally (repeat.x = -1)
                // 
                // After 90° CCW rotation + horizontal flip:
                // - Original left (UV.x=0) -> becomes top (after rotation) -> but flipped, so bottom
                // - Original right (UV.x=1) -> becomes bottom (after rotation) -> but flipped, so top
                // - Original top (UV.y=0) -> becomes right (after rotation) -> but flipped, so left
                // - Original bottom (UV.y=1) -> becomes left (after rotation) -> but flipped, so right
                //
                // So the mapping is:
                // - Container X = (1 - UV.y) * containerWidth  (UV.y maps to X, inverted)
                // - Container Y = UV.x * containerHeight  (UV.x maps to Y, not inverted)
                const containerWidth = 400
                const containerHeight = 300
                
                // Map UV to container coordinates accounting for 90° CCW rotation + horizontal flip
                // The texture is rotated 90° CCW (Math.PI/2 - 3°) and flipped horizontally (repeat.x = -1)
                // UV mapping in Three.js: (0,0) is bottom-left, (1,1) is top-right
                // After 90° CCW rotation + horizontal flip:
                // - Original UV.x (left=0, right=1) maps to container Y (but inverted due to flip)
                // - Original UV.y (bottom=0, top=1) maps to container X (but inverted due to flip)
                // Try different mappings to find the correct one
                const x = uv.y * containerWidth  // Try: UV.y directly maps to X
                const y = (1 - uv.x) * containerHeight  // Try: UV.x inverted maps to Y
                
                // Temporarily make container visible and position it for accurate click detection
                const originalVisibility = chatContainerRef.current.style.visibility
                const originalOpacity = chatContainerRef.current.style.opacity
                const originalPosition = chatContainerRef.current.style.position
                const originalLeft = chatContainerRef.current.style.left
                const originalTop = chatContainerRef.current.style.top
                const originalZIndex = chatContainerRef.current.style.zIndex
                
                chatContainerRef.current.style.visibility = 'visible'
                chatContainerRef.current.style.opacity = '1'
                chatContainerRef.current.style.position = 'fixed'
                chatContainerRef.current.style.left = '0px'
                chatContainerRef.current.style.top = '0px'
                chatContainerRef.current.style.width = containerWidth + 'px'
                chatContainerRef.current.style.height = containerHeight + 'px'
                chatContainerRef.current.style.zIndex = '99999' // Very high to ensure it's on top
                
                // Force a reflow to ensure styles are applied
                chatContainerRef.current.offsetHeight
                
                // Get the container's position
                const rect = chatContainerRef.current.getBoundingClientRect()
                const clickX = rect.left + x
                const clickY = rect.top + y
                
                // Find element at that position
                const elementAtPoint = document.elementFromPoint(clickX, clickY)
                
                // Restore container visibility
                chatContainerRef.current.style.visibility = originalVisibility
                chatContainerRef.current.style.opacity = originalOpacity
                chatContainerRef.current.style.position = originalPosition
                chatContainerRef.current.style.left = originalLeft
                chatContainerRef.current.style.top = originalTop
                chatContainerRef.current.style.zIndex = originalZIndex
                
                // Debug: log the click position and what element we found
                console.warn('🔵 Monitor click detected:', {
                  uv: { u: uv.x.toFixed(3), v: uv.y.toFixed(3) },
                  containerCoords: { x: x.toFixed(1), y: y.toFixed(1) },
                  screenCoords: { x: clickX.toFixed(1), y: clickY.toFixed(1) },
                  elementAtPoint: elementAtPoint?.tagName,
                  elementText: elementAtPoint?.textContent?.substring(0, 50)
                })
                
                if (elementAtPoint) {
                  // Find any interactive element (button, input, textarea, etc.)
                  const interactiveElement = elementAtPoint.closest('button, input, textarea, [role="button"], [onclick], .chat-input, .chat-messages')
                  
                  // If we didn't find it via closest, try searching the container directly
                  let elementToInteract = interactiveElement
                  if (!elementToInteract && chatContainerRef.current) {
                    // Try to find buttons or inputs - check which one is closest to click position
                    const allInteractive = Array.from(chatContainerRef.current.querySelectorAll('button, input, textarea'))
                    if (allInteractive.length > 0) {
                      // Find the element closest to the click position
                      let closestElement = null
                      let closestDistance = Infinity
                      
                      allInteractive.forEach((el) => {
                        const rect = el.getBoundingClientRect()
                        const elCenterX = rect.left + rect.width / 2
                        const elCenterY = rect.top + rect.height / 2
                        const distance = Math.sqrt(
                          Math.pow(clickX - elCenterX, 2) + Math.pow(clickY - elCenterY, 2)
                        )
                        if (distance < closestDistance) {
                          closestDistance = distance
                          closestElement = el
                        }
                      })
                      
                      if (closestElement && closestDistance < 100) { // Within 100px
                        elementToInteract = closestElement
                        console.warn('🟡 Using closest interactive element:', closestElement.tagName, closestDistance.toFixed(1) + 'px away')
                      } else if (allInteractive.length > 0) {
                        // Fallback: use the last button (usually the send button)
                        const buttons = allInteractive.filter(el => el.tagName === 'BUTTON')
                        if (buttons.length > 0) {
                          elementToInteract = buttons[buttons.length - 1] // Last button is usually send
                          console.warn('🟡 Using fallback send button')
                        } else {
                          elementToInteract = allInteractive[0]
                          console.warn('🟡 Using fallback first interactive element')
                        }
                      }
                    }
                  }
                  
                  if (elementToInteract) {
                    console.warn('🟢 Interacting with element:', elementToInteract.tagName, elementToInteract.type || elementToInteract.textContent?.substring(0, 30))
                    
                    // For input/textarea fields, focus them and place cursor
                    if (elementToInteract.tagName === 'INPUT' || elementToInteract.tagName === 'TEXTAREA') {
                      elementToInteract.focus()
                      // Try to place cursor at click position if it's a text input
                      if (elementToInteract.setSelectionRange && elementToInteract.value) {
                        try {
                          const containerWidth = 400
                          const clickPos = Math.round((clickX - rect.left) / (containerWidth / elementToInteract.value.length))
                          elementToInteract.setSelectionRange(clickPos, clickPos)
                        } catch (e) {
                          // Ignore selection errors
                        }
                      }
                    } else {
                      // For buttons and other elements, click them
                      elementToInteract.click()
                    }
                    
                    // Also dispatch a synthetic click event for React handlers
                    const clickEvent = new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                      view: window,
                      detail: 1,
                      button: 0,
                      clientX: clickX,
                      clientY: clickY
                    })
                    elementToInteract.dispatchEvent(clickEvent)
                    
                    // Also dispatch mousedown and mouseup for better compatibility
                    const mouseDownEvent = new MouseEvent('mousedown', {
                      bubbles: true,
                      cancelable: true,
                      view: window,
                      button: 0,
                      clientX: clickX,
                      clientY: clickY
                    })
                    const mouseUpEvent = new MouseEvent('mouseup', {
                      bubbles: true,
                      cancelable: true,
                      view: window,
                      button: 0,
                      clientX: clickX,
                      clientY: clickY
                    })
                    elementToInteract.dispatchEvent(mouseDownEvent)
                    elementToInteract.dispatchEvent(mouseUpEvent)
                    
                    // Element interacted with successfully - return early to prevent exit
                    return
                  } else {
                    console.warn('🔴 No interactive element found at click position')
                  }
                } else {
                  console.warn('🔴 No element found at click position')
                }
                // Always return to prevent exit from close-up when clicking monitorscreen02
                return
              }
            }
            // If we get here, no intersection or UV - still prevent exit
            event.preventDefault()
            event.stopPropagation()
            return
          }
          
          // Toggle close-up view
          // Don't allow clicking monitorscreen02 or monitorscreen06 to exit close-up - only exit button should do that
          if (isCloseUp) {
            // If clicking on monitorscreen02 in close-up, don't exit (clicks are forwarded to chatbox)
            if (closeUpMonitor === 'monitorscreen02' && isMonitorscreen02) {
              // Click forwarding already handled above, just return without toggling
              return
            }
            
            // If clicking on monitorscreen06 in close-up, don't exit (only exit button should exit)
            if (closeUpMonitor === 'monitorscreen06' && isMonitorscreen06) {
              // Don't exit - return without toggling
              return
            }
            
            // Return to original position (for other cases)
            if (originalCameraPositionRef.current && originalCameraDirectionRef.current) {
                  // OrbitControls should already be removed from scene when in close-up mode
                  // No need to disable it here
                  
                  isAnimatingRef.current = true
                  animateCamera(
                    camera.position,
                    originalCameraPositionRef.current,
                    originalCameraDirectionRef.current, // Restore original rotation
                    () => {
                      isAnimatingRef.current = false
                      setIsCloseUp(false)
                    if (setContextIsCloseUp) setContextIsCloseUp(false)
                      setCloseUpMonitor(null) // Clear close-up monitor when exiting
                      if (onCloseUpMonitorChange) onCloseUpMonitorChange(null)
                      originalCameraPositionRef.current = null
                      originalCameraDirectionRef.current = null
                      // Re-enable controls and restore constraints after animation completes
                      if (controls) {
                        if (controls.enabled !== undefined) {
                          controls.enabled = true
                        }
                        // Restore original distance constraints
                        if (originalControlsConstraintsRef.current.minDistance !== null) {
                          controls.minDistance = originalControlsConstraintsRef.current.minDistance
                        }
                        if (originalControlsConstraintsRef.current.maxDistance !== null) {
                          controls.maxDistance = originalControlsConstraintsRef.current.maxDistance
                        }
                      }
                    }
                  )
                } else {
                  setIsCloseUp(false)
                  setCloseUpMonitor(null) // Clear close-up monitor when exiting
                  if (onCloseUpMonitorChange) onCloseUpMonitorChange(null)
                }
              } else {
                // Move to close-up
                if (!originalCameraPositionRef.current) {
                  originalCameraPositionRef.current = camera.position.clone()
                }
                
                // Store the current camera rotation to preserve it (don't change rotation)
                // Store it fresh each time so we can return to it
                if (!originalCameraDirectionRef.current) {
                  originalCameraDirectionRef.current = {
                    quaternion: camera.quaternion.clone(),
                    rotation: camera.rotation.clone()
                  }
                }
                
                // Use the current rotation - don't change it
                const rotationToUse = {
                  quaternion: camera.quaternion.clone(),
                  rotation: camera.rotation.clone()
                }
                
                // OrbitControls should already be removed from scene when in close-up mode
                // No need to disable it here
                
                
                // Manually set close-up camera position (keep current rotation - don't change it)
                let closeUpPosition
                
                if (isMonitorscreen06) {
                  // Close-up position for monitorscreen06
                  closeUpPosition = new THREE.Vector3(-0.566, 0.691, 0.845)
                } else if (isMonitorscreen02) {
                  // Close-up position for monitorscreen02
                  closeUpPosition = new THREE.Vector3(0.495, 0.691, 0.845)
                } else {
                  // Default (shouldn't happen, but just in case)
                  closeUpPosition = new THREE.Vector3(-0.566, 0.691, 0.845)
                }
               
                // Disable OrbitControls immediately to prevent orbital rotation during animation
                if (controls && controls.enabled !== undefined) {
                  controls.enabled = false
                }
                
                // Set isCloseUp to true immediately so OrbitControls is removed from scene
                setIsCloseUp(true)
                if (setContextIsCloseUp) setContextIsCloseUp(true)
                // Track which monitor is in close-up
                if (isMonitorscreen06) {
                  setCloseUpMonitor('monitorscreen06')
                  if (onCloseUpMonitorChange) onCloseUpMonitorChange('monitorscreen06')
                } else if (isMonitorscreen02) {
                  setCloseUpMonitor('monitorscreen02')
                  if (onCloseUpMonitorChange) onCloseUpMonitorChange('monitorscreen02')
                }
                
                isAnimatingRef.current = true
                // Animate only position, keep current rotation unchanged
                animateCamera(
                  camera.position,
                  closeUpPosition,
                  rotationToUse, // Keep the current rotation - don't change it
                  () => {
                    isAnimatingRef.current = false
                  }
                )
              }
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
    }
  }, [gl.domElement, camera, raycaster, scene, isCloseUp])
  
  // Animate camera smoothly (ONLY position, NEVER change rotation)
  const animateCamera = (startPos, endPos, preserveRotation, onComplete) => {
    const duration = 1000 // 1 second
    const startTime = Date.now()
    
    // Store the rotation at the start and NEVER change it
    const startRotation = {
      quaternion: preserveRotation.quaternion.clone(),
      rotation: preserveRotation.rotation.clone()
    }
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      
      // ONLY update position - NEVER touch rotation
      camera.position.set(
        THREE.MathUtils.lerp(startPos.x, endPos.x, eased),
        THREE.MathUtils.lerp(startPos.y, endPos.y, eased),
        THREE.MathUtils.lerp(startPos.z, endPos.z, eased)
      )
      
      // PRESERVE rotation - keep it exactly as it was at the start
      // This prevents any orbiting or rotation changes
      camera.quaternion.copy(startRotation.quaternion)
      camera.rotation.copy(startRotation.rotation)
      
      // Update matrix to apply changes
      camera.updateMatrixWorld(true)
      camera.updateProjectionMatrix()
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Ensure final position is set exactly, rotation stays unchanged
        camera.position.copy(endPos)
        camera.quaternion.copy(startRotation.quaternion)
        camera.rotation.copy(startRotation.rotation)
        camera.updateMatrixWorld(true)
        camera.updateProjectionMatrix()
        if (onComplete) onComplete()
      }
    }
    
    animate()
  }

  // Make all cockpit materials lighter
  useEffect(() => {
    if (!scene) return

    scene.traverse((child) => {
      // Skip monitorscreen02 entirely when in close-up to avoid interfering with chat texture
      if (monitorscreen02Ref.current && (child === monitorscreen02Ref.current || monitorscreen02Ref.current.getObjectById(child.id))) {
        if (isCloseUp && closeUpMonitor === 'monitorscreen02') {
          return // Skip entirely when in close-up
        }
      }
      
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        
        materials.forEach((material) => {
          if (material) {
            // Skip if this is a chat material
            if (material.userData?.isChatMaterial) {
              return
            }
            
            // Make material lighter by adjusting color and properties
            if (material.color) {
              // Lighten the color by mixing with white
              const originalColor = material.color.clone()
              material.color.lerp(new THREE.Color(0xffffff), 0.4) // Mix 40% white to lighten
            }
            
            // Increase emissive for additional brightness
            if (material.emissive !== undefined) {
              material.emissive = new THREE.Color(0x222222) // Subtle emissive glow
              material.emissiveIntensity = 0.3
            }
            
            // Adjust roughness for a slightly more reflective surface
            if (material.roughness !== undefined) {
              material.roughness = Math.max(0.3, material.roughness * 0.8) // Make slightly less rough
            }
            
            material.needsUpdate = true
          }
        })
      }
    })
  }, [scene, isCloseUp, closeUpMonitor])

  // Find and store reference to monitorscreen06 and monitorscreen02 elements
  // Also find and remove button15
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

    // Find and remove button15
    const button15 = findElement(scene, 'button15')
    if (button15 && button15.parent) {
      button15.parent.remove(button15)
    }

    // Find and remove button34
    const button34 = findElement(scene, 'button34')
    if (button34 && button34.parent) {
      button34.parent.remove(button34)
    }

    // Find and remove button30
    const button30 = findElement(scene, 'button30')
    if (button30 && button30.parent) {
      button30.parent.remove(button30)
    }

    // Find monitorscreen02 first to get its materials
    const element02 = findElement(scene, 'monitorscreen02')
    if (element02) {
      monitorscreen02Ref.current = element02
      
      // Store original materials for all meshes in this element
      element02.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          originalMaterials02Ref.current.set(child, materials.map(mat => mat.clone()))
        }
      })
    }

    // Find monitorscreen06 and replace its materials with monitorscreen02's materials
    const element06 = findElement(scene, 'monitorscreen06')
    if (element06) {
      monitorscreen06Ref.current = element06
      
      // Get the first material from monitorscreen02 to use as template
      let monitorscreen02Material = null
      if (element02) {
        element02.traverse((child) => {
          if (child.isMesh && child.material && !monitorscreen02Material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            monitorscreen02Material = materials[0] // Use first material as template
          }
        })
      }
      
      // Replace all materials in monitorscreen06 with cloned monitorscreen02 material
      element06.traverse((child) => {
        if (child.isMesh && child.material) {
          if (monitorscreen02Material) {
            // Clone the monitorscreen02 material
            const clonedMaterial = monitorscreen02Material.clone()
            child.material = clonedMaterial
            // Store the replaced material as "original" for highlight effects
            originalMaterialsRef.current.set(child, [clonedMaterial.clone()])
          } else {
            // If monitorscreen02 doesn't exist, just store original materials
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            originalMaterialsRef.current.set(child, materials.map(mat => mat.clone()))
          }
        }
      })
    }

    // Find and store reference to button20
    const button20 = findElement(scene, 'button20')
    if (button20) {
      button20Ref.current = button20
      
      // Store original materials and make them darker for all meshes in this element
      button20.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          const clonedMaterials = materials.map(mat => {
            const cloned = mat.clone()
            // Make the material the same brightness as warning system buttons (70%)
            if (cloned.color) {
              cloned.color.multiplyScalar(0.7) // Make it 70% of original brightness (same as warning buttons)
            }
            // Set roughness to 100% (or smoothness to 0%)
            if (cloned.roughness !== undefined) {
              cloned.roughness = 1.0
            }
            if (cloned.metalness !== undefined) {
              cloned.metalness = 0.0 // Also set metalness to 0 for matte appearance
            }
            cloned.needsUpdate = true
            return cloned
          })
          // Apply the material to the mesh
          child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0]
          // Store the material as "original" for hover effects
          originalMaterialsButton20Ref.current.set(child, clonedMaterials.map(mat => mat.clone()))
        }
      })
    }

    // Find and store reference to button21
    const button21 = findElement(scene, 'button21')
    if (button21) {
      button21Ref.current = button21
      
      // Store original materials and make them darker for all meshes in this element
      button21.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          const clonedMaterials = materials.map(mat => {
            const cloned = mat.clone()
            // Make the material the same brightness as warning system buttons (70%)
            if (cloned.color) {
              cloned.color.multiplyScalar(0.7) // Make it 70% of original brightness (same as warning buttons)
            }
            // Set roughness to 100% (or smoothness to 0%)
            if (cloned.roughness !== undefined) {
              cloned.roughness = 1.0
            }
            if (cloned.metalness !== undefined) {
              cloned.metalness = 0.0 // Also set metalness to 0 for matte appearance
            }
            cloned.needsUpdate = true
            return cloned
          })
          // Apply the material to the mesh
          child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0]
          // Store the material as "original" for hover effects
          originalMaterialsButton21Ref.current.set(child, clonedMaterials.map(mat => mat.clone()))
        }
      })
    }

    // Find and store reference to button18
    const button18 = findElement(scene, 'button18')
    if (button18) {
      button18Ref.current = button18
      // Store original materials
      button18.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          originalMaterialsButton18Ref.current.set(child, materials.map(mat => mat.clone()))
        }
      })
    }

    // Find and store reference to button27
    const button27 = findElement(scene, 'button27')
    if (button27) {
      button27Ref.current = button27
      // Store original materials
      button27.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          originalMaterialsButton27Ref.current.set(child, materials.map(mat => mat.clone()))
        }
      })
    }

    // Find and store reference to button28
    const button28 = findElement(scene, 'button28')
    if (button28) {
      button28Ref.current = button28
      // Store original materials
      button28.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          originalMaterialsButton28Ref.current.set(child, materials.map(mat => mat.clone()))
        }
      })
    }

    // Find and store reference to butotn28 (typo in model name is intentional)
    const butotn28 = findElement(scene, 'butotn28')
    if (butotn28) {
      butotn28Ref.current = butotn28
      // Store original materials
      butotn28.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          originalMaterialsButotn28Ref.current.set(child, materials.map(mat => mat.clone()))
        }
      })
    }

    // Find and store reference to button29
    const button29 = findElement(scene, 'button29')
    if (button29) {
      button29Ref.current = button29
      // Store original materials
      button29.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          originalMaterialsButton29Ref.current.set(child, materials.map(mat => mat.clone()))
        }
      })
    }

    // Find and store reference to button31
    const button31 = findElement(scene, 'button31')
    if (button31) {
      button31Ref.current = button31
      // Store original materials
      button31.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          originalMaterialsButton31Ref.current.set(child, materials.map(mat => mat.clone()))
        }
      })
    }

    // Find and store reference to button32
    const button32 = findElement(scene, 'button32')
    if (button32) {
      button32Ref.current = button32
      // Store original materials
      button32.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          originalMaterialsButton32Ref.current.set(child, materials.map(mat => mat.clone()))
        }
      })
    }

    // Find handle01 and handlebase02 for Engine 1 Switch
    // Keep them in their original positions (don't group them to avoid position issues)
    const handle01 = findElement(scene, 'handle01')
    const handlebase02 = findElement(scene, 'handlebase02')
    
    if (handle01 && handlebase02) {
      // Update world matrices to ensure we get accurate positions
      handle01.updateMatrixWorld(true)
      handlebase02.updateMatrixWorld(true)
      
      // Store refs BEFORE storing positions to ensure we're working with the right objects
      handle01Ref.current = handle01
      handlebase02Ref.current = handlebase02
      
      // Store original local positions for movement animation
      // Store these immediately after finding the elements to preserve original state
      handle01.userData.originalPosition = handle01.position.clone()
      handlebase02.userData.originalPosition = handlebase02.position.clone()
      
      // Store a marker object to identify this as the engine switch group
      // We'll check both meshes individually in raycasting
      engine1SwitchGroupRef.current = { handle01, handlebase02 }
    }

    // Find handle02 and handlebase01 for Engine 2 Switch
    // Keep them in their original positions (don't group them to avoid position issues)
    const handle02 = findElement(scene, 'handle02')
    const handlebase01 = findElement(scene, 'handlebase01')
    
    if (handle02 && handlebase01) {
      // Update world matrices to ensure we get accurate positions
      handle02.updateMatrixWorld(true)
      handlebase01.updateMatrixWorld(true)
      
      // Store refs BEFORE storing positions to ensure we're working with the right objects
      handle02Ref.current = handle02
      handlebase01Ref.current = handlebase01
      
      // Store original local positions for movement animation
      // Store these immediately after finding the elements to preserve original state
      handle02.userData.originalPosition = handle02.position.clone()
      handlebase01.userData.originalPosition = handlebase01.position.clone()
      
      // Store a marker object to identify this as the engine switch group
      // We'll check both meshes individually in raycasting
      engine2SwitchGroupRef.current = { handle02, handlebase01 }
    }
  }, [scene])

  // Apply darker material to warning system buttons based on checkedItems
  useEffect(() => {
    // Map buttons to their checkbox keys in note 2
    const buttonCheckboxMap = [
      { ref: button18Ref, key: 'Cockpit Warning System-0', originalMaterials: originalMaterialsButton18Ref }, // ANTI ICE
      { ref: button27Ref, key: 'Cockpit Warning System-1', originalMaterials: originalMaterialsButton27Ref }, // ENG
      { ref: button28Ref, key: 'Cockpit Warning System-0', originalMaterials: originalMaterialsButton28Ref }, // ANTI ICE (button28 is ANTI ICE)
      { ref: butotn28Ref, key: 'Cockpit Warning System-2', originalMaterials: originalMaterialsButotn28Ref }, // HYD (butotn28 is HYD)
      { ref: button31Ref, key: 'Cockpit Warning System-3', originalMaterials: originalMaterialsButton31Ref }, // OVERHEAD
      { ref: button32Ref, key: 'Cockpit Warning System-4', originalMaterials: originalMaterialsButton32Ref }, // DOORS
      { ref: button29Ref, key: 'Cockpit Warning System-5', originalMaterials: originalMaterialsButton29Ref }, // AIR COND
    ]

    buttonCheckboxMap.forEach(({ ref, key, originalMaterials }) => {
      if (!ref.current) return

      const isChecked = checkedItems[key] || false

      ref.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const originalMaterialsForChild = originalMaterials.current.get(child)
          
          if (isChecked) {
            // Apply darker material when checked - always use original materials as base
            if (originalMaterialsForChild) {
              const darkerMaterials = originalMaterialsForChild.map(mat => {
                const darker = mat.clone()
                if (darker.color) {
                  darker.color.multiplyScalar(0.5) // Make it 50% of original brightness (darker)
                }
                darker.needsUpdate = true
                return darker
              })
              child.material = Array.isArray(child.material) ? darkerMaterials : darkerMaterials[0]
            }
          } else {
            // Restore original materials when unchecked
            if (originalMaterialsForChild) {
              child.material = Array.isArray(child.material) 
                ? originalMaterialsForChild.map(m => m.clone())
                : originalMaterialsForChild[0].clone()
              const restoredMaterials = Array.isArray(child.material) ? child.material : [child.material]
              restoredMaterials.forEach((mat) => {
                if (mat) {
                  mat.needsUpdate = true
                }
              })
            }
          }
        }
      })
    })
  }, [checkedItems])

  // Apply darker material to engine buttons (button20, button21) when their engines are affected
  useEffect(() => {
    // Check if engine1 is affected by vibration or smoke
    const engine1Affected = vibrationAffectedEngines.includes('engine1') || smokeAffectedEngines.includes('engine1')
    
    // Check if engine2 is affected by vibration or smoke
    const engine2Affected = vibrationAffectedEngines.includes('engine2') || smokeAffectedEngines.includes('engine2')

    // Apply darker material to button20 if engine1 is affected
    if (button20Ref.current) {
      button20Ref.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const originalMaterialsForChild = originalMaterialsButton20Ref.current.get(child)
          
          if (engine1Affected) {
            // Apply darker material when engine is affected
            // Use stored original materials as base to ensure consistency
            if (originalMaterialsForChild) {
              const darkerMaterials = originalMaterialsForChild.map(mat => {
                const darker = mat.clone()
                if (darker.color) {
                  // Apply 0.3 multiplier to the stored original (which is already at 0.7)
                  // This gives approximately 0.21 of the true original brightness
                  darker.color.multiplyScalar(0.3 / 0.7) // Adjust to get 30% of true original
                }
                // Set roughness to 100% (or smoothness to 0%)
                if (darker.roughness !== undefined) {
                  darker.roughness = 1.0
                }
                if (darker.metalness !== undefined) {
                  darker.metalness = 0.0 // Also set metalness to 0 for matte appearance
                }
                darker.needsUpdate = true
                return darker
              })
              child.material = Array.isArray(child.material) ? darkerMaterials : darkerMaterials[0]
            }
          } else {
            // Restore original materials when engine is not affected
            if (originalMaterialsForChild) {
              child.material = Array.isArray(child.material) 
                ? originalMaterialsForChild.map(m => m.clone())
                : originalMaterialsForChild[0].clone()
              const restoredMaterials = Array.isArray(child.material) ? child.material : [child.material]
              restoredMaterials.forEach((mat) => {
                if (mat) {
                  mat.needsUpdate = true
                }
              })
            }
          }
        }
      })
    }

    // Apply darker material to button21 if engine2 is affected
    if (button21Ref.current) {
      button21Ref.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const originalMaterialsForChild = originalMaterialsButton21Ref.current.get(child)
          
          if (engine2Affected) {
            // Apply darker material when engine is affected
            // Use stored original materials as base to ensure consistency
            if (originalMaterialsForChild) {
              const darkerMaterials = originalMaterialsForChild.map(mat => {
                const darker = mat.clone()
                if (darker.color) {
                  // Apply 0.3 multiplier to the stored original (which is already at 0.7)
                  // This gives approximately 0.21 of the true original brightness
                  darker.color.multiplyScalar(0.3 / 0.7) // Adjust to get 30% of true original
                }
                // Set roughness to 100% (or smoothness to 0%)
                if (darker.roughness !== undefined) {
                  darker.roughness = 1.0
                }
                if (darker.metalness !== undefined) {
                  darker.metalness = 0.0 // Also set metalness to 0 for matte appearance
                }
                darker.needsUpdate = true
                return darker
              })
              child.material = Array.isArray(child.material) ? darkerMaterials : darkerMaterials[0]
            }
          } else {
            // Restore original materials when engine is not affected
            if (originalMaterialsForChild) {
              child.material = Array.isArray(child.material) 
                ? originalMaterialsForChild.map(m => m.clone())
                : originalMaterialsForChild[0].clone()
              const restoredMaterials = Array.isArray(child.material) ? child.material : [child.material]
              restoredMaterials.forEach((mat) => {
                if (mat) {
                  mat.needsUpdate = true
                }
              })
            }
          }
        }
      })
    }
  }, [vibrationAffectedEngines, smokeAffectedEngines])

  // Handle engine 1 switch position toggle
  useEffect(() => {
    if (!handle01Ref.current || !handlebase02Ref.current) return
    
    const moveDistance = 1.5 // Distance to move down (adjust as needed)
    
    if (engine1SwitchOn) {
      // Move both meshes down
      if (handle01Ref.current.userData.originalPosition) {
        handle01Ref.current.position.y = handle01Ref.current.userData.originalPosition.y - moveDistance
      }
      if (handlebase02Ref.current.userData.originalPosition) {
        handlebase02Ref.current.position.y = handlebase02Ref.current.userData.originalPosition.y - moveDistance
      }
    } else {
      // Move both meshes back to original position
      if (handle01Ref.current.userData.originalPosition) {
        handle01Ref.current.position.copy(handle01Ref.current.userData.originalPosition)
      }
      if (handlebase02Ref.current.userData.originalPosition) {
        handlebase02Ref.current.position.copy(handlebase02Ref.current.userData.originalPosition)
      }
    }
    
    // Notify parent of switch state change
    if (onEngine1SwitchChange) {
      onEngine1SwitchChange(engine1SwitchOn)
    }
  }, [engine1SwitchOn, onEngine1SwitchChange])

  // Handle engine 2 switch position toggle
  useEffect(() => {
    if (!handle02Ref.current || !handlebase01Ref.current) return
    
    const moveDistance = 1.5 // Distance to move down (adjust as needed)
    
    if (engine2SwitchOn) {
      // Move both meshes down
      if (handle02Ref.current.userData.originalPosition) {
        handle02Ref.current.position.y = handle02Ref.current.userData.originalPosition.y - moveDistance
      }
      if (handlebase01Ref.current.userData.originalPosition) {
        handlebase01Ref.current.position.y = handlebase01Ref.current.userData.originalPosition.y - moveDistance
      }
    } else {
      // Move both meshes back to original position
      if (handle02Ref.current.userData.originalPosition) {
        handle02Ref.current.position.copy(handle02Ref.current.userData.originalPosition)
      }
      if (handlebase01Ref.current.userData.originalPosition) {
        handlebase01Ref.current.position.copy(handlebase01Ref.current.userData.originalPosition)
      }
    }
    
    // Notify parent of switch state change
    if (onEngine2SwitchChange) {
      onEngine2SwitchChange(engine2SwitchOn)
    }
  }, [engine2SwitchOn, onEngine2SwitchChange])

  // Apply highlight effect for monitorscreen06 and monitorscreen02 (dark color on hover)
  // button20 and button21 don't change material on hover - they show text instead
  useEffect(() => {
    // Skip hover effects entirely when in close-up for monitorscreen02 or monitorscreen06
    if (isCloseUp && (closeUpMonitor === 'monitorscreen02' || closeUpMonitor === 'monitorscreen06')) {
      return
    }
    
    const isHovered06 = hoveredElement === monitorscreen06Ref.current
    const isHovered02 = hoveredElement === monitorscreen02Ref.current

    const applyHighlight = (elementRef, highlight, originalMaterialsRef) => {
      if (!elementRef.current) return
      
      // Skip monitorscreen02 entirely when in close-up to prevent interference with chat texture
      // Skip monitorscreen06 entirely when in close-up to prevent hover effects
      if ((elementRef.current === monitorscreen02Ref.current && isCloseUp && closeUpMonitor === 'monitorscreen02') ||
          (elementRef.current === monitorscreen06Ref.current && isCloseUp && closeUpMonitor === 'monitorscreen06')) {
        return // Don't apply any highlight effects when in close-up
      }

      elementRef.current.traverse((child) => {
        // Make sure this child is actually part of the element hierarchy
        let current = child
        let isPartOfElement = false
        while (current) {
          if (current === elementRef.current) {
            isPartOfElement = true
            break
          }
          if (current === scene || !current.parent) break
          current = current.parent
        }
        
        if (!isPartOfElement) return
        
        if (child.isMesh && child.material) {
          let materials = Array.isArray(child.material) ? child.material : [child.material]
          
          // Skip if any material is a chat material
          const hasChatMaterial = materials.some(m => m?.userData?.isChatMaterial)
          if (hasChatMaterial) {
            return // Skip this mesh entirely - don't modify chat materials
          }
          
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
            // BUT don't restore if we have a chat texture material applied
            if (!hasChatMaterial && child.userData.clonedMaterials) {
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
              // Apply dark color on hover
              if (material.color) {
                material.color.setHex(0x1a1a1a) // Dark gray/black
              }
              // Reduce emissive to make it darker
              if (material.emissive !== undefined) {
                material.emissive = new THREE.Color(0x000000)
                material.emissiveIntensity = 0.0
              }
              material.needsUpdate = true
            } else {
              // Material will be restored by replacing with original above
              material.needsUpdate = true
            }
          })
        }
      })
    }

    // Apply dark highlight for monitorscreen06
    // Skip if in close-up to prevent hover effects
    if (!(isCloseUp && closeUpMonitor === 'monitorscreen06')) {
      applyHighlight(
        monitorscreen06Ref,
        isHovered06,
        originalMaterialsRef
      )
    }

    // Apply dark highlight for monitorscreen02
    // Skip if in close-up to prevent interference with chat texture
    if (!(isCloseUp && closeUpMonitor === 'monitorscreen02')) {
      applyHighlight(
        monitorscreen02Ref,
        isHovered02,
        originalMaterials02Ref
      )
    }
  }, [hoveredElement, isCloseUp, closeUpMonitor])

  // Note: OrbitControls is now conditionally rendered in Scene component
  // No need to manually disable it here - it's completely removed from the scene when needed
  
  // Log camera position and rotation in gizmo mode (using useFrame to ensure accurate values)
  useFrame(() => {
    if (!gizmoMode || !isCloseUp || isAnimatingRef.current) return
    
    const now = Date.now()
    // Log position every 500ms
    if (now - lastLogTimeRef.current >= 500) {
      lastLogTimeRef.current = now
      
      // Ensure camera matrix is up to date before reading position and rotation
      camera.updateMatrixWorld(true)
      
      // Log the camera's local position and rotation (this is what we use in closeUpPosition)
      console.log('📐 Camera Position & Rotation:', {
        position: {
          x: camera.position.x.toFixed(3),
          y: camera.position.y.toFixed(3),
          z: camera.position.z.toFixed(3),
          formatted: `new THREE.Vector3(${camera.position.x.toFixed(3)}, ${camera.position.y.toFixed(3)}, ${camera.position.z.toFixed(3)})`
        },
        rotation: {
          x: camera.rotation.x.toFixed(4),
          y: camera.rotation.y.toFixed(4),
          z: camera.rotation.z.toFixed(4),
          formatted: `[${camera.rotation.x.toFixed(4)}, ${camera.rotation.y.toFixed(4)}, ${camera.rotation.z.toFixed(4)}]`
        },
        quaternion: {
          x: camera.quaternion.x.toFixed(4),
          y: camera.quaternion.y.toFixed(4),
          z: camera.quaternion.z.toFixed(4),
          w: camera.quaternion.w.toFixed(4),
          formatted: `new THREE.Quaternion(${camera.quaternion.x.toFixed(4)}, ${camera.quaternion.y.toFixed(4)}, ${camera.quaternion.z.toFixed(4)}, ${camera.quaternion.w.toFixed(4)})`
        }
      })
    }
  })
  
  // Enable gizmo mode with 'G' key, handle WASD movement, and handle 'e' to exit comms
  useEffect(() => {
    if (!isCloseUp) return
    
    const handleKeyDown = (event) => {
      // Forward keyboard input to chat input field when in close-up for monitorscreen02
      if (isCloseUp && closeUpMonitor === 'monitorscreen02' && chatContainerRef.current) {
        const chatInput = chatContainerRef.current.querySelector('input[type="text"], textarea')
        if (chatInput && document.activeElement !== chatInput) {
          // Focus the input and forward the key event
          chatInput.focus()
          // Create and dispatch the key event to the input
          const keyEvent = new KeyboardEvent(event.type, {
            bubbles: true,
            cancelable: true,
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            which: event.which,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
          })
          chatInput.dispatchEvent(keyEvent)
          
          // Also update the input value for character keys
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const start = chatInput.selectionStart || 0
            const end = chatInput.selectionEnd || 0
            const value = chatInput.value
            const newValue = value.substring(0, start) + event.key + value.substring(end)
            chatInput.value = newValue
            // Trigger input event for React
            const inputEvent = new Event('input', { bubbles: true })
            chatInput.dispatchEvent(inputEvent)
            // Update cursor position
            const newPos = start + 1
            chatInput.setSelectionRange(newPos, newPos)
          } else if (event.key === 'Backspace') {
            const start = chatInput.selectionStart || 0
            const end = chatInput.selectionEnd || 0
            const value = chatInput.value
            if (start === end && start > 0) {
              const newValue = value.substring(0, start - 1) + value.substring(start)
              chatInput.value = newValue
              const inputEvent = new Event('input', { bubbles: true })
              chatInput.dispatchEvent(inputEvent)
              chatInput.setSelectionRange(start - 1, start - 1)
            } else if (start !== end) {
              const newValue = value.substring(0, start) + value.substring(end)
              chatInput.value = newValue
              const inputEvent = new Event('input', { bubbles: true })
              chatInput.dispatchEvent(inputEvent)
              chatInput.setSelectionRange(start, start)
            }
            event.preventDefault()
          } else if (event.key === 'Enter') {
            // Trigger the send button click
            const sendButton = chatContainerRef.current.querySelector('button:not([disabled])')
            if (sendButton) {
              sendButton.click()
            }
            event.preventDefault()
          }
          
          // Prevent the key from being processed by other handlers (except 'e' for exit)
          if (event.key !== 'e' && event.key !== 'E') {
            event.preventDefault()
            event.stopPropagation()
          }
          return
        }
      }
      const key = event.key.toLowerCase()
      
      // Toggle gizmo mode with G
      if (key === 'g') {
        setGizmoMode(prev => {
          const newMode = !prev
          if (newMode) {
            console.log('🎯 Gizmo mode ENABLED - Use WASD to move camera. Position will be logged to console.')
            console.log('   W/A/S/D: Move forward/left/back/right')
            console.log('   E/X: Move up/down')
            console.log('   Press G again to disable gizmo mode.')
            
            // OrbitControls will be removed from the scene by the Scene component
          } else {
            console.log('🎯 Gizmo mode DISABLED')
            // Reset keys when disabling
            keysPressedRef.current = { w: false, a: false, s: false, d: false, e: false, x: false }
            
            // OrbitControls will be restored to the scene by the Scene component
          }
          return newMode
        })
      }
      
      // Track WASD and E/X keys
      if (gizmoMode && (key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'e' || key === 'x')) {
        keysPressedRef.current[key] = true
        event.preventDefault()
      }
    }
    
    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase()
      if (gizmoMode && (key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'e' || key === 'x')) {
        keysPressedRef.current[key] = false
        event.preventDefault()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isCloseUp, gizmoMode, closeUpMonitor, camera, controls])
  
  // Move camera with WASD in gizmo mode
  useFrame((state, delta) => {
    if (!gizmoMode || !isCloseUp || isAnimatingRef.current) return
    
    // OrbitControls is completely removed from the scene in gizmo mode
    // No need to disable it here
    
    const moveSpeed = 0.2 * delta // Very slow speed for precise positioning
    const keys = keysPressedRef.current
    
    // Get camera's local axes in world space
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(camera.quaternion)
    
    const right = new THREE.Vector3(1, 0, 0)
    right.applyQuaternion(camera.quaternion)
    
    const up = new THREE.Vector3(0, 1, 0)
    up.applyQuaternion(camera.quaternion)
    
    // Calculate movement direction based on camera's local axes
    const moveDirection = new THREE.Vector3(0, 0, 0)
    
    // W/S: Move forward/back along camera's forward axis
    if (keys.w) moveDirection.add(forward)
    if (keys.s) moveDirection.sub(forward)
    
    // A/D: Move left/right along camera's right axis
    if (keys.a) moveDirection.sub(right)
    if (keys.d) moveDirection.add(right)
    
    // E/X: Move up/down along camera's up axis
    if (keys.e) moveDirection.add(up)
    if (keys.x) moveDirection.sub(up)
    
    // Apply movement directly to camera position
    if (moveDirection.length() > 0) {
      moveDirection.normalize()
      moveDirection.multiplyScalar(moveSpeed)
      camera.position.add(moveDirection)
      // Force camera matrix update to ensure position change is applied
      camera.updateMatrixWorld(true)
    }
  })

  // Note: No rotation locking - camera rotation is free in all modes
  // OrbitControls is removed in gizmo mode, so no orbiting behavior
  // The camera rotation is only set during the animation, not continuously locked

  // Apply vibration effect to cockpit when engines are affected
  const hasVibration = vibrationAffectedEngines.length > 0
  const basePositionRef = useRef(new THREE.Vector3(...position))
  const vibrationStartTimeRef = useRef(null)
  const vibrationStopTimeRef = useRef(null)
  const rampUpDuration = 2.0 // Time in seconds to reach full intensity
  const fadeOutDuration = 2.0 // Time in seconds to fade out completely
  
  // Track when vibration starts and stops
  useEffect(() => {
    if (hasVibration && vibrationStartTimeRef.current === null) {
      // Vibration just started - record the start time
      vibrationStartTimeRef.current = Date.now()
      vibrationStopTimeRef.current = null // Clear stop time when starting
    } else if (!hasVibration && vibrationStartTimeRef.current !== null) {
      // Vibration just stopped - record the stop time for fade-out
      if (vibrationStopTimeRef.current === null) {
        vibrationStopTimeRef.current = Date.now()
      }
    }
  }, [hasVibration])
  
  // Update base position when position prop changes and initialize group position
  useEffect(() => {
    basePositionRef.current.set(...position)
    if (groupRef.current) {
      if (!hasVibration) {
        groupRef.current.position.set(...position)
      }
    }
  }, [position, hasVibration])
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Check if we're in fade-out phase (vibration stopped but fade-out not complete)
      const isFadingOut = !hasVibration && vibrationStopTimeRef.current !== null
      const isActive = hasVibration || isFadingOut
      
      if (isActive) {
        // Calculate ramp-up factor (0 to 1) when starting
        let rampUpFactor = 1.0
        if (hasVibration && vibrationStartTimeRef.current !== null) {
          const elapsed = (Date.now() - vibrationStartTimeRef.current) / 1000 // Convert to seconds
          const progress = Math.min(elapsed / rampUpDuration, 1.0) // Clamp to 1.0
          
          // Use ease-in-out curve for smooth ramp-up
          rampUpFactor = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2
        }
        
        // Calculate fade-out factor (1 to 0) when stopping
        let fadeOutFactor = 1.0
        if (isFadingOut && vibrationStopTimeRef.current !== null) {
          const elapsed = (Date.now() - vibrationStopTimeRef.current) / 1000 // Convert to seconds
          const progress = Math.min(elapsed / fadeOutDuration, 1.0) // Clamp to 1.0
          
          // Use ease-in-out curve for smooth fade-out
          fadeOutFactor = progress < 0.5
            ? 1 - 2 * progress * progress
            : Math.pow(-2 * progress + 2, 2) / 2
          
          // If fade-out is complete, reset everything
          if (progress >= 1.0) {
            vibrationStartTimeRef.current = null
            vibrationStopTimeRef.current = null
            groupRef.current.position.copy(basePositionRef.current)
            return
          }
        }
        
        // Combine ramp-up and fade-out factors
        const intensityFactor = rampUpFactor * fadeOutFactor
        
        // Create a shaking effect with random small offsets
        const maxIntensity = 0.005 // Maximum vibration intensity (reduced for subtler effect)
        const intensity = maxIntensity * intensityFactor // Apply both factors
        const time = state.clock.elapsedTime
        
        // Use multiple sine waves at different frequencies for more realistic vibration
        const offsetX = (Math.sin(time * 50) + Math.sin(time * 73) * 0.5) * intensity
        const offsetY = (Math.cos(time * 43) + Math.cos(time * 67) * 0.5) * intensity
        const offsetZ = (Math.sin(time * 37) + Math.sin(time * 59) * 0.5) * intensity
        
        // Apply vibration offset to the group's position
        groupRef.current.position.set(
          basePositionRef.current.x + offsetX,
          basePositionRef.current.y + offsetY,
          basePositionRef.current.z + offsetZ
        )
      } else {
        // No vibration and not fading out - ensure position is reset
        groupRef.current.position.copy(basePositionRef.current)
      }
    }
  })

  // Raycast for hover detection for monitorscreen06, monitorscreen02, button20, and button21
  useFrame(() => {
    if (!gl.domElement || !groupRef.current) return

    // Use manually tracked mouse position instead of useThree mouse
    const mousePos = mousePositionRef.current
    raycaster.setFromCamera(mousePos, camera)

    // Check monitorscreen06, monitorscreen02, button20, button21, and other buttons
    // Skip monitorscreen02 if in close-up for monitorscreen02 (no hover interaction)
    // Skip monitorscreen06 if in close-up for monitorscreen06 (no hover interaction)
    const elementsToCheck = [
      ...(isCloseUp && closeUpMonitor === 'monitorscreen06' ? [] : [{ ref: monitorscreen06Ref, name: 'monitorscreen06' }]),
      ...(isCloseUp && closeUpMonitor === 'monitorscreen02' ? [] : [{ ref: monitorscreen02Ref, name: 'monitorscreen02' }]),
      { ref: button20Ref, name: 'button20' },
      { ref: button21Ref, name: 'button21' },
      { ref: button18Ref, name: 'button18' },
      { ref: button27Ref, name: 'button27' },
      { ref: button28Ref, name: 'button28' },
      { ref: butotn28Ref, name: 'butotn28' },
      { ref: button29Ref, name: 'button29' },
      { ref: button31Ref, name: 'button31' },
      { ref: button32Ref, name: 'button32' }
    ]

    let foundIntersection = null

    // Check regular elements
    for (const { ref, name } of elementsToCheck) {
      if (!ref.current) continue

      // Get all meshes in the element and update their world matrices
      const meshes = []
      ref.current.traverse((child) => {
        if (child.isMesh) {
          // Update world matrix to account for group transforms
          child.updateMatrixWorld(true)
          meshes.push(child)
        }
      })

      if (meshes.length === 0) continue

      // Also try raycasting against the entire group to account for transforms
      // First try direct meshes, then try the group
      let allIntersects = raycaster.intersectObjects(meshes, true)
      
      // If no intersections with meshes directly, try the group
      if (allIntersects.length === 0) {
        allIntersects = raycaster.intersectObject(groupRef.current, true)
        // Filter to only the current element
        allIntersects = allIntersects.filter(intersect => {
          let current = intersect.object
          while (current) {
            if (current === ref.current) return true
            if (current === scene || !current.parent) break
            current = current.parent
          }
          return false
        })
      }
      
      if (allIntersects.length > 0) {
        foundIntersection = ref.current
        break
      }
    }
    
    // Check engine 1 switch (handle01 and handlebase02) separately since they're not grouped
    if (!foundIntersection && engine1SwitchGroupRef.current && handle01Ref.current && handlebase02Ref.current) {
      const switchMeshes = []
      handle01Ref.current.traverse((child) => {
        if (child.isMesh) {
          child.updateMatrixWorld(true)
          switchMeshes.push(child)
        }
      })
      handlebase02Ref.current.traverse((child) => {
        if (child.isMesh) {
          child.updateMatrixWorld(true)
          switchMeshes.push(child)
        }
      })
      
      const switchIntersects = raycaster.intersectObjects(switchMeshes, true)
      if (switchIntersects.length > 0) {
        // Check if intersection is from handle01 or handlebase02
        let current = switchIntersects[0].object
        while (current) {
          if (current === handle01Ref.current || current === handlebase02Ref.current) {
            foundIntersection = engine1SwitchGroupRef.current // Use the ref object as the intersection marker
            break
          }
          if (current === scene || !current.parent) break
          current = current.parent
        }
      }
    }

    // Check engine 2 switch (handle02 and handlebase01) separately since they're not grouped
    if (!foundIntersection && engine2SwitchGroupRef.current && handle02Ref.current && handlebase01Ref.current) {
      const switchMeshes = []
      handle02Ref.current.traverse((child) => {
        if (child.isMesh) {
          child.updateMatrixWorld(true)
          switchMeshes.push(child)
        }
      })
      handlebase01Ref.current.traverse((child) => {
        if (child.isMesh) {
          child.updateMatrixWorld(true)
          switchMeshes.push(child)
        }
      })
      
      const switchIntersects = raycaster.intersectObjects(switchMeshes, true)
      if (switchIntersects.length > 0) {
        // Check if intersection is from handle02 or handlebase01
        let current = switchIntersects[0].object
        while (current) {
          if (current === handle02Ref.current || current === handlebase01Ref.current) {
            foundIntersection = engine2SwitchGroupRef.current // Use the ref object as the intersection marker
            break
          }
          if (current === scene || !current.parent) break
          current = current.parent
        }
      }
    }
    
    if (foundIntersection) {
      if (hoveredElement !== foundIntersection) {
        const previousHovered = hoveredElement
        setHoveredElement(foundIntersection)
        gl.domElement.style.cursor = 'pointer'
        
        // Notify parent component about button hover
        if (onButtonHover) {
          // Clear previous hover if it was a button or monitor
          if (previousHovered === button20Ref.current || previousHovered === button21Ref.current || previousHovered === monitorscreen02Ref.current || previousHovered === monitorscreen06Ref.current ||
              previousHovered === button18Ref.current || previousHovered === button27Ref.current || previousHovered === button28Ref.current ||
              previousHovered === butotn28Ref.current || previousHovered === button29Ref.current || previousHovered === button31Ref.current || previousHovered === button32Ref.current ||
              previousHovered === engine1SwitchGroupRef.current || previousHovered === engine2SwitchGroupRef.current) {
            onButtonHover(null)
          }
          // Set new button/monitor hover
          if (foundIntersection === button20Ref.current) {
            onButtonHover('button20')
          } else if (foundIntersection === button21Ref.current) {
            onButtonHover('button21')
          } else if (foundIntersection === monitorscreen02Ref.current) {
            // monitorscreen02 hover (only when not in close-up)
            onButtonHover('monitorscreen02')
          } else if (foundIntersection === monitorscreen06Ref.current) {
            // monitorscreen06 hover (only when not in close-up)
            onButtonHover('monitorscreen06')
          } else if (foundIntersection === button18Ref.current) {
            onButtonHover('button18')
          } else if (foundIntersection === button27Ref.current) {
            onButtonHover('button27')
          } else if (foundIntersection === button28Ref.current) {
            onButtonHover('button28')
          } else if (foundIntersection === butotn28Ref.current) {
            onButtonHover('butotn28')
          } else if (foundIntersection === button29Ref.current) {
            onButtonHover('button29')
          } else if (foundIntersection === button31Ref.current) {
            onButtonHover('button31')
          } else if (foundIntersection === button32Ref.current) {
            onButtonHover('button32')
          } else if (foundIntersection && foundIntersection === engine1SwitchGroupRef.current) {
            // Include switch state in hover text
            const switchStatus = engine1SwitchOn ? 'Off' : 'On'
            onButtonHover(`Engine 1 Switch (${switchStatus})`)
          } else if (foundIntersection && foundIntersection === engine2SwitchGroupRef.current) {
            // Include switch state in hover text
            const switchStatus = engine2SwitchOn ? 'Off' : 'On'
            onButtonHover(`Engine 2 Switch (${switchStatus})`)
          } else {
            onButtonHover(null)
          }
        }
      }
    } else {
      if (hoveredElement) {
        const wasButtonOrMonitor = hoveredElement === button20Ref.current || hoveredElement === button21Ref.current || hoveredElement === monitorscreen02Ref.current || hoveredElement === monitorscreen06Ref.current ||
            hoveredElement === button18Ref.current || hoveredElement === button27Ref.current || hoveredElement === button28Ref.current ||
            hoveredElement === butotn28Ref.current || hoveredElement === button29Ref.current || hoveredElement === button31Ref.current || hoveredElement === button32Ref.current ||
            (hoveredElement && hoveredElement === engine1SwitchGroupRef.current) || (hoveredElement && hoveredElement === engine2SwitchGroupRef.current)
        setHoveredElement(null)
        gl.domElement.style.cursor = 'default'
        
        // Notify parent component that hover ended
        if (onButtonHover && wasButtonOrMonitor) {
          onButtonHover(null)
        }
      }
    }
  })

  // Create canvas texture for chat display on monitorscreen02
  const chatCanvasRef = useRef(null)
  const chatContainerRef = useRef(null)
  const chatTextureRef = useRef(null)
  const chatRootRef = useRef(null)
  const textureUpdateIntervalRef = useRef(null)
  
  // Initialize canvas and texture
  useEffect(() => {
    if (!chatCanvasRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      chatCanvasRef.current = canvas
      
      // Initialize canvas with dark background (no test pattern)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Dark background to match chat UI
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(0, 0, 1024, 1024)
        ctx.lineWidth = 20
        ctx.strokeRect(50, 50, 924, 924)
      }
      
      const texture = new THREE.CanvasTexture(canvas)
      texture.flipY = false
      texture.needsUpdate = true
      chatTextureRef.current = texture
    }
    
    // Create hidden container for React rendering
    // Match the exact dimensions and styling of the original ChatConnection when position="inline"
    if (!chatContainerRef.current) {
      const container = document.createElement('div')
      container.id = 'monitorscreen02-chat-container'
      // Match the inline position styling from ChatConnection
      container.style.width = '400px'
      container.style.height = '300px'
      container.style.position = 'fixed'
      // Position off-screen - clicks will be forwarded from 3D monitor
      container.style.left = '-10000px'
      container.style.top = '-10000px'
      // Make it invisible but still functional for texture capture and programmatic clicks
      container.style.visibility = 'hidden'
      container.style.opacity = '0'
      container.style.pointerEvents = 'auto' // Allow programmatic clicks
      // Preserve original chat UI styling - don't override background, let Chat component handle it
      container.style.overflow = 'hidden'
      container.style.transform = 'scale(1)'
      container.style.zIndex = '-1'
      // Ensure all CSS is preserved (fonts, colors, etc.)
      container.style.boxSizing = 'border-box'
      document.body.appendChild(container)
      chatContainerRef.current = container
    }
    
    return () => {
      if (chatContainerRef.current && chatContainerRef.current.parentNode) {
        chatContainerRef.current.parentNode.removeChild(chatContainerRef.current)
      }
      if (chatRootRef.current) {
        chatRootRef.current.unmount()
        chatRootRef.current = null
      }
      if (textureUpdateIntervalRef.current) {
        clearInterval(textureUpdateIntervalRef.current)
      }
    }
  }, [])
  
  // Render chat component to container and update texture
  // Always render to hidden container when chatComponent is available, but only apply texture when in close-up
  useEffect(() => {
    if (chatComponent && chatContainerRef.current && chatCanvasRef.current) {
      // Render React component to hidden container
      if (!chatRootRef.current) {
        const root = createRoot(chatContainerRef.current)
        chatRootRef.current = root
      }
      
      if (chatRootRef.current) {
        chatRootRef.current.render(chatComponent)
        
        // Ensure the container and all its children can receive clicks
        // Add a small delay to ensure React has rendered
        setTimeout(() => {
          if (chatContainerRef.current) {
            // Force pointer events on all interactive elements
            const interactiveElements = chatContainerRef.current.querySelectorAll('button, input, a, [onclick]')
            interactiveElements.forEach((el) => {
              el.style.pointerEvents = 'auto'
              el.style.cursor = 'pointer'
            })
          }
        }, 100)
        
        // Function to capture container to canvas
        const captureToCanvas = () => {
          if (!chatContainerRef.current || !chatCanvasRef.current) return
          
          const container = chatContainerRef.current
          const canvas = chatCanvasRef.current
          const ctx = canvas.getContext('2d')
          
          if (!ctx) return
          
          // Use html2canvas to capture the chat container
          // Get actual container dimensions
          const containerWidth = container.scrollWidth || container.offsetWidth || 400
          const containerHeight = container.scrollHeight || container.offsetHeight || 300
          
          // Scale factor to match test texture size (test texture filled 1024x1024)
          // Scale to make the chat fill most of the canvas like the test texture did
          const targetScale = 2.56 // 1024 / 400 = 2.56 (scale to fill width)
          
          // Temporarily make container visible for capture
          const originalVisibility = container.style.visibility
          const originalOpacity = container.style.opacity
          const originalPosition = container.style.position
          const originalLeft = container.style.left
          const originalTop = container.style.top
          
          container.style.visibility = 'visible'
          container.style.opacity = '1'
          container.style.position = 'fixed'
          container.style.left = '0px'
          container.style.top = '0px'
          
          html2canvas(container, {
            width: containerWidth,
            height: containerHeight,
            backgroundColor: null, // Use transparent to preserve original chat UI colors
            scale: targetScale, // Scale up to match test texture size
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: containerWidth,
            windowHeight: containerHeight,
            // Preserve all styling and fonts
            ignoreElements: (element) => false, // Capture all elements
            onclone: (clonedDoc) => {
              // Ensure all styles are preserved in the cloned document
              const clonedContainer = clonedDoc.getElementById('monitorscreen02-chat-container')
              if (clonedContainer) {
                // Ensure visibility for capture
                clonedContainer.style.visibility = 'visible'
                clonedContainer.style.position = 'absolute'
                clonedContainer.style.left = '0'
                clonedContainer.style.top = '0'
                clonedContainer.style.opacity = '1'
                clonedContainer.style.pointerEvents = 'auto' // Ensure buttons are clickable in clone
              }
            }
          }).then((htmlCanvas) => {
            // Restore container visibility after capture
            container.style.visibility = originalVisibility
            container.style.opacity = originalOpacity
            container.style.position = originalPosition
            container.style.left = originalLeft
            container.style.top = originalTop
            // Clear canvas first
            ctx.clearRect(0, 0, 1024, 1024)
            
            // Fill with the chat UI background color to match original styling
            ctx.fillStyle = 'rgba(31, 41, 55, 0.95)' // Match Chat component background
            ctx.fillRect(0, 0, 1024, 1024)
            
            // Scale down the texture to "zoom out" - make it smaller
            const scaleDown = 0.85 // Make it 85% of original size (zoom out)
            const scaledWidth = htmlCanvas.width * scaleDown
            const scaledHeight = htmlCanvas.height * scaleDown
            
            // Center horizontally, but move down more to avoid being cut off
            const offsetX = (1024 - scaledWidth) / 2
            const offsetY = (1024 - scaledHeight) / 2 + 80 // Move down by 80 pixels to avoid cutoff
            
            // Draw the chat content scaled down and positioned lower
            ctx.drawImage(htmlCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
            
            if (chatTextureRef.current) {
              chatTextureRef.current.needsUpdate = true
            }
          }).catch((error) => {
            // Restore container visibility even on error
            container.style.visibility = originalVisibility
            container.style.opacity = originalOpacity
            container.style.position = originalPosition
            container.style.left = originalLeft
            container.style.top = originalTop
            console.error('Error capturing chat to canvas:', error)
            console.error('Error capturing chat to canvas:', error)
            // Fallback: Draw a simple representation
            ctx.fillStyle = '#1f2937'
            ctx.fillRect(0, 0, 1024, 1024)
            ctx.fillStyle = '#60a5fa'
            ctx.font = 'bold 64px monospace'
            ctx.textAlign = 'center'
            ctx.fillText('Chat', 512, 400)
            ctx.fillStyle = '#f8fafc'
            ctx.font = '32px monospace'
            ctx.fillText('Display Active', 512, 500)
            if (chatTextureRef.current) {
              chatTextureRef.current.needsUpdate = true
            }
          })
          
          // Fallback removed - using html2canvas directly
          if (false) {
            // Fallback: Draw a simple representation
            ctx.fillStyle = '#1f2937'
            ctx.fillRect(0, 0, 1024, 1024)
            ctx.fillStyle = '#60a5fa'
            ctx.font = 'bold 64px monospace'
            ctx.textAlign = 'center'
            ctx.fillText('Chat', 512, 400)
            ctx.fillStyle = '#f8fafc'
            ctx.font = '32px monospace'
            ctx.fillText('Display Active', 512, 500)
            if (chatTextureRef.current) {
              chatTextureRef.current.needsUpdate = true
            }
          }
        }
        
        // Only capture and update texture when in close-up for monitorscreen02
        if (isCloseUp && closeUpMonitor === 'monitorscreen02') {
          // Wait for React to render, then capture
          setTimeout(captureToCanvas, 300)
          
          // Set up periodic updates to refresh the texture
          if (textureUpdateIntervalRef.current) {
            clearInterval(textureUpdateIntervalRef.current)
          }
          textureUpdateIntervalRef.current = setInterval(captureToCanvas, 1000) // Update every second
        } else {
          // Clear interval when not in close-up
          if (textureUpdateIntervalRef.current) {
            clearInterval(textureUpdateIntervalRef.current)
            textureUpdateIntervalRef.current = null
          }
        }
      }
    }
  }, [chatComponent, isCloseUp, closeUpMonitor])
  
  // Apply texture to monitorscreen02 material - use useFrame to ensure it persists
  const textureAppliedRef = useRef(false)
  const lastLogTimeRef2 = useRef(0)
  const lastMaterialCheckRef = useRef(null)
  
  useFrame(() => {
    const now = Date.now()
    const shouldLog = now - lastLogTimeRef2.current > 2000 // Log every 2 seconds for debugging
    
    if (monitorscreen02Ref.current && chatTextureRef.current && isCloseUp && closeUpMonitor === 'monitorscreen02') {
      let meshCount = 0
      let materialCount = 0
      let applied = false
      let materialChanged = false
      
      monitorscreen02Ref.current.traverse((child) => {
        if (child.isMesh && child.material) {
          meshCount++
          
          
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((mat, matIndex) => {
            if (mat) {
              materialCount++
              
              // Check if material was changed since last frame
              const materialKey = `${mat.type}-${mat.map === chatTextureRef.current ? 'chat' : 'other'}`
              if (lastMaterialCheckRef.current !== materialKey) {
                materialChanged = true
                if (shouldLog) {
                  console.log('🔍 Material changed detected', {
                    previous: lastMaterialCheckRef.current,
                    current: materialKey,
                    materialType: mat.type,
                    hasChatTexture: mat.map === chatTextureRef.current,
                    isChatMaterial: mat.userData?.isChatMaterial
                  })
                }
                lastMaterialCheckRef.current = materialKey
              }
              
              // ALWAYS apply chat texture - FORCE it every single frame
              // This ensures nothing can overwrite it, even if something runs after this
              const isChatMaterial = mat.userData?.isChatMaterial && mat.type === 'MeshBasicMaterial'
              const hasCorrectTexture = mat.map === chatTextureRef.current
              
              // ALWAYS recreate the material every frame to prevent any overwrites
              // Don't check conditions - just force it
              if (!isChatMaterial || !hasCorrectTexture || mat.type !== 'MeshBasicMaterial' || true) { // Always true to force every frame
                // Create a new MeshBasicMaterial to ensure texture is visible
                // This material type doesn't require lighting
                // Always create new material to prevent any cached references
                if (!mat.userData.isChatMaterial || mat.type !== 'MeshBasicMaterial' || mat.map !== chatTextureRef.current) {
                  const basicMat = new THREE.MeshBasicMaterial({
                    map: chatTextureRef.current,
                    color: new THREE.Color(0xffffff), // White to show texture clearly
                    transparent: false,
                    opacity: 1.0,
                    side: THREE.DoubleSide, // Render both sides in case mesh is flipped
                  })
                  
                  // Ensure texture properties are correct
                  // Fix orientation: rotate 90 degrees counter-clockwise, flip horizontally, and add slight clockwise correction
                  if (basicMat.map) {
                    basicMat.map.flipY = false
                    basicMat.map.wrapS = THREE.RepeatWrapping
                    basicMat.map.wrapT = THREE.RepeatWrapping
                    // Rotate 90 degrees counter-clockwise (left) + a few degrees clockwise to correct tilt
                    basicMat.map.rotation = Math.PI / 2 - (3 * Math.PI / 180) // 90° - 3° = 87° counter-clockwise
                    basicMat.map.center.set(0.5, 0.5) // Rotate around center
                    // Flip horizontally
                    basicMat.map.repeat.x = -1
                    // Move texture down: use offset.y to shift vertically (negative moves down in UV space after rotation)
                    basicMat.map.offset.y = -0.1 // Move down (negative Y offset moves content down)
                  }
                  
                  // Copy userData
                  basicMat.userData = { ...mat.userData }
                  basicMat.userData.isChatMaterial = true
                  
                  // Replace the material
                  const materialIndex = Array.isArray(child.material) 
                    ? materials.indexOf(mat) 
                    : 0
                  
                  if (Array.isArray(child.material)) {
                    const newMaterials = [...child.material]
                    newMaterials[materialIndex] = basicMat
                    child.material = newMaterials
                  } else {
                    child.material = basicMat
                  }
                  
                  // DON'T overwrite originalMaterials02Ref - we need to keep the true originals for restoration
                  // The original materials are already stored when the component loads
                  
                  applied = true
                  lastMaterialCheckRef.current = `MeshBasicMaterial-chat`
                } else {
                  // Material exists but might have wrong texture - force recreate anyway
                  // This ensures it's always correct, even if something modified it
                  const basicMat = new THREE.MeshBasicMaterial({
                    map: chatTextureRef.current,
                    color: new THREE.Color(0xffffff),
                    transparent: false,
                    opacity: 1.0,
                    side: THREE.DoubleSide,
                  })
                  
                  // Fix orientation: rotate 90 degrees counter-clockwise, flip horizontally, and add slight clockwise correction
                  if (basicMat.map) {
                    basicMat.map.flipY = false
                    basicMat.map.wrapS = THREE.RepeatWrapping
                    basicMat.map.wrapT = THREE.RepeatWrapping
                    // Rotate 90 degrees counter-clockwise (left) + a few degrees clockwise to correct tilt
                    basicMat.map.rotation = Math.PI / 2 - (3 * Math.PI / 180) // 90° - 3° = 87° counter-clockwise
                    basicMat.map.center.set(0.5, 0.5) // Rotate around center
                    // Flip horizontally
                    basicMat.map.repeat.x = -1
                    // Move texture down: use offset.y to shift vertically (negative moves down in UV space after rotation)
                    basicMat.map.offset.y = -0.1 // Move down (negative Y offset moves content down)
                  }
                  
                  basicMat.userData = { ...mat.userData }
                  basicMat.userData.isChatMaterial = true
                  
                  const materialIndex = Array.isArray(child.material) 
                    ? materials.indexOf(mat) 
                    : 0
                  
                  if (Array.isArray(child.material)) {
                    const newMaterials = [...child.material]
                    newMaterials[materialIndex] = basicMat
                    child.material = newMaterials
                  } else {
                    child.material = basicMat
                  }
                  
                  lastMaterialCheckRef.current = `MeshBasicMaterial-chat`
                  if (shouldLog && (mat.type !== 'MeshBasicMaterial' || mat.map !== chatTextureRef.current)) {
                    console.warn('⚠️ Recreated chat material - it was overwritten!', {
                      previousType: mat.type,
                      hadCorrectTexture: mat.map === chatTextureRef.current,
                      materialChanged
                    })
                  }
                  applied = true
                }
              }
            }
          })
        }
      })
      
      if (applied) {
        textureAppliedRef.current = true
      }
      
      // Also verify material is still correct every frame (silent check)
      if (!applied && monitorscreen02Ref.current) {
        monitorscreen02Ref.current.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((mat) => {
              if (mat && mat.userData?.isChatMaterial && mat.type !== 'MeshBasicMaterial') {
                if (shouldLog) {
                  console.error('❌ Chat material type mismatch!', {
                    expected: 'MeshBasicMaterial',
                    actual: mat.type,
                    hasChatTexture: mat.map === chatTextureRef.current
                  })
                }
              }
            })
          }
        })
      }
      
      if (shouldLog && meshCount === 0) {
        console.warn('⚠️ monitorscreen02 found but no meshes detected', {
          hasRef: !!monitorscreen02Ref.current,
          children: monitorscreen02Ref.current?.children?.length
        })
        lastLogTimeRef2.current = now
      }
    } else {
      if (shouldLog && isCloseUp && closeUpMonitor === 'monitorscreen02') {
        console.warn('⚠️ Conditions not met for texture application', {
          hasMonitorRef: !!monitorscreen02Ref.current,
          hasTexture: !!chatTextureRef.current,
          isCloseUp,
          closeUpMonitor
        })
        lastLogTimeRef2.current = now
      }
      textureAppliedRef.current = false
      if (monitorscreen02Ref.current && !isCloseUp) {
        // Restore original materials when not in close-up
        monitorscreen02Ref.current.traverse((child) => {
          if (child.isMesh && child.material) {
            // Check if current material is a chat material
            const currentMaterials = Array.isArray(child.material) ? child.material : [child.material]
            const isChatMaterial = currentMaterials.some(m => m?.userData?.isChatMaterial)
            
            if (isChatMaterial) {
              // We have a chat material, restore the original
              const originalMaterials = originalMaterials02Ref.current.get(child)
              if (originalMaterials) {
                // Restore the original materials by cloning them
                if (Array.isArray(child.material)) {
                  child.material = originalMaterials.map(m => m.clone())
                } else {
                  child.material = originalMaterials[0].clone()
                }
                // Ensure all materials in the array are updated
                const restoredMaterials = Array.isArray(child.material) ? child.material : [child.material]
                restoredMaterials.forEach((mat) => {
                  if (mat) {
                    mat.needsUpdate = true
                    // Clear chat material flag if it exists
                    if (mat.userData) {
                      mat.userData.isChatMaterial = false
                    }
                  }
                })
                child.material.needsUpdate = true
                
                if (shouldLog) {
                  console.log('🔄 Restored original materials to monitorscreen02', {
                    meshName: child.name,
                    materialCount: restoredMaterials.length
                  })
                }
              } else {
                // Fallback: restore from userData if originalMaterials not available
                currentMaterials.forEach((mat) => {
                  if (mat && mat.userData.originalMap !== undefined && mat.userData.isChatMaterial) {
                    // Only restore if this was a chat material
                    if (mat.map !== mat.userData.originalMap) {
                      mat.map = mat.userData.originalMap
                      mat.emissiveMap = null
                      mat.emissive = mat.userData.originalEmissive
                      mat.emissiveIntensity = mat.userData.originalEmissiveIntensity
                      mat.color = mat.userData.originalColor
                      mat.needsUpdate = true
                      mat.userData.isChatMaterial = false // Clear the flag
                    }
                  }
                })
              }
            }
          }
        })
      }
    }
  })

  // Create canvas texture for navigation display on monitorscreen06
  const navCanvasRef = useRef(null)
  const navContainerRef = useRef(null)
  const navTextureRef = useRef(null)
  const navRootRef = useRef(null)
  const navTextureUpdateIntervalRef = useRef(null)
  
  // Initialize canvas and texture for navigation
  useEffect(() => {
    if (!navCanvasRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      navCanvasRef.current = canvas
      
      // Initialize canvas with black background
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Black background for navigation UI
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, 1024, 1024)
        ctx.lineWidth = 20
        ctx.strokeRect(50, 50, 924, 924)
      }
      
      const texture = new THREE.CanvasTexture(canvas)
      texture.flipY = false
      texture.needsUpdate = true
      navTextureRef.current = texture
    }
    
    // Create hidden container for React rendering
    if (!navContainerRef.current) {
      const container = document.createElement('div')
      container.id = 'monitorscreen06-nav-container'
      container.style.width = '400px'
      container.style.height = '300px'
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '-10000px'
      container.style.visibility = 'hidden'
      container.style.opacity = '0'
      container.style.pointerEvents = 'auto'
      container.style.overflow = 'hidden'
      container.style.transform = 'scale(1)'
      container.style.zIndex = '-1'
      container.style.boxSizing = 'border-box'
      document.body.appendChild(container)
      navContainerRef.current = container
    }
    
    return () => {
      if (navContainerRef.current && navContainerRef.current.parentNode) {
        navContainerRef.current.parentNode.removeChild(navContainerRef.current)
      }
      if (navRootRef.current) {
        navRootRef.current.unmount()
        navRootRef.current = null
      }
      if (navTextureUpdateIntervalRef.current) {
        clearInterval(navTextureUpdateIntervalRef.current)
      }
    }
  }, [])
  
  // Render navigation component to container and update texture
  useEffect(() => {
    if (navigationData && navContainerRef.current && navCanvasRef.current && formatCoordinates) {
      // Render React component to hidden container
      if (!navRootRef.current) {
        const root = createRoot(navContainerRef.current)
        navRootRef.current = root
      }
      
      if (navRootRef.current) {
        // Create navigation display component
        const navDisplay = (
          <div style={{
            width: '100%',
            height: '100%',
            background: '#000000',
            color: '#f8fafc',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: 1.6,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {navigationData.latitude !== null && navigationData.longitude !== null && (
                <>
                  <img 
                    src="/naviinstruments.png" 
                    alt="Navigation Instruments" 
                    style={{ 
                      maxWidth: '50%', 
                      height: 'auto',
                      marginBottom: '12px'
                    }} 
                  />
                  <div>Position: {formatCoordinates(navigationData.latitude, navigationData.longitude)}</div>
                  <div>Heading: {Math.round(navigationData.heading || 0)}°</div>
                  <div>Speed: {Math.round(navigationData.speed || 0)} kts</div>
                </>
              )}
            </div>
          </div>
        )
        
        navRootRef.current.render(navDisplay)
        
        // Function to capture container to canvas
        const captureToCanvas = () => {
          if (!navContainerRef.current || !navCanvasRef.current) return
          
          const container = navContainerRef.current
          const canvas = navCanvasRef.current
          const ctx = canvas.getContext('2d')
          
          if (!ctx) return
          
          const containerWidth = container.scrollWidth || container.offsetWidth || 400
          const containerHeight = container.scrollHeight || container.offsetHeight || 300
          
          const targetScale = 2.56 // 1024 / 400 = 2.56
          
          // Temporarily make container visible for capture
          const originalVisibility = container.style.visibility
          const originalOpacity = container.style.opacity
          const originalPosition = container.style.position
          const originalLeft = container.style.left
          const originalTop = container.style.top
          
          container.style.visibility = 'visible'
          container.style.opacity = '1'
          container.style.position = 'fixed'
          container.style.left = '0px'
          container.style.top = '0px'
          
          html2canvas(container, {
            width: containerWidth,
            height: containerHeight,
            backgroundColor: null,
            scale: targetScale,
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: containerWidth,
            windowHeight: containerHeight,
            ignoreElements: (element) => false,
            onclone: (clonedDoc) => {
              const clonedContainer = clonedDoc.getElementById('monitorscreen06-nav-container')
              if (clonedContainer) {
                clonedContainer.style.visibility = 'visible'
                clonedContainer.style.position = 'absolute'
                clonedContainer.style.left = '0'
                clonedContainer.style.top = '0'
                clonedContainer.style.opacity = '1'
              }
            }
          }).then((htmlCanvas) => {
            // Restore container visibility after capture
            container.style.visibility = originalVisibility
            container.style.opacity = originalOpacity
            container.style.position = originalPosition
            container.style.left = originalLeft
            container.style.top = originalTop
            
            // Clear canvas first
            ctx.clearRect(0, 0, 1024, 1024)
            
            // Fill with black background color
            ctx.fillStyle = '#000000'
            ctx.fillRect(0, 0, 1024, 1024)
            
            // Scale down the texture
            const scaleDown = 0.85
            const scaledWidth = htmlCanvas.width * scaleDown
            const scaledHeight = htmlCanvas.height * scaleDown
            
            // Center horizontally and vertically
            const offsetX = (1024 - scaledWidth) / 2
            const offsetY = (1024 - scaledHeight) / 2 + 80
            
            // Draw the navigation content
            ctx.drawImage(htmlCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
            
            if (navTextureRef.current) {
              navTextureRef.current.needsUpdate = true
            }
          }).catch((error) => {
            // Restore container visibility even on error
            container.style.visibility = originalVisibility
            container.style.opacity = originalOpacity
            container.style.position = originalPosition
            container.style.left = originalLeft
            container.style.top = originalTop
            console.error('Error capturing navigation to canvas:', error)
            
            // Fallback: Draw a simple representation
            ctx.fillStyle = '#000000'
            ctx.fillRect(0, 0, 1024, 1024)
            ctx.fillStyle = '#60a5fa'
            ctx.font = 'bold 64px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('Navigation', 512, 400)
            ctx.fillStyle = '#f8fafc'
            ctx.font = '32px Arial'
            ctx.fillText('Display Active', 512, 500)
            if (navTextureRef.current) {
              navTextureRef.current.needsUpdate = true
            }
          })
        }
        
        // Only capture and update texture when in close-up for monitorscreen06
        if (isCloseUp && closeUpMonitor === 'monitorscreen06') {
          // Wait for React to render, then capture
          setTimeout(captureToCanvas, 300)
          
          // Set up periodic updates to refresh the texture
          if (navTextureUpdateIntervalRef.current) {
            clearInterval(navTextureUpdateIntervalRef.current)
          }
          navTextureUpdateIntervalRef.current = setInterval(captureToCanvas, 1000) // Update every second
        } else {
          // Clear interval when not in close-up
          if (navTextureUpdateIntervalRef.current) {
            clearInterval(navTextureUpdateIntervalRef.current)
            navTextureUpdateIntervalRef.current = null
          }
        }
      }
    }
  }, [navigationData, formatCoordinates, isCloseUp, closeUpMonitor])
  
  // Apply texture to monitorscreen06 material - use useFrame to ensure it persists
  const navTextureAppliedRef = useRef(false)
  const lastNavLogTimeRef = useRef(0)
  const lastNavMaterialCheckRef = useRef(null)
  
  useFrame(() => {
    const now = Date.now()
    const shouldLog = now - lastNavLogTimeRef.current > 2000
    
    if (monitorscreen06Ref.current && navTextureRef.current && isCloseUp && closeUpMonitor === 'monitorscreen06') {
      let applied = false
      
      monitorscreen06Ref.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((mat, matIndex) => {
            if (mat) {
              const isNavMaterial = mat.userData?.isNavMaterial && mat.type === 'MeshBasicMaterial'
              const hasCorrectTexture = mat.map === navTextureRef.current
              
              if (!isNavMaterial || !hasCorrectTexture || mat.type !== 'MeshBasicMaterial' || true) {
                if (!mat.userData.isNavMaterial || mat.type !== 'MeshBasicMaterial' || mat.map !== navTextureRef.current) {
                  const basicMat = new THREE.MeshBasicMaterial({
                    map: navTextureRef.current,
                    color: new THREE.Color(0xffffff),
                    transparent: false,
                    opacity: 1.0,
                    side: THREE.DoubleSide,
                  })
                  
                  // Fix orientation: rotate 90 degrees counter-clockwise, flip horizontally
                  if (basicMat.map) {
                    basicMat.map.flipY = false
                    basicMat.map.wrapS = THREE.RepeatWrapping
                    basicMat.map.wrapT = THREE.RepeatWrapping
                    basicMat.map.rotation = Math.PI / 2 - (3 * Math.PI / 180) // 90° - 3° = 87° counter-clockwise
                    basicMat.map.center.set(0.5, 0.5)
                    basicMat.map.repeat.x = -1
                    basicMat.map.offset.y = -0.1
                  }
                  
                  basicMat.userData = { ...mat.userData }
                  basicMat.userData.isNavMaterial = true
                  
                  const materialIndex = Array.isArray(child.material) 
                    ? materials.indexOf(mat) 
                    : 0
                  
                  if (Array.isArray(child.material)) {
                    const newMaterials = [...child.material]
                    newMaterials[materialIndex] = basicMat
                    child.material = newMaterials
                  } else {
                    child.material = basicMat
                  }
                  
                  applied = true
                  lastNavMaterialCheckRef.current = `MeshBasicMaterial-nav`
                } else {
                  // Force recreate to ensure it's always correct
                  const basicMat = new THREE.MeshBasicMaterial({
                    map: navTextureRef.current,
                    color: new THREE.Color(0xffffff),
                    transparent: false,
                    opacity: 1.0,
                    side: THREE.DoubleSide,
                  })
                  
                  if (basicMat.map) {
                    basicMat.map.flipY = false
                    basicMat.map.wrapS = THREE.RepeatWrapping
                    basicMat.map.wrapT = THREE.RepeatWrapping
                    basicMat.map.rotation = Math.PI / 2 - (3 * Math.PI / 180)
                    basicMat.map.center.set(0.5, 0.5)
                    basicMat.map.repeat.x = -1
                    basicMat.map.offset.y = -0.1
                  }
                  
                  basicMat.userData = { ...mat.userData }
                  basicMat.userData.isNavMaterial = true
                  
                  const materialIndex = Array.isArray(child.material) 
                    ? materials.indexOf(mat) 
                    : 0
                  
                  if (Array.isArray(child.material)) {
                    const newMaterials = [...child.material]
                    newMaterials[materialIndex] = basicMat
                    child.material = newMaterials
                  } else {
                    child.material = basicMat
                  }
                  
                  lastNavMaterialCheckRef.current = `MeshBasicMaterial-nav`
                  applied = true
                }
              }
            }
          })
        }
      })
      
      if (applied) {
        navTextureAppliedRef.current = true
      }
    } else {
      navTextureAppliedRef.current = false
      if (monitorscreen06Ref.current && !isCloseUp) {
        // Restore original materials when not in close-up
        monitorscreen06Ref.current.traverse((child) => {
          if (child.isMesh && child.material) {
            const currentMaterials = Array.isArray(child.material) ? child.material : [child.material]
            const isNavMaterial = currentMaterials.some(m => m?.userData?.isNavMaterial)
            
            if (isNavMaterial) {
              const originalMaterials = originalMaterialsRef.current.get(child)
              if (originalMaterials) {
                if (Array.isArray(child.material)) {
                  child.material = originalMaterials.map(m => m.clone())
                } else {
                  child.material = originalMaterials[0].clone()
                }
                const restoredMaterials = Array.isArray(child.material) ? child.material : [child.material]
                restoredMaterials.forEach((mat) => {
                  if (mat) {
                    mat.needsUpdate = true
                    if (mat.userData) {
                      mat.userData.isNavMaterial = false
                    }
                  }
                })
                child.material.needsUpdate = true
              }
            }
          }
        })
      }
    }
  })

  return (
    <group ref={groupRef} rotation={rotation} scale={scale}>
      <primitive object={scene} />
      {/* Interior cockpit light with wide radius - multiple lights for better coverage */}
      <pointLight
        position={[0, 0.6, -0.2]} // Positioned inside the cockpit, center
        intensity={4.0}
        distance={30} // Very wide radius of influence
        decay={1.2} // Slower falloff for wider reach
        color={0xffffff} // Bright white interior light
      />
      {/* Additional light for more coverage */}
      <pointLight
        position={[-0.3, 0.5, -0.1]} // Left side of cockpit
        intensity={3.0}
        distance={25}
        decay={1.3}
        color={0xffffff}
      />
      <pointLight
        position={[0.3, 0.5, -0.1]} // Right side of cockpit
        intensity={3.0}
        distance={25}
        decay={1.3}
        color={0xffffff}
      />
    </group>
  )
}

// Preload the model for better performance
useGLTF.preload('/lambda_cockpit_version_1.glb')

