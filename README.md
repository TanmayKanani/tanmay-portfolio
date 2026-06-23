# Tanmay Kanani — Portfolio

A refined, modern-dark personal portfolio for a software engineer and competitive
programmer. Built with **Next.js 16 (App Router) + TypeScript**, with rich, tasteful
motion throughout.

## Design

- **Aesthetic** — an **immersive 3D studio**: the hero is a real-time, baked 3D room
  (react-three-fiber) with lit monitor screens, fog and bloom, a camera that slowly
  orbits and parallaxes to the cursor — on a dark cinematic theme with a warm amber
  accent. `StudioScene` loads `/public/scene/models/room/model.glb`; the model is
  trivially swappable.
- **Asset note** — the 3D model under `public/scene` is a third-party asset used for
  this prototype. License or replace it (e.g. a CC0 model) before deploying publicly.
- **Type** — EB Garamond (serif display), Geist (sans body/labels).
- **Signature interaction** — a **scratch-to-reveal hero**: a paper layer you erase
  with the cursor (`ScratchReveal`) to uncover a living **watercolour wash**
  (`WatercolorWash`) and the name beneath. Auto-reveals on touch / reduced-motion.
- **Motion everywhere** — Lenis smooth scroll, Framer Motion reveals & stagger,
  a cursor-following project preview (GSAP) in Work, scroll-scrub parallax words,
  a velocity-reactive marquee, animated stat counters, an animated submission heatmap,
  magnetic buttons, a custom sticky cursor, an intro loader, and a scroll-progress bar.
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
