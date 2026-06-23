'use client'

import { RevealGroup, RevealItem } from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import { site, type Project } from '@/lib/data/site'

function ProjectCard({ project }: { project: Project }) {
  const href = project.live || project.repo || undefined
  return (
    <RevealItem>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '1.6rem',
          gap: '0.9rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
          <h3 className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.01em' }}>
            {project.title}
          </h3>
          <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {project.year}
          </span>
        </div>

        <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, fontSize: '0.96rem', flex: 1 }}>
          {project.summary}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '0.4rem',
            paddingTop: '0.9rem',
            borderTop: '1px solid var(--line)',
          }}
        >
          <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {project.meta}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 500 }}>
            {project.live ? 'Live' : 'Source'} <span className="go-arrow">↗</span>
          </span>
        </div>
      </a>
    </RevealItem>
  )
}

export default function Work() {
  return (
    <section id="work" className="section">
      <SectionHeader index="02" label="Selected work" title="Things I've built." />
      <RevealGroup
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.2rem',
        }}
      >
        {site.projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </RevealGroup>
    </section>
  )
}
