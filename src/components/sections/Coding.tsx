'use client'

import { motion } from 'framer-motion'
import { EASE } from '@/lib/motion'
import Reveal, { RevealGroup, RevealItem } from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import { site } from '@/lib/data/site'

const totals = [
  { value: site.coding.totals.solved, suffix: '+', label: 'Problems solved' },
  { value: site.coding.totals.activeDays, suffix: '', label: 'Active days' },
  { value: site.coding.totals.contests, suffix: '', label: 'Rated contests' },
]

export default function Coding() {
  return (
    <section id="coding" className="section">
      <SectionHeader index="03" label="Competitive programming" />

      {/* headline totals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2rem',
          marginBottom: 'clamp(3rem, 7vh, 5rem)',
        }}
      >
        {totals.map((t, i) => (
          <Reveal key={t.label} delay={i * 0.08}>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.2rem' }}>
              <div
                className="font-serif"
                style={{
                  fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                  fontWeight: 500,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: 'var(--gold)',
                }}
              >
                <AnimatedCounter value={t.value} suffix={t.suffix} />
              </div>
              <div className="eyebrow" style={{ marginTop: '0.9rem' }}>
                {t.label}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* platform cards */}
      <RevealGroup
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.2rem',
        }}
      >
        {site.coding.platforms.map((p) => (
          <RevealItem key={p.name}>
            <motion.a
              data-hover
              href={p.url}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -6 }}
              transition={{ duration: 0.4, ease: EASE }}
              style={{
                display: 'block',
                height: '100%',
                padding: '1.6rem',
                borderRadius: 16,
                border: '1px solid var(--line)',
                background: 'var(--panel)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.6rem',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{p.name}</span>
                <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  @{p.handle}
                </span>
              </div>

              <div className="eyebrow" style={{ marginBottom: '0.4rem' }}>
                {p.primary.label}
              </div>
              <div
                className="font-serif"
                style={{
                  fontSize: '2.6rem',
                  fontWeight: 500,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--accent-bri)',
                  marginBottom: '1.4rem',
                }}
              >
                {p.primary.value}
              </div>

              <div style={{ display: 'flex', gap: '1.6rem', borderTop: '1px solid var(--line)', paddingTop: '1.1rem' }}>
                {p.stats.map((s) => (
                  <div key={s.label}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 500 }}>{s.value}</div>
                    <div className="eyebrow" style={{ fontSize: '0.62rem', marginTop: '0.25rem' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="font-mono"
                style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '1.1rem' }}
              >
                {p.note}
              </div>
            </motion.a>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  )
}
