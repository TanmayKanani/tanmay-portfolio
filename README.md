# Tanmay Kanani — Portfolio

A refined, modern-dark personal portfolio for a software engineer and competitive
programmer. Built with **Next.js 16 (App Router) + TypeScript**, with rich, tasteful
motion throughout.

## Design

- **Aesthetic** — deep neutral near-black, off-white type, a single electric indigo
  accent with sparing warm-amber highlights for stats.
- **Type** — EB Garamond (serif display), Geist (sans body), IBM Plex Mono (labels).
- **Signature interaction** — an interactive constellation/graph canvas in the hero
  (`src/components/canvas/Constellation.tsx`) that lights up and warps toward the cursor.
- **Motion** — Lenis smooth scroll, Framer Motion reveals & stagger, animated stat
  counters, magnetic buttons, a custom two-part cursor, and a scroll-progress bar.
  Everything respects `prefers-reduced-motion`.

## Editing content

All copy lives in **`src/lib/data/site.ts`** — name, intro, projects, skills,
achievements, competitive-programming stats, and socials. Wrap a phrase in `*asterisks*`
to render it in the accent serif italic (keep the markers balanced within a single line).

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint
```

## Structure

```
src/
  app/                 layout, page, global styles
  components/
    canvas/            Constellation (hero background)
    layout/            Nav, Footer
    sections/          Hero, About, Work, Coding, Skills, Achievements, Contact
    providers/         LenisProvider (smooth scroll)
    ui/                Cursor, Grain, ScrollProgress, Reveal, Magnetic, AnimatedCounter
  lib/
    data/site.ts       all editable content
    hooks/             useMobile
    motion.ts, text.tsx
```
