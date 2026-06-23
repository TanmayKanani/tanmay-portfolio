'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { HeatCell } from '@/lib/cp'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function level(count: number, max: number): number {
  if (count <= 0) return 0
  if (max <= 0) return 1
  const r = count / max
  if (r > 0.66) return 4
  if (r > 0.33) return 3
  if (r > 0.12) return 2
  return 1
}

const COLORS = [
  'rgba(20, 22, 28, 0.06)', // empty
  'rgba(47, 84, 235, 0.22)',
  'rgba(47, 84, 235, 0.42)',
  'rgba(47, 84, 235, 0.66)',
  'rgba(31, 63, 196, 0.92)',
]

/** GitHub-style contribution grid built from merged LeetCode + Codeforces activity. */
export default function Heatmap({ cells, max }: { cells: HeatCell[]; max: number }) {
  // group into weeks (columns of 7, starting Sunday)
  const weeks = useMemo(() => {
    const w: HeatCell[][] = []
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7))
    return w
  }, [cells])

  // month labels positioned at the week where the month changes
  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = []
    let last = -1
    weeks.forEach((week, col) => {
      const first = week[0]
      if (!first) return
      const m = new Date(first.date).getUTCMonth()
      if (m !== last) {
        labels.push({ col, label: MONTHS[m] })
        last = m
      }
    })
    return labels
  }, [weeks])

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'inline-block', minWidth: 'min-content' }}>
        {/* month row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${weeks.length}, 13px)`,
            gap: 3,
            marginBottom: 6,
            marginLeft: 0,
          }}
        >
          {weeks.map((_, col) => {
            const lab = monthLabels.find((l) => l.col === col)
            return (
              <div
                key={col}
                className="font-mono"
                style={{ fontSize: '0.6rem', color: 'var(--text-dim)', height: 12, whiteSpace: 'nowrap' }}
              >
                {lab ? lab.label : ''}
              </div>
            )
          })}
        </div>

        {/* week columns */}
        <div style={{ display: 'flex', gap: 3 }}>
          {weeks.map((week, col) => (
            <div key={col} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 13px)', gap: 3 }}>
              {week.map((cell) => {
                const lv = level(cell.count, max)
                return (
                  <motion.div
                    key={cell.date}
                    initial={{ opacity: 0, scale: 0.4 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.7, backgroundColor: 'var(--accent)' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: Math.min(col * 0.012, 0.6) }}
                    title={`${cell.count} on ${cell.date}`}
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 3,
                      background: COLORS[lv],
                      boxShadow: lv >= 4 ? '0 0 9px rgba(47,84,235,0.45)' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 12,
            justifyContent: 'flex-end',
          }}
        >
          <span className="font-mono" style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
            Less
          </span>
          {COLORS.map((c, i) => (
            <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
          ))}
          <span className="font-mono" style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
            More
          </span>
        </div>
      </div>
    </div>
  )
}
