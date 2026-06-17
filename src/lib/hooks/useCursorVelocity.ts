'use client'

import { useEffect, useRef } from 'react'

export interface CursorVelocity {
  x: number
  y: number
  vx: number
  vy: number
  speed: number  // 8-frame smoothed magnitude in px/frame
}

export function useCursorVelocity() {
  const state = useRef<CursorVelocity>({ x: 0, y: 0, vx: 0, vy: 0, speed: 0 })
  const prev = useRef({ x: 0, y: 0 })
  const buf = useRef<number[]>(new Array(8).fill(0))
  const idx = useRef(0)

  useEffect(() => {
    // Default cursor to center so initial parallax offset is zero
    state.current.x = window.innerWidth / 2
    state.current.y = window.innerHeight / 2
    prev.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - prev.current.x
      const dy = e.clientY - prev.current.y
      buf.current[idx.current % 8] = Math.sqrt(dx * dx + dy * dy)
      idx.current++
      const speed = buf.current.reduce((a, b) => a + b, 0) / 8
      state.current = { x: e.clientX, y: e.clientY, vx: dx, vy: dy, speed }
      prev.current = { x: e.clientX, y: e.clientY }
    }

    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return state
}
