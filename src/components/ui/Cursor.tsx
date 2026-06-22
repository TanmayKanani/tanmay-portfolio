'use client'

import { useEffect, useRef, useState } from 'react'
import { useMobile } from '@/lib/hooks/useMobile'

/**
 * A custom two-part cursor: a precise dot that tracks 1:1 and a ring
 * that trails with a slight lag and grows when hovering interactive
 * elements (anything that is, or lives inside, a / button / [data-hover]).
 */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  const target = useRef({ x: -100, y: -100 })
  const ring = useRef({ x: -100, y: -100 })
  const raf = useRef(0)

  const [hovering, setHovering] = useState(false)
  const [down, setDown] = useState(false)

  useEffect(() => {
    if (isMobile) return

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      }
    }

    const interactive = (el: EventTarget | null) =>
      el instanceof Element && !!el.closest('a, button, [data-hover]')

    const onOver = (e: MouseEvent) => setHovering(interactive(e.target))
    const onDown = () => setDown(true)
    const onUp = () => setDown(false)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    const animate = () => {
      ring.current.x += (target.current.x - ring.current.x) * 0.16
      ring.current.y += (target.current.y - ring.current.y) * 0.16
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0) translate(-50%, -50%)`
      }
      raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      cancelAnimationFrame(raf.current)
    }
  }, [isMobile])

  if (isMobile) return null

  const ringSize = hovering ? 52 : 30
  const scale = down ? 0.82 : 1

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          marginLeft: -3,
          marginTop: -3,
          borderRadius: '50%',
          background: 'var(--accent)',
          pointerEvents: 'none',
          zIndex: 9999,
          willChange: 'transform',
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: ringSize,
          height: ringSize,
          borderRadius: '50%',
          border: `1px solid ${hovering ? 'var(--accent)' : 'rgba(28,23,18,0.45)'}`,
          background: hovering ? 'rgba(40,75,94,0.10)' : 'transparent',
          pointerEvents: 'none',
          zIndex: 9998,
          willChange: 'transform, width, height',
          transition:
            'width 0.35s var(--ease-out), height 0.35s var(--ease-out), border-color 0.35s, background 0.35s',
          scale: String(scale),
        }}
      />
    </>
  )
}
