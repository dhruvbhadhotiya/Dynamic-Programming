import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface ClimbingStairsInput {
  n: number;
}

const MAX_N = 20;

const pythonCode = [
  'def climb(n):',
  '    dp = [0] * (n + 1)',
  '    dp[0] = 1',
  '    if n >= 1: dp[1] = 1',
  '    for i in range(2, n + 1):',
  '        dp[i] = dp[i - 1] + dp[i - 2]',
  '    return dp[n]',
].join('\n');

const javascriptCode = [
  'function climb(n) {',
  '  const dp = new Array(n + 1).fill(0);',
  '  dp[0] = 1;',
  '  if (n >= 1) dp[1] = 1;',
  '  for (let i = 2; i <= n; i++)',
  '    dp[i] = dp[i - 1] + dp[i - 2];',
  '  return dp[n];',
  '}',
].join('\n');

const cppCode = [
  'int climb(int n) {',
  '  vector<int> dp(n + 1, 0);',
  '  dp[0] = 1;',
  '  if (n >= 1) dp[1] = 1;',
  '  for (int i = 2; i <= n; i++)',
  '    dp[i] = dp[i-1] + dp[i-2];',
  '  return dp[n];',
  '}',
].join('\n');

function makeRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n + 1 }, () => null),
      labels: Array.from({ length: n + 1 }, (_value, index) => `ways(${index})`),
      indexName: 'i',
      caption: 'Climbing-stairs table dp[i] = ways to reach step i',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  n: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(7).record(`The answer is ways(${n}) = ${answer}.`, {
    codeLine: 7,
    highlights: [{ pos: [n], kind: 'result', label: 'answer' }],
    vars: { answer, n, ...extra },
  });
  return [...rec.steps];
}

function dependencyHighlights(i: number): Highlight[] {
  return [
    { pos: [i - 1], kind: 'dependency', label: `ways(${i - 1})` },
    { pos: [i - 2], kind: 'dependency', label: `ways(${i - 2})` },
  ];
}

function bruteForceSteps(n: number): Step[] {
  const rec = makeRecorder(n);
  let calls = 0;
  rec.at(1).record(
    `Brute force: call ways(${n}) recursively with no cache. Overlapping subproblems will be recomputed.`,
    {
      codeLine: 1,
      highlights: [{ pos: [n], kind: 'active', label: `ways(${n})` }],
      vars: { n, calls: 0 },
    },
  );

  const solve = (k: number): number => {
    calls += 1;
    if (k === 0 || k === 1) {
      rec.at(k === 0 ? 3 : 4).fill(
        [k],
        1,
        k === 0
          ? 'Base case: ways(0) = 1 (one way to stand at the ground). No recursive calls needed.'
          : 'Base case: ways(1) = 1 (one single step). No recursive calls needed.',
        {
          kind: 'base',
          codeLine: k === 0 ? 3 : 4,
          vars: { n, calls, k },
        },
      );
      return 1;
    }
    const left = solve(k - 1);
    const right = solve(k - 2);
    const value = left + right;
    rec.at(6).fill(
      [k],
      value,
      `Recomputed ways(${k}) = ways(${k - 1}) + ways(${k - 2}) = ${left} + ${right} = ${value}. Nothing was remembered.`,
      {
        codeLine: 6,
        highlights: dependencyHighlights(k),
        vars: { n, calls, k },
      },
    );
    return value;
  };

  const answer = solve(n);
  return finish(rec, n, answer, { calls });
}

function iterativeSteps(n: number, memo: boolean): Step[] {
  const rec = makeRecorder(n);
  const dp: number[] = Array.from({ length: n + 1 }, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? `Memoization: cache each ways(i) once. Look up cached ways(i-1) and ways(i-2) to build larger values.`
      : `Tabulation: build the table bottom-up from ways(0). Smaller cells are final before larger ones.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { n, computed: 0, reused: 0 },
    },
  );

  dp[0] = 1;
  rec.at(3).fill([0], 1, 'Base case: ways(0) = 1 — one way to stand at the ground.', {
    kind: 'base',
    codeLine: 3,
    vars: { n, computed: 1, reused: 0 },
  });
  computed = 1;

  if (n >= 1) {
    dp[1] = 1;
    rec.at(4).fill([1], 1, 'Base case: ways(1) = 1 — one single step.', {
      kind: 'base',
      codeLine: 4,
      vars: { n, computed: 2, reused: 0 },
    });
    computed = 2;
  }

  for (let i = 2; i <= n; i += 1) {
    const left = dp[i - 1] ?? 0;
    const right = dp[i - 2] ?? 0;
    dp[i] = left + right;
    computed += 1;
    reused += 2;
    rec.at(6).fill(
      [i],
      dp[i] ?? 0,
      memo
        ? `Cache hit: reuse ways(${i - 1}) = ${left} and ways(${i - 2}) = ${right}; ways(${i}) = ${left} + ${right} = ${dp[i] ?? 0}.`
        : `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${left} + ${right} = ${dp[i] ?? 0}. Both dependencies are already final.`,
      {
        codeLine: 6,
        highlights: dependencyHighlights(i),
        vars: { n, computed, reused, i },
      },
    );
  }

  return finish(rec, n, dp[n] ?? 0, { computed, reused });
}

function normalizeInput(input: ClimbingStairsInput): number {
  const raw = typeof input.n === 'number' && Number.isFinite(input.n) ? Math.trunc(input.n) : 1;
  return clamp(raw, 1, MAX_N);
}

const climbingStairsModule: ProblemModule<ClimbingStairsInput> = {
  id: 'climbing-stairs',
  title: 'Climbing Stairs',
  category: '1d',
  difficulty: 'easy',
  summary:
    'Count the distinct ways to climb n steps taking 1 or 2 at a time. Brute force recomputes overlapping subproblems; memoization caches them and tabulation fills the table bottom-up, so each ways(i) is computed once.',
  stateDefinition: 'dp[i] = ways(i), the number of distinct ways to reach step i, for 0 <= i <= n.',
  recurrence: 'ways(0) = 1; ways(1) = 1; ways(n) = ways(n-1) + ways(n-2) for n >= 2.',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'n',
      label: 'n',
      help: 'Find ways(n). Keep n small to see brute-force overlap.',
      type: 'number',
      min: 1,
      max: MAX_N,
      step: 1,
    },
  ],
  defaultInput: { n: 5 },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: ClimbingStairsInput, mode: Mode): Step[] {
    const n = normalizeInput(input);
    if (mode === 'bruteforce') return bruteForceSteps(n);
    if (mode === 'memo') return iterativeSteps(n, true);
    return iterativeSteps(n, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'How many distinct ways are there to climb 3 steps (taking 1 or 2 at a time)?',
      options: ['3', '2', '4', '6'],
      answer: 0,
      why: 'The ways are 1+1+1, 1+2 and 2+1, so ways(3) = 3.',
    },
    {
      q: 'What is ways(5), the number of ways to climb 5 steps?',
      options: ['7', '8', '5', '13'],
      answer: 1,
      why: 'ways(1)=1, ways(2)=2, ways(3)=3, ways(4)=5, ways(5)=5+3=8.',
    },
    {
      q: 'In brute-force ways(4), how many times is ways(2) computed?',
      options: ['Twice', 'Once', 'Never', 'Three times'],
      answer: 0,
      why: 'ways(4) calls ways(3) and ways(2); ways(3) calls ways(2) again, so ways(2) is computed twice.',
    },
    {
      q: 'How do memoization/tabulation compare to brute force on climbing stairs?',
      options: ['O(n) vs O(2^n)', 'O(n^2) vs O(n)', 'The same', 'O(1) vs O(n)'],
      answer: 0,
      why: 'Caching computes each ways(i) once in O(n); brute force recomputes overlapping calls, giving exponential time.',
    },
  ],
};

export default climbingStairsModule;
