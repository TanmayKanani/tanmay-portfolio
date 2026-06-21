'use client'

import Reveal from '@/components/ui/Reveal'
import Magnetic from '@/components/ui/Magnetic'
import { site } from '@/lib/data/site'
import { parseAccent } from '@/lib/text'

export default function Contact() {
  return (
    <section id="contact" className="section" style={{ paddingBlock: 'clamp(6rem, 16vh, 11rem)' }}>
      <Reveal>
        <div className="eyebrow" style={{ marginBottom: '2rem' }}>
          06 — Contact
        </div>
      </Reveal>

      <Reveal y={36}>
        <h2
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 8vw, 6rem)',
            fontWeight: 500,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            marginBottom: '2.6rem',
          }}
        >
          {site.contactHeadline.map((line, i) => (
            <span key={i} style={{ display: 'block' }}>
              {parseAccent(line)}
            </span>
          ))}
        </h2>
      </Reveal>

      <Reveal delay={0.06}>
        <p
          style={{
            maxWidth: '42ch',
            marginBottom: '2.4rem',
            marginTop: '-0.6rem',
            color: 'var(--text-muted)',
            fontSize: 'clamp(1rem, 1.4vw, 1.15rem)',
            lineHeight: 1.7,
          }}
        >
          {site.contactSub}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <Magnetic strength={0.4}>
            <a className="btn btn-accent" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </Magnetic>
          {site.resumeUrl && site.resumeUrl !== '#' && (
            <Magnetic strength={0.4}>
              <a className="btn" href={site.resumeUrl} target="_blank" rel="noreferrer">
                Résumé ↗
              </a>
            </Magnetic>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div
          style={{
            marginTop: 'clamp(3rem, 8vh, 5rem)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem 2.5rem',
            borderTop: '1px solid var(--line)',
            paddingTop: '2rem',
          }}
        >
          {site.socials.map((s) => (
            <a
              key={s.label}
              data-hover
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono"
              style={{
                fontSize: '0.82rem',
                letterSpacing: '0.04em',
                color: 'var(--text-muted)',
                transition: 'color 0.3s',
              }}
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
