# DECISIONS

Newest first. One line per dependency, plus architecture calls.

- **D001 — Vite React app, manual scaffold.** Faster and smaller than generator templates; all config is explicit.
- **D002 — HashRouter + Vite `base: './'`.** The static build works from any folder, `file://`, GitHub Pages, or USB stick without server rewrites.
- **D003 — `import.meta.glob(..., { eager: true })` registry.** Adding a problem is one file; no central registry edits and no dynamic network chunks.
- **D004 — Prism (`prismjs`) instead of Shiki.** Much smaller static bundle, synchronous highlighting, sufficient for three fixed languages.
- **D005 — Tailwind 3 + CSS-variable design tokens.** One token source supports light/dark/teacher scaling and keeps component classes short.
- **D006 — Zustand 4 player store.** Required by fixed stack; v4 avoids migration churn for this single store.
- **D007 — Framer Motion only for page transitions and flagship tree collapse.** Animation is driven by discrete `Step` state so it stays deterministic and testable.
- **D008 — Renderer states are discriminated by `renderer` id at module level; each state type lives in `types.ts`.** Renderers can stay dumb and modules remain data-only.
- **D009 — Step lists capped at 1200 by default (T036).** Prevents huge inputs freezing class projectors; truncation is explicit in UI.
- **D010 — Tests import Vitest APIs explicitly; no globals.** Simpler TS and lint configuration.
- **D011 — Playwright uses the dev server; production build is verified separately by `npm run preview`.** Smoke tests stay fast; final gate checks `dist/`.
- **D012 — Fonts are system stacks, not downloaded.** Offline requirement; no silent network dependency.
- **D013 — No icon library; inline accessible SVG/Unicode icons.** Avoids a dependency for a handful of glyphs.
- **D014 — Lessons are typed data modules rendered by one LessonPage.** Reuse instead of eleven bespoke page components.
- **D015 — Quiz/predict/progress persist in localStorage under namespaced keys.** No backend; safe to clear.
- **D016 — Input validation is schema-driven and shared by InputForm/ProblemPage.** Modules cannot invent inconsistent limits.
- **D017 — Fibonacci flagship has a dedicated page and lab, while its problem module remains standard.** Best teaching demo gets custom composition without breaking the generic template.
- **D018 — Color is always paired with shape/icon/border/label.** Accessibility and projector legibility.
- **D019 — `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are on.** Stricter safety; helpers absorb indexed access.
- **D020 — Only one player store instance; pages reset on module/input/mode change.** Deterministic classroom behavior.
- **D021 — New problems must expose final answer in the last step's `vars.answer`.** Shared tests and smoke tests can assert it generically.
- **D022 — `StepRecorder` owns snapshots and table mutation; modules use `fill`/`mark`/`commit`.** Guarantees immutable steps and aligned messages.
- **D023 — Category order is the teaching order in TASKS.md.** Partial delivery remains immediately useful.
