'use client'

import { useEffect, useRef } from 'react'

interface GrainMark {
  x: number
  y: number
  length: number
  angle: number
  targetAngle: number
  angleTimer: number
  angleDuration: number
  opacity: number
  vx: number
  vy: number
}

export default function GrainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const marksRef = useRef<GrainMark[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef<number>(0)
  const wRef = useRef(0)
  const hRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isMobile = window.innerWidth < 768
    const COUNT = isMobile ? 500 : 1000
    const PRESSURE_RADIUS = 130

    const initMarks = (w: number, h: number) => {
      marksRef.current = Array.from({ length: COUNT }, () => {
        const angle = Math.random() * Math.PI * 2
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          length: 2.5 + Math.random() * 5,
          angle,
          targetAngle: Math.random() * Math.PI * 2,
          angleTimer: Math.random() * 8000,
          angleDuration: 5000 + Math.random() * 3000,
          opacity: 0.015 + Math.random() * 0.055,
          vx: 0,
          vy: 0,
        }
      })
    }

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w
      canvas.height = h
      wRef.current = w
      hRef.current = h
      initMarks(w, h)
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)

    let lastTime = performance.now()

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50)
      lastTime = now

      const w = wRef.current
      const h = hRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      ctx.clearRect(0, 0, w, h)

      const marks = marksRef.current
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i]

        // Angle drift
        m.angleTimer += dt
        if (m.angleTimer >= m.angleDuration) {
          m.targetAngle = Math.random() * Math.PI * 2
          m.angleTimer = 0
          m.angleDuration = 5000 + Math.random() * 3000
        }
        const progress = m.angleTimer / m.angleDuration
        // Smooth angle interpolation
        let da = m.targetAngle - m.angle
        while (da > Math.PI) da -= Math.PI * 2
        while (da < -Math.PI) da += Math.PI * 2
        m.angle += da * progress * 0.004

        // Cursor pressure
        const dx = m.x - mx
        const dy = m.y - my
        const distSq = dx * dx + dy * dy
        if (distSq < PRESSURE_RADIUS * PRESSURE_RADIUS && distSq > 0) {
          const dist = Math.sqrt(distSq)
          const force = (1 - dist / PRESSURE_RADIUS) * 0.5
          m.vx += (dx / dist) * force
          m.vy += (dy / dist) * force
        }

        // Dampen velocity and apply
        m.vx *= 0.92
        m.vy *= 0.92
        m.x += m.vx + Math.cos(m.angle) * 0.025
        m.y += m.vy + Math.sin(m.angle) * 0.025

        // Wrap
        if (m.x < 0) m.x += w
        else if (m.x > w) m.x -= w
        if (m.y < 0) m.y += h
        else if (m.y > h) m.y -= h

        // Draw
        ctx.save()
        ctx.translate(m.x, m.y)
        ctx.rotate(m.angle)
        ctx.globalAlpha = m.opacity
        ctx.strokeStyle = '#e8e2d8'
        ctx.lineWidth = 0.75
        ctx.beginPath()
        ctx.moveTo(-m.length / 2, 0)
        ctx.lineTo(m.length / 2, 0)
        ctx.stroke()
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, mixBlendMode: 'screen' }}
      aria-hidden="true"
    />
  )
}
