'use client'

import { useRef, useState } from 'react'

const CHARS = '!<>-_\\/[]{}—=+*^?#________'

/** Decodes/scrambles its text on hover (and once when it enters view). */
export default function ScrambleText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const [display, setDisplay] = useState(text)
  const frame = useRef<ReturnType<typeof setInterval> | null>(null)

  const run = () => {
    if (frame.current) clearInterval(frame.current)
    let iteration = 0
    frame.current = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((ch, i) => {
            if (ch === ' ') return ' '
            if (i < iteration) return text[i]
            return CHARS[Math.floor(Math.random() * CHARS.length)]
          })
          .join('')
      )
      iteration += 1 / 2
      if (iteration >= text.length) {
        if (frame.current) clearInterval(frame.current)
        setDisplay(text)
      }
    }, 35)
  }

  return (
    <span className={className} onMouseEnter={run}>
      {display}
    </span>
  )
}
