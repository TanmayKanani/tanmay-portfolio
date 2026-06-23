'use client'

import { useEffect, useRef } from 'react'

/**
 * Soft, slow-drifting gradient blobs behind the hero — subtle colour and a
 * gentle cursor parallax so the hero feels alive without distracting from the
 * content. Pure CSS animation; respects reduced motion.
 */
export default function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    let raf = 0
    const target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    const onMove = (e: MouseEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 40
      target.y = (e.clientY / window.innerHeight - 0.5) * 40
    }
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.05
      cur.y += (target.y - cur.y) * 0.05
      el.style.transform = `translate(${cur.x}px, ${cur.y}px)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  const blob = (
    bg: string,
    size: number,
    top: string,
    left: string,
    anim: string,
    dur: number
  ): React.CSSProperties => ({
    position: 'absolute',
    top,
    left,
    width: size,
    height: size,
    borderRadius: '50%',
    background: bg,
    filter: 'blur(70px)',
    animation: `${anim} ${dur}s ease-in-out infinite`,
    willChange: 'transform',
  })

  return (
    <div
      aria-hidden
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', mixBlendMode: 'screen' }}
    >
      <div ref={ref} style={{ position: 'absolute', inset: '-10%' }}>
        <div style={blob('radial-gradient(circle, rgba(255,111,77,0.34), transparent 65%)', 540, '-8%', '6%', 'blobA', 22)} />
        <div style={blob('radial-gradient(circle, rgba(95,227,218,0.26), transparent 65%)', 480, '18%', '54%', 'blobB', 26)} />
        <div style={blob('radial-gradient(circle, rgba(157,176,255,0.24), transparent 65%)', 440, '48%', '12%', 'blobC', 30)} />
      </div>
    </div>
  )
}
