# PROGRESS — append only

2026-11-06 | T001 | Git repo + Vite/React/TS strict + dependencies + scripts installed. Follow-up: tooling configs (T002).
2026-11-06 | T002 | Tailwind, ESLint, Vitest 3, Playwright configured; typecheck + lint clean. Follow-up: docs (T003).
2026-11-06 | T003 | Agent contract, architecture, decisions, resumability docs in place. Follow-up: bootstrap/routes (T004).
2026-11-06 | T004 | Hash-router shell, theme toggle, placeholder routes, route error page; build passes. Follow-up: design tokens (T005).
2026-11-06 | T005 | Light/dark token system, state colors with symbols, focus/reduced-motion/print styles. Stage 0 gate passes. Follow-up: engine types (T010).
2026-11-06 | T010 | Engine contracts for steps, inputs, eight renderer states, modules; type guards tested. Follow-up: StepRecorder (T011).
2026-11-06 | T011 | Immutable table StepRecorder with fill/update/read, table helpers, final-answer extractor; 5 tests pass. Follow-up: player store (T012).
2026-11-06 | T012 | Zustand player with bounded playback, speed scale, keyboard shortcuts; 5 tests pass. Follow-up: controls UI (T013).
2026-11-06 | T013 | Transport controls with scrubber, speed, auto-advance; 3 tests pass; global RTL cleanup added. Follow-up: engine renderers.
2026-11-06 | T016 | StringAlign renderer with editable sequence headers, state symbols, caption and accessible cells; 2 tests pass. Follow-up: RecursionTree (T017).
2026-11-06 | T014 | Accessible 1D table renderer with state symbols, labels and compact mode; 5 tests pass. Follow-up: Table2D (T015).
2026-11-06 | T019 | Explanation bar, step counter and variable watch with live/progress semantics; 5 tests pass. Follow-up: ProblemPage integration.
2026-11-06 | T015 | 2D table with headers, state badges, dependency arrows, compact mode; 6 tests pass. Follow-up: engine renderer review.
2026-11-06 | T017 | Recursion tree with layout, memo/pruned badges, active focus path; 3 tests pass. Follow-up: flagship Fibonacci.
2026-11-06 | T018 | Prism code panel with language tabs, live line highlight, copy feedback, teacher-mode hide; 7 tests pass. Follow-up: ProblemPage wiring.
2026-11-06 | T020 | Schema-driven input form with inline validation, randomize, revert; 8 tests pass; typecheck + lint clean. Follow-up: ModeToggle (T021).
2026-11-06 | T021 | Mode toggle with arrow-key navigation, teaching hint, live operation counter; 4 tests pass. Follow-up: PredictMode (T022).
2026-11-06 | T022 | Prediction panel with keyboard answer entry, hints, scored feedback and reset-per-question; 5 tests pass. Follow-up: QuizEngine (T023).
2026-11-06 | T023 | QuizEngine with per-question explanations and localStorage score; 9 tests pass. Follow-up: ProblemPage (T025).
2026-11-06 | T024 | Module registry with import.meta.glob auto-load, validation, category metadata; 13 tests pass. Follow-up: ProblemPage (T025).
2026-11-06 | T027 | Teacher mode store + toolbar (hide code, font scale, fullscreen); 5 tests pass. Follow-up: AppShell wiring.
2026-11-06 | T029 | SVG DAG renderer with path/dependency edge highlighting and a11y fallback; 6 tests pass. Follow-up: bitmask/interval/tree renderers.
2026-11-06 | T025 | Generic ProblemPage assembling input/mode/player/renderer/code/predict/quiz from a module; 5 tests pass. Follow-up: flagship Fibonacci (T040).
2026-11-06 | T026 | HomePage with search/filter, saved-progress totals from localStorage, teacher entry; 7 tests pass. Follow-up: routes/teacher wiring.
2026-11-06 | T028 | Printable cheat sheet grouped by category with recurrence + complexity tables; 4 tests pass. Follow-up: none.
2026-11-06 | T030 | Bitmask grid renderer with binary cells, bit legend, compact mode; 9 tests pass. Follow-up: interval/tree renderers.
2026-11-06 | T031 | Interval triangle renderer with labels and highlight tokens; 6 tests pass. Follow-up: lessons/stepCap.
2026-11-06 | T032 | TreeDP renderer with per-node state chips and kind badges; 8 tests pass. Follow-up: lessons/stepCap.
2026-11-06 | T033 | Per-page ErrorBoundary with retry and friendly fallback; 5 tests pass. Follow-up: lessons/stepCap.
2026-11-06 | T034 | Seeded RNG + runModuleChecks harness (20 seeded cases, step/codeLine/answer checks); 10 tests pass. Follow-up: lessons/stepCap.
2026-11-06 | T035 | Lesson data model + LessonPage with animated diagram playback; 7 tests pass. Stage 1 complete.
2026-11-06 | T036 | capSteps with explicit truncation step preserving the answer; 10 tests pass. Gate 1 PASS.
2026-11-06 | T040 | Flagship Fibonacci module (brute/memo/tabulation, table1d, aligned code, 4 quizzes); 20-seed reference checks pass. Follow-up: FibonacciPage + Lab.
2026-11-06 | T041 | Fibonacci flagship page: ops comparison, table walkthrough, recursion tree with memo collapse; 5 tests pass. Stage 2 complete.
2026-11-06 | T042 | FibonacciLab: n slider, op comparison, reduced-motion-safe autoplay; 7 tests pass. Gate 2 PASS.
2026-11-06 | T100 | Climbing Stairs module; 7 tests pass (20 seeded reference cases).
2026-11-06 | T101 | House Robber module; 7 tests pass.
2026-11-06 | T102 | House Robber II (circle via two linear passes); 8 tests pass.
2026-11-06 | T103 | Min Cost Climbing Stairs module; 7 tests pass.
