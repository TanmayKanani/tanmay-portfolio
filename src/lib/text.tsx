import { Fragment, type ReactNode } from 'react'

/**
 * Renders text where *wrapped* segments become the accent serif italic.
 * e.g. parseAccent('the space *between.*') → "the space " + <em>between.</em>
 */
export function parseAccent(input: string): ReactNode {
  const parts = input.split(/(\*[^*]+\*)/g).filter(Boolean)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <span key={i} className="serif-accent">
          {part.slice(1, -1)}
        </span>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}
