'use client'

import { RevealGroup, RevealItem } from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import { site } from '@/lib/data/site'

export default function Skills() {
  return (
    <section id="skills" className="section">
      <SectionHeader index="04" label="Toolkit" title="What I work with." />

      <RevealGroup
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
        }}
        stagger={0.07}
      >
        {site.skills.map((group) => (
          <RevealItem key={group.group}>
            <h3 className="eyebrow" style={{ marginBottom: '1rem', color: 'var(--accent)' }}>
              {group.group}
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {group.items.map((item) => (
                <li
                  key={item}
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--text)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '0.4rem 0.8rem',
                    background: 'var(--panel)',
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  )
}
