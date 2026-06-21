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
  role: 'Software Engineer · Competitive Programmer',
  location: 'Ahmedabad, India',
  coords: '23.02° N, 72.57° E',
  email: 'tanmaykanani8@gmail.com',

  // headline — the asterisk word is rendered in the accent serif italic
  headline: ['Code, contests', '& the space', '*between.*'],

  intro:
    'Computer-science student at Ahmedabad University and Competitive Programming Lead of the Programming Club. I build full-stack products and have solved 1,000+ problems across LeetCode, Codeforces and CodeChef.',

  about: {
    statement:
      'I like problems with hard edges — a timetable that refuses to fit, a phishing link hiding in plain sight, a contest clock running down. I build the thing that *solves* it.',
    columns: [
      {
        title: 'Now',
        body: 'B.Tech CSE at Ahmedabad University (2024–28) and Competitive Programming Lead of the Programming Club — running contests and training members.',
      },
      {
        title: 'Build with',
        body: 'JavaScript & React, Django & Python, C++, with SQL / MongoDB and a Docker-and-Vercel deploy flow.',
      },
      {
        title: 'Compete on',
        body: 'LeetCode (1653), Codeforces & CodeChef — 1,000+ problems over 339 active days and 65 rated contests.',
      },
    ],
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

  coding: {
    totals: { solved: 1000, activeDays: 339, contests: 65 },
    platforms: [
      {
        name: 'LeetCode',
        handle: 'Tanmay_Kanani',
        url: 'https://leetcode.com/u/Tanmay_Kanani/',
        primary: { label: 'Rating', value: '1653' },
        stats: [
          { label: 'Solved', value: '470' },
          { label: 'Percentile', value: 'Top 18%' },
        ],
        note: '100-day streak',
      },
      {
        name: 'Codeforces',
        handle: 'tanmay.k',
        url: 'https://codeforces.com/profile/tanmay.k',
        primary: { label: 'Solved', value: '494' },
        stats: [
          { label: 'Contests', value: '23' },
          { label: 'Platform', value: 'Rated' },
        ],
        note: 'Active competitor',
      },
      {
        name: 'CodeChef',
        handle: 'tanmay_kanani',
        url: 'https://www.codechef.com/users/tanmay_kanani',
        primary: { label: 'Max rating', value: '1447' },
        stats: [
          { label: 'Stars', value: '2★' },
          { label: 'Solved', value: '121' },
        ],
        note: 'Long & short challenges',
      },
    ],
  },

  contactHeadline: ['Let’s build', 'something worth', '*remembering.*'],
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
