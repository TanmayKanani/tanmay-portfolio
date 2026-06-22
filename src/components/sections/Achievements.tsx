'use client'

import { motion } from 'framer-motion'
import Reveal from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import { site } from '@/lib/data/site'

export default function Achievements() {
  return (
    <section id="achievements" className="section">
      <SectionHeader index="05" label="Recognition" />

      <div style={{ borderTop: '1px solid var(--line)' }}>
        {site.achievements.map((a, i) => (
          <Reveal key={i} delay={i * 0.05}>
            <motion.div
              data-hover
              initial="rest"
              whileHover="hover"
              animate="rest"
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: 'minmax(110px, 160px) 1fr auto',
                gap: 'clamp(1rem, 4vw, 3rem)',
                alignItems: 'baseline',
                padding: 'clamp(1.2rem, 2.6vw, 1.8rem) clamp(0.5rem, 2vw, 1.4rem)',
                borderBottom: '1px solid var(--line)',
                overflow: 'hidden',
              }}
            >
              {/* hover wash */}
              <motion.span
                aria-hidden
                variants={{ rest: { scaleY: 0 }, hover: { scaleY: 1 } }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(40,75,94,0.08)',
                  transformOrigin: 'bottom',
                  zIndex: 0,
                }}
              />
              <span
                className="font-mono"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontSize: '0.72rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                {a.tag}
              </span>
              <p
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontSize: 'clamp(1rem, 1.6vw, 1.25rem)',
                  lineHeight: 1.55,
                  color: 'var(--text)',
                }}
              >
                {a.text}
              </p>
              <motion.span
                aria-hidden
                variants={{ rest: { opacity: 0, x: -8 }, hover: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.35 }}
                style={{ position: 'relative', zIndex: 1, color: 'var(--accent)', alignSelf: 'center' }}
              >
                ↗
              </motion.span>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
