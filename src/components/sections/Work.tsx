'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE } from '@/lib/motion'
import Reveal from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import { site, type Project } from '@/lib/data/site'

function ProjectRow({ project, index }: { project: Project; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <Reveal>
      <div
        data-hover
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        style={{
          borderTop: '1px solid var(--line)',
          padding: 'clamp(1.4rem, 3vw, 2.1rem) 0',
          position: 'relative',
          transition: 'background 0.4s var(--ease-out)',
        }}
      >
        {/* top line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '1.2rem',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.2rem', minWidth: 0 }}>
            <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              0{index + 1}
            </span>
            <motion.h3
              className="font-serif"
              animate={{ color: open ? 'var(--accent-bri)' : 'var(--text)' }}
              transition={{ duration: 0.4 }}
              style={{
                fontSize: 'clamp(1.6rem, 4vw, 2.8rem)',
                fontWeight: 500,
                letterSpacing: '-0.015em',
                lineHeight: 1.05,
              }}
            >
              {project.title}
            </motion.h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.4rem' }}>
            <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {project.meta}
            </span>
            <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              {project.year}
            </span>
            <motion.span
              aria-hidden
              animate={{ rotate: open ? 90 : 0, color: open ? 'var(--accent-bri)' : 'var(--text-dim)' }}
              transition={{ duration: 0.4 }}
              style={{ display: 'inline-block', fontSize: '0.9rem' }}
            >
              →
            </motion.span>
          </div>
        </div>

        {/* expanding detail */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ paddingTop: '1.3rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem 3rem' }}>
                <p
                  style={{
                    color: 'var(--text-muted)',
                    lineHeight: 1.7,
                    maxWidth: '62ch',
                    fontSize: '0.98rem',
                    flex: '1 1 380px',
                  }}
                >
                  {project.summary}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {project.live && (
                    <a
                      className="font-mono"
                      href={project.live}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: '0.8rem', color: 'var(--accent-bri)' }}
                    >
                      ↗ Live site
                    </a>
                  )}
                  {project.repo && (
                    <a
                      className="font-mono"
                      href={project.repo}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                    >
                      ↗ Source
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  )
}

export default function Work() {
  return (
    <section id="work" className="section">
      <SectionHeader index="02" label="Selected work" />
      <div style={{ borderBottom: '1px solid var(--line)' }}>
        {site.projects.map((project, i) => (
          <ProjectRow key={project.title} project={project} index={i} />
        ))}
      </div>
    </section>
  )
}
