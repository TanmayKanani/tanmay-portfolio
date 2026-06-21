'use client'

import { motion } from 'framer-motion'
import { EASE } from '@/lib/motion'
import Constellation from '@/components/canvas/Constellation'
import Magnetic from '@/components/ui/Magnetic'
import { site } from '@/lib/data/site'
import { parseAccent } from '@/lib/text'

const lineVariant = {
  hidden: { y: '110%' },
  show: (i: number) => ({
    y: '0%',
    transition: { duration: 1.1, ease: EASE, delay: 0.35 + i * 0.12 },
  }),
}

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE, delay },
  }),
}

export default function Hero() {
  return (
    <section
      id="top"
      style={{
        position: 'relative',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingInline: 'clamp(1.25rem, 5vw, 6rem)',
      }}
    >
      <Constellation />

      <div style={{ position: 'relative', maxWidth: 1320, margin: '0 auto', width: '100%' }}>
        {/* eyebrow */}
        <motion.div
          custom={0.15}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '2rem' }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent-bri)',
              boxShadow: '0 0 14px var(--accent-glow)',
            }}
          />
          <span className="eyebrow">{site.role}</span>
        </motion.div>

        {/* headline with line-mask reveal */}
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.7rem, 9vw, 7rem)',
            lineHeight: 1.02,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {site.headline.map((line, i) => (
            <span
              key={i}
              style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.06em' }}
            >
              <motion.span
                custom={i}
                initial="hidden"
                animate="show"
                variants={lineVariant}
                style={{ display: 'block' }}
              >
                {parseAccent(line)}
              </motion.span>
            </span>
          ))}
        </h1>

        {/* intro + meta */}
        <motion.p
          custom={0.95}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{
            marginTop: '2.4rem',
            maxWidth: '46ch',
            fontSize: 'clamp(1rem, 1.4vw, 1.18rem)',
            color: 'var(--text-muted)',
            lineHeight: 1.65,
          }}
        >
          {site.intro}
        </motion.p>

        <motion.div
          custom={1.15}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{ marginTop: '2.6rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
        >
          <Magnetic strength={0.4}>
            <a className="btn btn-accent" href="#work">
              View work
              <span aria-hidden>↓</span>
            </a>
          </Magnetic>
          <Magnetic strength={0.4}>
            <a className="btn" href="#contact">
              Get in touch
            </a>
          </Magnetic>
        </motion.div>
      </div>

      {/* footer row: location + scroll cue */}
      <motion.div
        custom={1.4}
        initial="hidden"
        animate="show"
        variants={fade}
        style={{
          position: 'absolute',
          bottom: 'clamp(1.5rem, 4vh, 2.5rem)',
          left: 'clamp(1.25rem, 5vw, 6rem)',
          right: 'clamp(1.25rem, 5vw, 6rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <div>{site.location}</div>
          <div>{site.coords}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <span className="eyebrow">Scroll</span>
          <motion.span
            aria-hidden
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'inline-block', color: 'var(--text-dim)' }}
          >
            ↓
          </motion.span>
        </div>
      </motion.div>
    </section>
  )
}
