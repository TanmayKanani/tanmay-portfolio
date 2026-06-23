'use client'

import Reveal from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import { site } from '@/lib/data/site'
import { parseAccent } from '@/lib/text'

export default function About() {
  return (
    <section id="about" className="section">
      <SectionHeader index="01" label="About" />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '1.6rem', maxWidth: 820 }}>
        <Reveal>
          <p
            className="font-serif"
            style={{
              fontSize: 'clamp(1.6rem, 3.4vw, 2.6rem)',
              lineHeight: 1.3,
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            {parseAccent(site.about.statement)}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.75, color: 'var(--text-muted)', maxWidth: '62ch' }}>
            {site.about.body}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
