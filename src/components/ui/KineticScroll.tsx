'use client'

import { useEffect } from 'react'

/**
 * Drives a global `--vskew` CSS variable from scroll velocity. Any element
 * with the `.kinetic` class skews/stretches as you scroll and springs back
 * when you stop — so the whole page feels physical, not just one section.
 */
export default function KineticScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let last = window.scrollY
    let skew = 0
    let raf = 0

    const loop = () => {
      const y = window.scrollY
      const velocity = y - last
      last = y
      // target skew from velocity, clamped
      const target = Math.max(-7, Math.min(7, velocity * 0.35))
      skew += (target - skew) * 0.12
      if (Math.abs(skew) < 0.01) skew = 0
      document.documentElement.style.setProperty('--vskew', `${skew.toFixed(3)}deg`)
      document.documentElement.style.setProperty('--vstretch', `${(1 - Math.abs(skew) * 0.012).toFixed(4)}`)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return null
}
