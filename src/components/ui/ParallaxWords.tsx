'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const LINES: { text: string; from: number; to: number; italic?: boolean }[] = [
  { text: 'Algorithms', from: -12, to: 12 },
  { text: 'Full-stack', from: 18, to: -18, italic: true },
  { text: 'Problem-solving', from: -24, to: 24 },
  { text: 'Shipping', from: 30, to: -30, italic: true },
]

/** Big words that slide horizontally as the section scrolls through view. */
export default function ParallaxWords() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  return (
    <section
      ref={ref}
      aria-label="What I do"
      style={{
        overflow: 'hidden',
        paddingBlock: 'clamp(4rem, 12vh, 8rem)',
        textAlign: 'center',
      }}
    >
      {LINES.map((line) => (
        <Line key={line.text} line={line} progress={scrollYProgress} />
      ))}
    </section>
  )
}

function Line({
  line,
  progress,
}: {
  line: (typeof LINES)[number]
  progress: ReturnType<typeof useScroll>['scrollYProgress']
}) {
  const x = useTransform(progress, [0, 1], [`${line.from}%`, `${line.to}%`])
  return (
    <motion.div
      className="font-serif"
      style={{
        x,
        fontSize: 'clamp(2.4rem, 9vw, 7rem)',
        fontWeight: 500,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        fontStyle: line.italic ? 'italic' : 'normal',
        color: line.italic ? 'var(--accent-bri)' : 'var(--text)',
        whiteSpace: 'nowrap',
      }}
    >
      {line.text}
    </motion.div>
  )
}
