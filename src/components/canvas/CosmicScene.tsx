'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/purity -- procedural geometry uses Math.random by design */
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, MeshDistortMaterial } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { startScrollTracking, scrollData } from '@/lib/scrollStore'
import { useMobile } from '@/lib/hooks/useMobile'

// ── camera parallax + subtle scroll dolly ───────────────────
function Rig() {
  useFrame((state) => {
    const px = state.pointer.x * 1.3
    const py = state.pointer.y * 0.9
    state.camera.position.x += (px - state.camera.position.x) * 0.04
    state.camera.position.y += (py - state.camera.position.y) * 0.04
    // gentle push-in with scroll velocity
    const targetZ = 9 - Math.min(scrollData.smoothVel * 0.03, 2.4)
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.06
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

// ── warp starfield (recycles toward the camera) ─────────────
function WarpStars({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null)
  const mat = useRef<THREE.PointsMaterial>(null)

  const positions = useMemo(() => {
    const a = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 46
      a[i * 3 + 1] = (Math.random() - 0.5) * 46
      a[i * 3 + 2] = -Math.random() * 70 + 6
    }
    return a
  }, [count])

  useFrame((_, dt) => {
    const pts = ref.current
    if (!pts) return
    const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    const speed = (2 + scrollData.smoothVel * 0.9) * dt * 6
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 2] += speed
      if (arr[i * 3 + 2] > 9) {
        arr[i * 3] = (Math.random() - 0.5) * 46
        arr[i * 3 + 1] = (Math.random() - 0.5) * 46
        arr[i * 3 + 2] = -64
      }
    }
    ;(pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    if (mat.current) mat.current.size = 0.06 + Math.min(scrollData.smoothVel, 40) * 0.006
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        size={0.07}
        color="#bfe6ff"
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

// ── the glowing, morphing core ──────────────────────────────
const C1 = new THREE.Color('#46e1ff')
const C2 = new THREE.Color('#ff5ad8')
const C3 = new THREE.Color('#9b6bff')
const tmp = new THREE.Color()

function Core() {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<any>(null)

  useFrame((state, dt) => {
    if (mesh.current) {
      mesh.current.rotation.y += dt * 0.18
      mesh.current.rotation.x += dt * 0.05
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04
      mesh.current.scale.setScalar(pulse)
      // sink away as the visitor scrolls past the hero, leaving clean space
      const targetY = -scrollData.progress * 18
      mesh.current.position.y += (targetY - mesh.current.position.y) * 0.08
    }
    if (mat.current) {
      mat.current.distort = 0.32 + Math.min(scrollData.smoothVel * 0.012, 0.4)
      // shift colour across the scroll journey
      const p = scrollData.progress
      if (p < 0.5) tmp.copy(C1).lerp(C2, p * 2)
      else tmp.copy(C2).lerp(C3, (p - 0.5) * 2)
      mat.current.emissive.copy(tmp)
      mat.current.color.copy(tmp)
    }
  })

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1.5, 96, 96]} />
      <MeshDistortMaterial
        ref={mat}
        color="#46e1ff"
        emissive="#46e1ff"
        emissiveIntensity={1.35}
        roughness={0.25}
        metalness={0.6}
        distort={0.35}
        speed={2.2}
      />
    </mesh>
  )
}

// ── soft additive nebula clouds ─────────────────────────────
const nebulaFrag = `
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = distance(vUv, vec2(0.5));
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * 0.5);
  }
`
const nebulaVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

function Nebula({ position, color, scale, speed }: { position: [number, number, number]; color: string; scale: number; speed: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(color) } }), [color])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * speed
  })
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={nebulaVert}
        fragmentShader={nebulaFrag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function Scene({ lowPower }: { lowPower: boolean }) {
  return (
    <>
      <color attach="background" args={['#05060f']} />
      <fog attach="fog" args={['#05060f', 9, 40]} />

      <ambientLight intensity={0.35} />
      <pointLight position={[6, 4, 6]} color="#46e1ff" intensity={120} distance={40} />
      <pointLight position={[-6, -3, 3]} color="#ff5ad8" intensity={90} distance={40} />

      <Nebula position={[-7, 3, -16]} color="#3a2c7a" scale={26} speed={0.02} />
      <Nebula position={[9, -4, -20]} color="#7a2c63" scale={30} speed={-0.015} />
      <Nebula position={[0, 0, -12]} color="#1d3a7a" scale={22} speed={0.01} />

      <Stars radius={70} depth={50} count={lowPower ? 1800 : 4000} factor={4} saturation={0} fade speed={0.6} />
      <WarpStars count={lowPower ? 500 : 1100} />
      <Core />

      <Rig />

      {!lowPower && (
        <EffectComposer>
          <Bloom mipmapBlur intensity={1.0} luminanceThreshold={0.22} luminanceSmoothing={0.4} radius={0.65} />
          <Vignette eskil={false} offset={0.28} darkness={0.72} />
        </EffectComposer>
      )}
    </>
  )
}

export default function CosmicScene() {
  const isMobile = useMobile()

  useEffect(() => {
    startScrollTracking()
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 55 }}
        dpr={[1, isMobile ? 1.2 : 1.6]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <Scene lowPower={isMobile} />
      </Canvas>
    </div>
  )
}
