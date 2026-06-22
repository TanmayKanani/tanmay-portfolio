'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE } from '@/lib/motion'
import { site } from '@/lib/data/site'

/** Cinematic intro: counts to 100 then curtains up to reveal the page. */
export default function Loader() {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const start = performance.now()
    const dur = 1900
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setProgress(Math.round(eased * 100))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setTimeout(() => setDone(true), 350)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (done) document.body.style.overflow = ''
  }, [done])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          exit={{ y: '-100%' }}
          transition={{ duration: 1, ease: EASE }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
          }}
        >
          <motion.div
            className="font-serif"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            style={{
              fontSize: 'clamp(2.4rem, 7vw, 4.5rem)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            {site.name}
            <span style={{ color: 'var(--accent-bri)' }}>.</span>
          </motion.div>

          <div style={{ width: 'min(280px, 60vw)', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <div style={{ height: 2, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--accent-deep), var(--accent-bri))',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
            <div
              className="font-mono"
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)' }}
            >
              <span>Loading</span>
              <span>{progress}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
