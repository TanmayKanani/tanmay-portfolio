'use client'

import { motion } from 'framer-motion'
import { EASE } from '@/lib/motion'

interface SectionHeaderProps {
  index: string
  label: string
  title?: string
}

/** Eyebrow + index row (with an animated divider) that opens each section. */
export default function SectionHeader({ index, label, title }: SectionHeaderProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-12% 0px' }}
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: title ? '1.6rem' : '3rem',
        }}
      >
        <motion.span
          className="eyebrow"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5 } } }}
        >
          {index}
        </motion.span>
        <motion.span
          className="rule"
          style={{ flex: 1, maxWidth: 64, transformOrigin: 'left' }}
          variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.7, ease: EASE } } }}
        />
        <motion.span
          className="eyebrow"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5 } } }}
        >
          {label}
        </motion.span>
      </div>
      {title && (
        <motion.h2
          className="font-serif"
          variants={{
            hidden: { opacity: 0, y: 18 },
            show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
          }}
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
        </motion.h2>
      )}
    </motion.div>
  )
}
