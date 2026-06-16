'use client'

import { useEffect, useRef } from 'react'
import { useMobile } from '@/lib/hooks/useMobile'

export default function Cursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const posRef = useRef({ x: -100, y: -100 })
  const currentRef = useRef({ x: -100, y: -100 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (isMobile) return

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove)

    const animate = () => {
      // Lerp toward target for slight lag feel
      currentRef.current.x += (posRef.current.x - currentRef.current.x) * 0.18
      currentRef.current.y += (posRef.current.y - currentRef.current.y) * 0.18

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${currentRef.current.x - 7}px, ${currentRef.current.y - 7}px)`
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [isMobile])

  if (isMobile) return null

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none"
      style={{ zIndex: 50, willChange: 'transform' }}
    >
      <div className="relative" style={{ width: 14, height: 14 }}>
        {/* Horizontal arm */}
        <div
          className="absolute inset-y-0 my-auto left-0 right-0"
          style={{
            height: 1,
            background: 'rgba(232, 226, 216, 0.65)',
          }}
        />
        {/* Vertical arm */}
        <div
          className="absolute inset-x-0 mx-auto top-0 bottom-0"
          style={{
            width: 1,
            background: 'rgba(232, 226, 216, 0.65)',
          }}
        />
        {/* Center dot */}
        <div
          className="absolute"
          style={{
            width: 2,
            height: 2,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(232, 226, 216, 0.9)',
            borderRadius: '50%',
          }}
        />
      </div>
    </div>
  )
}
