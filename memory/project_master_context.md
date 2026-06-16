---
name: project-master-context
description: Complete master context for Tanmay Kanani's portfolio — concept, architecture, visual system, technical decisions, implementation roadmap. Read this first in any new session.
metadata:
  type: project
---

# DESCENT — Portfolio Master Context

## Project Identity

**Owner:** Tanmay Kanani  
**Email:** malaybkanani@gmail.com  
**Identity:** Third-year Computer Science student. Competitive programmer. Software developer.  
**Platforms:** Codeforces, LeetCode, CodeChef  
**Goal:** Awwwards Site of the Day — a portfolio that makes visitors say "I've never seen anything like this."

---

## ⚠️ PENDING DECISION — Creative Theme

The structural concept (DESCENT) and all interactions are **fully approved and frozen**. One decision remains open:

**The creative IDENTITY — the world's name and thematic lens.**

Five options were proposed. None has been chosen yet:

1. **VOYAGER** — Portfolio as deep space probe transmission. CP = mission log. Amber telemetry aesthetic.
2. **CASE FILE** — Classified scientific dossier about a "computational anomaly." CP = documented incidents. Redacted text mechanic.
3. **CORE PROCESS** — Running AI system's operational log. CP = the core running process. Warm system readout.
4. **THE ORACLE** — Ancient computational artifact discovered in ruins. CP = verified oracle outputs. Archaeological + mathematical.
5. **SAVE STATE** — The portfolio as an RPG save file. CP = achievement vault. Game UI elevated to editorial quality.

The theme does NOT change the architecture, interactions, color system, or typography. It changes the copy register, section headers, and the conceptual framing visitors use to understand the world.

**When returning: choose a theme before beginning Phase 1.**

---

## The Governing Narrative (Theme-Agnostic)

There are three layers to the world Tanmay has built.

**Layer 1 — The Surface:** What most people see. A person, a student, an identity legible to anyone. Dark, architectural, physical. Almost normal — but with signs that something lies beneath.

**Layer 2 — The Machine Dream:** The interior world. Where ideas form, where connections fire, where three years of training created something that thinks. A living network of filaments and nodes. The visitor is now a signal inside the system.

**Layer 3 — The Core:** The mathematical substrate. Pure algorithm space. Where competitive programming exists not as an activity but as physics — the laws by which this world operates. The deepest, brightest place.

The visitor descends through all three layers via **The Fold** — a physical rotation of reality that happens twice. Each fold reveals a stranger, more beautiful world beneath.

**The emotional arc:**
- Arrival: orientation, the room is significant
- Crack: *what is that light?*
- First Fold: *this is impossible*
- Auto-hold mid-fold: *the world slowed down for me*
- Layer 2: *the machine knows where I am*
- Sphere reaching: *it reached for me*
- Second Fold floor split: *I'm falling through reality*
- Descent: anticipation, scale
- Empty plane: *something is about to happen*
- Nodes materializing: *a problem is loading*
- Dijkstra execution (12 seconds): *I'm watching it think*
- ACCEPTED: *I felt that*
- Return — labeled network: *I can read the machine now*
- Contact: *I've been somewhere. I want to go back.*

---

## Layer 1 — The Surface

### Visual Character
Dark architectural interior. Not a website loading — a room you've entered. Very high ceilings implied by perspective geometry. Warm directional light from off-screen upper-right casting long shadows. Scale established immediately.

The room has **impossible elements** — visible at the periphery: a corridor that extends in a direction that shouldn't exist, a window looking onto another part of the same room, a structural element implying a staircase to nowhere. These are subtle in the hero (opacity ~15%). On the return journey (after visiting Layer 3), they are fully visible (opacity ~100%). The descent gives the visitor a key to read the surface differently.

### Hero Content
- Tanmay's name: EB Garamond 88px, weight 400, letter-spacing +0.01em, warm cream. **Already present at load — no entry animation.** The world existed before the visitor arrived.
- Supporting text: "Computer Science. Third Year." — 20px, secondary color, Framer Motion fade-in at 900ms after load
- One sentence: *"I build things that solve things."* — 19px, secondary color 80% opacity, delayed 1400ms
- The one sentence bridges the two disciplines (building = projects, solving = competitive programming) and is the only direct statement of identity on the site

### The Crack (Hero's Wow Moment #1)
- Appears **8 seconds after load** — unprompted, unexpected
- SVG path animation using `stroke-dashoffset` — a fine crack line propagates from upper-right toward center-left over 3 seconds
- The crack is 1px, colored with the **core light accent** (`#ede5cc`) — the deepest layer's color visible through the surface
- Below the crack: a `div` with matching `clip-path` showing warm light at 30% opacity — the visitor sees three layers deep through a fault in the surface
- The crack holds for 4 seconds with two gentle light pulses, then seals (line narrows back to zero)
- **Never repeats.** Runs once on load, component unmounts after sealing.
- Visitors who miss it will not be able to retrieve it. This is intentional.

### Scroll Prompt
Bottom center of viewport: 40px horizontal line, 1px tall, surface amber at 45% opacity. Slow pulse (0.3→0.6→0.3 opacity) on 4-second sine curve. After two pulses, `DESCEND` appears in IBM Plex Mono 9px, tracked +0.4em, secondary color.

### Layer 1 Mouse Interaction
- Custom cursor: small crosshair `+`, 14px, 1px weight, primary color at 70%
- Scene perspective tilt: `perspective(1400px) rotateX(tiltY) rotateY(tiltX)` on scene container, max 3°, responds to cursor position from center
- The impossible architectural elements become more visible as the perspective shifts — revealing depth hints

---

## The First Fold

### Mechanism
CSS 3D perspective rotation. The HTML content layer (Layer 1) rotates on a horizontal axis, revealing Layer 2 behind/beneath it. The R3F canvas (rendering Layer 2 filaments) has been fading in behind the fold as it progresses — the Machine Dream is visible through the rotating Layer 1 panel.

### Implementation: Three-Segment Scroll
NOT a timing interruption. Three separate GSAP tweens on the same ScrollTrigger pin:
- **Segment A:** 600px scroll → fold rotates 0° → 45°
- **Segment B (dead zone):** 600px scroll → fold holds at 45°, no visual change, visitor scrolls through blank space
- **Segment C:** 600px scroll → fold rotates 45° → 90°

Total fold scroll: 1800px. Reliable, no fighting with scroll, same visual result as timing interruption.

### The Auto-Hold (Wow Moment)
At 45° rotation (mid-fold), the world holds itself. Both Layer 1 and Layer 2 are simultaneously visible — Layer 1 perpendicular as a thin plane, Layer 2 fully visible behind it. The underside of Layer 1 is not clean — it shows the structural logic of Layer 2 (filament-approximating CSS gradient).

**Visitors will stop scrolling here.** They will hold the world mid-rotation and look at it. This is the first "how did they do that?" moment.

### CSS Setup
```
.fold-container: perspective: 1400px, perspective-origin: 50% 50%
.fold-panel-front: Layer 1 content, backface-visibility: hidden
.fold-panel-back: Layer 2 content, backface-visibility: hidden, initial rotateX(-90deg)
transform-style: preserve-3d on container
```

### Completion
Layer state context sets to `2`. R3F Layer 2 scene reaches full opacity.

---

## Layer 2 — The Machine Dream

### Visual Character
A living network of thousands of thin organic filaments — lines following curved paths between node points, like mycorrhizal networks or neural dendrites at cosmic scale. Not a technical diagram. An atmosphere.

Three opacity depth layers:
- Nearest: 15–25% opacity
- Mid-field: 5–12% opacity
- Distant: 2–5% opacity

The aggregate reads as a fog of connection. Dense regions glow slightly warmer (machine gold accent).

### Filament Network Architecture
- **Pre-generated static data** stored in `lib/data/filament-graph.ts` — 800 node positions and connection lists, generated offline once, hardcoded as TypeScript arrays. Zero runtime topology computation.
- Rendered in R3F as `THREE.LineSegments` with `LineBasicMaterial`, 1px (delicate, not thick)
- Distance-based cursor cascade in `useFrame` — proximity glow, no shader, no BFS table

### Cursor Interaction: The Cascade (Wow Moment #2 candidate)
The most important Layer 2 interaction. Every cursor movement triggers light propagation toward the cursor position.

**Implementation:** Each filament stores its world-space midpoint. In `useFrame`, compute Euclidean distance from cursor to each filament midpoint. `opacity = baseOpacity + brightBoost * max(0, 1 - distance/radius)`. ~800 distance calculations per frame = ~0.02ms. Linear scan, no spatial index.

The visitor sees: filaments near cursor brighten, distant ones dim. The world tracks them.

**Cursor in Layer 2:** No crosshair. A small node — 5px, full opacity, primary color — follows cursor at 0.08 lerp delay. This is the visitor's signal presence in the system.

### Identity Nodes
Three large node objects (significantly bigger than network nodes), connected by bold filaments:
`ALGORITHMS ←——→ SYSTEMS ←——→ COMPETITION`

Connection between COMPETITION and ALGORITHMS is boldest — the most active edge. Pulses with slightly more light. GSAP timeline: `emissiveIntensity` 0.5→1.0→0.5, period 3 seconds.

Labels via `@react-three/drei` `<Html>` component.

### Layer 2 One Sentence
EB Garamond Italic, 18px, warm cream, via Framer Motion `whileInView`:
*"Three years inside the machine. Learning its grammar, its strangeness, its necessity."*

### Layer 2 Grain Density
GrainCanvas drops to 70% density when `currentLayer === 2`. Cursor pressure field remains active.

---

## The Second Fold — Floor Split + Descent

### The Floor Split
The Layer 2 "floor" (a `position: absolute` element covering bottom 30% of viewport) splits along a central seam. Two halves fold away in opposite directions — like opening a book from its spine. Between them: warm core light rises from below at increasing opacity.

CSS clip-path animation:
- Left half: `inset(0 50% 0 0)` → `inset(0 100% 0 0)`
- Right half: `inset(0 0 0 50%)` → `inset(0 0 0 100%)`

### The Descent (Wow Moment)
60vh of scroll-controlled camera drop. Driven by GSAP ScrollTrigger, progress value passed to R3F via a `ref` (not React state — directly mutated by `onUpdate`, read in `useFrame`).

```typescript
const descentRef = useRef(0)  // 0→1, mutated directly
// In Layer3Scene useFrame:
camera.position.y = THREE.MathUtils.lerp(8, -8, descentProgressRef.current)
```

**At 30vh (midpoint of descent):** Both Layer 2 filaments (fading above) and Layer 3 coordinate plane (arriving below) are simultaneously visible. Neither fills the frame. This is the site's deepest sense of vertical scale.

**Brief warm glow** at midpoint: CSS `radial-gradient` overlay at the center of the viewport, opacity 0→0.2→0 over 1 second, suggesting the light source below.

Layer state sets to `3` on arrival.

---

## Layer 3 — The Competitive Programming Core

### The World
An infinite coordinate plane in three-quarter perspective. The grid lines are barely-visible warm threads (8% opacity). Coordinate axes are more pronounced (25% opacity, amber tint). The plane is made of light, not of surface. Mathematical space.

**Color contrast is dramatic:** Layer 3 background (`#060403`) is near-absolute dark. But content within it — algorithm traces, rating number — is more luminous than anything seen above. Descending to the darkest place to find the brightest light. This is the emotional core.

### Coordinate Plane Implementation
NOT custom BufferGeometry. Two objects:
- `GridHelper(40, 40)` at 8% opacity for the grid
- Two `Line` objects (4 vertices each) for X and Z axes at 25% opacity with amber tint

### The Rating Number
CSS `position: fixed`, centered, IBM Plex Mono 90px, core light color (`#ede5cc`) at **20% opacity initially**.

No label. No annotation. No "Codeforces Rating:" prefix.

The visitor descends through two folds to find this number at the center of a mathematical universe. They understand it is significant without being told.

### Problem Nodes
Pre-computed from actual Codeforces data (stored in `lib/data/cp-data.ts`). Each node:
- `THREE.Mesh(SphereGeometry(0.08, 8, 8), MeshBasicMaterial)`
- Sized and colored by category: graph=cool blue, dp=amber, greedy=muted green, number-theory=muted violet, data-structures=warm rust, strings=teal
- Materialize one by one at 300ms stagger, opacity 0→1 over 400ms each

### The Dijkstra Execution (12 seconds)
From pre-computed paths in `lib/data/cp-data.ts` (computed offline, stored as static arrays).

**Implementation:** `LineDashedMaterial` per path. `line.computeLineDistances()` on creation (once). GSAP tweens `material.dashSize` from `0` to `totalLength` on each path's `delay` offset. The "light traveling along the path" visual — origin to node — is exact and clear. Zero GLSL written.

As each path completes: rating number opacity increments by `0.8 / totalNodes`. By the time the final node connects, rating number is at full opacity.

### The ACCEPTED Reveal (The Climax)

When the Dijkstra GSAP timeline completes (`onComplete`): React state `accepted: boolean` becomes `true`.

**The ACCEPTED text:**
- EB Garamond 100px (the first and only time EB Garamond appears in Layer 3 — every other element is mono)
- Core light color, full opacity
- `position: fixed`, centered over the coordinate plane
- **Instant appearance. No fade, no animation, no transition.** It exists the moment it should.
- The contrast of serif in a mono world makes it land harder

**The grid pulse:** One GSAP tween on a `uPulse` uniform: grid opacity `baseOpacity + uPulse * 0.4`, over 1.5 seconds. The entire plane breathes once.

**ACCEPTED fades** after 4 seconds, over 2 seconds. Then exploration mode begins.

### Exploration Mode (After ACCEPTED)
- Camera drifts at constant slow speed: `camera.position.x += Math.sin(time * 0.05) * 0.003`, `camera.position.z -= 0.004`
- Cursor tilts plane: horizontal cursor position → 2° plane rotation on vertical axis
- Node hover: scale 1→1.8, path from origin to that node re-illuminates at full brightness, static tooltip appears with category name and problem count
- Axis labels: static CSS positioned elements (not world-to-screen projection), appearing to label the coordinate axes

### The Unrepeatable Event
The full-plane Dijkstra execution happens once when Layer 3 is first entered. It does not repeat. Visitors who scrolled too fast will not be able to retrieve it. This is intentional — it creates something worth telling other people about.

---

## Project Spheres (Layer 2 — Return Journey)

### What They Are
Large spherical objects floating in the Machine Dream filament network. Encountered as the visitor ascends back through Layer 2 after the CP Core.

### Material (Simplified from original plan)
`MeshPhysicalMaterial` WITHOUT transmission (no render target complexity):
- `transparent: true, opacity: 0.12`
- `roughness: 0, metalness: 0.1`
- `EdgesGeometry` overlay with slight amber emission for the rim glow
- Reads as glass — dark glass with a lit edge — without GPU cost
- Filaments visible "through" the sphere because they're rendered behind it through the transparency

### The Reaching Filament (Wow Moment #3)
**This is the project interaction's wow moment.**

When cursor enters ~200px proximity of a sphere:
1. After 1 second of proximity (a pause — a decision)
2. A single filament extends from the sphere's surface toward the cursor
3. Growth speed: ~80 world-units per second (deliberate, patient)
4. Uses ONE `Line2` instance per sphere (the only use of `Line2` addon — worth it here for the organic curve quality)
5. If cursor leaves: filament retracts at the same speed
6. On filament-cursor contact: `onSphereOpen(id)` fires

**Why this works:** The project reaches toward the visitor, not the other way around. The reversal breaks the model of how websites work. "The sphere reached for me" is the sentence visitors will use.

### Sphere Opening
1. R3F sphere fades to opacity 0
2. A DOM duplicate div (`border-radius: 50%`, matching sphere's screen position via one-time `vector.project(camera)` calculation) performs Framer Motion layout animation expanding to fill viewport
3. Inside the expanded sphere: project name assembled via SVG `stroke-dashoffset` animation on letterform paths (0.6 seconds), then description and stack fade in
4. Close: reverse layout animation, sphere restores to opacity 0.12

### The Machine Network During Projects
The filament network continues operating around and through the spheres. When one sphere opens, nearby spheres brighten slightly — the network routes awareness toward the active node.

### Labeled Nodes (Return Journey)
After `hasVisitedCore === true` and `currentLayer === 2` on return, network node labels become visible via CSS opacity transition. Labels include algorithm category names corresponding to Layer 3's problem nodes. The descent gave the visitor a key to read the machine.

---

## Skills and Contact (Layer 1 Return)

### The Return Fold
Reverse rotation, NO dead-zone hold — the return is faster (~900px total). Confident, not ceremonial.

Layer 1 on return: impossible architectural elements at full opacity. The room is the same room but readable now.

### Skills
SVG network with hardcoded positions from `lib/data/skills.ts` (manually positioned — no D3, no runtime computation). On hover: GSAP animates `stroke-dashoffset` on connecting SVG lines between related skills.

The impossible architectural elements are now "labeled" — skills are embedded in the architecture that was always there but couldn't be read before the descent.

### Contact
EB Garamond, warm cream:
*"You've been to the bottom."*

[Email address] at 42px. On hover: amber underline draws left-to-right in 300ms (CSS `::after` with `transform: scaleX(0→1)`).

Social links in IBM Plex Mono, small-caps, wide tracking.

Bottom-right corner: `2025` — Plex Mono 10px, 25% opacity. No copyright.

---

## Visual Philosophy

**The single governing principle:** Elegance at scale. Very few elements. Very precise placement. Space is architecture.

**Warm, not cold.** The single most important artistic decision. Every dark portfolio is cool-toned. Every tech aesthetic is blue. This site is warm throughout. Finding depth feels like finding dawn, not like a computer resolving.

**The accent is precious.** Amber appears only where it matters: axis lines, the rating number, the crack light, underline states. Its rarity is its power.

**Scale creates awe.** The rating number at 90px mono. The ACCEPTED text at 100px serif. The coordinate plane extending to all horizons. These are architectural elements, not readable text.

**Nothing loops or performs without user input.** The grain drifts. The ambient light pulses. These are the only continuous animations. Everything else responds to scroll or cursor. The world is alive, not performing.

---

## Motion Philosophy

### Easing
One cubic-bezier everywhere: `cubic-bezier(0.16, 1, 0.3, 1)` — aggressive ease-out. Elements know where they're going before they start moving. Fast start, dramatic deceleration.

### Scroll
Lenis: `duration: 1.2`, `easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))` — slight resistance, physically weighted, not floaty.

### Grain
Canvas 2D, `requestAnimationFrame`. ~1000 grain marks. Drift via random walk (not Perlin): each mark has an angle that changes slowly every 5–8 seconds, linearly interpolated. Cursor pressure field: within ~120px radius, grain drifts away from cursor over 1.5 seconds, returns over 3 seconds. Reads as breath, not code.

### Reveals
Elements enter with: `translateY(24px→0)`, `opacity(0→1)`, 900ms, signature easing. 24px is a settling, not a dramatic fly-in.

### The ACCEPTED Exception
The only element in the site that appears with zero animation — instant presence. No fade, no translate. It exists the moment it should. This contrast with every other element's choreography is the effect.

---

## Color System

| Name | Hex | Usage |
|---|---|---|
| Surface ground | `#0f0d0b` | Layer 1 background — dark warm brown-black |
| Machine ground | `#0a0806` | Layer 2 background — darker, warmer |
| Core ground | `#060403` | Layer 3 background — near absolute dark |
| Primary text | `#e8e2d8` | All type, all layers — warm cream |
| Secondary text | `#6b6055` | Captions, labels, secondary |
| Surface amber | `#c8a96e` | Layer 1 accent — earth, physical reality |
| Machine gold | `#d4c9a0` | Layer 2 accent — paler, light through fog |
| Core light | `#ede5cc` | Layer 3 accent — luminous, pure, the rating and algorithm traces |
| Fold reveal | `#0f0d0b` | Color of fold surface — continuous with world |

**No other colors exist in this world.**

The accent warms and brightens as you descend. Surface amber → paler machine gold → near-luminous core light. Counter-intuitive: the deepest layer has the brightest light. Descending toward something.

---

## Typography System

**Two typefaces. No others.**

**EB Garamond** — display, body, human voice. Used in Layers 1 and 2. Literary precision and warmth. At 100px: architectural. At 18px: intimate. **Never used in Layer 3 except for ACCEPTED** (which is why ACCEPTED lands — it's the serif breaking into a mono world).

**IBM Plex Mono** — precision, data, mathematical register. Layer 3 exclusively, plus labels and coordinates in Layers 1 and 2. At 90px in Layer 3: monumental. The typeface of things that are exactly what they are.

**The transition from serif to mono marks the descent.** Visitors feel this shift before they consciously notice it.

**Scale rules:**
- Layer 1 headlines: EB Garamond 88px (name), 20px (supporting)
- Layer 2: EB Garamond 18px italic (one sentence)
- Layer 3 rating: IBM Plex Mono 90px
- Layer 3 data: IBM Plex Mono 11–14px
- ACCEPTED: EB Garamond 100px (the exception that earns its weight)

**Line-height:** 1.85 everywhere for body text.

**Copy count:** Under 200 words total on the site. Visitors experience the world, not read about it.

---

## Technical Architecture

### Stack
- **Next.js 16.2.9**, **React 19.2.4**, **TypeScript**, **Tailwind v4**
- Turbopack by default in Next.js 16 (no webpack config needed)

### Rendering Stack (back to front)
```
z-index 0:  R3F Canvas (Three.js) — position: fixed, pointer-events: none
z-index 1:  GrainCanvas (Canvas 2D) — position: fixed, pointer-events: none
z-index 2:  CSS atmospheric layers — position: fixed, pointer-events: none
z-index 5:  CSS 3D Fold panels (HTML content rotating)
z-index 10: HTML content sections
z-index 20: ACCEPTED text — position: fixed
z-index 30: Project sphere overlay (Framer Motion)
z-index 50: Cursor — position: fixed
```

### Single Persistent R3F Canvas
One `<Canvas>`, lazy-loaded via `next/dynamic` with `ssr: false`. Renders Layer 2 and Layer 3 content only (Layer 1 is pure CSS + Canvas 2D — no Three.js needed).

Canvas begins rendering Layer 2 filaments when fold `progress > 0.1` (so the Machine Dream is visible through the rotating Layer 1 panel before fold completes).

### Lenis + GSAP Wiring (Mandatory, exact pattern)
```typescript
const lenis = new Lenis({ duration: 1.2, easing: ... })
gsap.ticker.add((time) => { lenis.raf(time * 1000) })
gsap.ticker.lagSmoothing(0)
lenis.on('scroll', ScrollTrigger.update)
```

### Key Data Refs Pattern
ScrollTrigger progress values passed to R3F via refs, not React state:
```typescript
const descentRef = useRef(0) // mutated by ScrollTrigger onUpdate
// In useFrame: read descentRef.current directly
```
This prevents re-renders on every scroll tick.

### Mobile Strategy
`useMobile` hook (detects `window.innerWidth < 768`) gates Three.js mounting from Phase 1. Mobile receives: Layer 1 full, Fold transitions full (CSS only), Layer 2 as CSS gradient, Layer 3 as static SVG, Projects as flat cards, Contact full. Implemented from the start, not as Phase 7 afterthought.

### Libraries (Final, Approved List)
```
lenis
gsap
@gsap/react
framer-motion
@react-three/fiber
@react-three/drei
three
```
No D3. No noise library. No Three.js addons except one `Line2` instance for the reaching filament.

### File Structure
```
src/
├── app/
│   ├── layout.tsx              Fonts, LenisProvider, global canvas
│   ├── page.tsx                Section orchestrator, layer state
│   └── globals.css             Tailwind v4 + CSS custom properties
├── components/
│   ├── canvas/
│   │   ├── RootCanvas.tsx      Single R3F canvas (next/dynamic, ssr: false)
│   │   ├── Layer2Scene.tsx     Filament network, project spheres
│   │   └── Layer3Scene.tsx     Coordinate plane, nodes, traces
│   ├── fold/
│   │   ├── FoldContainer.tsx   CSS 3D perspective container
│   │   ├── FirstFold.tsx       Three-segment scroll fold
│   │   └── SecondFold.tsx      Floor split + descent
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── MachineDream.tsx
│   │   ├── CPCore.tsx
│   │   ├── Projects.tsx
│   │   ├── Skills.tsx
│   │   └── Contact.tsx
│   └── ui/
│       ├── Cursor.tsx
│       ├── GrainCanvas.tsx
│       └── CrackEffect.tsx
├── lib/
│   ├── data/
│   │   ├── cp-data.ts          CP stats + pre-computed node positions + Dijkstra paths
│   │   ├── projects.ts         Project data + sphere positions
│   │   ├── skills.ts           Skill nodes with hardcoded positions
│   │   └── filament-graph.ts   Pre-generated filament network (800 nodes)
│   └── hooks/
│       ├── useLayerState.ts    Context: currentLayer (1|2|3), hasVisitedCore
│       ├── useMousePosition.ts Normalized [-1,1] coords + mouseRef for RAF loops
│       ├── useScrollProgress.ts Section-level scroll progress
│       └── useMobile.ts        Detects mobile, gates Three.js
```

---

## Approved Implementation Roadmap

### Phase 1 — Foundation + Hero
**Delivers:** All infrastructure. Lenis. GSAP. Cursor. GrainCanvas with cursor pressure. Layer 1 architectural space. Name present on load. Two supporting text lines fade in. Perspective tilt on cursor. The crack at 8 seconds. Scroll prompt. Layer state context. Mobile detection from day one.

**New libraries:** `lenis`, `gsap`, `@gsap/react`, `framer-motion`

**Pre-work needed:** Real data for cp-data.ts and projects.ts (can use placeholder initially)

---

### Phase 2 — The First Fold
**Delivers:** Three-segment scroll pin (600px approach / 600px dead zone / 600px complete). CSS 3D `rotateX` 0°→45°→45°→90°. The underside gradient approximating Machine Dream. R3F canvas fades in Layer 2 as fold progresses. Layer state → 2 on completion.

**New libraries:** None

---

### Phase 3 — The Machine Dream
**Delivers:** R3F canvas active with Layer 2 scene. Static filament graph from `lib/data/filament-graph.ts`. `THREE.LineSegments` at 1px with distance-based cursor glow in `useFrame`. Three identity nodes with pulse. One sentence HTML overlay. Cursor switches to node dot. GrainCanvas density to 70%.

**New libraries:** `@react-three/fiber`, `@react-three/drei`, `three`

**Pre-work needed:** Generate and hardcode filament graph (800 nodes, k-nearest connections)

---

### Phase 4 — The Second Fold
**Delivers:** CSS floor-split animation (two halves folding away). R3F camera descent over 60vh (descentRef pattern). Layer 2 fades above, Layer 3 arrives below. Midpoint warm glow. Layer state → 3 on arrival.

**New libraries:** None

**Critical:** descentRef must be a plain ref (not state) mutated directly by ScrollTrigger.

---

### Phase 5 — Competitive Programming Core
**Delivers:** Two GridHelpers + axis Lines for coordinate plane. Problem nodes at pre-computed positions materializing in stagger. Rating number at 20% opacity. GSAP timeline: node materialization → Dijkstra execution (`LineDashedMaterial` dashSize tween per path) → rating brightens with each connection → `ACCEPTED` instant appearance → grid pulse → fade → exploration mode. Node hover reveals category info. Camera drift.

**New libraries:** None

**Pre-work needed:** Real Codeforces data. Pre-computed Dijkstra paths as static arrays. This is the most critical data to have correct.

---

### Phase 6 — Projects
**Delivers:** Project spheres in R3F (simplified glass material). One `Line2` reaching filament per sphere. Filament growth/retraction on proximity. `onSphereOpen` fires on contact. DOM duplicate + Framer Motion layout animation for sphere expansion. SVG letterform path animation for project name assembly. Labeled network nodes on return.

**New libraries:** None (one `Line2` addon from three.js examples — already in three package)

**Pre-work needed:** Real project data. Chosen sphere positions in Layer 2 world space.

---

### Phase 7 — Skills, Contact, Return + Polish
**Delivers:** Return fold (900px, no dead zone). Skills SVG network with hardcoded positions. Hover connections via GSAP stroke-dashoffset. Contact section complete. Layer 1 impossible elements at full opacity on return. GrainCanvas returns to 100%. Cursor returns to crosshair. Mobile fallback (CSS gradient replacing filaments, static SVG replacing coordinate plane, flat cards replacing spheres). Performance profiling. Fonts verified. Metadata and OG image. Real data fully entered.

**New libraries:** None (D3 explicitly eliminated)

---

## Engineering Decisions Made

### Things Simplified (Without Reducing Perceived Quality)

| What | Original Plan | What It Became | Why |
|---|---|---|---|
| Filament cascade | BFS distance table, GPU texture, custom shader | CPU distance-based proximity glow in `useFrame` | Visitor cannot perceive difference between topology-following and proximity glow |
| Filament line rendering | `Line2` addon for thickness | `THREE.LineSegments` at 1px | Filaments should be delicate. 1px is correct. |
| Filament graph | Runtime Delaunay triangulation | Pre-generated static TypeScript arrays | Zero runtime cost, identical visual |
| Glass spheres | `MeshPhysicalMaterial` with transmission + render target | `transparent: 0.12` + `EdgesGeometry` rim | True refraction requires WebGLRenderTarget per sphere — very expensive. Simplified glass reads as glass. |
| Coordinate plane | Custom BufferGeometry | Two GridHelpers + two Line objects | Same visual, 60% less code |
| Algorithm traces | Custom GLSL vertex shader with `aSegmentT` | `LineDashedMaterial` with GSAP dashSize tween | Identical visual — light sweeping along path |
| Mid-fold hold | ScrollTrigger timing interruption | Three-segment dead-zone scroll | More reliable, no scroll fighting |
| Letter springs | Per-letter Framer Motion springs (3px max) | Removed | 3px on 88px type is imperceptible |
| Grain drift | Perlin flow field | Random walk with slow angle change | No noise library, identical visual |
| Axis labels | World-to-screen per frame | Static CSS positions | Labels convey meaning without pixel-precision placement |
| Rating number | `<Html>` drei at 3D origin | CSS `position: fixed`, centered | Rating is always approximately centered. No 3D projection needed. |
| Skills layout | D3-force simulation | Hardcoded positions | 15–20 nodes, manual placement takes 10 minutes |
| Layer1Scene | Three.js scene | Eliminated | Layer 1 is pure CSS + Canvas 2D, no Three.js content |

### Things Kept at Full Complexity (Worth It)

- Single persistent R3F canvas — browser WebGL context limits make this mandatory
- CSS 3D fold mechanism — the correct tool, no simpler equivalent
- Lenis + GSAP ticker wiring — mandatory for smooth scroll with pinned sections
- GrainCanvas cursor pressure field — this is what makes Layer 1 feel alive vs a static overlay
- Pre-computed Dijkstra paths — computing at runtime risks frame drops at the climax
- `LineDashedMaterial` sweep — the light-traveling animation IS the ACCEPTED buildup
- ACCEPTED as instant appearance — the zero-animation is the animation
- DOM duplicate for sphere expansion — correct Framer Motion / R3F bridge pattern
- Reaching filament with one `Line2` — the project interaction wow moment
- Layer state context — central nervous system of the entire experience

---

## Things Explicitly Rejected

### Rejected Visual Approaches
- **Cyberpunk aesthetics** — neon, glitch effects, aggressive color, rain. Explicitly not this.
- **Three.js particle showcases** — generic particle fields responding to cursor. The Machine Dream filaments specifically avoid this by being organic in path, thin, and responding to proximity rather than organizing into geometric patterns.
- **Generic dark portfolio** — floating cards, glassmorphism, dashboard aesthetics, SaaS design
- **Cold signal color** — cyan was the original accent. Replaced with warm amber throughout. Cold signal colors = technology performing. Warm colors = warmth arriving.
- **Looping hero animations** — no floating elements, no pulsing rings without user input
- **Typing animations for the hero name** — replaced with instant presence. World existed before visitor arrived.
- **Per-letter spring physics on name** — imperceptible at 88px. Removed.
- **The H-R diagram restructuring** from original Universe concept — removed when Fold concept was chosen

### Rejected Technical Approaches
- **BFS distance table as GPU texture** — over-engineering, visitor can't perceive the difference
- **Delaunay triangulation at runtime** — pre-generate, same visual
- **MeshPhysicalMaterial with transmission** — requires WebGLRenderTarget per sphere, too expensive
- **D3 for skills layout** — 15 nodes, hardcode positions
- **Layer1Scene in R3F** — no Three.js content needed for Layer 1
- **Multiple R3F canvases** — WebGL context limit
- **Per-vertex custom shader for algorithm traces** — LineDashedMaterial achieves identical visual
- **ScrollTrigger timing interruption for fold hold** — scroll fighting. Three-segment approach instead.
- **World-to-screen projection for axis labels every frame** — static CSS, contextually accurate

### Rejected Structural Concepts (from earlier explorations)
- Pure atmospheric/editorial direction (SIGNAL v1) — too safe, too passive, not enough wonder
- The Atlas concept — warm but too magazine-like
- The Theorem concept — intellectually interesting, visually understated
- The Verdict concept — strong but the ACCEPTED moment works better as the Descent's climax than as the entire site's framing
- The Observatory (star field) — beautiful but CP as navigable stars is less emotionally powerful than CP as the mathematical core you descend to reach

---

## Data Requirements

The following real data must be collected from Tanmay before Phase 5:

**Competitive Programming:**
- Codeforces handle and current rating
- Total problems solved (across all platforms)
- Total rated contests
- Peak rank (any contest)
- Problem distribution by category (graph, DP, greedy, number theory, data structures, strings) — needed for pre-computing node positions and Dijkstra paths
- Contest history for the "field log" display (past 10–15 contests: name, rank, delta)

**Projects (3–5 projects):**
- Project name
- One-sentence description (what it does and why it exists)
- Tech stack (comma-separated)
- Year built
- GitHub URL
- Live URL (if applicable)

**Contact:**
- Email address to display
- GitHub username
- LinkedIn URL
- Codeforces profile URL

---

## Reference Sites (Approved Inspirations)

- **davidwhyte.com/experience** — atmosphere, cursor-reactive immersion, world alive before you arrive
- **hatom.com** — phase-based loading, scroll as timeline, audio-visual quality
- **houseofhoney.com** — editorial typography, warmth, space as content

**Avoid:** Anything that looks like a Three.js tutorial, a CodePen experiment, a SaaS landing page, or a "creative developer" portfolio template.

---

## The Three Visitor Wow Moments

These are the three moments guaranteed to make visitors stop and think "how did they do that?":

1. **The Crack (Hero, 8 seconds in)** — Warm light visible through a fault in the surface, three layers deep, appearing unprompted, sealing and disappearing. Creates the question the entire descent answers.

2. **The Sphere Reaches (Projects, Layer 2)** — A project sphere grows a filament toward the cursor. The visitor must touch the filament. The reversal of the standard portfolio interaction (content coming to visitor, not visitor navigating to content) breaks the expected model.

3. **ACCEPTED (CP Core, Layer 3)** — After descending through two folds and 60vh of drop, after watching 12 seconds of an algorithm execute across a mathematical plane, after the rating number reaches full brightness: one word. Instant. Serif. In the mathematical world. The most emotionally loaded word in competitive programming. Earned by everything that preceded it.
