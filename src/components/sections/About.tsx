'use client'

import Reveal from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import { site } from '@/lib/data/site'
import { parseAccent } from '@/lib/text'

export default function About() {
  return (
    <section id="about" className="section">
      <SectionHeader index="01" label="About" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 'clamp(1.6rem, 4vw, 2.4rem)',
          maxWidth: 900,
        }}
      >
        <Reveal>
          <p
            className="font-serif"
            style={{
              fontSize: 'clamp(1.9rem, 4.4vw, 3.4rem)',
              lineHeight: 1.25,
              fontWeight: 400,
              letterSpacing: '-0.015em',
            }}
          >
            {parseAccent(site.about.statement)}
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <p
            style={{
              fontSize: 'clamp(1.05rem, 1.6vw, 1.3rem)',
              lineHeight: 1.75,
              color: 'var(--text-muted)',
              maxWidth: '60ch',
            }}
          >
            {site.about.body}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
