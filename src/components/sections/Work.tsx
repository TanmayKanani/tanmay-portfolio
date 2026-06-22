'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { site, type Project } from '@/lib/data/site'

gsap.registerPlugin(ScrollTrigger)

const ACCENTS = ['#ff6f4d', '#5fe3da', '#9db0ff', '#ffd27a']

/**
 * Horizontal, pinned project gallery: the section pins and the track of
 * project panels slides sideways as you scroll vertically. A different
 * navigation model from the usual vertical list.
 */
export default function Work() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    const mm = gsap.matchMedia()

    // horizontal pin only where there's room (desktop / tablet)
    mm.add('(min-width: 768px)', () => {
      const getScroll = () => track.scrollWidth - window.innerWidth
      const tween = gsap.to(track, {
        x: () => -getScroll(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${getScroll()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
        gsap.set(track, { x: 0 })
      }
    })

    return () => mm.revert()
  }, [])

  return (
    <section ref={sectionRef} id="work" style={{ overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 767px) {
          .work-track { flex-direction: column !important; width: 100% !important; min-height: 0 !important; transform: none !important; }
          .work-track > * { width: 100% !important; }
        }
      `}</style>
      <div
        ref={trackRef}
        className="work-track"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          width: 'max-content',
          minHeight: '100svh',
          willChange: 'transform',
        }}
      >
        {/* intro panel */}
        <div
          style={{
            flex: '0 0 auto',
            width: 'min(78vw, 460px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 'clamp(1.5rem, 5vw, 5rem)',
          }}
        >
          <div className="eyebrow" style={{ marginBottom: '1.4rem' }}>
            02 — Selected work
          </div>
          <h2
            className="font-serif"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            Things I’ve
            <br />
            built.
          </h2>
          <p style={{ marginTop: '1.4rem', color: 'var(--text-muted)', maxWidth: '34ch', lineHeight: 1.6 }}>
            Scroll to move sideways through the work.
          </p>
          <div
            className="font-mono"
            style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.7rem', color: 'var(--accent)', fontSize: '0.8rem' }}
          >
            <span>scroll</span>
            <span aria-hidden>→</span>
          </div>
        </div>

        {site.projects.map((project, i) => (
          <ProjectPanel key={project.title} project={project} index={i} />
        ))}

        {/* end spacer */}
        <div style={{ flex: '0 0 auto', width: '12vw' }} />
      </div>
    </section>
  )
}

function ProjectPanel({ project, index }: { project: Project; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length]
  const href = project.live || project.repo || '#'

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-hover
      style={{
        flex: '0 0 auto',
        width: 'min(86vw, 620px)',
        display: 'flex',
        alignItems: 'center',
        padding: 'clamp(1.5rem, 4vw, 4rem)',
      }}
    >
      <div
        className="glass"
        style={{
          position: 'relative',
          width: '100%',
          padding: 'clamp(1.8rem, 4vw, 3rem)',
          overflow: 'hidden',
          minHeight: 'min(64vh, 460px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* big ghost index + glow */}
        <span
          className="font-serif"
          aria-hidden
          style={{
            position: 'absolute',
            right: '-0.5rem',
            top: '-3rem',
            fontSize: 'clamp(10rem, 22vw, 18rem)',
            fontWeight: 500,
            lineHeight: 1,
            color: 'rgba(243,236,216,0.05)',
          }}
        >
          0{index + 1}
        </span>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(60% 80% at 80% 0%, ${accent}22, transparent 70%)`,
          }}
        />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="font-mono" style={{ fontSize: '0.74rem', color: accent }}>
            {project.meta}
          </span>
          <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
            {project.year}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <h3
            className="font-serif"
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.02,
              marginBottom: '1.2rem',
            }}
          >
            {project.title}
          </h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '46ch', fontSize: '0.98rem' }}>
            {project.summary}
          </p>
          <div
            style={{
              marginTop: '1.6rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: accent,
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            {project.live ? 'View live' : 'View source'}
            <span aria-hidden>↗</span>
          </div>
        </div>
      </div>
    </a>
  )
}
