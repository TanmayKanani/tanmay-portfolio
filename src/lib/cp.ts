import { site } from '@/lib/data/site'

// ─────────────────────────────────────────────────────────────
//  Live competitive-programming data.
//  Fetched server-side from LeetCode (GraphQL) + Codeforces (REST),
//  cached for an hour. Every source is wrapped in try/catch and
//  falls back to the static numbers in site.ts, so the section
//  never breaks even if an API is down or unreachable.
// ─────────────────────────────────────────────────────────────

export interface HeatCell {
  date: string // YYYY-MM-DD
  count: number
}

export interface CpData {
  totalSolved: number
  activeDays: number
  contests: number
  leetcode: { solved: number; rating: number | null; ranking: number | null; url: string; live: boolean }
  codeforces: {
    solved: number
    rating: number | null
    maxRating: number | null
    rank: string | null
    contests: number
    url: string
    live: boolean
  }
  codechef: { maxRating: number; stars: number; solved: number; url: string }
  heatmap: HeatCell[]
  maxCount: number
  live: boolean
}

const DAY = 86400
const REVALIDATE = 3600 // 1 hour

function isoDay(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10)
}

async function timedFetch(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 9000)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      next: { revalidate: REVALIDATE },
    })
  } finally {
    clearTimeout(t)
  }
}

// ── Codeforces ───────────────────────────────────────────────
async function getCodeforces(handle: string) {
  const out = {
    solved: 0,
    rating: null as number | null,
    maxRating: null as number | null,
    rank: null as string | null,
    contests: 0,
    days: {} as Record<string, number>,
    live: false,
  }
  try {
    const [infoRes, ratingRes, statusRes] = await Promise.all([
      timedFetch(`https://codeforces.com/api/user.info?handles=${handle}`),
      timedFetch(`https://codeforces.com/api/user.rating?handle=${handle}`),
      timedFetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100000`),
    ])
    const info = await infoRes.json()
    if (info.status === 'OK' && info.result?.[0]) {
      const u = info.result[0]
      out.rating = u.rating ?? null
      out.maxRating = u.maxRating ?? null
      out.rank = u.rank ?? null
    }
    const rating = await ratingRes.json()
    if (rating.status === 'OK' && Array.isArray(rating.result)) {
      out.contests = rating.result.length
    }
    const status = await statusRes.json()
    if (status.status === 'OK' && Array.isArray(status.result)) {
      const solvedSet = new Set<string>()
      for (const sub of status.result) {
        const day = isoDay(sub.creationTimeSeconds)
        out.days[day] = (out.days[day] || 0) + 1
        if (sub.verdict === 'OK' && sub.problem) {
          solvedSet.add(`${sub.problem.contestId}-${sub.problem.index}`)
        }
      }
      out.solved = solvedSet.size
    }
    out.live = true
  } catch {
    // leave defaults; caller falls back
  }
  return out
}

// ── LeetCode ─────────────────────────────────────────────────
async function getLeetCode(username: string) {
  const out = {
    solved: 0,
    rating: null as number | null,
    ranking: null as number | null,
    days: {} as Record<string, number>,
    live: false,
  }
  const year = new Date().getFullYear()
  const query = `
    query data($u: String!, $y: Int!, $py: Int!) {
      matchedUser(username: $u) {
        profile { ranking }
        submitStatsGlobal { acSubmissionNum { difficulty count } }
        cur: userCalendar(year: $y) { submissionCalendar }
        prev: userCalendar(year: $py) { submissionCalendar }
      }
    }`
  try {
    const res = await timedFetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      },
      body: JSON.stringify({ query, variables: { u: username, y: year, py: year - 1 } }),
    })
    const json = await res.json()
    const m = json?.data?.matchedUser
    if (m) {
      out.ranking = m.profile?.ranking ?? null
      const all = m.submitStatsGlobal?.acSubmissionNum?.find(
        (d: { difficulty: string; count: number }) => d.difficulty === 'All'
      )
      out.solved = all?.count ?? 0
      for (const cal of [m.cur?.submissionCalendar, m.prev?.submissionCalendar]) {
        if (!cal) continue
        const parsed = JSON.parse(cal) as Record<string, number>
        for (const [ts, count] of Object.entries(parsed)) {
          const day = isoDay(Number(ts))
          out.days[day] = (out.days[day] || 0) + count
        }
      }
      out.live = true
    }
  } catch {
    // leave defaults
  }
  return out
}

// ── Build last-53-weeks heatmap grid ─────────────────────────
function buildHeatmap(...sources: Record<string, number>[]): { cells: HeatCell[]; max: number; activeDays: number } {
  const merged: Record<string, number> = {}
  for (const src of sources) {
    for (const [day, n] of Object.entries(src)) {
      merged[day] = (merged[day] || 0) + n
    }
  }

  // end on today, start 53 weeks back aligned to Sunday
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const end = Math.floor(today.getTime() / 1000)
  const start = end - 53 * 7 * DAY

  const cells: HeatCell[] = []
  let max = 0
  let activeDays = 0
  for (let t = start; t <= end; t += DAY) {
    const date = isoDay(t)
    const count = merged[date] || 0
    if (count > 0) activeDays++
    if (count > max) max = count
    cells.push({ date, count })
  }
  return { cells, max, activeDays }
}

// Preview-only synthetic activity, so the heatmap can be seen even when the
// APIs are unreachable (e.g. an offline preview). Off unless CP_DEMO=1.
function demoDays(): Record<string, number> {
  const days: Record<string, number> = {}
  const end = Math.floor(Date.now() / 1000)
  for (let i = 0; i < 371; i++) {
    if (Math.random() < 0.45) continue
    const date = isoDay(end - i * DAY)
    days[date] = Math.ceil(Math.random() * 9)
  }
  return days
}

export async function getCpData(): Promise<CpData> {
  const fb = site.coding.fallback
  const [cf, lc] = await Promise.all([
    getCodeforces(site.coding.codeforces.handle),
    getLeetCode(site.coding.leetcode.handle),
  ])

  const sources = [cf.days, lc.days]
  if (!(cf.live || lc.live) && process.env.CP_DEMO === '1') sources.push(demoDays())
  const { cells, max, activeDays } = buildHeatmap(...sources)

  const lcSolved = lc.live ? lc.solved : fb.leetcode.solved
  const cfSolved = cf.live ? cf.solved : fb.codeforces.solved
  const cfContests = cf.live ? cf.contests : fb.codeforces.contests

  const live = cf.live || lc.live

  return {
    totalSolved: lcSolved + cfSolved + site.coding.codechef.solved,
    activeDays: live && activeDays > 0 ? activeDays : fb.activeDays,
    contests: cfContests,
    leetcode: {
      solved: lcSolved,
      rating: lc.live ? lc.rating : fb.leetcode.rating,
      ranking: lc.live ? lc.ranking : fb.leetcode.ranking,
      url: site.coding.leetcode.url,
      live: lc.live,
    },
    codeforces: {
      solved: cfSolved,
      rating: cf.live ? cf.rating : fb.codeforces.rating,
      maxRating: cf.live ? cf.maxRating : fb.codeforces.maxRating,
      rank: cf.rank,
      contests: cfContests,
      url: site.coding.codeforces.url,
      live: cf.live,
    },
    codechef: {
      maxRating: site.coding.codechef.maxRating,
      stars: site.coding.codechef.stars,
      solved: site.coding.codechef.solved,
      url: site.coding.codechef.url,
    },
    heatmap: cells,
    maxCount: max,
    live,
  }
}
