'use client'

import { motion } from 'framer-motion'
import { RevealGroup, RevealItem } from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import { site } from '@/lib/data/site'

export default function Skills() {
  return (
    <section id="skills" className="section">
      <SectionHeader index="04" label="Toolkit" />

      <RevealGroup
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2.5rem 2rem',
        }}
        stagger={0.07}
      >
        {site.skills.map((group) => (
          <RevealItem key={group.group}>
            <h3 className="eyebrow" style={{ marginBottom: '1.2rem', color: 'var(--accent-bri)' }}>
              {group.group}
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {group.items.map((item) => (
                <motion.li
                  key={item}
                  data-hover
                  whileHover={{ x: 6, color: 'var(--text)' }}
                  transition={{ duration: 0.3 }}
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '1.05rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                  }}
                >
                  <span
                    aria-hidden
                    style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-dim)' }}
                  />
                  {item}
                </motion.li>
              ))}
            </ul>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  )
}
