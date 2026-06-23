'use client'

import Reveal from '@/components/ui/Reveal'
import Magnetic from '@/components/ui/Magnetic'
import { site } from '@/lib/data/site'
import { parseAccent } from '@/lib/text'

export default function Contact() {
  return (
    <section id="contact" className="section" style={{ paddingBlock: 'clamp(5rem, 14vh, 9rem)' }}>
      <Reveal>
        <div className="eyebrow" style={{ marginBottom: '1.6rem' }}>
          06 — Contact
        </div>
      </Reveal>

      <Reveal y={30}>
        <h2
          className="font-serif"
          style={{
            fontSize: 'clamp(2.4rem, 7vw, 5rem)',
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: '1.6rem',
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
            maxWidth: '46ch',
            marginBottom: '2.2rem',
            color: 'var(--text-muted)',
            fontSize: 'clamp(1rem, 1.4vw, 1.15rem)',
            lineHeight: 1.7,
          }}
        >
          {site.contactSub}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem', alignItems: 'center' }}>
          <Magnetic strength={0.3}>
            <a className="btn btn-accent" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </Magnetic>
          {site.resumeUrl && site.resumeUrl !== '#' && (
            <Magnetic strength={0.3}>
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
            marginTop: 'clamp(2.5rem, 7vh, 4rem)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.2rem 2.2rem',
            borderTop: '1px solid var(--line)',
            paddingTop: '1.8rem',
          }}
        >
          {site.socials.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="ul font-mono"
              style={{ fontSize: '0.82rem', letterSpacing: '0.04em', color: 'var(--text-muted)' }}
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
