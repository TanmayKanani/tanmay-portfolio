'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useMousePosition } from '@/lib/hooks/useMousePosition'
import { useMobile } from '@/lib/hooks/useMobile'
import CrackEffect from '@/components/ui/CrackEffect'

export default function Hero() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const mouseRef = useMousePosition()
  const isMobile = useMobile()
  const rafRef = useRef<number>(0)
  const tiltRef = useRef({ x: 0, y: 0 })
  const [showDescend, setShowDescend] = useState(false)

  // Smooth perspective tilt following mouse, max ±3°
  useEffect(() => {
    if (isMobile) return

    const animate = () => {
      const m = mouseRef.current
      tiltRef.current.x += (m.y * 3 - tiltRef.current.x) * 0.04
      tiltRef.current.y += (m.x * 3 - tiltRef.current.y) * 0.04

      if (sceneRef.current) {
        sceneRef.current.style.transform =
          `perspective(1400px) rotateX(${tiltRef.current.x}deg) rotateY(${tiltRef.current.y}deg)`
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isMobile, mouseRef])

  // Reveal "DESCEND" after two scroll pulse cycles
  useEffect(() => {
    const t = setTimeout(() => setShowDescend(true), 8000)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Crack appears 8 seconds in */}
      <CrackEffect />

      {/* Warm directional light from upper-right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '55%',
            height: '45%',
            background:
              'radial-gradient(ellipse at 90% 5%, rgba(200,169,110,0.05) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* Scene container — receives perspective tilt */}
      <div
        ref={sceneRef}
        className="absolute inset-0 flex flex-col justify-center"
        style={{
          paddingLeft: 'clamp(44px, 8vw, 120px)',
          paddingRight: 'clamp(44px, 8vw, 120px)',
          willChange: 'transform',
        }}
      >
        {/* Impossible architectural geometry */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          {/* Vertical corridor — right side */}
          <div
            style={{
              position: 'absolute',
              right: '12%',
              top: '18%',
              width: 1,
              height: '55%',
              background:
                'linear-gradient(to bottom, transparent 0%, rgba(200,169,110,0.35) 30%, rgba(200,169,110,0.35) 70%, transparent 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '22%',
              top: '25%',
              width: 1,
              height: '40%',
              background:
                'linear-gradient(to bottom, transparent 0%, rgba(200,169,110,0.15) 40%, rgba(200,169,110,0.15) 60%, transparent 100%)',
            }}
          />
          {/* Ceiling vanishing lines */}
          <div
            style={{
              position: 'absolute',
              top: '14%',
              left: 0,
              width: '42%',
              height: 1,
              background:
                'linear-gradient(to right, transparent 0%, rgba(200,169,110,0.28) 50%, transparent 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '22%',
              left: 0,
              width: '28%',
              height: 1,
              background:
                'linear-gradient(to right, transparent 0%, rgba(200,169,110,0.14) 60%, transparent 100%)',
            }}
          />
          {/* Floor line */}
          <div
            style={{
              position: 'absolute',
              bottom: '18%',
              left: 0,
              width: '55%',
              height: 1,
              background:
                'linear-gradient(to right, transparent 0%, rgba(200,169,110,0.22) 40%, transparent 100%)',
            }}
          />
          {/* Window to another part of the same room */}
          <div
            style={{
              position: 'absolute',
              right: '6%',
              top: '30%',
              width: '8%',
              height: '25%',
              border: '1px solid rgba(200,169,110,0.12)',
              background: 'rgba(200,169,110,0.02)',
            }}
          />
        </div>

        {/* Text content */}
        <div className="relative" style={{ zIndex: 2 }}>
          {/* Name — present on load, world existed before visitor arrived */}
          <h1
            style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: 'clamp(52px, 6.5vw, 88px)',
              fontWeight: 400,
              letterSpacing: '0.01em',
              lineHeight: 1.05,
              color: '#e8e2d8',
            }}
          >
            Tanmay Kanani
          </h1>

          {/* Discipline — fades up at 900ms */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--font-ibm-plex-mono)',
              fontSize: '13px',
              letterSpacing: '0.14em',
              color: '#6b6055',
              marginTop: '20px',
              textTransform: 'uppercase',
            }}
          >
            Computer Science — Third Year
          </motion.p>

          {/* Bridge sentence — fades up at 1400ms */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.78, y: 0 }}
            transition={{ duration: 0.9, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '19px',
              lineHeight: 1.65,
              color: '#e8e2d8',
              marginTop: '28px',
              maxWidth: '360px',
            }}
          >
            I build things that solve things.
          </motion.p>
        </div>
      </div>

      {/* Scroll prompt — bottom center */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
        style={{ zIndex: 10, gap: '10px' }}
      >
        <div
          style={{
            width: 40,
            height: 1,
            background: 'rgba(200, 169, 110, 0.45)',
            animation: 'scrollLinePulse 4s ease-in-out infinite',
          }}
        />
        <motion.span
          animate={{ opacity: showDescend ? 0.45 : 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'var(--font-ibm-plex-mono)',
            fontSize: '9px',
            letterSpacing: '0.38em',
            color: '#6b6055',
            textTransform: 'uppercase',
            display: 'block',
          }}
        >
          Descend
        </motion.span>
      </div>

      <style>{`
        @keyframes scrollLinePulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </section>
  )
}
