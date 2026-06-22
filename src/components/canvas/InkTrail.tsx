'use client'

import { useEffect, useRef } from 'react'

interface Stamp {
  x: number
  y: number
  r: number
  hue: string
  life: number
  max: number
}

const HUES = ['#2f6175', '#4a8f8c', '#b2563a', '#6a5a9c', '#c98a4b']

/**
 * Sitewide watercolour trail: moving the cursor anywhere paints ink blooms
 * that spread and fade. Fixed full-viewport canvas behind the content, so
 * every section reacts — not just the hero. Multiply-blended onto the paper.
 */
export default function InkTrail() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (reduced || coarse) return

    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let dpr = 1
    const stamps: Stamp[] = []
    let lastX = -999
    let lastY = -999
    let hueIndex = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      const d = Math.hypot(dx, dy)
      if (d < 26) return // throttle by distance
      lastX = e.clientX
      lastY = e.clientY
      hueIndex = (hueIndex + 1) % HUES.length
      stamps.push({
        x: e.clientX,
        y: e.clientY,
        r: 36 + Math.random() * 46,
        hue: HUES[hueIndex],
        life: 1,
        max: 1,
      })
      if (stamps.length > 80) stamps.splice(0, stamps.length - 80)
    }

    let raf = 0
    const render = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'multiply'
      for (let i = stamps.length - 1; i >= 0; i--) {
        const s = stamps[i]
        s.life -= 0.012
        if (s.life <= 0) {
          stamps.splice(i, 1)
          continue
        }
        const grow = s.r * (1 + (1 - s.life) * 0.9)
        const alpha = s.life * 0.5
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, grow)
        const a = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        g.addColorStop(0, s.hue + a)
        g.addColorStop(0.6, s.hue + Math.floor(alpha * 110).toString(16).padStart(2, '0'))
        g.addColorStop(1, s.hue + '00')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(s.x, s.y, grow, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(render)
    }

    resize()
    raf = requestAnimationFrame(render)
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
      }}
    />
  )
}
