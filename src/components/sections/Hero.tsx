'use client'

import { motion } from 'framer-motion'
import { EASE } from '@/lib/motion'
import { site } from '@/lib/data/site'

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE, delay },
  }),
}

export default function Hero() {
  return (
    <section
      id="top"
      style={{
        position: 'relative',
        minHeight: '92svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        maxWidth: 1180,
        margin: '0 auto',
        paddingInline: 'clamp(1.25rem, 5vw, 5rem)',
        paddingTop: '6rem',
      }}
    >
      <motion.div custom={0.05} initial="hidden" animate="show" variants={fade}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.6rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1fbf75' }} />
          <span className="eyebrow" style={{ color: 'var(--text-muted)' }}>
            {site.greeting} — open to work
          </span>
        </div>
      </motion.div>

      <h1
        className="font-serif"
        style={{
          fontSize: 'clamp(2.8rem, 9vw, 6.5rem)',
          lineHeight: 1.0,
          fontWeight: 500,
          letterSpacing: '-0.025em',
          margin: 0,
          maxWidth: '14ch',
        }}
      >
        {['Tanmay', 'Kanani'].map((w, i) => (
          <span key={w} style={{ display: 'inline-block', overflow: 'hidden', marginRight: '0.25em' }}>
            <motion.span
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.1 }}
              style={{ display: 'inline-block' }}
            >
              {w}
            </motion.span>
          </span>
        ))}
      </h1>

      <motion.p
        custom={0.5}
        initial="hidden"
        animate="show"
        variants={fade}
        style={{
          marginTop: '1.8rem',
          maxWidth: '52ch',
          fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)',
          color: 'var(--text-muted)',
          lineHeight: 1.65,
        }}
      >
        {site.intro}
      </motion.p>

      <motion.div
        custom={0.65}
        initial="hidden"
        animate="show"
        variants={fade}
        style={{ marginTop: '2.4rem', display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <a className="btn btn-accent" href="#work">View my work</a>
        <a className="btn" href={`mailto:${site.email}`}>Get in touch</a>
      </motion.div>

      {/* quick facts */}
      <motion.div
        custom={0.8}
        initial="hidden"
        animate="show"
        variants={fade}
        style={{
          marginTop: 'clamp(3rem, 8vh, 5rem)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2.5rem',
          borderTop: '1px solid var(--line)',
          paddingTop: '1.6rem',
        }}
      >
        {[
          ['Role', site.role],
          ['Based in', site.location],
          ['Focus', 'Full-stack · Algorithms'],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="eyebrow" style={{ marginBottom: '0.4rem' }}>{k}</div>
            <div style={{ fontSize: '0.98rem', color: 'var(--text)' }}>{v}</div>
          </div>
        ))}
      </motion.div>
    </section>
  )
}
