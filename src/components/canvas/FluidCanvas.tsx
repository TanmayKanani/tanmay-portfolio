'use client'

import { useEffect, useRef } from 'react'

// Watercolour hues injected into the fluid as you move.
const PALETTE = ['#2f6175', '#4a8f8c', '#b2563a', '#6a5a9c', '#c98a4b', '#3a5e9c']

/**
 * The signature interaction (David-Whyte inspired): a real GPU fluid simulation
 * (webgl-fluid). The canvas sits behind the content with pointer-events: none,
 * so we forward window pointer moves to it — moving the cursor pushes flowing
 * watercolour that blooms and slowly dissipates. Fully guarded.
 */
export default function FluidCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // bail if WebGL is unavailable
    try {
      const t = document.createElement('canvas')
      if (!(t.getContext('webgl') || t.getContext('experimental-webgl'))) return
    } catch {
      return
    }

    let cancelled = false
    const cleanups: Array<() => void> = []

    import('webgl-fluid')
      .then((mod) => {
        if (cancelled || !ref.current) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const WebGLFluid = (mod as any).default
        try {
          WebGLFluid(ref.current, {
            TRIGGER: 'hover',
            IMMEDIATE: true,
            AUTO: false,
            TRANSPARENT: true,
            BACK_COLOR: { r: 244, g: 236, b: 224 },
            COLOR_PALETTE: PALETTE,
            SIM_RESOLUTION: 128,
            DYE_RESOLUTION: 1024,
            DENSITY_DISSIPATION: 0.7, // lower = paint lingers longer (tune to taste)
            VELOCITY_DISSIPATION: 1.1,
            PRESSURE: 0.8,
            PRESSURE_ITERATIONS: 20,
            CURL: 26,
            SPLAT_RADIUS: 0.32,
            SPLAT_FORCE: 7000,
            SHADING: true,
            COLORFUL: true, // drift hue so hover (no click) still paints
            COLOR_UPDATE_SPEED: 2.5,
            BLOOM: true,
            BLOOM_INTENSITY: 0.7,
            BLOOM_RESOLUTION: 256,
          })

          // Forward window pointer activity to the canvas the lib listens on.
          // webgl-fluid reads offsetX/offsetY (0 on synthetic events) so we set
          // them explicitly from the canvas rect.
          const forward = (e: MouseEvent) => {
            const canvas = ref.current
            if (!canvas) return
            const rect = canvas.getBoundingClientRect()
            const ev = new MouseEvent(e.type, {
              clientX: e.clientX,
              clientY: e.clientY,
              bubbles: false, // must not bubble back to window (infinite loop)
              cancelable: true,
              view: window,
            })
            Object.defineProperty(ev, 'offsetX', { value: e.clientX - rect.left })
            Object.defineProperty(ev, 'offsetY', { value: e.clientY - rect.top })
            canvas.dispatchEvent(ev)
          }
          window.addEventListener('mousemove', forward)
          window.addEventListener('mousedown', forward)
          cleanups.push(() => window.removeEventListener('mousemove', forward))
          cleanups.push(() => window.removeEventListener('mousedown', forward))
        } catch (e) {
          console.warn('Fluid disabled:', e)
        }
      })
      .catch((e) => console.warn('Fluid failed to load:', e))

    return () => {
      cancelled = true
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return <canvas ref={ref} className="fluid" aria-hidden="true" />
}
