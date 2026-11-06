# AGENTS — DP Playground

Static, offline-first DP teaching app. Vite + React 18 + TS strict + Tailwind + Zustand +
React Router (hash) + Framer Motion (sparingly) + Prism. No backend.

## Session start (always, in order)
1. Read this file, `TASKS.md`, and the last 20 lines of `PROGRESS.md`.
2. Run `git status --short` and inspect only the files of a `[~]` task.
3. Continue the first unfinished task. If half-written work is unsound, revert those files with
   `git checkout -- <files>` and redo the task cleanly. Otherwise finish and verify it.

## Contract
- `TASKS.md` is the single source of truth. Mark `[~]` before work, `[x]` only after verification.
- Before starting: ensure the task's owner-files list is explicit. Two agents must never edit the
  same file at once. Add files to the owner list if needed.
- Commit after every finished task: `T012: short description`. Never leave verified work uncommitted.
- Append one line to `PROGRESS.md` per finished task: date, id, done, follow-up.
- If quota/rate limit hits: finish or revert current task, commit, append
  `STOPPED: <reason>, next task: T0xx`, stop. No tight retries.
- Every task is idempotent. Never delete or weaken tests. No `any`, no `@ts-ignore`.
- Before stage gates run: typecheck, lint, test, build. Show first error only.
- Decisions that change architecture go in `DECISIONS.md`.

## Architecture
- One pure-data `ProblemModule` per problem in `src/problems/<category>/<id>.problem.ts`.
  No UI. Auto-loaded by `src/engine/registry.ts` via `import.meta.glob('./problems/**/*.problem.ts')`.
- All animation comes from `Step[]` produced with `StepRecorder`; modules never build steps by hand.
- Shared renderers: `table1d`, `table2d`, `stringAlign`, `recursionTree`, `dagGraph`,
  `bitmaskGrid`, `intervalTriangle`, `treeDP`. ProblemPage assembles all UI generically.
- Lesson data lives in `src/lessons/<category>.lesson.ts`; LessonPage renders it.
- Source of truth for types: `src/engine/types.ts`, helpers in `src/engine/dpHelpers.ts`.
- If two modules look alike, move the logic into the engine. No copy-pasted DP logic.
- Files under ~120 lines when practical. kebab-case files, PascalCase components, camelCase functions.
- Only add a dependency with a one-line reason in `DECISIONS.md`.

## Layout
```
src/engine/      types, registry, recorder, player, helpers (no JSX)
src/components/  shared React UI
src/renderers/   eight visualization renderers
src/pages/       route-level pages
src/problems/    pure problem modules + tests, grouped by category
src/lessons/     pure lesson data
src/styles/      tokens + globals
e2e/             Playwright smoke tests
```

## Problem module checklist
- Unique `id`, all metadata, default input within size limits, 3–5 quizzes.
- `generateSteps` modes where applicable; final step states the answer.
- Aligned Python/JS/C++ code, `codeLine` is a 1-based line in all three snippets.
- Uses engine helpers/renderers only; no UI imports.
- Vitest compares final answer with an independent reference on 20 seeded random inputs.

## UI rules
- Color is never the only signal: pair with icon, border, or label.
- Works phone/tablet/projector, light/dark, keyboard, reduced motion.
- Teacher mode enlarges text, can hide code and enter fullscreen.
- No network calls; no remote fonts; static build must run offline from `dist/`.
