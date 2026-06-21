'use client'

import { motion } from 'framer-motion'
import { EASE } from '@/lib/motion'
import Reveal, { RevealGroup, RevealItem } from '@/components/ui/Reveal'
import SectionHeader from '@/components/ui/SectionHeader'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import Heatmap from '@/components/ui/Heatmap'
import type { CpData } from '@/lib/cp'

function StatBlock({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.2rem' }}>
      <div
        className="font-serif"
        style={{
          fontSize: 'clamp(3rem, 7vw, 5.5rem)',
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: 'var(--gold)',
        }}
      >
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
      <div className="eyebrow" style={{ marginTop: '0.9rem' }}>
        {label}
      </div>
    </div>
  )
}

interface CardStat {
  label: string
  value: string
}

function PlatformCard({
  name,
  handle,
  url,
  primary,
  stats,
}: {
  name: string
  handle: string
  url: string
  primary: CardStat
  stats: CardStat[]
}) {
  return (
    <RevealItem>
      <motion.a
        data-hover
        href={url}
        target="_blank"
        rel="noreferrer"
        whileHover={{ y: -6 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="glass"
        style={{ display: 'block', height: '100%', padding: '1.6rem' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.6rem',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{name}</span>
          <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            @{handle}
          </span>
        </div>

        <div className="eyebrow" style={{ marginBottom: '0.4rem' }}>
          {primary.label}
        </div>
        <div
          className="font-serif"
          style={{
            fontSize: '2.6rem',
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--accent-bri)',
            marginBottom: '1.4rem',
          }}
        >
          {primary.value}
        </div>

        <div style={{ display: 'flex', gap: '1.6rem', borderTop: '1px solid var(--line)', paddingTop: '1.1rem' }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: '1.05rem', fontWeight: 500 }}>{s.value}</div>
              <div className="eyebrow" style={{ fontSize: '0.62rem', marginTop: '0.25rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </motion.a>
    </RevealItem>
  )
}

export default function CodingView({ data }: { data: CpData }) {
  const lc = data.leetcode
  const cf = data.codeforces
  const cc = data.codechef

  return (
    <section id="coding" className="section">
      <SectionHeader index="03" label="Competitive programming" />

      {/* headline totals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2rem',
          marginBottom: 'clamp(3rem, 7vh, 4.5rem)',
        }}
      >
        <Reveal delay={0}>
          <StatBlock value={data.totalSolved} suffix="+" label="Problems solved" />
        </Reveal>
        <Reveal delay={0.08}>
          <StatBlock value={data.activeDays} label="Active days / year" />
        </Reveal>
        <Reveal delay={0.16}>
          <StatBlock value={data.contests} label="Rated contests" />
        </Reveal>
      </div>

      {/* heatmap */}
      <Reveal>
        <div className="glass" style={{ padding: 'clamp(1.2rem, 3vw, 1.8rem)', marginBottom: '1.6rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.6rem',
              marginBottom: '1.2rem',
            }}
          >
            <span className="eyebrow">Submission activity · last year</span>
            <span
              className="font-mono"
              style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 7 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: data.live ? 'var(--accent-bri)' : 'var(--text-dim)',
                  boxShadow: data.live ? '0 0 8px var(--accent-glow)' : 'none',
                }}
              />
              {data.live ? 'live · LeetCode + Codeforces' : 'cached'}
            </span>
          </div>
          <Heatmap cells={data.heatmap} max={data.maxCount} />
        </div>
      </Reveal>

      {/* platform cards */}
      <RevealGroup
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.2rem',
        }}
      >
        <PlatformCard
          name="LeetCode"
          handle="Tanmay_Kanani"
          url={lc.url}
          primary={lc.rating ? { label: 'Contest rating', value: String(lc.rating) } : { label: 'Solved', value: String(lc.solved) }}
          stats={[
            { label: 'Solved', value: String(lc.solved) },
            { label: 'Global rank', value: lc.ranking ? `#${lc.ranking.toLocaleString()}` : '—' },
          ]}
        />
        <PlatformCard
          name="Codeforces"
          handle="tanmay.k"
          url={cf.url}
          primary={cf.maxRating ? { label: 'Max rating', value: String(cf.maxRating) } : { label: 'Solved', value: String(cf.solved) }}
          stats={[
            { label: 'Solved', value: String(cf.solved) },
            { label: 'Contests', value: String(cf.contests) },
          ]}
        />
        <PlatformCard
          name="CodeChef"
          handle="tanmay_kanani"
          url={cc.url}
          primary={{ label: 'Max rating', value: String(cc.maxRating) }}
          stats={[
            { label: 'Stars', value: `${cc.stars}★` },
            { label: 'Solved', value: String(cc.solved) },
          ]}
        />
      </RevealGroup>
    </section>
  )
}
