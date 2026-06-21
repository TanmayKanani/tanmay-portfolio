'use client'

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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(110px, 160px) 1fr',
                gap: 'clamp(1rem, 4vw, 3rem)',
                alignItems: 'baseline',
                padding: 'clamp(1.2rem, 2.6vw, 1.8rem) 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-bri)',
                }}
              >
                {a.tag}
              </span>
              <p style={{ fontSize: 'clamp(1rem, 1.6vw, 1.25rem)', lineHeight: 1.55, color: 'var(--text)' }}>
                {a.text}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
