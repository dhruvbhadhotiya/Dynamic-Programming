import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, IntervalTriangleState, Mode, ProblemModule, Step } from '../../engine/types';

export interface StoneGameInput {
  nums: number[];
}

const MAX_STONES = 8;

const pythonCode = [
  'def first_wins(nums):',
  '    n = len(nums)',
  '    pref = [0] * (n + 1)',
  '    for i in range(n):',
  '        pref[i + 1] = pref[i] + nums[i]',
  '    dp = [[0] * n for _ in range(n)]',
  '    for i in range(n): dp[i][i] = nums[i]',
  '    for length in range(2, n + 1):',
  '        for l in range(n - length + 1):',
  '            r = l + length - 1',
  '            take_l = nums[l] + (pref[r + 1] - pref[l + 1] - dp[l + 1][r])',
  '            take_r = nums[r] + (pref[r] - pref[l] - dp[l][r - 1])',
  '            dp[l][r] = max(take_l, take_r)',
  '    return dp[0][n - 1] > pref[n] / 2',
].join('\n');

const javascriptCode = [
  'function firstWins(nums) {',
  '  const n = nums.length;',
  '  const pref = new Array(n + 1).fill(0);',
  '  for (let i = 0; i < n; i++)',
  '    pref[i + 1] = pref[i] + nums[i];',
  '  const dp = Array.from({ length: n }, () => Array(n).fill(0));',
  '  for (let i = 0; i < n; i++) dp[i][i] = nums[i];',
  '  for (let length = 2; length <= n; length++)',
  '    for (let l = 0; l + length <= n; l++) {',
  '      const r = l + length - 1;',
  '      const takeL = nums[l] + (pref[r + 1] - pref[l + 1] - dp[l + 1][r]);',
  '      const takeR = nums[r] + (pref[r] - pref[l] - dp[l][r - 1]);',
  '      dp[l][r] = Math.max(takeL, takeR); }',
  '  return dp[0][n - 1] > pref[n] / 2;',
  '}',
].join('\n');

const cppCode = [
  'bool firstWins(vector<int>& nums) {',
  '  int n = nums.size();',
  '  vector<int> pref(n + 1, 0);',
  '  for (int i = 0; i < n; i++)',
  '    pref[i + 1] = pref[i] + nums[i];',
  '  vector<vector<int>> dp(n, vector<int>(n, 0));',
  '  for (int i = 0; i < n; i++) dp[i][i] = nums[i];',
  '  for (int length = 2; length <= n; length++)',
  '    for (int l = 0; l + length <= n; l++) {',
  '      int r = l + length - 1;',
  '      int takeL = nums[l] + (pref[r + 1] - pref[l + 1] - dp[l + 1][r]);',
  '      int takeR = nums[r] + (pref[r] - pref[l] - dp[l][r - 1]);',
  '      dp[l][r] = max(takeL, takeR); }',
  '  return dp[0][n - 1] * 2 > pref[n];',
  '}',
].join('\n');

function normalizeNums(input: StoneGameInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const cleaned = raw
    .slice(0, MAX_STONES)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 9) : 1,
    );
  if (cleaned.length === 0) return [1, 1];
  if (cleaned.length === 1) return [cleaned[0] ?? 1, cleaned[0] ?? 1];
  if (cleaned.length % 2 === 1) return cleaned.slice(0, cleaned.length - 1);
  return cleaned;
}

function buildPref(nums: number[]): number[] {
  const pref = new Array(nums.length + 1).fill(0) as number[];
  for (let i = 0; i < nums.length; i += 1) {
    pref[i + 1] = (pref[i] ?? 0) + (nums[i] ?? 1);
  }
  return pref;
}

function makeRecorder(size: number): StepRecorder<IntervalTriangleState> {
  return new StepRecorder<IntervalTriangleState>(
    {
      kind: 'intervalTriangle',
      values: create2D(size, size, () => null),
      rowLabels: Array.from({ length: size }, (_, i) => `l=${i}`),
      colLabels: Array.from({ length: size }, (_, j) => `r=${j}`),
      caption: 'Stone Game: dp[l][r] = max stones the player to move collects from nums[l..r]',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<IntervalTriangleState>,
  n: number,
  firstScore: number,
  total: number,
): Step[] {
  const win = firstScore > total / 2;
  const advantage = 2 * firstScore - total;
  rec
    .at(14)
    .record(`The answer is ${win ? 'true' : 'false'} — the first player ${win ? 'wins' : 'does not win'} with dp[0][${n - 1}] = ${firstScore} of ${total} stones (advantage ${advantage}).`, {
      codeLine: 14,
      highlights: [{ pos: [0, n - 1], kind: 'result', label: 'answer' }],
      vars: { answer: win, firstScore, total, advantage },
    });
  return [...rec.steps];
}

function memoSteps(nums: number[], pref: number[]): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  const cache: (number | null)[][] = create2D(n, n, () => null);
  let computed = 0;
  let hits = 0;

  rec
    .at(1)
    .record(
      `Stone Game memo: ${n} stones [${nums.join(', ')}]. solve(l, r) returns the max the player to move can collect from nums[l..r]. Two players alternate taking an end; each cached interval is reused.`,
      { codeLine: 1, highlights: [{ pos: [0, n - 1], kind: 'active', label: 'solve(0, whole)' }], vars: { n, total: pref[n] ?? 0 } },
    );
  rec
    .at(5)
    .record(`Prefix sums: pref = [${pref.join(', ')}], total = ${pref[n] ?? 0}. opponentSubtotal = intervalTotal - dp[opponentInterval].`, {
      codeLine: 5,
      highlights: [],
      vars: { n, total: pref[n] ?? 0 },
    });

  const solve = (l: number, r: number): number => {
    const cached = cache[l]?.[r] ?? null;
    if (cached !== null) {
      hits += 1;
      rec.at(6).record(`Cache hit: solve(${l}, ${r}) = ${cached} is already stored, so this interval score is reused instead of recomputed.`, {
        codeLine: 6,
        highlights: [{ pos: [l, r], kind: 'result', label: 'memo hit' }],
        vars: { l, r, cached, computed, hits },
      });
      return cached;
    }

    if (l === r) {
      const value = nums[l] ?? 1;
      const row = cache[l];
      if (row) row[r] = value;
      computed += 1;
      rec
        .at(7)
        .update(
          (draft) => {
            const target = draft.values[l];
            if (target) target[r] = value;
          },
          `Base case: one stone, solve(${l}, ${r}) = nums[${l}] = ${value}.`,
          {
            codeLine: 7,
            highlights: [{ pos: [l, r], kind: 'base', label: 'one stone' }],
            vars: { l, r, value, computed, hits },
          },
        );
      return value;
    }

    const afterLeft = solve(l + 1, r);
    const afterRight = solve(l, r - 1);
    const totalAfterLeft = (pref[r + 1] ?? 0) - (pref[l + 1] ?? 0);
    const totalAfterRight = (pref[r] ?? 0) - (pref[l] ?? 0);
    const takeL = (nums[l] ?? 1) + (totalAfterLeft - afterLeft);
    const takeR = (nums[r] ?? 1) + (totalAfterRight - afterRight);
    const best = Math.max(takeL, takeR);

    rec.at(11).record(`Take left: nums[${l}] + (total(${l + 1}..${r}) - solve(${l + 1}, ${r})) = ${nums[l]} + (${totalAfterLeft} - ${afterLeft}) = ${takeL}.`, {
      codeLine: 11,
      highlights: [
        { pos: [l, r], kind: 'active', label: `solve(${l}, ${r})` },
        { pos: [l + 1, r], kind: 'dependency', label: 'after left' },
      ],
      vars: { l, r, takeL, takeR, computed, hits },
    });
    rec.at(12).record(`Take right: nums[${r}] + (total(${l}..${r - 1}) - solve(${l}, ${r - 1})) = ${nums[r]} + (${totalAfterRight} - ${afterRight}) = ${takeR}.`, {
      codeLine: 12,
      highlights: [
        { pos: [l, r], kind: 'active', label: `solve(${l}, ${r})` },
        { pos: [l, r - 1], kind: 'dependency', label: 'after right' },
      ],
      vars: { l, r, takeL, takeR, computed, hits },
    });

    const cacheRow = cache[l];
    if (cacheRow) cacheRow[r] = best;
    computed += 1;
    rec
      .at(13)
      .update(
        (draft) => {
          const target = draft.values[l];
          if (target) target[r] = best;
        },
        `Cache solve(${l}, ${r}) = max(${takeL}, ${takeR}) = ${best}: the player to move picks the bigger end.`,
        {
          codeLine: 13,
          highlights: [
            { pos: [l, r], kind: 'result', label: `dp[${l}][${r}]` },
            { pos: [l + 1, r], kind: 'dependency', label: 'after left' },
            { pos: [l, r - 1], kind: 'dependency', label: 'after right' },
          ],
          vars: { l, r, takeL, takeR, best, computed, hits },
        },
      );
    return best;
  };

  const firstScore = solve(0, n - 1);
  return finish(rec, n, firstScore, pref[n] ?? 0);
}

function tabulationSteps(nums: number[], pref: number[]): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  const dp = create2D(n, n, () => 0);

  rec
    .at(1)
    .record(
      `Stone Game tabulation: ${n} stones [${nums.join(', ')}]. Fill dp[l][r] bottom-up by increasing interval length; each interval reads only shorter, already-final intervals.`,
      { codeLine: 1, highlights: [{ pos: [0, n - 1], kind: 'active', label: 'full row' }], vars: { n, total: pref[n] ?? 0 } },
    );
  rec
    .at(5)
    .record(`Prefix sums: pref = [${pref.join(', ')}], total = ${pref[n] ?? 0}. opponentSubtotal = intervalTotal - dp[opponentInterval].`, {
      codeLine: 5,
      highlights: [],
      vars: { n, total: pref[n] ?? 0 },
    });

  for (let i = 0; i < n; i += 1) {
    const value = nums[i] ?? 1;
    const row = dp[i];
    if (row) row[i] = value;
    rec
      .at(7)
      .update(
        (draft) => {
          const target = draft.values[i];
          if (target) target[i] = value;
        },
        `Base case: one stone, dp[${i}][${i}] = nums[${i}] = ${value}.`,
        { codeLine: 7, highlights: [{ pos: [i, i], kind: 'base', label: 'one stone' }], vars: { i, value } },
      );
  }

  for (let length = 2; length <= n; length += 1) {
    rec.at(8).record(`Tabulation fills interval length ${length} next; every entry reads only shorter, already-final intervals.`, {
      codeLine: 8,
      highlights: [],
      vars: { length },
    });

    for (let l = 0; l + length <= n; l += 1) {
      const r = l + length - 1;
      const afterLeft = dp[l + 1]?.[r] ?? 0;
      const afterRight = dp[l]?.[r - 1] ?? 0;
      const totalAfterLeft = (pref[r + 1] ?? 0) - (pref[l + 1] ?? 0);
      const totalAfterRight = (pref[r] ?? 0) - (pref[l] ?? 0);
      const takeL = (nums[l] ?? 1) + (totalAfterLeft - afterLeft);
      const takeR = (nums[r] ?? 1) + (totalAfterRight - afterRight);
      const best = Math.max(takeL, takeR);

      rec.at(11).record(`Take left: dp[${l}][${r}] via left = nums[${l}] + (${totalAfterLeft} - dp[${l + 1}][${r}] = ${afterLeft}) = ${takeL}.`, {
        codeLine: 11,
        highlights: [
          { pos: [l, r], kind: 'active', label: `dp[${l}][${r}]` },
          { pos: [l + 1, r], kind: 'dependency', label: 'after left' },
        ],
        vars: { l, r, takeL, takeR },
      });
      rec.at(12).record(`Take right: dp[${l}][${r}] via right = nums[${r}] + (${totalAfterRight} - dp[${l}][${r - 1}] = ${afterRight}) = ${takeR}.`, {
        codeLine: 12,
        highlights: [
          { pos: [l, r], kind: 'active', label: `dp[${l}][${r}]` },
          { pos: [l, r - 1], kind: 'dependency', label: 'after right' },
        ],
        vars: { l, r, takeL, takeR },
      });

      const row = dp[l];
      if (row) row[r] = best;
      const bestHighlights: Highlight[] = [{ pos: [l, r], kind: 'result', label: `dp[${l}][${r}]` }];
      bestHighlights.push({ pos: [l + 1, r], kind: 'dependency', label: 'after left' });
      bestHighlights.push({ pos: [l, r - 1], kind: 'dependency', label: 'after right' });
      rec
        .at(13)
        .update(
          (draft) => {
            const target = draft.values[l];
            if (target) target[r] = best;
          },
          `Best for [${l}..${r}]: max(${takeL}, ${takeR}) = ${best}: ${takeL >= takeR ? 'take left' : 'take right'} wins.`,
          { codeLine: 13, highlights: bestHighlights, vars: { l, r, takeL, takeR, best } },
        );
    }
  }

  const firstScore = dp[0]?.[n - 1] ?? 0;
  return finish(rec, n, firstScore, pref[n] ?? 0);
}

const stoneGameModule: ProblemModule<StoneGameInput> = {
  id: 'stone-game',
  title: 'Stone Game',
  category: 'counting',
  difficulty: 'easy',
  summary:
    'Two players alternately take one stone from either end of a row; each maximizes their own total. dp[l][r] is what the player to move can still collect from nums[l..r]; prefix sums turn the opponent interval total into intervalTotal - dp[opponentInterval].',
  stateDefinition:
    'dp[l][r] = maximum stones the player who moves NOW can collect from nums[l..r], for 0 <= l <= r < n.',
  recurrence:
    'dp[i][i] = nums[i]. For l < r: dp[l][r] = max(nums[l] + (total(l+1..r) - dp[l+1][r]), nums[r] + (total(l..r-1) - dp[l][r-1])). Answer is dp[0][n-1] > total/2.',
  complexity: { time: 'O(n²)', space: 'O(n²)' },
  renderer: 'intervalTriangle',
  inputSchema: [
    {
      name: 'nums',
      label: 'stone piles',
      help: 'Even number of piles, 2 to 8. Values 1 to 9. The classic default is [5, 3, 4, 5].',
      type: 'array',
      itemType: 'number',
      minItems: 2,
      maxItems: MAX_STONES,
      min: 1,
      max: 9,
    },
  ],
  defaultInput: { nums: [5, 3, 4, 5] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: StoneGameInput, mode: Mode): Step[] {
    const nums = normalizeNums(input);
    const pref = buildPref(nums);
    return mode === 'memo' ? memoSteps(nums, pref) : tabulationSteps(nums, pref);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the answer for [5, 3, 4, 5] (the default)?',
      options: ['true — the first player wins', 'false', '9', '0'],
      answer: 0,
      why: 'dp[0][3] = 9 of 17 total, and 9 > 17 / 2 = 8.5. The final answer is the boolean true; step vars also record firstScore = 9 and advantage = 1.',
    },
    {
      q: 'What does dp[l][r] mean?',
      options: [
        'Maximum stones the player to move can collect from nums[l..r]',
        'Total stones in nums[l..r]',
        'Maximum stones the first player collected so far',
        'Number of stones left after taking from l..r',
      ],
      answer: 0,
      why: 'The state is relative to whoever moves now, not always the first player, so after one take the roles swap and the opponent score on the rest is total - dp[rest].',
    },
    {
      q: 'Why use prefix sums in the recurrence?',
      options: [
        'To get the rest-of-interval total quickly: opponentScore = intervalTotal - dp[opponentInterval]',
        'They store the dp table itself',
        'To sort the piles',
        'To count the moves',
      ],
      answer: 0,
      why: 'If the opponent optimally collects dp[l+1][r] from the rest, you get the pick plus whatever is left: nums[l] + ((pref[r+1] - pref[l+1]) - dp[l+1][r]).',
    },
    {
      q: 'What is the answer for [3, 7, 2, 3]?',
      options: ['true — the first player wins', 'false', '15', 'dp[0][3] = 15'],
      answer: 0,
      why: 'dp[0][3] = 10 of 15 total, and 10 > 15 / 2 = 7.5, so the boolean answer is true; the score advantage 2*10 - 15 = 5 is recorded in the final step vars alongside the boolean answer.',
    },
  ],
};

export default stoneGameModule;
