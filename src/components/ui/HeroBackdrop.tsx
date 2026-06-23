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
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div ref={ref} style={{ position: 'absolute', inset: '-10%' }}>
        <div style={blob('radial-gradient(circle, rgba(47,84,235,0.18), transparent 65%)', 520, '-8%', '4%', 'blobA', 22)} />
        <div style={blob('radial-gradient(circle, rgba(124,92,255,0.14), transparent 65%)', 460, '20%', '52%', 'blobB', 26)} />
        <div style={blob('radial-gradient(circle, rgba(31,191,117,0.10), transparent 65%)', 420, '46%', '14%', 'blobC', 30)} />
      </div>
    </div>
  )
}
