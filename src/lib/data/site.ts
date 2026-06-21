// ─────────────────────────────────────────────────────────────
//  All portfolio content lives here. Built from Tanmay Kanani's resume.
//  Edit this file to update the site — no component changes needed.
// ─────────────────────────────────────────────────────────────

export interface Project {
  title: string
  meta: string
  year: string
  summary: string
  live: string | null
  repo: string | null
}

export interface SkillGroup {
  group: string
  items: string[]
}

export interface Achievement {
  tag: string
  text: string
}

export interface Social {
  label: string
  url: string
}

export const site = {
  name: 'Tanmay Kanani',
  initials: 'TK',
  greeting: 'Hello, I’m',
  role: 'Computer Science · Software Engineer',
  location: 'Ahmedabad, India',
  email: 'tanmaykanani8@gmail.com',

  // short, simple, classy
  intro:
    'A computer-science student and software engineer based in Ahmedabad, India. I build clean, dependable products — and I compete in algorithms to keep my fundamentals sharp.',

  about: {
    statement:
      'I care about hard problems and *simple* solutions.',
    body: 'From full-stack products to algorithm contests, I like building things that work — and making them feel effortless. Right now I’m studying Computer Science at Ahmedabad University and leading competitive programming at the Programming Club.',
  },

  projects: [
    {
      title: 'AU Scheduler',
      meta: 'Vanilla JS · Canvas · SheetJS',
      year: '2025',
      summary:
        'Helps Ahmedabad University students build clash-free timetables during self-registration. A backtracking engine searches every valid course combination and ranks the conflict-free ones — with in-browser AURIS import via SheetJS, a Canvas save-as-image export, and a ~1,900-line vanilla-JS controller with light/dark theming.',
      live: 'https://course-scheduler-eight.vercel.app/',
      repo: 'https://github.com/TanmayKanani/AU_SCHEDULER',
    },
    {
      title: 'AgriSaathi',
      meta: 'Next.js · FastAPI · ML',
      year: '2025',
      summary:
        'An AI-powered smart-agriculture platform — crop recommendation, fertilizer advisory, disease detection, an analytics dashboard and a marketplace — backed by an ML service (LightGBM / XGBoost, explained with SHAP) behind a Next.js 15 app.',
      live: null,
      repo: 'https://github.com/aayushroopchandani/AgriSaathi',
    },
    {
      title: 'ScamShield',
      meta: 'Python · Django · SQLite',
      year: '2025',
      summary:
        'A cybersecurity platform that assesses suspicious URLs, phishing text, QR codes and IPs using heuristic risk analysis — keyword detection, URL-structure checks and redirect tracing — returning clear safe / suspicious / dangerous verdicts with scan history and a password generator.',
      live: null,
      repo: 'https://github.com/usp13/ScamShield-CyberSecurity',
    },
    {
      title: 'SwasthyaSaathi',
      meta: 'Python · AI APIs',
      year: '2024',
      summary:
        'An AI healthcare assistant offering symptom-based guidance — severity reads, possible conditions, follow-up questions and red-flag warnings. Won 3rd prize at the Aetrix Hackathon, PDEU, built with a team in 36 hours.',
      live: null,
      repo: 'https://github.com/Jyotier2006/SwasthyaSaathi',
    },
  ] as Project[],

  skills: [
    { group: 'Languages', items: ['Python', 'C++', 'JavaScript', 'SQL'] },
    { group: 'Web', items: ['React.js', 'Django', 'Tailwind', 'HTML5 / CSS3'] },
    { group: 'Databases', items: ['MySQL', 'MongoDB', 'SQLite'] },
    { group: 'Tools', items: ['Git / GitHub', 'Docker', 'Postman', 'Vercel'] },
    { group: 'Core CS', items: ['DSA', 'OOP', 'DBMS', 'REST APIs'] },
  ] as SkillGroup[],

  achievements: [
    { tag: 'IEEE', text: '2nd place out of 8 teams — IEEE Computer Society Tech Trek, a multi-round team relay.' },
    { tag: 'Hackathon', text: '3rd place — Aetrix Hackathon, PDEU, for SwasthyaSaathi (built in 36 hours).' },
    { tag: 'Contest', text: '2nd place — Clash of Code, a coding contest at Ahmedabad University.' },
    { tag: 'ACPC', text: 'Rank 2925 / ~1,30,000 (top ~2%) in Gujarat state engineering admissions.' },
    { tag: 'Leadership', text: 'Competitive Programming Lead, Programming Club, Ahmedabad University (2026–present).' },
  ] as Achievement[],

  // ── Competitive programming ──────────────────────────────────
  // Live stats + heatmap are fetched server-side from these handles
  // (see src/lib/cp.ts). `fallback` is used only if a fetch fails,
  // so the section never looks broken.
  coding: {
    leetcode: { handle: 'Tanmay_Kanani', url: 'https://leetcode.com/u/Tanmay_Kanani/' },
    codeforces: { handle: 'tanmay.k', url: 'https://codeforces.com/profile/tanmay.k' },
    // CodeChef has no stable public API — these stay as profile facts.
    codechef: {
      handle: 'tanmay_kanani',
      url: 'https://www.codechef.com/users/tanmay_kanani',
      maxRating: 1447,
      stars: 2,
      solved: 121,
    },
    fallback: {
      totalSolved: 1000,
      activeDays: 339,
      leetcode: { solved: 470, rating: 1653, ranking: null as number | null },
      codeforces: { solved: 494, rating: null as number | null, maxRating: null as number | null, contests: 23 },
    },
  },

  contactHeadline: ['Let’s work', '*together.*'],
  contactSub: 'Open to internships, collaborations, and genuinely hard problems.',
  resumeUrl: '#',

  socials: [
    { label: 'GitHub', url: 'https://github.com/TanmayKanani' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/tanmay-kanani-163875333/' },
    { label: 'LeetCode', url: 'https://leetcode.com/u/Tanmay_Kanani/' },
    { label: 'Codeforces', url: 'https://codeforces.com/profile/tanmay.k' },
  ] as Social[],

  nav: [
    { label: 'About', href: '#about' },
    { label: 'Work', href: '#work' },
    { label: 'Coding', href: '#coding' },
    { label: 'Skills', href: '#skills' },
    { label: 'Contact', href: '#contact' },
  ],
}
