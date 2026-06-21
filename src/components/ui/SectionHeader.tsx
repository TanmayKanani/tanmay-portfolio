'use client'

import Reveal from '@/components/ui/Reveal'

interface SectionHeaderProps {
  index: string
  label: string
  title?: string
}

/** Consistent eyebrow + index row that opens each section. */
export default function SectionHeader({ index, label, title }: SectionHeaderProps) {
  return (
    <Reveal>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: title ? '1.6rem' : '3rem',
        }}
      >
        <span className="eyebrow">{index}</span>
        <span className="rule" style={{ flex: 1, maxWidth: 64 }} />
        <span className="eyebrow">{label}</span>
      </div>
      {title && (
        <h2
          className="font-serif"
          style={{
            fontSize: 'clamp(1.9rem, 4vw, 3rem)',
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.1,
            marginBottom: '3rem',
            maxWidth: '20ch',
          }}
        >
          {title}
        </h2>
      )}
    </Reveal>
  )
}
