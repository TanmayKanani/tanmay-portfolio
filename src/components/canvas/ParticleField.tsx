'use client'

/* eslint-disable react-hooks/immutability -- particle buffers are mutated each frame by design (react-three-fiber) */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ── target-shape generators ──────────────────────────────────
function sphere(count: number): Float32Array {
  const a = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const phi = i * Math.PI * (3 - Math.sqrt(5))
    a[i * 3] = Math.cos(phi) * r * 2.1
    a[i * 3 + 1] = y * 2.1
    a[i * 3 + 2] = Math.sin(phi) * r * 2.1
  }
  return a
}

function torusKnot(count: number): Float32Array {
  const a = new Float32Array(count * 3)
  const p = 2
  const q = 3
  for (let i = 0; i < count; i++) {
    const u = (i / count) * Math.PI * 2 * q
    const cu = Math.cos(u)
    const su = Math.sin(u)
    const qpu = (q / p) * u
    const cqpu = Math.cos(qpu)
    const r = 0.6 * (2 + cqpu)
    a[i * 3] = r * cu * 1.15
    a[i * 3 + 1] = r * su * 1.15
    a[i * 3 + 2] = 0.6 * Math.sin(qpu) * 1.6
  }
  return a
}

/** Sample the glyphs "TK" from a 2D canvas into 3D point targets. */
function textPoints(count: number, text = 'TK'): Float32Array {
  const a = new Float32Array(count * 3)
  if (typeof document === 'undefined') return a
  const c = document.createElement('canvas')
  const W = 320
  const H = 180
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 150px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, W / 2, H / 2 + 6)
  const data = ctx.getImageData(0, 0, W, H).data

  const pts: [number, number][] = []
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y])
    }
  }
  for (let i = 0; i < count; i++) {
    const [x, y] = pts.length ? pts[Math.floor(Math.random() * pts.length)] : [W / 2, H / 2]
    a[i * 3] = (x / W - 0.5) * 6.4
    a[i * 3 + 1] = -(y / H - 0.5) * 3.6
    a[i * 3 + 2] = (Math.random() - 0.5) * 0.35
  }
  return a
}

const vertex = `
  uniform float uSize;
  uniform float uPixel;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixel * (1.0 / -mv.z);
  }
`
const fragment = `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = mix(uColor2, uColor, a);
    gl_FragColor = vec4(col, a);
  }
`

export default function ParticleField({ count = 7000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null)
  const { size, viewport, gl } = useThree()

  const targets = useMemo(
    () => [sphere(count), torusKnot(count), textPoints(count)],
    [count]
  )

  // current (mutable) buffer — intentionally mutated each frame (r3f pattern)
  const current = useMemo(() => Float32Array.from(targets[0]), [targets])
  const stage = useRef(0)
  const t0 = useRef(0)
  const mouse = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const el = gl.domElement
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      mouse.current.x = e.clientX - r.left
      mouse.current.y = e.clientY - r.top
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [gl])

  const uniforms = useMemo(
    () => ({
      uSize: { value: 14 },
      uPixel: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
      uColor: { value: new THREE.Color('#f1d292') },
      uColor2: { value: new THREE.Color('#c79a4a') },
    }),
    []
  )

  useFrame((state, delta) => {
    const pts = pointsRef.current
    if (!pts) return
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array

    // cycle the morph target every ~4s
    if (state.clock.elapsedTime - t0.current > 4) {
      t0.current = state.clock.elapsedTime
      stage.current = (stage.current + 1) % targets.length
    }
    const target = targets[stage.current]

    // map cursor to world plane
    const mx = (mouse.current.x / size.width) * viewport.width - viewport.width / 2
    const my = -(mouse.current.y / size.height) * viewport.height + viewport.height / 2

    const lerp = 1 - Math.pow(0.0015, delta) // frame-rate independent ease
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      current[ix] += (target[ix] - current[ix]) * lerp
      current[ix + 1] += (target[ix + 1] - current[ix + 1]) * lerp
      current[ix + 2] += (target[ix + 2] - current[ix + 2]) * lerp

      // cursor repulsion
      const dx = current[ix] - mx
      const dy = current[ix + 1] - my
      const dist2 = dx * dx + dy * dy
      if (dist2 < 2.2) {
        const f = (2.2 - dist2) * 0.16
        arr[ix] = current[ix] + dx * f
        arr[ix + 1] = current[ix + 1] + dy * f
        arr[ix + 2] = current[ix + 2]
      } else {
        arr[ix] = current[ix]
        arr[ix + 1] = current[ix + 1]
        arr[ix + 2] = current[ix + 2]
      }
    }
    attr.needsUpdate = true

    // slow auto-rotation
    pts.rotation.y += delta * 0.12
    pts.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.06
  })

  return (
    <points ref={pointsRef} position={[1.5, 0.2, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[current, 3]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
