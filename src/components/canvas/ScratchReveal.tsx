'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A paper-coloured overlay that the visitor scratches away with the cursor
 * to reveal what's beneath (the watercolour wash + name). Once enough is
 * erased it fades out completely. Touch / reduced-motion auto-reveal.
 */
export default function ScratchReveal({ onReveal }: { onReveal?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (reduced || coarse) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability check on mount
      setRevealed(true)
      onReveal?.()
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const paper = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#f3ebdd'
    const ink = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#1d1813'

    let w = 0
    let h = 0
    const SIZE = 56
    let cols = 0
    let cells: number[] = []
    let erased = 0
    let done = false
    let last: { x: number; y: number } | null = null

    const fill = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = paper
      ctx.fillRect(0, 0, w, h)

      // hint
      ctx.fillStyle = ink
      ctx.globalAlpha = 0.5
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '500 0.8rem var(--font-geist, sans-serif)'
      ctx.font = `500 13px ui-sans-serif, system-ui, sans-serif`
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.fillText('✦   D R A G   T O   R E V E A L   ✦', 0, 0)
      ctx.restore()
      ctx.globalAlpha = 1

      // erase mode
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = 110
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      cols = Math.ceil(w / SIZE)
      cells = new Array(cols * Math.ceil(h / SIZE)).fill(1)
      erased = 0
    }

    const mark = (x: number, y: number) => {
      const i = Math.floor(x / SIZE) + Math.floor(y / SIZE) * cols
      if (i >= 0 && i < cells.length && cells[i]) {
        cells[i] = 0
        erased++
        if (!done && erased / cells.length > 0.5) {
          done = true
          setRevealed(true)
          onReveal?.()
        }
      }
    }

    const draw = (x: number, y: number) => {
      ctx.beginPath()
      ctx.moveTo(last ? last.x : x - 0.1, last ? last.y : y)
      ctx.lineTo(x, y)
      ctx.stroke()
      last = { x, y }
      mark(x, y)
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      draw(e.clientX - rect.left, e.clientY - rect.top)
    }

    fill()
    window.addEventListener('mousemove', onMove)
    const onResize = () => {
      last = null
      fill()
    }
    window.addEventListener('resize', onResize)

    // fallback: auto-reveal if the visitor never moves
    const auto = setTimeout(() => {
      if (!done) {
        done = true
        setRevealed(true)
        onReveal?.()
      }
    }, 6500)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', onResize)
      clearTimeout(auto)
    }
  }, [onReveal])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 4,
        opacity: revealed ? 0 : 1,
        pointerEvents: revealed ? 'none' : 'auto',
        transition: 'opacity 1.1s var(--ease-out)',
      }}
    />
  )
}
