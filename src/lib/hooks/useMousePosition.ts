'use client'

import { useRef, useEffect } from 'react'

export interface MousePosition {
  x: number
  y: number
  rawX: number
  rawY: number
}

export function useMousePosition() {
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0, rawX: 0, rawY: 0 })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
        rawX: e.clientX,
        rawY: e.clientY,
      }
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return mouseRef
}
