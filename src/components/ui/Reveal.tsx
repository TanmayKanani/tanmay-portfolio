'use client'

import { motion, type Variants } from 'framer-motion'
import { EASE } from '@/lib/motion'
import type { CSSProperties, ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** delay in seconds */
  delay?: number
  /** travel distance in px */
  y?: number
  className?: string
  as?: 'div' | 'span' | 'li'
  once?: boolean
}

const variants = (y: number): Variants => ({
  hidden: { opacity: 0, y },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE },
  },
})

/** Fade-and-rise a block into view the first time it enters the viewport. */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = 'div',
  once = true,
}: RevealProps) {
  const MotionTag = motion[as]
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-12% 0px -12% 0px' }}
      variants={variants(y)}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  )
}

/** Stagger container — pair with <RevealItem /> children. */
export function RevealGroup({
  children,
  className,
  style,
  stagger = 0.09,
  once = true,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  stagger?: number
  once?: boolean
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-10% 0px -10% 0px' }}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({
  children,
  className,
  style,
  y = 24,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  y?: number
}) {
  return (
    <motion.div className={className} style={style} variants={variants(y)}>
      {children}
    </motion.div>
  )
}
