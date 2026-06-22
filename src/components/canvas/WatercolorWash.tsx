'use client'

import { useEffect, useRef } from 'react'

interface Blob {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  hue: string
  phase: number
}

const HUES = ['#2f6175', '#4a8f8c', '#b2563a', '#6a5a9c', '#c98a4b']

/**
 * Opaque watercolor layer: paper fill + slowly drifting, multiply-blended
 * colour blooms. Sits beneath the hero text and the scratch overlay.
 */
export default function WatercolorWash() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let dpr = 1
    let blobs: Blob[] = []

    const paper = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#f3ebdd'

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const n = 7
      blobs = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.min(w, h) * (0.34 + Math.random() * 0.3),
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        hue: HUES[i % HUES.length],
        phase: Math.random() * Math.PI * 2,
      }))
    }

    let raf = 0
    const render = (t: number) => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = paper
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'multiply'
      for (const b of blobs) {
        if (!reduced) {
          b.x += b.vx
          b.y += b.vy
          if (b.x < -b.r * 0.4 || b.x > w + b.r * 0.4) b.vx *= -1
          if (b.y < -b.r * 0.4 || b.y > h + b.r * 0.4) b.vy *= -1
        }
        const pr = b.r * (0.92 + Math.sin(t * 0.0004 + b.phase) * 0.08)
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, pr)
        g.addColorStop(0, b.hue + 'cc')
        g.addColorStop(0.55, b.hue + '55')
        g.addColorStop(1, b.hue + '00')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(b.x, b.y, pr, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      if (!reduced) raf = requestAnimationFrame(render)
    }

    build()
    raf = requestAnimationFrame(render)
    window.addEventListener('resize', build)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', build)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
