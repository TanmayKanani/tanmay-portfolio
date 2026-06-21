import { site } from '@/lib/data/site'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line)',
        paddingInline: 'clamp(1.25rem, 5vw, 6rem)',
        paddingBlock: '2.5rem',
        maxWidth: 1320,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
          © {year} {site.name}
        </span>
        <a
          data-hover
          href="#top"
          className="font-mono"
          style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}
        >
          Back to top ↑
        </a>
        <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
          Built with Next.js
        </span>
      </div>
    </footer>
  )
}
