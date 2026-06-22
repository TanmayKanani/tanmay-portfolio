'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { EASE } from '@/lib/motion'
import Reveal from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import { site, type Project } from '@/lib/data/site'

const HIDDEN = 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)'
const SHOWN = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'

export default function Work() {
  const [active, setActive] = useState<number | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const moveX = useRef<((v: number) => void) | null>(null)
  const moveY = useRef<((v: number) => void) | null>(null)

  useEffect(() => {
    if (!previewRef.current) return
    moveX.current = gsap.quickTo(previewRef.current, 'x', { duration: 1.1, ease: 'power3.out' })
    moveY.current = gsap.quickTo(previewRef.current, 'y', { duration: 1.4, ease: 'power3.out' })
  }, [])

  const onMove = (e: React.MouseEvent) => {
    if (window.innerWidth < 768) return
    moveX.current?.(e.clientX + 28)
    moveY.current?.(e.clientY - 60)
  }

  const enter = (i: number) => {
    if (window.innerWidth < 768) return
    setActive(i)
    gsap.to(previewRef.current, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' })
  }
  const leave = () => {
    if (window.innerWidth < 768) return
    setActive(null)
    gsap.to(previewRef.current, { opacity: 0, scale: 0.92, duration: 0.3, ease: 'power2.out' })
  }

  return (
    <section id="work" className="section" onMouseMove={onMove}>
      <SectionHeader index="02" label="Selected work" />

      <div style={{ borderTop: '1px solid var(--line)' }}>
        {site.projects.map((project, i) => (
          <ProjectRow
            key={project.title}
            project={project}
            index={i}
            active={active === i}
            onEnter={() => enter(i)}
            onLeave={leave}
          />
        ))}
      </div>

      {/* cursor-following floating preview (desktop) */}
      <div
        ref={previewRef}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 440,
          height: 300,
          zIndex: 60,
          pointerEvents: 'none',
          opacity: 0,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--accent)',
          boxShadow: '0 30px 70px -24px rgba(29,24,19,0.45)',
          willChange: 'transform',
        }}
      >
        {active !== null && <PreviewCard project={site.projects[active]} index={active} />}
      </div>
    </section>
  )
}

function ProjectRow({
  project,
  index,
  active,
  onEnter,
  onLeave,
}: {
  project: Project
  index: number
  active: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  const href = project.live || project.repo || '#'
  return (
    <Reveal>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        data-hover
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{
          display: 'block',
          position: 'relative',
          borderBottom: '1px solid var(--line)',
          padding: 'clamp(1.3rem, 3vw, 2rem) clamp(0.5rem, 2vw, 1.5rem)',
          overflow: 'hidden',
        }}
      >
        {/* wipe overlay */}
        <motion.div
          aria-hidden
          initial={false}
          animate={{ clipPath: active ? SHOWN : HIDDEN }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ position: 'absolute', inset: 0, background: 'var(--accent)', zIndex: 0 }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              transition: 'color 0.4s, padding-left 0.4s',
              color: active ? 'var(--bg)' : 'var(--text)',
              paddingLeft: active ? '0.8rem' : 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.1rem' }}>
              <span className="font-mono" style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                0{index + 1}
              </span>
              <h3
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.7rem, 4.5vw, 3rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.04,
                }}
              >
                {project.title}
              </h3>
            </div>
            <span style={{ fontSize: '1.1rem' }} aria-hidden>
              ↗
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1.2rem',
              flexWrap: 'wrap',
              marginTop: '0.7rem',
              paddingLeft: active ? '0.8rem' : 0,
              transition: 'color 0.4s, padding-left 0.4s',
              color: active ? 'rgba(243,235,221,0.78)' : 'var(--text-dim)',
            }}
            className="font-mono"
          >
            <span style={{ fontSize: '0.72rem' }}>{project.meta}</span>
            <span style={{ fontSize: '0.72rem' }}>· {project.year}</span>
          </div>
        </div>
      </a>
    </Reveal>
  )
}

const TINTS = [
  ['rgba(47,97,117,0.6)', 'rgba(29,24,19,0.15)'],
  ['rgba(74,143,140,0.55)', 'rgba(29,24,19,0.15)'],
  ['rgba(178,86,58,0.55)', 'rgba(29,24,19,0.15)'],
  ['rgba(106,90,156,0.55)', 'rgba(29,24,19,0.15)'],
]

function PreviewCard({ project, index }: { project: Project; index: number }) {
  const [c1, c2] = TINTS[index % TINTS.length]
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${c1}, ${c2}), #1d1813`,
        color: 'var(--bg)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <span
        className="font-serif"
        aria-hidden
        style={{
          position: 'absolute',
          right: '0.6rem',
          top: '-1.4rem',
          fontSize: '9rem',
          fontWeight: 500,
          color: 'rgba(243,235,221,0.10)',
          lineHeight: 1,
        }}
      >
        0{index + 1}
      </span>
      <div className="eyebrow" style={{ color: 'rgba(243,235,221,0.65)' }}>
        {project.meta}
      </div>
      <div>
        <div
          className="font-serif"
          style={{ fontSize: '2.2rem', fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.02em' }}
        >
          {project.title}
        </div>
        <div
          style={{ marginTop: '0.7rem', fontSize: '0.78rem', color: 'rgba(243,235,221,0.9)', letterSpacing: '0.02em' }}
        >
          {project.live ? 'View live ↗' : 'View source ↗'}
        </div>
      </div>
    </div>
  )
}
