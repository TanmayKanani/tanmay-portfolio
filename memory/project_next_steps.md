---
name: project-next-steps
description: Current status, next actions, Phase 1 checklist, warnings, and open questions for DESCENT portfolio implementation
metadata:
  type: project
---

## Current Status

All planning is **complete and frozen**. Do not add features or narrative ideas.

- Creative direction: DESCENT (Layer 1 Reality → Layer 2 Machine Dream → Layer 3 CP Core)
- Engineering review: Complete — simplifications approved, spectacle preserved
- Creative identity: 5 options proposed (VOYAGER, CASE FILE, CORE PROCESS, THE ORACLE, SAVE STATE) — **none chosen yet**
- `memory/project_master_context.md`: Created ✓
- Code written: Zero. Only default Next.js template exists.

**Why:** User explicitly said "Freeze the creative direction" after engineering review. The identity/theme decision is the only unresolved creative question.

## Last Completed Planning Step

Engineering review → final implementation roadmap → 5 creative theme identity options proposed → `project_master_context.md` written.

## Exact Next Action When Returning

**Step 1 (blocking):** User must choose a creative theme identity:
- **VOYAGER** — Interstellar archive, you are a signal from deep space
- **CASE FILE** — Intelligence dossier aesthetic, redacted documents, classified systems
- **CORE PROCESS** — You are inside a running process, memory addresses, execution traces
- **THE ORACLE** — Ancient AI god, mythological meets machine, prophecy tone
- **SAVE STATE** — Game world checkpoint system, reality saves and restores
- Or propose their own alternative

**Step 2:** Begin Phase 1 implementation (checklist below).

## Phase 1 Implementation Checklist

### Library Installation
- [ ] `npm install lenis gsap @gsap/react framer-motion`
- [ ] `npm install @react-three/fiber @react-three/drei three`
- [ ] `npm install @types/three --save-dev`

### Foundation Setup
- [ ] Read `node_modules/next/dist/docs/` relevant sections before touching layout
- [ ] Replace `src/app/layout.tsx`: swap Geist → EB Garamond + IBM Plex Mono via `next/font/google`, mount `<LenisProvider>`, `<Cursor>`, `<GrainCanvas>`
- [ ] Update `src/app/globals.css`: add CSS custom properties (color system), `cursor: none` on body, `.preserve-3d` and `.backface-hidden` utility classes
- [ ] Create `src/lib/hooks/useMobile.ts` — gates Three.js mounting entirely on mobile
- [ ] Create `src/lib/hooks/useLayerState.ts` — React Context: `currentLayer: 1|2|3`, `hasVisitedCore: boolean`

### Smooth Scroll
- [ ] Create `src/components/providers/LenisProvider.tsx`
- [ ] Wire Lenis → GSAP ticker (exact pattern from master context)
- [ ] Wire `lenis.on('scroll', ScrollTrigger.update)`

### UI Primitives
- [ ] Create `src/components/ui/Cursor.tsx` — custom cursor, hides system cursor
- [ ] Create `src/components/ui/GrainCanvas.tsx` — Canvas 2D, elongated grain marks, cursor pressure field
- [ ] Create `src/components/ui/CrackEffect.tsx` — SVG stroke-dashoffset crack animation

### Hero Section
- [ ] Create `src/components/sections/Hero.tsx`
- [ ] Implement `perspective: 1400px` tilt on mouse move
- [ ] Static text layout: name + tagline only, minimal copy
- [ ] Scroll indicator: "↓ descend"

### Phase 1 Complete When
- Dev server runs without errors
- EB Garamond + IBM Plex Mono render correctly
- Custom cursor visible, system cursor hidden
- Grain texture visible on page
- Hero perspective tilt works on mouse move
- Lenis smooth scroll active
- Mobile hook correctly disables Three.js features

## Important Warnings

- **Do NOT begin Phase 5 (CP Core)** without real Codeforces data: handle, rating, problems solved, contests entered, peak rank, category distribution
- **Do NOT create a Layer1Scene R3F component** — Layer 1 has no Three.js. The canvas only mounts for Layers 2 and 3.
- **Do NOT install or use Perlin noise libraries** — eliminated in engineering review. Use CSS grain + Canvas 2D only.
- **Do NOT add new creative features or narrative ideas** — direction is frozen
- **Do NOT use Three.js transmission/glass material** — eliminated. Use transparent + EdgesGeometry rim for spheres.
- **Read next/dist/docs/ before writing any Next.js code** — this is Next.js 16.2.9, breaking changes from training data
- **LineDashedMaterial requires `line.computeLineDistances()` once on creation** before GSAP can tween dashSize

## Open Questions (must resolve before respective phases)

### Before Phase 1 begins
- Which creative theme identity? (VOYAGER / CASE FILE / CORE PROCESS / THE ORACLE / SAVE STATE / custom)

### Before Phase 5 (CP Core)
- Codeforces handle?
- Current rating?
- Total problems solved?
- Total contests entered?
- Peak rank?
- Problem category distribution (arrays, graphs, DP, etc. with rough percentages)?
- 10-15 contest history entries (contest name, date, rank, delta)?

### Before Phase 6 (Projects)
- 3-5 projects: name, one-sentence description, tech stack, year, GitHub URL, live URL (if any)

### Before Phase 7 (Contact)
- Display email address
- GitHub username
- LinkedIn URL
- Codeforces profile URL

**How to apply:** Do not implement phases 5-7 without collecting this real data. Placeholder data will degrade the CP Core's emotional impact — the ACCEPTED climax must show real numbers.

[[project-master-context]]
[[portfolio-creative-direction]]
