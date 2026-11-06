import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface FibonacciInput {
  n: number;
}

const MAX_N = 15;

const pythonCode = [
  'def fib(n):',
  '    dp = [0] * (n + 1)',
  '    dp[0] = 0',
  '    if n >= 1: dp[1] = 1',
  '    for i in range(2, n + 1):',
  '        dp[i] = dp[i - 1] + dp[i - 2]',
  '    return dp[n]',
].join('\n');

const javascriptCode = [
  'function fib(n) {',
  '  const dp = new Array(n + 1).fill(0);',
  '  dp[0] = 0;',
  '  if (n >= 1) dp[1] = 1;',
  '  for (let i = 2; i <= n; i++)',
  '    dp[i] = dp[i - 1] + dp[i - 2];',
  '  return dp[n];',
  '}',
].join('\n');

const cppCode = [
  'int fib(int n) {',
  '  vector<int> dp(n + 1, 0);',
  '  dp[0] = 0;',
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
      labels: Array.from({ length: n + 1 }, (_value, index) => `fib(${index})`),
      indexName: 'i',
      caption: 'Fibonacci table dp[i] = fib(i)',
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
  rec.at(7).record(`The answer is fib(${n}) = ${answer}.`, {
    codeLine: 7,
    highlights: [{ pos: [n], kind: 'result', label: 'answer' }],
    vars: { answer, n, ...extra },
  });
  return [...rec.steps];
}

function dependencyHighlights(i: number): Highlight[] {
  return [
    { pos: [i - 1], kind: 'dependency', label: `fib(${i - 1})` },
    { pos: [i - 2], kind: 'dependency', label: `fib(${i - 2})` },
  ];
}

function bruteForceSteps(n: number): Step[] {
  const rec = makeRecorder(n);
  let calls = 0;
  rec.at(1).record(
    `Brute force: call fib(${n}) recursively with no cache. Overlapping subproblems will be recomputed.`,
    {
      codeLine: 1,
      highlights: [{ pos: [n], kind: 'active', label: `fib(${n})` }],
      vars: { n, calls: 0 },
    },
  );

  const solve = (k: number): number => {
    calls += 1;
    if (k === 0 || k === 1) {
      rec.at(k === 0 ? 3 : 4).fill(
        [k],
        k,
        `Base case: fib(${k}) = ${k}. No recursive calls needed.`,
        {
          kind: 'base',
          codeLine: k === 0 ? 3 : 4,
          vars: { n, calls, k },
        },
      );
      return k;
    }
    const left = solve(k - 1);
    const right = solve(k - 2);
    const value = left + right;
    rec.at(6).fill(
      [k],
      value,
      `Recomputed fib(${k}) = fib(${k - 1}) + fib(${k - 2}) = ${left} + ${right} = ${value}. Nothing was remembered.`,
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
      ? `Memoization: cache each fib(i) once. Look up cached fib(i-1) and fib(i-2) to build larger values.`
      : `Tabulation: build the table bottom-up from fib(0). Smaller cells are final before larger ones.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { n, computed: 0, reused: 0 },
    },
  );

  dp[0] = 0;
  rec.at(3).fill([0], 0, 'Base case: fib(0) = 0.', {
    kind: 'base',
    codeLine: 3,
    vars: { n, computed: 1, reused: 0 },
  });
  computed = 1;

  if (n >= 1) {
    dp[1] = 1;
    rec.at(4).fill([1], 1, 'Base case: fib(1) = 1.', {
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
        ? `Cache hit: reuse fib(${i - 1}) = ${left} and fib(${i - 2}) = ${right}; fib(${i}) = ${left} + ${right} = ${dp[i] ?? 0}.`
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

function normalizeInput(input: FibonacciInput): number {
  const raw = typeof input.n === 'number' && Number.isFinite(input.n) ? Math.trunc(input.n) : 0;
  return clamp(raw, 0, MAX_N);
}

const fibonacciModule: ProblemModule<FibonacciInput> = {
  id: 'fibonacci',
  title: 'Fibonacci Numbers',
  category: '1d',
  difficulty: 'easy',
  summary:
    'Compute fib(n) from fib(n)=fib(n-1)+fib(n-2). Brute force recomputes overlapping subproblems; memoization caches them and tabulation fills the table bottom-up, so each fib(i) is computed once.',
  stateDefinition: 'dp[i] = fib(i), the i-th Fibonacci number, for 0 <= i <= n.',
  recurrence: 'fib(0) = 0; fib(1) = 1; fib(n) = fib(n-1) + fib(n-2) for n >= 2.',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'n',
      label: 'n',
      help: 'Find fib(n). Keep n small to see brute-force overlap.',
      type: 'number',
      min: 0,
      max: MAX_N,
      step: 1,
    },
  ],
  defaultInput: { n: 8 },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: FibonacciInput, mode: Mode): Step[] {
    const n = normalizeInput(input);
    if (mode === 'bruteforce') return bruteForceSteps(n);
    if (mode === 'memo') return iterativeSteps(n, true);
    return iterativeSteps(n, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is fib(0)?',
      options: ['0', '1', '10', '2'],
      answer: 0,
      why: 'fib(0) = 0 by definition, the first base case.',
    },
    {
      q: 'What is fib(10)?',
      options: ['55', '45', '65', '100'],
      answer: 0,
      why: 'The sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 gives fib(10) = 55.',
    },
    {
      q: 'In brute-force fib(5), how many times is fib(3) computed?',
      options: ['Twice', 'Once', 'Never', 'Three times'],
      answer: 0,
      why: 'fib(5) calls fib(4) and fib(3); fib(4) calls fib(3) again, so fib(3) is computed twice.',
    },
    {
      q: 'How do memoization/tabulation compare to brute force on fib(n)?',
      options: ['O(n) vs O(2^n)', 'O(n^2) vs O(n)', 'The same', 'O(1) vs O(n)'],
      answer: 0,
      why: 'Caching computes each fib(i) once in O(n); brute force recomputes overlapping calls, giving exponential time.',
    },
  ],
};

export default fibonacciModule;
