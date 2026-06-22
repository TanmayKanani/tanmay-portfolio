'use client'

import { Canvas } from '@react-three/fiber'
import { useMobile } from '@/lib/hooks/useMobile'
import ParticleField from './ParticleField'

/** The 3D hero centerpiece — a morphing particle cloud (sphere → knot → "TK"). */
export default function HeroScene() {
  const isMobile = useMobile()
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={reduced ? 'demand' : 'always'}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ParticleField count={isMobile ? 3800 : 7000} />
    </Canvas>
  )
}
