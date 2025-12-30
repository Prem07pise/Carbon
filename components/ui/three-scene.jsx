"use client"
import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function ThreeScene({ className = 'w-28 h-28' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.z = 4

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    container.appendChild(renderer.domElement)

    // Sphere
    const geometry = new THREE.SphereGeometry(1, 64, 64)
    const material = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4, metalness: 0.2 })
    const sphere = new THREE.Mesh(geometry, material)
    sphere.rotation.x = 0.2
    scene.add(sphere)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1)
    dir.position.set(5, 5, 5)
    scene.add(dir)

    // Simple starfield (small points)
    const starsGeometry = new THREE.BufferGeometry()
    const starCount = 100
    const positions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, opacity: 0.8 })
    const stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)

    // Interactive rotation targets (inertia)
    let reqId
    const targetRotation = { x: 0, y: 0 }

    const animate = () => {
      // base slow rotation
      sphere.rotation.y += 0.005
      // ease toward target rotation for subtle interactivity
      sphere.rotation.x += (targetRotation.x - sphere.rotation.x) * 0.06
      sphere.rotation.y += (targetRotation.y - sphere.rotation.y) * 0.06
      stars.rotation.y += 0.0005
      renderer.render(scene, camera)
      reqId = requestAnimationFrame(animate)
    }

    animate()

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      targetRotation.x = -y * 0.5
      targetRotation.y = x * 1.0
    }

    const onPointerLeave = () => {
      targetRotation.x = 0
      targetRotation.y = 0
    }

    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)

    const onResize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(reqId)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className={className} />
}
