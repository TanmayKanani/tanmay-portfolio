'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { EASE } from '@/lib/motion'
import Magnetic from '@/components/ui/Magnetic'
import { site } from '@/lib/data/site'

const HeroScene = dynamic(() => import('@/components/canvas/HeroScene'), { ssr: false })

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE, delay },
  }),
}

// split the name into letters for a refined stagger reveal
const letters = (text: string) => Array.from(text)

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
      <HeroScene />

      <div style={{ position: 'relative', maxWidth: 1320, margin: '0 auto', width: '100%' }}>
        {/* greeting */}
        <motion.div
          custom={0.15}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.6rem' }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-bri)',
              boxShadow: '0 0 16px var(--accent-glow)',
            }}
          />
          <span className="eyebrow">{site.greeting}</span>
        </motion.div>

        {/* name — the hero */}
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(3.2rem, 13vw, 11rem)',
            lineHeight: 0.95,
            fontWeight: 500,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          {name.split(' ').map((word, wi) => (
            <span key={wi} style={{ display: 'block', overflow: 'hidden' }}>
              <span style={{ display: 'inline-block' }}>
                {letters(word).map((ch, ci) => (
                  <motion.span
                    key={ci}
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    transition={{
                      duration: 1,
                      ease: EASE,
                      delay: 0.35 + wi * 0.18 + ci * 0.035,
                    }}
                    style={{ display: 'inline-block' }}
                  >
                    {ch}
                  </motion.span>
                ))}
              </span>
            </span>
          ))}
        </h1>

        {/* role */}
        <motion.div
          custom={1.05}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{ marginTop: '1.8rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
        >
          <span className="rule" style={{ width: 48, flex: '0 0 48px' }} />
          <span
            className="font-mono"
            style={{ fontSize: '0.9rem', letterSpacing: '0.06em', color: 'var(--text)' }}
          >
            {site.role}
          </span>
        </motion.div>

        {/* intro */}
        <motion.p
          custom={1.2}
          initial="hidden"
          animate="show"
          variants={fade}
          style={{
            marginTop: '1.8rem',
            maxWidth: '46ch',
            fontSize: 'clamp(1rem, 1.4vw, 1.18rem)',
            color: 'var(--text-muted)',
            lineHeight: 1.7,
          }}
        >
          {site.intro}
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={1.35}
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

      {/* scroll cue */}
      <motion.div
        custom={1.6}
        initial="hidden"
        animate="show"
        variants={fade}
        style={{
          position: 'absolute',
          bottom: 'clamp(1.5rem, 4vh, 2.5rem)',
          left: 0,
          right: 0,
          paddingInline: 'clamp(1.25rem, 5vw, 6rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          {site.location}
        </span>
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
