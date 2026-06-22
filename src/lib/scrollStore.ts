// Tiny shared scroll store the 3D scene reads from (avoids prop-drilling into
// react-three-fiber's render loop). Updated once via rAF.

export const scrollData = {
  y: 0,
  velocity: 0,
  smoothVel: 0,
  progress: 0,
}

let started = false

export function startScrollTracking() {
  if (started || typeof window === 'undefined') return
  started = true

  const tick = () => {
    const y = window.scrollY
    scrollData.velocity = y - scrollData.y
    scrollData.y = y
    const target = Math.min(Math.abs(scrollData.velocity), 80)
    scrollData.smoothVel += (target - scrollData.smoothVel) * 0.08
    const max = document.documentElement.scrollHeight - window.innerHeight
    scrollData.progress = max > 0 ? y / max : 0
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
