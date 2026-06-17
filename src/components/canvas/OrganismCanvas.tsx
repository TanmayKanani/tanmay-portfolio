'use client'

import { useEffect, useRef } from 'react'
import { useCursorVelocity } from '@/lib/hooks/useCursorVelocity'
import { useMobile } from '@/lib/hooks/useMobile'

// ─── Types ───────────────────────────────────────────────────────────────────

type OrgType = 'point' | 'wisp' | 'pulse' | 'radiolaria' | 'ghost'
type AmbientState = 'drift' | 'pause' | 'pulse-anim' | 'wander'
type CursorPhase = 'none' | 'orient' | 'approach' | 'observe' | 'retreat'
type Layer = 0 | 1 | 2

const PARALLAX: readonly [number, number, number] = [0.055, 0.022, 0.007]

interface Org {
  type: OrgType
  layer: Layer
  x: number; y: number
  vx: number; vy: number
  tvx: number; tvy: number
  opacity: number; tOpacity: number; baseOpacity: number
  size: number
  r: number; g: number; b: number
  phase: number; period: number
  state: AmbientState; frames: number
  angle: number; spokes: number; ringN: number
  px: number; py: number
  // Phase 2 — cursor awareness
  awareRadius: number
  cursorPhase: CursorPhase
  phaseTimer: number
  orientAngle: number
  eyeAngle: number
  // Phase 2 — disturbance / pressure wave
  disturbFrames: number
  disturbVx: number; disturbVy: number
  disturbGen: number
  disturbCooldown: number
  propagateDelay: number
  // Phase 2 — synchronized pulse
  syncStrength: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rnd(a: number, b: number): number { return a + Math.random() * (b - a) }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
function angleNorm(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

// ─── Organism factory ─────────────────────────────────────────────────────────

function makeOrg(w: number, h: number): Org {
  const tr = Math.random()
  const type: OrgType =
    tr < 0.68 ? 'point' :
    tr < 0.84 ? 'wisp' :
    tr < 0.93 ? 'pulse' :
    tr < 0.98 ? 'radiolaria' : 'ghost'

  const lr = Math.random()
  const layer: Layer = lr < 0.5 ? 0 : lr < 0.8 ? 1 : 2

  let r = 240, g = 234, b = 216
  if (type === 'ghost') { r = 143; g = 184; b = 212 }
  else if (type === 'radiolaria') { r = 240; g = 234; b = 216 }
  else {
    const cr = Math.random()
    if (cr > 0.65) { r = 200; g = 169; b = 110 }
    else if (cr > 0.85) { r = 221; g = 232; b = 242 }
  }

  const layerMult = layer === 0 ? 1.0 : layer === 1 ? 0.65 : 0.38
  const baseOpacity = rnd(0.35, 0.85) * layerMult

  const size =
    type === 'point' ? rnd(1.5, 4) :
    type === 'wisp' ? rnd(12, 28) :
    type === 'pulse' ? rnd(6, 14) :
    type === 'radiolaria' ? rnd(14, 26) :
    rnd(20, 38)

  const awareRadius =
    type === 'point' ? 200 :
    type === 'wisp' ? 250 :
    type === 'pulse' ? 220 :
    type === 'radiolaria' ? 280 : 360

  const speed = rnd(0.08, 0.35)
  const dir = Math.random() * Math.PI * 2

  return {
    type, layer,
    x: Math.random() * w, y: Math.random() * h,
    vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
    tvx: Math.cos(dir) * speed, tvy: Math.sin(dir) * speed,
    opacity: 0, tOpacity: 0, baseOpacity,
    size, r, g, b,
    phase: Math.random() * Math.PI * 2,
    period: Math.round(rnd(240, 480)),
    state: 'drift', frames: Math.round(rnd(180, 420)),
    angle: Math.random() * Math.PI * 2,
    spokes: Math.round(rnd(6, 11)),
    ringN: Math.round(rnd(8, 14)),
    px: 0, py: 0,
    awareRadius,
    cursorPhase: 'none', phaseTimer: 0,
    orientAngle: Math.random() * Math.PI * 2,
    eyeAngle: Math.random() * Math.PI * 2,
    disturbFrames: 0, disturbVx: 0, disturbVy: 0,
    disturbGen: 0, disturbCooldown: 0, propagateDelay: 0,
    syncStrength: 0,
  }
}

// ─── Ambient state machine ────────────────────────────────────────────────────

function transition(o: Org): void {
  const roll = Math.random()
  const state: AmbientState =
    o.type === 'pulse'
      ? (roll < 0.30 ? 'drift' : roll < 0.55 ? 'pause' : roll < 0.70 ? 'wander' : 'pulse-anim')
      : (roll < 0.45 ? 'drift' : roll < 0.70 ? 'pause' : roll < 0.85 ? 'wander' : 'pulse-anim')

  o.state = state
  o.frames = Math.round(rnd(120, 540))

  if (state === 'drift') {
    const s = rnd(0.08, 0.35); const d = o.angle + rnd(-0.6, 0.6)
    o.tvx = Math.cos(d) * s; o.tvy = Math.sin(d) * s
  } else if (state === 'wander') {
    const s = rnd(0.08, 0.35); const d = Math.random() * Math.PI * 2
    o.tvx = Math.cos(d) * s; o.tvy = Math.sin(d) * s
  } else if (state === 'pause') {
    o.tvx = 0; o.tvy = 0
  } else {
    o.tvx = o.vx * 0.3; o.tvy = o.vy * 0.3
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function drawOrg(ctx: CanvasRenderingContext2D, o: Org): void {
  const { r, g, b, opacity } = o
  if (opacity < 0.008) return
  const x = o.x + o.px
  const y = o.y + o.py

  switch (o.type) {
    case 'point': {
      const gr = o.size * 5 + 4
      const gd = ctx.createRadialGradient(x, y, 0, x, y, gr)
      gd.addColorStop(0,    `rgba(${r},${g},${b},${opacity})`)
      gd.addColorStop(0.28, `rgba(${r},${g},${b},${opacity * 0.32})`)
      gd.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = gd
      ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `rgba(255,252,238,${Math.min(1, opacity * 2.8)})`
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.4, o.size * 0.22), 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'wisp': {
      ctx.save()
      ctx.translate(x, y); ctx.rotate(o.angle); ctx.scale(1, 0.15)
      const gd = ctx.createRadialGradient(0, 0, 0, 0, 0, o.size)
      gd.addColorStop(0,    `rgba(${r},${g},${b},${opacity})`)
      gd.addColorStop(0.42, `rgba(${r},${g},${b},${opacity * 0.38})`)
      gd.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = gd
      ctx.beginPath(); ctx.arc(0, 0, o.size, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      break
    }
    case 'pulse': {
      const pulse = 0.76 + 0.24 * Math.sin(o.phase)
      const pr = o.size * pulse
      const po = opacity * (0.76 + 0.24 * pulse)
      const gd = ctx.createRadialGradient(x, y, 0, x, y, pr * 2.8)
      gd.addColorStop(0,    `rgba(${r},${g},${b},${po})`)
      gd.addColorStop(0.42, `rgba(${r},${g},${b},${po * 0.32})`)
      gd.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = gd
      ctx.beginPath(); ctx.arc(x, y, pr * 2.8, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'radiolaria': {
      ctx.save(); ctx.translate(x, y)
      for (let i = 0; i < o.spokes; i++) {
        const a = (i / o.spokes) * Math.PI * 2 + o.angle
        const len = o.size * (0.65 + 0.35 * Math.sin(a * 2.3 + o.phase))
        const tx2 = Math.cos(a) * len; const ty2 = Math.sin(a) * len
        ctx.strokeStyle = `rgba(${r},${g},${b},${opacity * 0.42})`
        ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tx2, ty2); ctx.stroke()
        const tg = ctx.createRadialGradient(tx2, ty2, 0, tx2, ty2, 4)
        tg.addColorStop(0, `rgba(${r},${g},${b},${opacity})`); tg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx2, ty2, 4, 0, Math.PI * 2); ctx.fill()
      }
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, o.size * 0.28)
      cg.addColorStop(0, `rgba(255,252,240,${opacity})`); cg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, o.size * 0.28, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      break
    }
    case 'ghost': {
      // Eye effect: the point nearest to eyeAngle is brighter and larger — it watches you
      for (let i = 0; i < o.ringN; i++) {
        const a = (i / o.ringN) * Math.PI * 2 + o.angle
        const px2 = x + Math.cos(a) * o.size
        const py2 = y + Math.sin(a) * o.size
        const eyeDiff = Math.abs(angleNorm(a - o.eyeAngle))
        const eye = Math.max(0, 1 - eyeDiff / 0.85)
        const pO = opacity * (0.52 + eye * 0.68)
        const pR = 4 + eye * 3.5
        const pg = ctx.createRadialGradient(px2, py2, 0, px2, py2, pR)
        pg.addColorStop(0, `rgba(${r},${g},${b},${pO})`); pg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px2, py2, pR, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrganismCanvas() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const isMobile   = useMobile()
  const cursor     = useCursorVelocity()
  const orgs       = useRef<Org[]>([])
  const raf        = useRef(0)

  // Ambient
  const currentAngle = useRef(Math.random() * Math.PI * 2)
  const currentTimer = useRef(0)

  // Phase 2 global state
  const stillFrames    = useRef(0)
  const prevCursorPos  = useRef({ x: 0, y: 0 })
  const frameCount     = useRef(0)
  const burstActive    = useRef(false)
  const burstTimer     = useRef(0)
  const burstCooldown  = useRef(0)
  const milestone15    = useRef(false)

  // Cursor light — direct DOM, no re-renders
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      el.style.background =
        `radial-gradient(circle 240px at ${e.clientX}px ${e.clientY}px,` +
        `rgba(244,232,204,0.13) 0%,rgba(200,169,110,0.045) 42%,transparent 100%)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    if (isMobile) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    orgs.current = Array.from({ length: 58 }, () => makeOrg(canvas.width, canvas.height))
    orgs.current.forEach((o, i) => {
      setTimeout(() => { o.tOpacity = o.baseOpacity }, i * 60 + Math.random() * 800)
    })

    const animate = () => {
      raf.current = requestAnimationFrame(animate)
      frameCount.current++

      const w = canvas.width, h = canvas.height
      const c = cursor.current

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      // ── Global water current ──────────────────────────────────────────────
      currentTimer.current++
      if (currentTimer.current > 4200 + Math.random() * 3600) {
        currentTimer.current = 0
        currentAngle.current += rnd(-0.9, 0.9)
      }
      const cax = Math.cos(currentAngle.current) * 0.0022
      const cay = Math.sin(currentAngle.current) * 0.0022

      // ── Stillness tracking ────────────────────────────────────────────────
      const moved = Math.sqrt(
        (c.x - prevCursorPos.current.x) ** 2 + (c.y - prevCursorPos.current.y) ** 2
      )
      if (moved < 2.0) {
        stillFrames.current = Math.min(stillFrames.current + 1, 6000)
      } else {
        stillFrames.current = Math.max(0, stillFrames.current - 6)
      }
      prevCursorPos.current = { x: c.x, y: c.y }

      const still5s  = stillFrames.current > 300
      const still15s = stillFrames.current > 900
      const still30s = stillFrames.current > 1800

      // 15s milestone: summon a ghost ring from the nearest edge
      if (still15s && !milestone15.current) {
        milestone15.current = true
        const ghosts = orgs.current.filter(o => o.type === 'ghost')
        if (ghosts.length > 0) {
          let farthest = ghosts[0], maxD = 0
          for (const g of ghosts) {
            const d = Math.hypot(g.x - c.x, g.y - c.y)
            if (d > maxD) { maxD = d; farthest = g }
          }
          // Place just outside nearest horizontal edge
          farthest.x = c.x < w / 2 ? -40 : w + 40
          farthest.y = c.y + rnd(-60, 60)
          farthest.vx = 0; farthest.vy = 0
          farthest.px = 0; farthest.py = 0
          farthest.cursorPhase = 'approach'
          farthest.phaseTimer = 0
          farthest.opacity = 0
          farthest.tOpacity = farthest.baseOpacity
        }
      }
      if (!still5s) milestone15.current = false

      // 90s burst: all nearby organisms flash simultaneously
      if (stillFrames.current === 5400 && burstCooldown.current === 0) {
        burstActive.current = true
        burstTimer.current  = 90   // 1.5s
        burstCooldown.current = 7200  // 2 min cooldown
      }
      if (burstCooldown.current > 0) burstCooldown.current--

      // Canonical sync phase (6-second breathing cycle)
      const syncPhase = (frameCount.current % 360) * (Math.PI * 2 / 360)

      // ── Per-organism update (pass 1: ambient + awareness) ─────────────────
      for (const o of orgs.current) {
        // Fade
        o.opacity = lerp(o.opacity, o.tOpacity, 0.006)

        // Pulse advance
        o.phase += (Math.PI * 2) / o.period

        // Angle drift
        if (o.type === 'wisp')        o.angle += 0.0014
        else if (o.type === 'radiolaria') o.angle += 0.0022
        else if (o.type === 'ghost')      o.angle += 0.0028

        // Ambient state machine
        o.frames--
        if (o.frames <= 0) transition(o)

        // Velocity: disturbance overrides ambient target
        if (o.disturbFrames > 0) {
          o.disturbFrames--
          o.disturbVx *= 0.88; o.disturbVy *= 0.88
          o.vx = lerp(o.vx, o.disturbVx, 0.35)
          o.vy = lerp(o.vy, o.disturbVy, 0.35)
        } else {
          o.vx = lerp(o.vx, o.tvx, 0.016)
          o.vy = lerp(o.vy, o.tvy, 0.016)
        }

        // Current + damping + clamp
        o.vx += cax; o.vy += cay
        o.vx *= 0.996; o.vy *= 0.996
        const spd = Math.sqrt(o.vx * o.vx + o.vy * o.vy)
        if (spd > 0.55) { o.vx = (o.vx / spd) * 0.55; o.vy = (o.vy / spd) * 0.55 }

        // Position + wrap
        o.x += o.vx; o.y += o.vy
        const pad = 60
        if (o.x < -pad)      o.x = w + pad
        else if (o.x > w + pad) o.x = -pad
        if (o.y < -pad)      o.y = h + pad
        else if (o.y > h + pad) o.y = -pad

        // Parallax
        const coeff = PARALLAX[o.layer]
        o.px = lerp(o.px, (c.x - w / 2) * coeff, 0.038)
        o.py = lerp(o.py, (c.y - h / 2) * coeff, 0.038)

        // ── Cursor awareness ─────────────────────────────────────────────
        const drawX = o.x + o.px
        const drawY = o.y + o.py
        const dx = c.x - drawX
        const dy = c.y - drawY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const towardCursor = Math.atan2(dy, dx)

        // Ghost ring eye always tracks cursor with slight lag
        if (o.type === 'ghost') {
          o.eyeAngle += angleNorm(towardCursor - o.eyeAngle) * 0.045
        }

        // Fast cursor → disturbance (flee + propagation cascade)
        if (
          c.speed > 11 &&
          dist < 140 &&
          o.disturbFrames === 0 &&
          o.disturbCooldown === 0
        ) {
          const flee = Math.atan2(drawY - c.y, drawX - c.x)
          const spd2 = 1.4 + (140 - dist) / 140 * 2.2
          o.disturbFrames  = Math.round(45 + rnd(0, 30))
          o.disturbVx      = Math.cos(flee) * spd2
          o.disturbVy      = Math.sin(flee) * spd2
          o.disturbGen     = 0
          o.disturbCooldown = 110
          o.propagateDelay = Math.round(8 + rnd(0, 14))
          o.cursorPhase    = 'none'
          o.phaseTimer     = 0
        }
        if (o.disturbCooldown > 0) o.disturbCooldown--

        // Cursor phase state machine — only when cursor is still enough
        if (o.disturbFrames === 0 && still5s && dist < o.awareRadius) {
          switch (o.cursorPhase) {
            case 'none':
              // First notice: start orienting
              o.cursorPhase = 'orient'
              o.phaseTimer = 0
              o.orientAngle = Math.atan2(o.vy, o.vx)
              break

            case 'orient': {
              o.phaseTimer++
              const diff = angleNorm(towardCursor - o.orientAngle)
              o.orientAngle += diff * 0.028
              // Wisps visually turn to face the cursor
              if (o.type === 'wisp') o.angle += angleNorm(towardCursor - o.angle) * 0.020
              // Orient complete → start approaching
              if (Math.abs(diff) < 0.28 || o.phaseTimer > 100) {
                o.cursorPhase = 'approach'; o.phaseTimer = 0
              }
              break
            }

            case 'approach': {
              const aSp = 0.26 * (o.layer === 0 ? 1.0 : o.layer === 1 ? 0.7 : 0.45)
              o.tvx = Math.cos(towardCursor) * aSp
              o.tvy = Math.sin(towardCursor) * aSp
              if (dist < 78) { o.cursorPhase = 'observe'; o.phaseTimer = 0; o.tvx = 0; o.tvy = 0 }
              break
            }

            case 'observe':
              o.phaseTimer++
              o.tvx = lerp(o.tvx, 0, 0.06)
              o.tvy = lerp(o.tvy, 0, 0.06)
              if (dist < 42) { o.cursorPhase = 'retreat'; o.phaseTimer = 0 }
              break

            case 'retreat': {
              const away = towardCursor + Math.PI
              o.tvx = Math.cos(away) * 0.32; o.tvy = Math.sin(away) * 0.32
              if (dist > 72) { o.cursorPhase = 'observe'; o.phaseTimer = 0 }
              break
            }
          }
        } else if (o.cursorPhase !== 'none' && o.disturbFrames === 0) {
          // Cursor left range — brief linger then return to ambient
          o.phaseTimer++
          if (o.phaseTimer > 55) { o.cursorPhase = 'none'; o.phaseTimer = 0 }
        }

        // Synchronized breathing (still 30s+)
        if (still30s && dist < 320) {
          o.syncStrength = lerp(o.syncStrength, 1.0, 0.002)
          o.phase += angleNorm(syncPhase - o.phase) * o.syncStrength * 0.008
        } else {
          o.syncStrength = lerp(o.syncStrength, 0, 0.012)
        }

        // Burst: ramp up fast, cool down via normal lerp
        if (burstActive.current && dist < 420) {
          o.opacity    = Math.min(1.0, o.opacity + 0.06)
          o.tOpacity   = Math.min(1.0, o.baseOpacity * 2.4)
        }
      }

      // Burst timer
      if (burstActive.current) {
        burstTimer.current--
        if (burstTimer.current <= 0) {
          burstActive.current = false
          // Restore tOpacity so organisms fade back naturally
          for (const o of orgs.current) {
            if (o.tOpacity > o.baseOpacity) o.tOpacity = o.baseOpacity
          }
        }
      }

      // ── Disturbance propagation (pass 2: cascade wave) ───────────────────
      for (const o of orgs.current) {
        if (o.propagateDelay <= 0 || o.disturbGen >= 2) continue
        o.propagateDelay--
        if (o.propagateDelay > 0) continue
        // Delay expired: now propagate to nearby undisturbed organisms
        const range  = o.disturbGen === 0 ? 115 : 82
        const chance = o.disturbGen === 0 ? 0.62 : 0.32
        for (const nb of orgs.current) {
          if (nb === o || nb.disturbCooldown > 0 || nb.disturbFrames > 0) continue
          const nd = Math.hypot(nb.x - o.x, nb.y - o.y)
          if (nd < range && Math.random() < chance) {
            const flee2 = Math.atan2(nb.y - o.y, nb.x - o.x)
            const spd3  = (o.disturbGen === 0 ? 0.85 : 0.48) + rnd(0, 0.4)
            nb.disturbFrames  = Math.round(28 + rnd(0, 18))
            nb.disturbVx      = Math.cos(flee2) * spd3
            nb.disturbVy      = Math.sin(flee2) * spd3
            nb.disturbGen     = o.disturbGen + 1
            nb.disturbCooldown = 85
            nb.propagateDelay  = Math.round(10 + rnd(0, 14))
            nb.cursorPhase     = 'none'
          }
        }
      }

      // ── Render (pass 3) ───────────────────────────────────────────────────
      for (const o of orgs.current) drawOrg(ctx, o)

      ctx.globalCompositeOperation = 'source-over'
    }

    animate()
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener('resize', resize) }
  }, [isMobile, cursor])

  if (isMobile) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      />
      <div
        ref={overlayRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 3, mixBlendMode: 'screen' }}
        aria-hidden="true"
      />
    </>
  )
}
