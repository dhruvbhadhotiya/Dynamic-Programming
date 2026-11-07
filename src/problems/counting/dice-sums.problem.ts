import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface DiceSumsInput {
  n: number;
  k: number;
  target: number;
}

const MAX_DICE = 4;
const MIN_FACES = 2;
const MAX_FACES = 6;
const MAX_TARGET = 18;

const pythonCode = [
  'def dice_sums(n, k, target):',
  '    dp = [[0] * (target + 1) for _ in range(n + 1)]',
  '    dp[0][0] = 1',
  '    for d in range(1, n + 1):',
  '        for s in range(target + 1):',
  '            for face in range(1, k + 1):',
  '                if s - face >= 0: dp[d][s] += dp[d - 1][s - face]',
  '    return dp[n][target]',
].join('\n');

const javascriptCode = [
  'function diceSums(n, k, target) {',
  '  const dp = Array.from({ length: n + 1 }, () => new Array(target + 1).fill(0));',
  '  dp[0][0] = 1;',
  '  for (let d = 1; d <= n; d++)',
  '    for (let s = 0; s <= target; s++)',
  '      for (let face = 1; face <= k; face++)',
  '        if (s - face >= 0) dp[d][s] += dp[d - 1][s - face];',
  '  return dp[n][target];',
  '}',
].join('\n');

const cppCode = [
  'int dice_sums(int n, int k, int target) {',
  '  vector<vector<int>> dp(n + 1, vector<int>(target + 1, 0));',
  '  dp[0][0] = 1;',
  '  for (int d = 1; d <= n; d++)',
  '    for (int s = 0; s <= target; s++)',
  '      for (int face = 1; face <= k; face++)',
  '        if (s - face >= 0) dp[d][s] += dp[d-1][s-face];',
  '  return dp[n][target];',
  '}',
].join('\n');

function makeRecorder(n: number, target: number): StepRecorder<Table2DState> {
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D(n + 1, target + 1, () => null),
      rowLabels: Array.from({ length: n + 1 }, (_value, d) => `d=${d}`),
      colLabels: Array.from({ length: target + 1 }, (_value, s) => `s=${s}`),
      rowHeader: 'dice d',
      colHeader: 'sum s',
      caption: 'Dice Sums: dp[d][s] = ordered outcomes of exactly d dice that sum to s',
    },
    { codeLine: 1 },
  );
}

/** Fills the base row and returns the number of cells recorded. */
function recordBaseRow(
  rec: StepRecorder<Table2DState>,
  n: number,
  k: number,
  target: number,
  dp?: number[][],
): number {
  const base = dp?.[0];
  if (base !== undefined) base[0] = 1;
  let computed = 1;
  rec.at(3).fill(
    [0, 0],
    1,
    'Base case: dp[0][0] = 1 — with zero dice there is exactly one way to reach sum 0 (the empty outcome).',
    { kind: 'base', codeLine: 3, vars: { n, k, target, computed } },
  );

  for (let s = 1; s <= target; s += 1) {
    if (base !== undefined) base[s] = 0;
    computed += 1;
    rec.at(3).fill(
      [0, s],
      0,
      `Base case: dp[0][${s}] = 0 — zero dice cannot sum to ${s}.`,
      { kind: 'base', codeLine: 3, vars: { n, k, target, computed, s } },
    );
  }
  return computed;
}

function finish(
  rec: StepRecorder<Table2DState>,
  n: number,
  k: number,
  target: number,
  answer: number,
  computed: number,
  reused: number,
): Step[] {
  const diceWord = n === 1 ? 'die' : 'dice';
  rec.at(8).record(
    `The answer is ${answer}: ${answer} ordered outcome${answer === 1 ? '' : 's'} of ${n} ${k}-sided ${diceWord} sum to ${target}.`,
    {
      codeLine: 8,
      highlights: [{ pos: [n, target], kind: 'result', label: 'answer' }],
      vars: { answer, n, k, target, computed, reused },
    },
  );
  return [...rec.steps];
}

function memoSteps(n: number, k: number, target: number): Step[] {
  const rec = makeRecorder(n, target);
  const memo = new Map<string, number>();
  let reused = 0;

  rec.at(2).record(
    `Memoization: solve count(${n}, ${target}) recursively, caching each (d, s) the first time it is computed so overlapping branches are reused.`,
    {
      codeLine: 2,
      highlights: [{ pos: [n, target], kind: 'active', label: `count(${n}, ${target})` }],
      vars: { n, k, target, computed: 0, reused: 0 },
    },
  );

  let computed = recordBaseRow(rec, n, k, target);

  function solve(d: number, s: number): number {
    if (d === 0) return s === 0 ? 1 : 0;
    if (s < 0) return 0;

    const key = `${d}:${s}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      reused += 1;
      rec.at(7).record(
        `Memo hit: count(${d}, ${s}) = ${cached} is already cached, so reuse it instead of exploring its ${k} face branches.`,
        {
          codeLine: 7,
          highlights: [{ pos: [d, s], kind: 'dependency', label: 'cached' }],
          vars: { n, k, target, computed, reused, d, s, cached },
        },
      );
      return cached;
    }

    let total = 0;
    const parts: string[] = [];
    const deps: Highlight[] = [];
    for (let face = 1; face <= k; face += 1) {
      const prev = s - face;
      if (prev < 0) continue;
      const part = solve(d - 1, prev);
      total += part;
      parts.push(`count(${d - 1}, ${prev}) = ${part}`);
      deps.push({ pos: [d - 1, prev], kind: 'dependency', label: `face ${face}` });
    }

    memo.set(key, total);
    computed += 1;
    const message =
      parts.length === 0
        ? `count(${d}, ${s}) = 0: no face fits because s - face < 0 for every face 1..${k}. Cache it.`
        : `count(${d}, ${s}) = ${parts.join(' + ')} = ${total}. Cache it for later reuse.`;
    rec.at(7).fill([d, s], total, message, {
      codeLine: 7,
      highlights: deps,
      vars: { n, k, target, computed, reused, d, s, total },
    });
    return total;
  }

  const answer = solve(n, target);
  return finish(rec, n, k, target, answer, computed, reused);
}

function tabulationSteps(n: number, k: number, target: number): Step[] {
  const rec = makeRecorder(n, target);
  const dp = create2D(n + 1, target + 1, () => 0);
  let reused = 0;

  rec.at(2).record(
    `Tabulation: start from dp[0][0] = 1 and fill rows d = 1..${n}. Every cell adds the counts of the predecessor sums s - face that are at least 0.`,
    {
      codeLine: 2,
      highlights: [{ pos: [n, target], kind: 'active', label: `dp[${n}][${target}]` }],
      vars: { n, k, target, computed: 0, reused: 0 },
    },
  );

  let computed = recordBaseRow(rec, n, k, target, dp);

  for (let d = 1; d <= n; d += 1) {
    rec.at(4).record(
      `Fill row d = ${d}: each cell can be reached by rolling any face 1..${k} on the last die.`,
      {
        codeLine: 4,
        highlights: [{ pos: [d, target], kind: 'active', label: `row ${d}` }],
        vars: { n, k, target, computed, reused, d },
      },
    );

    for (let s = 0; s <= target; s += 1) {
      let total = 0;
      const parts: string[] = [];
      const deps: Highlight[] = [];
      for (let face = 1; face <= k; face += 1) {
        const prev = s - face;
        if (prev < 0) continue;
        const value = dp[d - 1]?.[prev] ?? 0;
        total += value;
        parts.push(`dp[${d - 1}][${prev}] = ${value}`);
        deps.push({ pos: [d - 1, prev], kind: 'dependency', label: `face ${face}` });
      }

      const row = dp[d];
      if (row !== undefined) row[s] = total;
      computed += 1;
      reused += deps.length;
      const message =
        parts.length === 0
          ? `dp[${d}][${s}] = 0: no face fits because s - face < 0 for every face 1..${k}.`
          : `dp[${d}][${s}] = ${parts.join(' + ')} = ${total}: each term fixes the last face and counts the earlier dice.`;
      rec.at(7).fill([d, s], total, message, {
        codeLine: 7,
        highlights: deps,
        vars: { n, k, target, computed, reused, d, s, total },
      });
    }
  }

  return finish(rec, n, k, target, dp[n]?.[target] ?? 0, computed, reused);
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), min, max);
}

function normalizeInput(input: DiceSumsInput): { n: number; k: number; target: number } {
  return {
    n: clampInt(input?.n, 1, MAX_DICE, 2),
    k: clampInt(input?.k, MIN_FACES, MAX_FACES, 6),
    target: clampInt(input?.target, 0, MAX_TARGET, 7),
  };
}

const diceSumsModule: ProblemModule<DiceSumsInput> = {
  id: 'dice-sums',
  title: 'Number of Dice Rolls With Target Sum',
  category: 'counting',
  difficulty: 'medium',
  summary:
    'Count ordered outcomes of exactly n dice, each showing 1..k, that sum to target. Brute force enumerates all k^n rolls; memoization caches each (dice, sum) state and tabulation fills the dice-by-sum table row by row.',
  stateDefinition:
    'dp[d][s] = number of ordered outcomes of exactly d dice, each showing a face from 1 to k, whose faces sum to s, for 0 <= d <= n and 0 <= s <= target.',
  recurrence:
    'dp[0][0] = 1 and dp[0][s] = 0 for s > 0; dp[d][s] = sum over face = 1..k with s - face >= 0 of dp[d-1][s-face]; the answer is dp[n][target].',
  complexity: { time: 'O(n × target × k)', space: 'O(n × target)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'n',
      label: 'n',
      help: 'Number of dice rolled (1 to 4).',
      type: 'number',
      min: 1,
      max: MAX_DICE,
      step: 1,
    },
    {
      name: 'k',
      label: 'k',
      help: 'Number of faces on each die (2 to 6).',
      type: 'number',
      min: MIN_FACES,
      max: MAX_FACES,
      step: 1,
    },
    {
      name: 'target',
      label: 'target',
      help: 'Sum the faces must add up to (1 to 18).',
      type: 'number',
      min: 1,
      max: MAX_TARGET,
      step: 1,
    },
  ],
  defaultInput: { n: 2, k: 6, target: 7 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: DiceSumsInput, mode: Mode): Step[] {
    const { n, k, target } = normalizeInput(input);
    if (mode === 'memo') return memoSteps(n, k, target);
    return tabulationSteps(n, k, target);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'With two standard six-sided dice, how many ordered rolls sum to 7?',
      options: ['6', '5', '7', '12'],
      answer: 0,
      why: 'The six rolls are (1,6), (2,5), (3,4), (4,3), (5,2), (6,1), so dp[2][7] = 6.',
    },
    {
      q: 'What does dp[d][s] count in this table?',
      options: [
        'Unordered multisets of d faces that sum to s',
        'Ordered outcomes of exactly d dice that sum to s',
        'The probability that d dice sum to at most s',
        'The largest face among d dice whose total is s',
      ],
      answer: 1,
      why: 'The dice are distinguishable by their order, so (1,6) and (6,1) are different outcomes and both contribute to dp[d][s].',
    },
    {
      q: 'Which base row makes the recurrence work?',
      options: [
        'dp[0][s] = 1 for every s',
        'dp[0][0] = k and the rest are 0',
        'dp[0][0] = 1 and dp[0][s] = 0 for s > 0',
        'dp[0][s] = 0 for every s',
      ],
      answer: 2,
      why: 'The empty roll sums to 0 in exactly one way, while zero dice can never produce a positive sum.',
    },
    {
      q: 'Why does the recurrence add counts for each face instead of multiplying?',
      options: [
        'dp[d][s] = dp[d-1][s] + 1 for every face',
        'dp[d][s] = k × dp[d-1][s] for every state',
        'dp[d][s] = dp[d][0] + dp[0][s]',
        'Each last face leads to a different predecessor dp[d-1][s-face], and those disjoint outcomes add',
      ],
      answer: 3,
      why: 'The last die can show any face 1..k; outcomes with different last faces are disjoint, so their counts are summed.',
    },
  ],
};

export default diceSumsModule;
