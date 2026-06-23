'use client'

/* eslint-disable react-hooks/immutability -- three.js objects are mutated in the render loop by design */
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture, Center } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useMobile } from '@/lib/hooks/useMobile'

const ROOM = '/scene/models/room/model.glb'
const BAKED = '/scene/models/room/baked.jpg'
const SCREEN0 = '/scene/models/room/desktops/0.png'
const SCREEN1 = '/scene/models/room/desktops/1.png'

function Room() {
  const { scene } = useGLTF(ROOM)
  const [baked, s0, s1] = useTexture([BAKED, SCREEN0, SCREEN1])

  const prepared = useMemo(() => {
    for (const t of [baked, s0, s1]) {
      t.flipY = false
      t.colorSpace = THREE.SRGBColorSpace
    }
    const bakedMat = new THREE.MeshBasicMaterial({ map: baked })
    const screen0 = new THREE.MeshBasicMaterial({ map: s0, toneMapped: false })
    const screen1 = new THREE.MeshBasicMaterial({ map: s1, toneMapped: false })

    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if (m.name === 'desktop-plane-0') m.material = screen0
      else if (m.name === 'desktop-plane-1') m.material = screen1
      else m.material = bakedMat
    })
    return scene
  }, [scene, baked, s0, s1])

  return (
    <Center>
      <primitive object={prepared} />
    </Center>
  )
}

// cinematic camera: slow orbit + cursor parallax, framed on the room
function Rig() {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const px = state.pointer.x
    const py = state.pointer.y
    const radius = 9
    const angle = 0.6 + Math.sin(t * 0.06) * 0.22 + px * 0.3
    const ny = 3 + py * 1.2 + Math.sin(t * 0.1) * 0.3
    camera.position.x += (Math.sin(angle) * radius - camera.position.x) * 0.03
    camera.position.z += (Math.cos(angle) * radius - camera.position.z) * 0.03
    camera.position.y += (ny - camera.position.y) * 0.03
    camera.lookAt(look.current)
  })
  return null
}

export default function StudioScene() {
  const isMobile = useMobile()

  useEffect(() => {
    useGLTF.preload(ROOM)
  }, [])

  return (
    <Canvas
      camera={{ position: [7, 3, 8], fov: 38 }}
      dpr={[1, isMobile ? 1.2 : 1.6]}
      gl={{ antialias: !isMobile }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0b0a11']} />
      <fog attach="fog" args={['#0b0a11', 12, 30]} />
      <Suspense fallback={null}>
        <Room />
      </Suspense>
      <Rig />
      {!isMobile && (
        <EffectComposer>
          <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.55} luminanceSmoothing={0.4} />
          <Vignette eskil={false} offset={0.3} darkness={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
