'use client'

import { motion, useScroll, useSpring } from 'framer-motion'

/** A thin accent bar at the top of the viewport that fills with scroll progress. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <motion.div
      aria-hidden
      style={{
        scaleX,
        transformOrigin: '0%',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9997,
        background: 'var(--accent)',
      }}
    />
  )
}
