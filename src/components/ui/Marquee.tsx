'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * Infinite horizontal marquee that speeds up briefly with scroll velocity.
 */
export default function Marquee({
  items,
  reverse = false,
}: {
  items: string[]
  reverse?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const tween = gsap.to(track, {
      xPercent: reverse ? 50 : -50,
      duration: 24,
      ease: 'none',
      repeat: -1,
    })
    if (reduced) tween.pause()

    let timeout: ReturnType<typeof setTimeout>
    const onScroll = () => {
      if (reduced) return
      gsap.to(tween, { timeScale: reverse ? -4 : 4, duration: 0.3, overwrite: true })
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        gsap.to(tween, { timeScale: reverse ? -1 : 1, duration: 0.8, overwrite: true })
      }, 120)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timeout)
      tween.kill()
    }
  }, [reverse])

  // duplicate items so the -50% loop is seamless
  const content = [...items, ...items]

  return (
    <div
      style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        borderBlock: '1px solid var(--line)',
        paddingBlock: 'clamp(1rem, 3vw, 1.8rem)',
      }}
    >
      <div ref={trackRef} style={{ display: 'inline-flex', willChange: 'transform' }}>
        {content.map((item, i) => (
          <span
            key={i}
            className="font-serif"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2.5rem',
              paddingInline: '1.5rem',
              fontSize: 'clamp(1.6rem, 4vw, 3rem)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: i % 2 ? 'var(--accent-bri)' : 'var(--text)',
              fontStyle: i % 2 ? 'italic' : 'normal',
            }}
          >
            {item}
            <span style={{ color: 'var(--accent)', fontSize: '0.7em' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
