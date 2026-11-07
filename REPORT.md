# DP Playground — Build Report

## 1. Built

**What it is.** Static, offline-first teaching app for dynamic programming. No
backend. Static build runs from `dist/` — `file://`, GitHub Pages, USB stick, or
any folder — via Vite `base: './'` (`vite.config.ts:5`) and
`HashRouter` (`DECISIONS.md` D002). No network calls in `src/` (no `fetch`,
`XMLHttpRequest`, or remote font URLs found); fonts are system stacks
(D012). Persistence (theme, quiz scores, solved progress, teacher mode) is
`localStorage`-only (D015).

**Stack** (`package.json`, `AGENTS.md`). Vite 6 + React 18 + TypeScript 5.7
strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` per D019),
Tailwind 3, Zustand 4 (player + teacher stores), React Router 6 (hash),
Framer Motion sparingly (page transitions + flagship collapse, D007),
Prism (`prismjs`, D004) for Python/JS/C++ highlighting, Vitest + Playwright
for tests.

**Architecture.** One pure-data `ProblemModule` per problem in
`src/problems/<category>/<id>.problem.ts` — no UI imports; types live in
`src/engine/types.ts`, logic helpers in `src/engine/dpHelpers.ts`
(`StepRecorder`, `fill`/`mark`/`record`, `finalAnswer`). Modules never build
`Step[]` by hand; all animation comes from `StepRecorder`-produced steps.
`src/engine/registry.ts` auto-loads modules via
`import.meta.glob('../problems/**/*.problem.ts', { eager: true })` (D003),
validates shape (id, category, renderer, 3–5 quizzes, Python/JS/C++ code,
`defaultInput`), dedupes by `id`, and sorts in teaching-order
`CATEGORY_IDS`. `ProblemPage` assembles UI generically (input form, mode
toggle, player, renderer, code panel, predict, quiz); `LessonPage` renders
lessons generically. Extra pages: `HomePage` (search/filter/progress),
`FibonacciPage` + `FibonacciLab` (flagship), `CheatSheetPage` (printable),
`PlaceholderPage` fallback, per-page `ErrorBoundary`.

**Renderers (8).** `table1d`, `table2d`, `stringAlign`, `recursionTree`,
`dagGraph`, `bitmaskGrid`, `intervalTriangle`, `treeDP`
(`registry.ts` `RENDERER_IDS`, `types.ts` `RendererId`). Each renderer takes
only its discriminated state (`kind` + values) and is tested independently.
Every problem declares one `renderer` (checked: all 65 files match).

**Coverage: 65 problems across 11 categories** (verified by glob of
`src/problems/**/*.problem.ts` and per-category `TASKS.md` entries;
Fibonacci is the flagship inside the 1D count):

| Category | Problems |
|---|---:|
| 1d | 10 (fibonacci, climbing-stairs, house-robber, house-robber-ii, min-cost-climbing-stairs, decode-ways, kadane, jump-game, lis-quadratic, lis-binary) |
| knapsack | 8 (zero-one-knapsack, subset-sum, partition-equal-subset, target-sum, unbounded-knapsack, coin-change, coin-change-ii, rod-cutting) |
| strings | 7 (lcs, longest-common-substring, longest-palindromic-subsequence, edit-distance, distinct-subsequences, wildcard-matching, shortest-common-supersequence) |
| grid | 6 (unique-paths, unique-paths-ii, min-path-sum, triangle, maximal-square, dungeon-game) |
| stocks | 6 (stock-i, stock-ii, stock-iii, stock-iv, stock-cooldown, stock-fee) |
| intervals | 6 (matrix-chain, burst-balloons, min-cost-cut-stick, palindrome-partition-ii, word-break, split-array-largest-sum) |
| bitmask | 3 (tsp, assignment, shortest-path-all-nodes) |
| tree | 5 (tree-diameter, max-independent-set, house-robber-iii, rerooting, binary-tree-cameras) |
| graphs | 4 (dag-longest-path, floyd-warshall, bellman-ford, cheapest-flights-k-stops) |
| counting | 6 (unique-bsts, dice-sums, knight-probability, predict-the-winner, stone-game, digit-dp) |
| advanced | 4 (prefix-sum-optimization, monotonic-queue, sos-dp, matrix-exponentiation) |

**Lessons.** 10 typed data modules in `src/lessons/` (`*.lesson.ts`, one per
category except advanced), rendered by one generic `LessonPage` (D014).

**Modes.** `bruteforce` | `memo` | `tabulation` (`types.ts` `Mode`);
`ProblemModule.modes` is optional — modules that do not fit a mode omit it
(`types.ts:245`). In practice: brute force only where tractable on small
inputs (the 1D set, `zero-one-knapsack`, `partition-equal-subset`,
`unbounded-knapsack`, `word-break`); many string/grid/tree/counting modules
are `memo`/`tabulation` only; algorithmic modules (`floyd-warshall`,
`bellman-ford`, `cheapest-flights-k-stops`, `prefix-sum-optimization`,
`monotonic-queue`, `sos-dp`, `matrix-exponentiation`,
`shortest-path-all-nodes`) are `tabulation`-only. The shared test harness
(`testUtils.ts`) runs whatever modes the module declares.

**Quizzes / practice.** 3–5 quizzes per module (enforced by
`validateProblemModule`), each with explanations; `PredictMode` (guess next
cell) and `QuizEngine` (score in `localStorage`) are generic. Playback:
Zustand player (play/pause/step/reset/scrub/0.25–4× speed/keyboard,
max steps), schema-driven `InputForm` with validation, size limits, and
randomize; per-module tests compare final answers against an independent
reference on 20 seeded random inputs (`testUtils.ts` `runModuleChecks`).

**Teacher mode.** Toggle, hide-code, font scale (`normal`/`large`/
`extra-large`), and fullscreen via `TeacherBar` + `teacherMode` store
(`src/engine/teacherMode.ts`); persisted in `localStorage`.

**Accessibility.** Colour is never the only signal — cells pair colour with
symbol/icon/border/label (D018); `aria-label`/`aria-live`/`role` regions,
keyboard-operable controls, `prefers-reduced-motion` CSS, light/dark tokens,
responsive layout, focus styles, screen-reader-only node lists in SVG
renderers (`DagGraph`, `TreeDP`, `RecursionTree`).

## 2. Cut

- **No backend, accounts, or sync.** Quiz/predict/progress/teacher/theme
  state lives in namespaced `localStorage` keys; clearing site data loses
  it. `package.json` has no server, DB, or auth dependencies.
- **No remote fonts, analytics, or network fetches.** System font stacks
  only (D012); the app makes no network calls.
- **No icon library.** Inline accessible SVG/Unicode glyphs (D013) instead
  of an icon dependency. Prism instead of Shiki for a smaller synchronous
  bundle (D004).
- **Framer Motion limited** to page transitions and the Fibonacci collapse
  (D007); step playback is discrete `Step` state, not continuous motion.
- **No per-problem bespoke pages** (except the single Fibonacci flagship,
  D017). `ProblemPage` assembles everything from module data.
- **Mode coverage cut deliberately.** Brute force is not forced where it
  would hang the classroom; some modes are simply absent per module.
- **Step lists truncated, not fully shown.** `capSteps`
  (`src/engine/stepCap.ts`) returns at most 500 steps
  (`DEFAULT_MAX_STEPS = 500`) — first `max-1` steps plus one explicit
  truncation step that preserves `vars.answer` and the final answer
  wording. Huge inputs therefore animate a prefix, not the whole run.
- **Lessons: one precomputed diagram each, no freeform drawers.** A lesson's
  `diagram` is an optional single `{ rendererId, steps }` pair built with
  `StepRecorder` at module scope (e.g. `1d.lesson.ts`
  `buildDiagramSteps`); sections are plain `heading`/`body`/`bullets`/
  `callout` text (`lessonTypes.ts`). Advanced has **no lesson** — the
  `src/lessons/` glob finds 10 files, none for `advanced`.
- **Advanced started as optional scope.** `TASKS.md` labels Stage 3k
  "Advanced (optional, last)"; it was built (T200–T203) with problems only.

## 3. Limitations

- **Step-cap docs/code drift.** `DECISIONS.md` D009 documents a 1200-step
  cap; `src/engine/stepCap.ts` caps at **500** in code. Truncation hides
  intermediate steps for large inputs (answer is preserved, but the
  full trace is not viewable). Future work: reconcile the number and
  consider per-module caps.
- **`codeLine` alignment is range-checked, not semantic.** The shared
  harness (`testUtils.ts:101-128`) only asserts `1 ≤ codeLine ≤ min(line
  count across the three snippets)` and that the final message contains
  "answer". True semantic alignment (same statement across Python/JS/C++)
  was fixed by manual Stage 4 reviews (T210–T220), not by a test. Adding a
  new problem can pass tests while pointing at a wrong-but-in-range line.
- **~120-line guideline is not mechanically enforced.** `AGENTS.md` says
  "under ~120 lines when practical"; it is not a lint/test gate. Long
  problem modules exist by necessity (they embed three language snippets
  plus DP logic).
- **Seeded test coverage is narrow.** Each module is checked on 20 seeded
  inputs per declared mode against one hand-written reference. Edge cases
  outside the schema generator's range (patterned text fields fall back to
  the default input, `testUtils.ts:53-55`) are not covered.
- **Input sizes are capped for projectors.** Schema `min`/`max` limits and
  the step cap trade completeness for responsiveness; very large grids,
  trees, or strings cannot be explored step-by-step.
- **No multi-user / classroom sync.** One player store instance
  (D020), reset on module/input/mode change; no co-browsing, sharing, or
  server-side student tracking.
- **Hash routing** means URLs carry `#/...` hashes; deep links depend on
  hash parsing, and there is no server-side rendering/SEO.
- **System fonts only** limits typographic polish; icon glyphs are Unicode/
  emoji, which render differently across platforms.
- **Single-diagram lessons** cannot illustrate multiple sub-cases;
  advanced patterns have problem walkthroughs but no narrative lesson.
  Future work: per-advanced lesson(s), a second diagram slot, and tests
  that assert semantic code-line correspondence.
