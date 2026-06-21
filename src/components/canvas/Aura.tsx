'use client'

import { useEffect, useRef } from 'react'

interface Mote {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  a: number
  tw: number // twinkle phase
}

/**
 * Elegant ambient background: soft, slow-drifting gold motes with a
 * gentle glow and a faint cursor parallax. Warm and atmospheric —
 * no rigid graph/edges. Pure 2D canvas, reduced-motion aware.
 */
export default function Aura() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches

    let width = 0
    let height = 0
    let dpr = 1
    let motes: Mote[] = []
    const mouse = { x: 0.5, y: 0.5 }
    const parallax = { x: 0, y: 0 }

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const density = coarse ? 26000 : 17000
      const count = Math.min(90, Math.floor((width * height) / density))
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.8 + 0.5,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(Math.random() * 0.16 + 0.03), // drift gently upward
        a: Math.random() * 0.5 + 0.15,
        tw: Math.random() * Math.PI * 2,
      }))
    }

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth
      mouse.y = e.clientY / window.innerHeight
    }

    let raf = 0
    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // ease parallax toward cursor
      const targetX = (mouse.x - 0.5) * 26
      const targetY = (mouse.y - 0.5) * 26
      parallax.x += (targetX - parallax.x) * 0.04
      parallax.y += (targetY - parallax.y) * 0.04

      for (const m of motes) {
        m.x += m.vx
        m.y += m.vy
        m.tw += 0.02
        // wrap around
        if (m.y < -10) {
          m.y = height + 10
          m.x = Math.random() * width
        }
        if (m.x < -10) m.x = width + 10
        if (m.x > width + 10) m.x = -10

        const twinkle = 0.6 + Math.sin(m.tw) * 0.4
        const px = m.x + parallax.x * (m.r / 2)
        const py = m.y + parallax.y * (m.r / 2)

        // glow
        const grad = ctx.createRadialGradient(px, py, 0, px, py, m.r * 6)
        grad.addColorStop(0, `rgba(241, 210, 146, ${m.a * twinkle * 0.5})`)
        grad.addColorStop(1, 'rgba(241, 210, 146, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(px, py, m.r * 6, 0, Math.PI * 2)
        ctx.fill()

        // core
        ctx.beginPath()
        ctx.arc(px, py, m.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(244, 237, 224, ${m.a * twinkle})`
        ctx.fill()
      }

      raf = requestAnimationFrame(render)
    }

    build()
    if (reduced) {
      render()
      cancelAnimationFrame(raf)
    } else {
      raf = requestAnimationFrame(render)
    }

    window.addEventListener('resize', build)
    if (!coarse) window.addEventListener('mousemove', onMove)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', build)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}
