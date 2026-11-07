# DP Playground

A **static, offline-first** teaching app for Dynamic Programming. Each problem
is an animated, step-by-step visualization (with Python / JavaScript / C++
code synced to the current line), quiz questions, and an "explain / predict"
mode. There is **no backend** and **no network calls at runtime** — the whole
app is a static bundle that runs offline once built.

## Requirements

- **Node.js 20 LTS** (18+ is required by Vite 6 / Vitest in the lockfile; 20
  is the safest current LTS. No `engines` field is pinned in `package.json`).
- **npm** (ships with Node.js).
- No other services, fonts, or APIs. The app has no remote fonts or network
  dependencies at runtime.

## Quick start

```bash
npm install
npm run dev
```

`npm run dev` is `vite` and serves the app in dev mode (default:
http://localhost:5173). Open the printed URL in a browser.
There are no mandatory environment variables.

### Production build (preview the static `dist/`)

```bash
npm run build    # tsc --noEmit && vite build  → writes dist/
npm run preview  # vite preview — serves the built dist/
```

`npm run preview` serves the static build (by default at
http://localhost:4173). The output of `npm run build` is a plain static
directory `dist/`. You can open it offline: `dist/index.html` works from
`file://` or any static host, with no server and no API.

### Checks before shipping

All four gates (typecheck + lint + tests + build), from `package.json`:

```bash
npm run check     # = typecheck && lint && test && build
npm run typecheck # tsc --noEmit --pretty false
npm run lint      # eslint . --max-warnings=0
npm test          # vitest run  (all unit tests)
npm run build     # production build
```

Other scripts:
- `npm run test:watch` — Vitest in watch mode (`vitest`).
- `npm run e2e` — Playwright smoke tests (`playwright test`).
  `playwright.config.ts` expects the app on
  `http://127.0.0.1:4173` and auto-starts `npm run dev -- --host 127.0.0.1
  --port 4173` if it isn't already running.

> Before stage gates, run `typecheck`, `lint`, `test`, and `build` in order
> and fix the first error shown.

## Deploy

Drop `dist/` on **any static host** (GitHub Pages, Netlify, Vercel, an S3
bucket, or a plain file server).

- **No rewrite rules needed.** The app uses a **hash router**
  (`createHashRouter` with `HashRouter`-style routes in
  `src/app/routes.tsx`), so deep links are `/#/problem/<id>` and the server
  never needs to resolve `/problem/<id>` paths.
- **Relative base.** `base: './'` in `vite.config.ts` makes all asset paths
  relative, so the same build works from a domain root, a **subpath**
  (e.g. `example.com/dp/`), or `file://`.
- **Offline-friendly.** No web fonts, no CDN, no fetch calls — fonts,
  Prism, and state all come from the bundle.

## Add a problem in 10 minutes

Copy a small existing module — `src/problems/1d/fibonacci.problem.ts` is the
canonical minimal example — and adapt it.

### 1. Create the module file

Save it as `src/problems/<category>/<id>.problem.ts`
(default-exported `ProblemModule`). Example: `src/problems/1d/dice-count.problem.ts`.

**Registering yourself is automatic** — do not touch the registry.
`src/engine/registry.ts` uses
`import.meta.glob('../problems/**/*.problem.ts', { eager: true, import: 'default' })`
so anything matching that path is imported and validated. Put files in the
right category folder:

| Folder | `category` value |
|---|---|
| `1d` | `1d` |
| `knapsack` | `knapsack` |
| `strings` | `strings` |
| `grid` | `grid` |
| `stocks` | `stocks` |
| `intervals` | `intervals` |
| `bitmask` | `bitmask` |
| `tree` | `tree` |
| `graphs` | `graphs` |
| `counting` | `counting` |
| `advanced` | `advanced` |

Invalid or duplicate modules are skipped and reported as `registryWarnings`
(it doesn't crash the app); the registry sorts valid ones by category, then
title.

### 2. ProblemModule checklist

The shape is `ProblemModule` in `src/engine/types.ts`. At minimum set:

```ts
import { StepRecorder } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step } from '../../engine/types';

export interface DiceCountInput { n: number; k: number }

const module: ProblemModule<DiceCountInput> = {
  id: 'dice-count',                       // unique, kebab-case
  title: 'Dice Ways to Reach k',
  category: 'counting',
  difficulty: 'easy',                     // 'easy' | 'medium' | 'hard'
  summary: '…',
  stateDefinition: 'dp[i] = …',
  recurrence: 'dp[0] = 1; dp[i] = …',
  complexity: { time: 'O(…)', space: 'O(…)' },
  renderer: 'table1d',                    // one of the eight ids below
  inputSchema: [
    { name: 'n', label: 'n', type: 'number', min: 0, max: 20, step: 1 },
  ],
  defaultInput: { n: 10, k: 5 },          // must validate against the schema
  modes: ['bruteforce', 'memo', 'tabulation'], // only modes that apply
  generateSteps: (input, mode) => { /* … */ },
  code: { python: '…', javascript: '…', cpp: '…' },
  quiz: [ /* 3–5 questions */ ],
  lessonId: 'counting',                   // optional, links to a lesson
};
export default module;
```

Rules the registry/tests enforce:

- **Metadata** — unique `id`, non-empty `title`, valid `category`,
  valid `renderer`, `defaultInput` present and schema-valid.
- **Renderer** — one of the eight
  `table1d | table2d | stringAlign | recursionTree | dagGraph | bitmaskGrid |
  intervalTriangle | treeDP`. The renderer must match the `state.kind` you
  record (e.g. `{ kind: 'table1d', values, labels }` for `table1d`).
- **Steps via `StepRecorder` only** — never hand-build `Step[]`. Create a
  `new StepRecorder(initialState, { codeLine: 1 })`, then call
  `rec.at(n).record(message, { codeLine, highlights, vars })` /
  `rec.at(n).fill(pos, value, message, { ... })`. Return `[...rec.steps]`.
  The **final step must state the answer** (use
  `highlights: [{ pos, kind: 'result', label: 'answer' }]`), because
  `finalAnswer()` reads it for tests.
- **`codeLine` is 1-based and must exist in all three snippets.** The tests
  check `codeLine <= min(lines(python), lines(javascript), lines(cpp))` — so
  the three snippets must have the same relevant line numbers. Write them in
  parallel (see `fibonacci.problem.ts` — each is 7 lines).
- **Quizzes: 3–5 questions** with `options` (non-empty), `answer` (index
  within `options`), `q`, and `why`.
- **Link the lesson** — set `lessonId` to the matching lesson id
  (`'1d'`, `'knapsack'`, `'strings'`, `'grid'`, `'stocks'`, `'intervals'`,
  `'bitmask'`, `'tree-dp'`, `'graphs'`, `'counting'`; lesson data lives in
  `src/lessons/<name>.lesson.ts`, rendered by `LessonPage`).
- **No UI imports** — import only from `src/engine/types` and
  `src/engine/dpHelpers` (fields like `complexity`, `inputSchema`, `modes`,
  `generateSteps` are the contract). `generateSteps(input, mode)` receives the
  typed input and a `Mode` (`'bruteforce' | 'memo' | 'tabulation'`). Common
  helpers: `createTable1D` / `createTable2D` (via `dpHelpers`) and
  `clamp(value, min, max)` for normalizing input.
- **Performance**: keep steps reasonable for large inputs — the
  `stepCap` engine handles truncation; don't silently drop steps.

### 3. Add the test

Create `src/problems/<category>/<id>.problem.test.ts`. The pattern is
`runModuleChecks` from `src/engine/testUtils` plus an **independent**
reference implementation (written from scratch, not by reusing the module's
own loop):

```ts
import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { runModuleChecks } from '../../engine/testUtils';
import module from './dice-count.problem';
import type { DiceCountInput } from './dice-count.problem';

function reference(input: DiceCountInput): number {
  // Independent, obviously-correct implementation (e.g. plain recursion).
  const solve = (i: number, left: number): number => {
    if (i === input.n) return left === input.k ? 1 : 0;
    let total = 0;
    for (let face = 1; face <= 6; face += 1) total += solve(i + 1, left + face);
    return total;
  };
  return solve(0, 0);
}

describe('dice-count module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(module, reference, { cases: 20, seed: 1 });
  });
});
```

`runModuleChecks` (in `src/engine/testUtils.ts`) generates 20 seeded
inputs from your `inputSchema` (deterministic via `createRng`/`seed`),
drives `generateSteps` in every mode in `module.modes` (default: all three),
and asserts: schema-valid inputs, step shape, valid `codeLine` in all three
snippets, valid `defaultInput`, answer correctness vs `reference`, and the
3–5 quiz rule. Then add a couple of `it`/`it.each` spot-checks with known
hand-computed values (see `fibonacci.problem.test.ts` for the pattern) to
catch reference bugs early.

### 4. Verify locally

```bash
npm test -- src/problems/<category>/<id>.problem.test.ts
npm run build  # or: npm run check
```

### 5. Minimize scope

This follows the repo convention (AGENTS.md): pure-data modules only — **no
React, no JSX, no UI imports in `src/problems/`**. All animation comes from
`Step[]` produced by `StepRecorder`, and `ProblemPage` assembles the entire
UI generically from the module. If a DP pattern appears twice, put the
shared logic in `src/engine/dpHelpers.ts` rather than copying it. Keep each
file focused (~120 lines where practical).

## Project structure

```
src/
  engine/      types, registry, StepRecorder/player, helpers, testUtils (no JSX)
  components/   shared React UI (player controls, code panel, quizzes, …)
  renderers/    the eight visualization renderers (table1d, table2d, stringAlign, …)
  pages/        route-level pages (ProblemPage, LessonPage, HomePage, …)
  problems/     one pure ProblemModule per problem, grouped by category; + tests
  lessons/      pure lesson data (LessonPage renders it)
  styles/       tokens + globals
e2e/            Playwright smoke tests
```

Categories in `src/problems/` (mirroring `src/lessons/`): `1d`, `knapsack`,
`strings`, `grid`, `stocks`, `intervals`, `bitmask`, `tree`, `graphs`,
`counting`, `advanced`. Route-level pages live in `src/pages/` and are wired
via `src/app/routes.tsx` (hash router).

## Built with

From `AGENTS.md` / `package.json` (fixed stack):

- **Vite 6 + React 18 + TypeScript (strict)** — build and types
- **Tailwind CSS** — utility-first styling
- **Zustand** — player/UI state
- **React Router (hash)** — routing (`createHashRouter`)
- **Framer Motion** — animation (used sparingly)
- **Prism** — syntax highlighting
- **Vitest + Playwright** — unit and smoke tests

Only add a dependency with a one-line reason recorded in `DECISIONS.md`.

## License

No `LICENSE` file is present in this repository checkout, and `package.json`
does not declare a `license` field. Treat the code as private/unlicensed
until a `LICENSE` is added — check the repository before redistributing it.

---
