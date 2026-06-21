'use client'

import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

/**
 * Signature hero background: a drifting field of nodes connected by edges
 * (a graph — a nod to competitive programming). The cursor warps nearby
 * nodes and ignites the edges around it. Pure 2D canvas for performance.
 */
export default function Constellation() {
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
    let nodes: Node[] = []
    const mouse = { x: -9999, y: -9999, active: false }
    const LINK_DIST = 132
    const MOUSE_DIST = 200

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const density = coarse ? 14000 : 9000
      const count = Math.min(120, Math.floor((width * height) / density))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.6,
      }))
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }
    const onLeave = () => {
      mouse.active = false
      mouse.x = -9999
      mouse.y = -9999
    }

    let raf = 0
    const render = () => {
      ctx.clearRect(0, 0, width, height)

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1

        // cursor pushes nodes gently outward
        if (mouse.active) {
          const dx = n.x - mouse.x
          const dy = n.y - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < MOUSE_DIST && dist > 0.01) {
            const force = (1 - dist / MOUSE_DIST) * 0.9
            n.x += (dx / dist) * force
            n.y += (dy / dist) * force
          }
        }
      }

      // edges
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DIST) {
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            const near = mouse.active ? Math.hypot(mx - mouse.x, my - mouse.y) : Infinity
            const lit = near < MOUSE_DIST ? 1 - near / MOUSE_DIST : 0
            const base = (1 - dist / LINK_DIST) * 0.16
            const alpha = Math.min(0.6, base + lit * 0.5)
            ctx.strokeStyle = lit > 0.05
              ? `rgba(154, 140, 255, ${alpha})`
              : `rgba(150, 150, 175, ${alpha})`
            ctx.lineWidth = 0.6 + lit * 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const near = mouse.active ? Math.hypot(n.x - mouse.x, n.y - mouse.y) : Infinity
        const lit = near < MOUSE_DIST ? 1 - near / MOUSE_DIST : 0
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + lit * 1.4, 0, Math.PI * 2)
        ctx.fillStyle = lit > 0.1
          ? `rgba(180, 168, 255, ${0.5 + lit * 0.5})`
          : 'rgba(160, 160, 185, 0.4)'
        ctx.fill()
        if (lit > 0.4) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(124, 108, 255, ${lit * 0.12})`
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(render)
    }

    build()
    if (!reduced) {
      raf = requestAnimationFrame(render)
    } else {
      // draw a single static frame
      render()
      cancelAnimationFrame(raf)
    }

    window.addEventListener('resize', build)
    if (!coarse) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseleave', onLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', build)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
