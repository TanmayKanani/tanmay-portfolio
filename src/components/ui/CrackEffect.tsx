'use client'

import { useEffect, useRef, useState } from 'react'

type Phase = 'waiting' | 'cracking' | 'holding' | 'sealing' | 'done'

export default function CrackEffect() {
  const pathRef = useRef<SVGPathElement>(null)
  const [phase, setPhase] = useState<Phase>('waiting')
  const [lightOpacity, setLightOpacity] = useState(0)

  // Start crack at 8 seconds
  useEffect(() => {
    const t = setTimeout(() => setPhase('cracking'), 8000)
    return () => clearTimeout(t)
  }, [])

  // Crack draws
  useEffect(() => {
    if (phase !== 'cracking') return
    const path = pathRef.current
    if (!path) return

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`

    // Force a repaint before transitioning
    void path.getBoundingClientRect()
    path.style.transition = 'stroke-dashoffset 3s cubic-bezier(0.16, 1, 0.3, 1)'
    path.style.strokeDashoffset = '0'

    setLightOpacity(0.3)

    const t = setTimeout(() => setPhase('holding'), 3000)
    return () => clearTimeout(t)
  }, [phase])

  // Two pulses while holding, then seal
  useEffect(() => {
    if (phase !== 'holding') return
    const t = setTimeout(() => setPhase('sealing'), 4000)
    return () => clearTimeout(t)
  }, [phase])

  // Seal: line narrows back to zero (reverse dashoffset)
  useEffect(() => {
    if (phase !== 'sealing') return
    const path = pathRef.current
    if (!path) return

    const length = path.getTotalLength()
    path.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.16, 1, 0.3, 1)'
    path.style.strokeDashoffset = `${length}`
    setLightOpacity(0)

    const t = setTimeout(() => setPhase('done'), 2100)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'done') return null

  const visible = phase !== 'waiting'

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 15 }}
      aria-hidden="true"
    >
      {/* SVG crack line — viewBox 0-100 maps to screen %, preserveAspectRatio none */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {/* Soft glow halo — rendered below the crisp line */}
        <path
          d="M 74,4 L 67,14 L 61,19 L 56,28 L 51,33 L 48,38 L 44,44 L 41,52"
          fill="none"
          stroke="#ede5cc"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ opacity: 0.07 }}
        />
        {/* Crisp 1px crack line — vectorEffect keeps it 1 screen pixel regardless of SVG scale */}
        <path
          ref={pathRef}
          d="M 74,4 L 67,14 L 61,19 L 56,28 L 51,33 L 48,38 L 44,44 L 41,52"
          fill="none"
          stroke="#ede5cc"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Warm light leaking through the fault */}
      <div
        style={{
          position: 'absolute',
          top: '36%',
          left: '32%',
          width: '240px',
          height: '120px',
          background: 'radial-gradient(ellipse at center, rgba(237,229,204,0.55) 0%, rgba(200,169,110,0.2) 35%, transparent 65%)',
          filter: 'blur(18px)',
          opacity: lightOpacity,
          transition: 'opacity 1.8s ease',
          animation: phase === 'holding' ? 'crackGlow 2s ease-in-out infinite' : undefined,
          transform: 'rotate(-38deg)',
        }}
      />
      {/* Inner core — brighter, tighter */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '35%',
          width: '80px',
          height: '40px',
          background: 'radial-gradient(ellipse at center, rgba(237,229,204,0.7) 0%, transparent 70%)',
          filter: 'blur(6px)',
          opacity: lightOpacity * 0.8,
          transition: 'opacity 1.8s ease',
          animation: phase === 'holding' ? 'crackGlowCore 2s ease-in-out infinite' : undefined,
          transform: 'rotate(-38deg)',
        }}
      />

      <style>{`
        @keyframes crackGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes crackGlowCore {
          0%, 100% { opacity: 0.24; }
          50% { opacity: 0.56; }
        }
      `}</style>
    </div>
  )
}
