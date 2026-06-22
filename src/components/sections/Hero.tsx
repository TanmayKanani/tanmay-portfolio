'use client'

import { motion } from 'framer-motion'
import { EASE } from '@/lib/motion'
import WatercolorWash from '@/components/canvas/WatercolorWash'
import ScratchReveal from '@/components/canvas/ScratchReveal'
import Magnetic from '@/components/ui/Magnetic'
import { site } from '@/lib/data/site'

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE, delay },
  }),
}

export default function Hero() {
  const name = site.name

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
      {/* revealed beneath the scratch layer */}
      <WatercolorWash />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1320, margin: '0 auto', width: '100%' }}>
        <motion.div
          custom={0.1}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.6rem' }}
        >
          <span className="rule" style={{ width: 40, flex: '0 0 40px' }} />
          <span className="eyebrow">{site.greeting}</span>
        </motion.div>

        <h1
          className="font-serif kinetic"
          style={{
            fontSize: 'clamp(3.2rem, 13vw, 11rem)',
            lineHeight: 0.94,
            fontWeight: 500,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          {name.split(' ').map((word, wi) => (
            <span key={wi} style={{ display: 'block', overflow: 'hidden' }}>
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1, ease: EASE, delay: 0.3 + wi * 0.14 }}
                style={{ display: 'inline-block' }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          custom={0.9}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{ marginTop: '1.8rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
        >
          <span className="rule" style={{ width: 48, flex: '0 0 48px' }} />
          <span style={{ fontSize: '1rem', letterSpacing: '0.04em', color: 'var(--text)' }}>
            {site.role}
          </span>
        </motion.div>

        <motion.p
          custom={1.05}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{
            marginTop: '1.8rem',
            maxWidth: '44ch',
            fontSize: 'clamp(1rem, 1.4vw, 1.18rem)',
            color: 'var(--text-muted)',
            lineHeight: 1.7,
          }}
        >
          {site.intro}
        </motion.p>

        <motion.div
          custom={1.2}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{ marginTop: '2.4rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
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

      {/* location + scroll cue */}
      <div
        style={{
          position: 'absolute',
          zIndex: 2,
          bottom: 'clamp(1.5rem, 4vh, 2.5rem)',
          left: 0,
          right: 0,
          paddingInline: 'clamp(1.25rem, 5vw, 6rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{site.location}</span>
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
      </div>

      {/* the scratch-to-reveal layer (on top) */}
      <ScratchReveal />
    </section>
  )
}
