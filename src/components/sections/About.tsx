'use client'

import Reveal, { RevealGroup, RevealItem } from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import { site } from '@/lib/data/site'
import { parseAccent } from '@/lib/text'

export default function About() {
  return (
    <section id="about" className="section">
      <SectionHeader index="01" label="About" />

      <Reveal>
        <p
          className="font-serif"
          style={{
            fontSize: 'clamp(1.6rem, 3.4vw, 2.7rem)',
            lineHeight: 1.32,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            maxWidth: '20ch',
            marginBottom: 'clamp(3rem, 7vh, 5rem)',
          }}
        >
          {parseAccent(site.about.statement)}
        </p>
      </Reveal>

      <RevealGroup
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2.5rem',
          borderTop: '1px solid var(--line)',
          paddingTop: '2.5rem',
        }}
      >
        {site.about.columns.map((col) => (
          <RevealItem key={col.title}>
            <h3 className="eyebrow" style={{ marginBottom: '1rem', color: 'var(--accent-bri)' }}>
              {col.title}
            </h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.98rem' }}>
              {col.body}
            </p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  )
}
