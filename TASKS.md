# TASKS — DP Playground

Single source of truth. Status: `[ ]` todo, `[~]` in progress, `[x]` finished + verified.
Format: `- [ ] T012 | owner files | description`. Only the current task may be `[~]`.
Read AGENTS.md, this file, and the last 20 lines of PROGRESS.md at session start.

## Stage 0 — Scaffold
- [x] T001 | package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, index.html, .gitignore, .npmrc | Init git, Vite+React+TS strict, all npm scripts, install fixed deps.
- [x] T002 | tailwind.config.ts, postcss.config.js, eslint.config.js, playwright.config.ts, vitest.setup.ts | Configure Tailwind, ESLint, Vitest, Playwright.
- [x] T003 | AGENTS.md, DECISIONS.md, PROGRESS.md | Write agent contract, decisions, progress log (TASKS.md exists).
- [x] T004 | src/main.tsx, src/App.tsx, src/app/routes.tsx, src/components/AppShell.tsx, src/components/RouteError.tsx, src/pages/PlaceholderPage.tsx, src/styles/globals.css (stub) | App bootstrap, hash router, lazy page routes, global error boundary.
- [x] T005 | src/styles/tokens.ts, src/styles/globals.css, vite.config.ts (test no-files flag) | Design tokens, light/dark tokens, base utility and focus styles.

Gate 0: `npm run typecheck && npm run lint && npm test && npm run build` pass; commit.

## Stage 1 — Shared Engine
- [x] T010 | src/engine/types.ts, src/engine/types.test.ts | Engine types, renderer state contracts, input field schema, step validation helpers.
- [x] T011 | src/engine/dpHelpers.ts, src/engine/dpHelpers.test.ts | StepRecorder class, table creation, immutable snapshots, clamp/cap helpers.
- [x] T012 | src/engine/usePlayer.ts, src/engine/usePlayer.test.ts | Zustand player: play/pause/step/reset/scrub/speed/keyboard, max steps.
- [x] T013 | src/components/PlayerControls.tsx, src/components/PlayerControls.test.tsx, vitest.setup.ts (cleanup) | Transport, scrubber, speed 0.25–4x, keyboard hints.
- [x] T014 | src/renderers/Table1D.tsx, src/renderers/Table1D.test.tsx | 1D table renderer with states, icons, labels, answer.
- [x] T015 | src/renderers/Table2D.tsx, src/renderers/Table2D.test.tsx | 2D table with row/col labels, dependency arrows, states, compact mode.
- [x] T016 | src/renderers/StringAlign.tsx, src/renderers/StringAlign.test.tsx | Two-sequence alignment renderer built on shared cell states.
- [x] T017 | src/renderers/RecursionTree.tsx, src/renderers/RecursionTree.test.tsx | Tree layout, memo-hit distinction, pruning, focus path.
- [x] T018 | src/components/CodePanel.tsx, src/components/CodePanel.test.tsx, src/types/prism.d.ts | Prism-powered Python/JS/C++ tabs, live line highlight, copy.
- [x] T019 | src/components/InfoPanels.tsx, src/components/InfoPanels.test.tsx | VariableWatch, ExplanationBar, StepCounter.
- [x] T020 | src/components/InputForm.tsx, src/components/InputForm.test.tsx, src/engine/inputValidation.ts, src/engine/inputValidation.test.ts | Schema-driven inputs, validation, size limits, randomize.
- [x] T021 | src/components/ModeToggle.tsx, src/components/ModeToggle.test.tsx | Brute/memo/tabulation toggle + live operation counter.
- [x] T022 | src/components/PredictMode.tsx, src/components/PredictMode.test.tsx | Next-cell prediction, hints, score, keyboard entry.
- [x] T023 | src/components/QuizEngine.tsx, src/components/QuizEngine.test.tsx | Quiz flow, explanations, localStorage score.
- [x] T024 | src/engine/registry.ts, src/engine/registry.test.ts | import.meta.glob auto-registration, validation, category metadata.
- [x] T025 | src/pages/ProblemPage.tsx, src/pages/ProblemPage.test.tsx | Generic problem page assembling engine; handles modes/input/predict/quiz.
- [x] T026 | src/pages/HomePage.tsx, src/pages/HomePage.test.tsx | Roadmap, search/filter, saved progress, teacher entry.
- [x] T027 | src/engine/teacherMode.ts, src/components/TeacherBar.tsx, src/engine/teacherMode.test.ts | Teacher mode: large fonts, hide code, fullscreen.
- [x] T028 | src/pages/CheatSheetPage.tsx, src/pages/CheatSheetPage.test.tsx | Printable cheat sheet from module metadata.
- [x] T029 | src/renderers/DagGraph.tsx, src/renderers/DagGraph.test.tsx | DAG renderer with shortest/longest path highlighting.
- [x] T030 | src/renderers/BitmaskGrid.tsx, src/renderers/BitmaskGrid.test.tsx | Bitmask/subsets renderer.
- [x] T031 | src/renderers/IntervalTriangle.tsx, src/renderers/IntervalTriangle.test.tsx | Interval DP triangle renderer.
- [x] T032 | src/renderers/TreeDP.tsx, src/renderers/TreeDP.test.tsx | Tree DP renderer with per-node state.
- [x] T033 | src/components/ErrorBoundary.tsx, src/components/ErrorBoundary.test.tsx | Per-page error boundary and friendly fallback.
- [x] T034 | src/engine/testUtils.ts, src/engine/random.ts, src/engine/random.test.ts | Seeded RNG, random-case helper, independent reference harness for module tests.
- [x] T035 | src/engine/lessonTypes.ts, src/pages/LessonPage.tsx, src/pages/LessonPage.test.tsx | Lesson data model and generic lesson page with animated diagram.
- [x] T036 | src/engine/stepCap.ts, src/engine/stepCap.test.ts | Cap huge step lists with explicit truncation step; no silent loss.

Gate 1: PASS — typecheck + lint + 165 tests + build green (2026-11-06).

Gate 1: build, typecheck, lint, all engine tests pass; no `any`/ts-ignore.

## Stage 2 — Flagship Fibonacci
- [x] T040 | src/problems/1d/fibonacci.problem.ts, src/problems/1d/fibonacci.problem.test.ts | Fibonacci module: brute tree, memo, tabulation, 3+ quizzes, aligned code.
- [x] T041 | src/pages/FibonacciPage.tsx, src/pages/FibonacciPage.test.tsx | Flagship visual story: exponential tree collapsing into linear table, memo vs tabulation.
- [x] T042 | src/components/FibonacciLab.tsx, src/components/FibonacciLab.test.tsx | Interactive n slider, operation comparison, auto-play walkthrough.

Gate 2: PASS — full suite (184 tests) + build green; note: routes still point at placeholders, page wiring deferred to final pass.

Gate 2: full suite and build pass; flagship route works from static build.

## Stage 3 — Problems And Lessons
### 3a 1D DP
- [x] T100 | src/problems/1d/climbing-stairs.problem.ts, src/problems/1d/climbing-stairs.problem.test.ts | Climbing Stairs.
- [x] T101 | src/problems/1d/house-robber.problem.ts, src/problems/1d/house-robber.problem.test.ts | House Robber.
- [x] T102 | src/problems/1d/house-robber-ii.problem.ts, src/problems/1d/house-robber-ii.problem.test.ts | House Robber II.
- [x] T103 | src/problems/1d/min-cost-climbing-stairs.problem.ts, src/problems/1d/min-cost-climbing-stairs.problem.test.ts | Min Cost Climbing Stairs.
- [x] T104 | src/problems/1d/decode-ways.problem.ts, src/problems/1d/decode-ways.problem.test.ts | Decode Ways.
- [x] T105 | src/problems/1d/kadane.problem.ts, src/problems/1d/kadane.problem.test.ts | Maximum Subarray (Kadane).
- [x] T106 | src/problems/1d/jump-game.problem.ts, src/problems/1d/jump-game.problem.test.ts | Jump Game.
- [x] T107 | src/problems/1d/lis-quadratic.problem.ts, src/problems/1d/lis-quadratic.problem.test.ts | Longest Increasing Subsequence O(n²).
- [x] T108 | src/problems/1d/lis-binary.problem.ts, src/problems/1d/lis-binary.problem.test.ts | Longest Increasing Subsequence O(n log n).
- [x] T109 | src/lessons/1d.lesson.ts | 1D DP lesson with animated stairs diagram.
### 3b Knapsack
- [x] T110 | src/problems/knapsack/zero-one-knapsack.problem.ts, src/problems/knapsack/zero-one-knapsack.problem.test.ts | 0/1 Knapsack.
- [x] T111 | src/problems/knapsack/subset-sum.problem.ts, src/problems/knapsack/subset-sum.problem.test.ts | Subset Sum.
- [x] T112 | src/problems/knapsack/partition-equal-subset.problem.ts, src/problems/knapsack/partition-equal-subset.problem.test.ts | Partition Equal Subset Sum.
- [x] T113 | src/problems/knapsack/target-sum.problem.ts, src/problems/knapsack/target-sum.problem.test.ts | Target Sum.
- [x] T114 | src/problems/knapsack/unbounded-knapsack.problem.ts, src/problems/knapsack/unbounded-knapsack.problem.test.ts | Unbounded Knapsack.
- [x] T115 | src/problems/knapsack/coin-change.problem.ts, src/problems/knapsack/coin-change.problem.test.ts | Coin Change (min coins).
- [x] T116 | src/problems/knapsack/coin-change-ii.problem.ts, src/problems/knapsack/coin-change-ii.problem.test.ts | Coin Change II (ways).
- [x] T117 | src/problems/knapsack/rod-cutting.problem.ts, src/problems/knapsack/rod-cutting.problem.test.ts | Rod Cutting.
- [x] T118 | src/lessons/knapsack.lesson.ts | Knapsack lesson with animated capacity row.
### 3c Strings
- [x] T120 | src/problems/strings/lcs.problem.ts, src/problems/strings/lcs.problem.test.ts | Longest Common Subsequence.
- [x] T121 | src/problems/strings/longest-common-substring.problem.ts, src/problems/strings/longest-common-substring.problem.test.ts | Longest Common Substring.
- [x] T122 | src/problems/strings/longest-palindromic-subsequence.problem.ts, src/problems/strings/longest-palindromic-subsequence.problem.test.ts | Longest Palindromic Subsequence.
- [x] T123 | src/problems/strings/edit-distance.problem.ts, src/problems/strings/edit-distance.problem.test.ts | Edit Distance.
- [x] T124 | src/problems/strings/distinct-subsequences.problem.ts, src/problems/strings/distinct-subsequences.problem.test.ts | Distinct Subsequences.
- [x] T125 | src/problems/strings/wildcard-matching.problem.ts, src/problems/strings/wildcard-matching.problem.test.ts | Wildcard Matching.
- [x] T126 | src/problems/strings/shortest-common-supersequence.problem.ts, src/problems/strings/shortest-common-supersequence.problem.test.ts | Shortest Common Supersequence.
- [x] T127 | src/lessons/strings.lesson.ts | Strings lesson with animated alignment.
### 3d Grid
- [x] T130 | src/problems/grid/unique-paths.problem.ts, src/problems/grid/unique-paths.problem.test.ts | Unique Paths.
- [x] T131 | src/problems/grid/unique-paths-ii.problem.ts, src/problems/grid/unique-paths-ii.problem.test.ts | Unique Paths with Obstacles.
- [x] T132 | src/problems/grid/min-path-sum.problem.ts, src/problems/grid/min-path-sum.problem.test.ts | Minimum Path Sum.
- [x] T133 | src/problems/grid/triangle.problem.ts, src/problems/grid/triangle.problem.test.ts | Triangle.
- [x] T134 | src/problems/grid/maximal-square.problem.ts, src/problems/grid/maximal-square.problem.test.ts | Maximal Square.
- [x] T135 | src/problems/grid/dungeon-game.problem.ts, src/problems/grid/dungeon-game.problem.test.ts | Dungeon Game.
- [x] T136 | src/lessons/grid.lesson.ts | Grid DP lesson with animated path.
### 3e Stocks
- [x] T140 | src/problems/stocks/stock-i.problem.ts, src/problems/stocks/stock-i.problem.test.ts | Best Time to Buy/Sell Stock I.
- [x] T141 | src/problems/stocks/stock-ii.problem.ts, src/problems/stocks/stock-ii.problem.test.ts | Stock II.
- [x] T142 | src/problems/stocks/stock-iii.problem.ts, src/problems/stocks/stock-iii.problem.test.ts | Stock III.
- [x] T143 | src/problems/stocks/stock-iv.problem.ts, src/problems/stocks/stock-iv.problem.test.ts | Stock IV.
- [x] T144 | src/problems/stocks/stock-cooldown.problem.ts, src/problems/stocks/stock-cooldown.problem.test.ts | Stock with Cooldown.
- [x] T145 | src/problems/stocks/stock-fee.problem.ts, src/problems/stocks/stock-fee.problem.test.ts | Stock with Transaction Fee.
- [x] T146 | src/lessons/stocks.lesson.ts | State-machine lesson with animated states.
### 3f Intervals
- [x] T150 | src/problems/intervals/matrix-chain.problem.ts, src/problems/intervals/matrix-chain.problem.test.ts | Matrix Chain Multiplication.
- [x] T151 | src/problems/intervals/burst-balloons.problem.ts, src/problems/intervals/burst-balloons.problem.test.ts | Burst Balloons.
- [x] T152 | src/problems/intervals/min-cost-cut-stick.problem.ts, src/problems/intervals/min-cost-cut-stick.problem.test.ts | Minimum Cost to Cut a Stick.
- [x] T153 | src/problems/intervals/palindrome-partition-ii.problem.ts, src/problems/intervals/palindrome-partition-ii.problem.test.ts | Palindrome Partitioning II.
- [x] T154 | src/problems/intervals/word-break.problem.ts, src/problems/intervals/word-break.problem.test.ts | Word Break.
- [x] T155 | src/problems/intervals/split-array-largest-sum.problem.ts, src/problems/intervals/split-array-largest-sum.problem.test.ts | Split Array Largest Sum.
- [x] T156 | src/lessons/intervals.lesson.ts | Interval DP lesson with triangle diagram.
### 3g Bitmask
- [x] T160 | src/problems/bitmask/tsp.problem.ts, src/problems/bitmask/tsp.problem.test.ts | TSP Held-Karp.
- [x] T161 | src/problems/bitmask/assignment.problem.ts, src/problems/bitmask/assignment.problem.test.ts | Assignment Problem.
- [x] T162 | src/problems/bitmask/shortest-path-all-nodes.problem.ts, src/problems/bitmask/shortest-path-all-nodes.problem.test.ts | Shortest Path Visiting All Nodes.
- [x] T163 | src/lessons/bitmask.lesson.ts | Bitmask lesson with animated subset grid.
### 3h Tree DP
- [ ] T170 | src/problems/tree/tree-diameter.problem.ts, src/problems/tree/tree-diameter.problem.test.ts | Binary Tree Diameter.
- [ ] T171 | src/problems/tree/max-independent-set.problem.ts, src/problems/tree/max-independent-set.problem.test.ts | Maximum Independent Set on Tree.
- [ ] T172 | src/problems/tree/house-robber-iii.problem.ts, src/problems/tree/house-robber-iii.problem.test.ts | House Robber III.
- [ ] T173 | src/problems/tree/rerooting.problem.ts, src/problems/tree/rerooting.problem.test.ts | Tree Rerooting.
- [ ] T174 | src/problems/tree/binary-tree-cameras.problem.ts, src/problems/tree/binary-tree-cameras.problem.test.ts | Binary Tree Cameras.
- [ ] T175 | src/lessons/tree-dp.lesson.ts | Tree DP lesson with animated post-order.
### 3i Graphs
- [ ] T180 | src/problems/graphs/dag-longest-path.problem.ts, src/problems/graphs/dag-longest-path.problem.test.ts | Longest Path in DAG.
- [ ] T181 | src/problems/graphs/floyd-warshall.problem.ts, src/problems/graphs/floyd-warshall.problem.test.ts | Floyd–Warshall.
- [ ] T182 | src/problems/graphs/bellman-ford.problem.ts, src/problems/graphs/bellman-ford.problem.test.ts | Bellman–Ford.
- [ ] T183 | src/problems/graphs/cheapest-flights-k-stops.problem.ts, src/problems/graphs/cheapest-flights-k-stops.problem.test.ts | Cheapest Flights Within K Stops.
- [ ] T184 | src/lessons/graphs.lesson.ts | Graph DP lesson with animated DAG.
### 3j Counting / Probability / Games
- [ ] T190 | src/problems/counting/unique-bsts.problem.ts, src/problems/counting/unique-bsts.problem.test.ts | Unique Binary Search Trees.
- [ ] T191 | src/problems/counting/dice-sums.problem.ts, src/problems/counting/dice-sums.problem.test.ts | Number of Dice Rolls With Target Sum.
- [ ] T192 | src/problems/counting/knight-probability.problem.ts, src/problems/counting/knight-probability.problem.test.ts | Knight Probability in Chessboard.
- [ ] T193 | src/problems/counting/predict-the-winner.problem.ts, src/problems/counting/predict-the-winner.problem.test.ts | Predict the Winner.
- [ ] T194 | src/problems/counting/stone-game.problem.ts, src/problems/counting/stone-game.problem.test.ts | Stone Game.
- [ ] T195 | src/problems/counting/digit-dp.problem.ts, src/problems/counting/digit-dp.problem.test.ts | Digit DP: count numbers with no 4.
- [ ] T196 | src/lessons/counting.lesson.ts | Counting/game DP lesson with animated states.
### 3k Advanced (optional, last)
- [ ] T200 | src/problems/advanced/prefix-sum-optimization.problem.ts, src/problems/advanced/prefix-sum-optimization.problem.test.ts | Prefix-sum optimization.
- [ ] T201 | src/problems/advanced/monotonic-queue.problem.ts, src/problems/advanced/monotonic-queue.problem.test.ts | Monotonic queue DP.
- [ ] T202 | src/problems/advanced/sos-dp.problem.ts, src/problems/advanced/sos-dp.problem.test.ts | Sum over subsets DP.
- [ ] T203 | src/problems/advanced/matrix-exponentiation.problem.ts, src/problems/advanced/matrix-exponentiation.problem.test.ts | Matrix exponentiation.

Gate 3 per category: each module test passes; app builds; code-line ranges valid.

## Stage 4 — Review (one per category)
- [ ] T210 | src/problems/1d/*, src/lessons/1d.lesson.ts | Review 1D: correctness, wording, line alignment.
- [ ] T211 | src/problems/knapsack/*, src/lessons/knapsack.lesson.ts | Review Knapsack.
- [ ] T212 | src/problems/strings/*, src/lessons/strings.lesson.ts | Review Strings.
- [ ] T213 | src/problems/grid/*, src/lessons/grid.lesson.ts | Review Grid.
- [ ] T214 | src/problems/stocks/*, src/lessons/stocks.lesson.ts | Review Stocks.
- [ ] T215 | src/problems/intervals/*, src/lessons/intervals.lesson.ts | Review Intervals.
- [ ] T216 | src/problems/bitmask/*, src/lessons/bitmask.lesson.ts | Review Bitmask.
- [ ] T217 | src/problems/tree/*, src/lessons/tree-dp.lesson.ts | Review Tree DP.
- [ ] T218 | src/problems/graphs/*, src/lessons/graphs.lesson.ts | Review Graphs.
- [ ] T219 | src/problems/counting/*, src/lessons/counting.lesson.ts | Review Counting.
- [ ] T220 | src/problems/advanced/* | Review Advanced (if built).

## Stage 5 — Polish
- [ ] T230 | src/styles/globals.css, src/components/*, src/pages/* | Accessibility and responsive layout: phone/tablet/projector.
- [ ] T231 | src/renderers/*, src/engine/usePlayer.ts | Performance: cap steps, compact tables, no layout thrash.
- [ ] T232 | e2e/smoke.spec.ts | Playwright smoke per problem page: load/play/predict/no console errors.
- [ ] T233 | README.md | Run, build, deploy, add problem in 10 minutes.
- [ ] T234 | REPORT.md | Built, cut, limitations.
- [ ] T235 | all | Final gate: every task done, typecheck/lint/test/build/e2e pass, static build preview.

Gate 5 = DONE.
