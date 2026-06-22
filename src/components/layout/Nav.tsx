'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE } from '@/lib/motion'
import { site } from '@/lib/data/site'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string>('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ids = site.nav.map((n) => n.href.slice(1))
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          transition: 'background 0.4s, border-color 0.4s, backdrop-filter 0.4s',
          background: scrolled ? 'rgba(243,235,221,0.72)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
        }}
      >
        <nav
          style={{
            maxWidth: 1320,
            margin: '0 auto',
            padding: '1.1rem clamp(1.25rem, 5vw, 6rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <a
            href="#top"
            data-hover
            style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}
          >
            <motion.span
              aria-hidden
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}
            />
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Open to work
            </span>
          </a>

          {/* desktop links */}
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {site.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                data-hover
                className="font-mono"
                style={{
                  fontSize: '0.78rem',
                  letterSpacing: '0.02em',
                  color: active === item.href ? 'var(--text)' : 'var(--text-muted)',
                  transition: 'color 0.3s',
                  position: 'relative',
                }}
              >
                {item.label}
                {active === item.href && (
                  <motion.span
                    layoutId="nav-active"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: -6,
                      height: 1,
                      background: 'var(--accent-bri)',
                    }}
                  />
                )}
              </a>
            ))}
          </div>

          {/* mobile toggle */}
          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
            style={{ display: 'none', flexDirection: 'column', gap: 5, padding: 6 }}
          >
            <span style={{ width: 22, height: 1.5, background: 'var(--text)', display: 'block' }} />
            <span style={{ width: 22, height: 1.5, background: 'var(--text)', display: 'block' }} />
          </button>
        </nav>
      </motion.header>

      {/* mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 80,
              background: 'rgba(243,235,221,0.97)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.6rem',
            }}
          >
            {site.nav.map((item, i) => (
              <motion.a
                key={item.href}
                href={item.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06 }}
                className="font-serif"
                style={{ fontSize: '2rem', fontWeight: 500 }}
              >
                {item.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 720px) {
          .nav-links { display: none !important; }
          .nav-toggle { display: flex !important; }
        }
      `}</style>
    </>
  )
}
