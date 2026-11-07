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
2026-11-06 | T104 | Decode Ways module; 7 tests pass.
2026-11-06 | T105 | Maximum Subarray (Kadane) module; 7 tests pass.
2026-11-06 | T106 | Jump Game module; 7 tests pass.
2026-11-06 | T107 | LIS O(n²) module; 7 tests pass.
2026-11-06 | T108 | LIS O(n log n) (tails/patience) module; 6 tests pass. 1D category complete.
2026-11-06 | T109 | 1D DP lesson with tabulation diagram; registry validation clean.
2026-11-06 | T110 | 0/1 Knapsack (table2d) module; 7 tests pass.
2026-11-06 | T111 | Subset Sum module; 6 tests pass.
2026-11-06 | T112 | Partition Equal Subset Sum module; 7 tests pass.
2026-11-06 | T118 | Knapsack lesson with item×capacity diagram; validation clean.
2026-11-06 | T113 | Target Sum module; 6 tests pass.
2026-11-06 | T114 | Unbounded Knapsack module; 7 tests pass.
2026-11-06 | T115 | Coin Change (min coins) module; 6 tests pass.
2026-11-06 | T116 | Coin Change II (ways) module; 6 tests pass.
2026-11-06 | T117 | Rod Cutting module; 6 tests pass. Knapsack category complete.
2026-11-06 | T120 | LCS module (stringAlign); 6 tests pass.
2026-11-06 | T121 | Longest Common Substring module; 6 tests pass.
2026-11-06 | T122 | Longest Palindromic Subsequence module; 6 tests pass.
2026-11-06 | T123 | Edit Distance module; 6 tests pass.
2026-11-06 | T124 | Distinct Subsequences module; 6 tests pass.
2026-11-06 | T125 | Wildcard Matching module; 6 tests pass.
2026-11-06 | T126 | Shortest Common Supersequence module; 7 tests pass.
2026-11-06 | T127 | String DP lesson with LCS alignment diagram; validation clean. Strings category complete.
2026-11-06 | T130 | Unique Paths module; 6 tests pass.
2026-11-06 | T131 | Unique Paths II module; 6 tests pass.
2026-11-06 | T132 | Minimum Path Sum module; 6 tests pass.
2026-11-06 | T133 | Triangle module (rectangular-safe padded input); 6 tests pass.
2026-11-06 | T134 | Maximal Square module; 6 tests pass.
2026-11-06 | T135 | Dungeon Game module; 6 tests pass.
2026-11-06 | T136 | Grid DP lesson with min-path diagram; validation clean. Grid category complete.
2026-11-06 | T140 | Stock I module; 6 tests pass.
2026-11-06 | T141 | Stock II module; 6 tests pass.
2026-11-06 | T142 | Stock III module; 6 tests pass.
2026-11-06 | T143 | Stock IV (max k transactions) module; 6 tests pass.
2026-11-06 | T144 | Stock with Cooldown module; 6 tests pass.
2026-11-06 | T145 | Stock with Transaction Fee module; 6 tests pass.
2026-11-06 | T146 | Stock state-machine lesson with cooldown diagram; validation clean. Stocks category complete.
2026-11-06 | T150 | Matrix Chain Multiplication interval DP module; 6 tests pass (exhaustive reference). Follow-up: Burst Balloons (T151).
2026-11-06 | T151 | Burst Balloons (last-balloon interval DP) module; 6 tests pass (burst-order reference). Follow-up: Min Cost to Cut a Stick (T152).
2026-11-06 | T152 | Minimum Cost to Cut a Stick module; 6 tests pass (cut-order reference). Follow-up: Palindrome Partitioning II (T153).
2026-11-06 | T153 | Palindrome Partitioning II interval DP module; 6 tests pass (cut-subset reference). Follow-up: Word Break (T154).
2026-11-06 | T154 | Word Break suffix DP module with brute-force/memo/tabulation modes; 7 tests pass (cut-subset reference). Follow-up: Split Array Largest Sum (T155).
2026-11-06 | T155 | Split Array Largest Sum table DP module (memo/tabulation); 6 tests pass (exhaustive cut reference). Follow-up: intervals lesson (T156).
2026-11-06 | T156 | Interval DP lesson with animated 3-matrix triangle; 12 steps, validation clean. Intervals category complete. Follow-up: bitmask TSP (T160).
2026-11-06 | T160 | TSP Held-Karp module with mask x last table; 6 tests pass (permutation reference). Follow-up: Assignment Problem (T161).
2026-11-06 | T161 | Assignment Problem bitmask DP module; 6 tests pass (job-permutation reference). Follow-up: Shortest Path Visiting All Nodes (T162).
2026-11-06 | T162 | Shortest Path Visiting All Nodes BFS-over-(mask,node) module; 5 tests pass (Floyd-Warshall + visit-order reference). Follow-up: bitmask lesson (T163).
2026-11-06 | T163 | Bitmask DP lesson with animated assignment subset grid; 10 steps, validation clean. Bitmask category complete. Follow-up: tree diameter (T170).
2026-11-06 | T170 | Binary Tree Diameter post-order module with memo/tabulation modes; 6 tests pass (all-pairs BFS reference). Follow-up: Maximum Independent Set on Tree (T171).
2026-11-06 | T171 | Maximum Independent Set on Tree (weighted, forests supported) with memo/tabulation modes; 6 tests pass (exhaustive subset reference). Follow-up: House Robber III (T172).
2026-11-06 | T172 | House Robber III binary-tree DP with memo/tabulation modes; 6 tests pass (exhaustive subset reference). Follow-up: Tree Rerooting (T173).
2026-11-06 | T173 | Tree Rerooting (best meeting node) with two-pass size/total DP; 6 tests pass (all-pairs BFS reference). Follow-up: Binary Tree Cameras (T174).
2026-11-06 | T174 | Binary Tree Cameras three-state post-order greedy with memo/tabulation modes; 6 tests pass (exhaustive camera-subset reference). Follow-up: tree DP lesson (T175).
2026-11-06 | T175 | Tree DP lesson with animated 7-node rob/skip post-order; 9 steps, final answer 12, validation clean. Tree category complete. Follow-up: DAG longest path (T180).
2026-11-07 | T180 | Longest Path in DAG with memo/tabulation, path reconstruction, and scoped node/edge highlights; 15 targeted tests pass, typecheck + lint clean. Follow-up: Floyd-Warshall (T181).
2026-11-07 | T181 | Floyd-Warshall all-pairs table with in-place relaxation rounds; 6 tests pass (Dijkstra reference). Follow-up: Bellman-Ford (T182).
2026-11-07 | T182 | Bellman-Ford with negative edges, early convergence, and reachable negative-cycle detection; 6 tests pass (Floyd-Warshall reference). Follow-up: Cheapest Flights Within K Stops (T183).
