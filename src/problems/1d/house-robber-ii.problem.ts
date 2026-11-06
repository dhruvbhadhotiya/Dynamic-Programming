import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface HouseRobberIIInput {
  nums: number[];
}

const MAX_ITEMS = 10;

const pythonCode = [
  'def rob(nums):',
  '    if len(nums) == 1: return nums[0]',
  '    best = 0',
  '    for drop in (0, 1):',
  '        a = nums[drop:-1] if drop == 0 else nums[1:]',
  '        prev, cur = 0, 0',
  '        for x in a:',
  '            take = prev + x',
  '            prev, cur = cur, max(cur, take)',
  '        best = max(best, cur)',
  '    return best',
].join('\n');

const javascriptCode = [
  'function rob(nums) {',
  '  if (nums.length === 1) return nums[0];',
  '  let best = 0;',
  '  for (let drop = 0; drop <= 1; drop++) {',
  '    const a = drop === 0 ? nums.slice(0, -1) : nums.slice(1);',
  '    let prev = 0, cur = 0;',
  '    for (const x of a) {',
  '      const take = prev + x;',
  '      const next = Math.max(cur, take); prev = cur; cur = next;',
  '    }',
  '    best = Math.max(best, cur);',
  '  }',
  '  return best;',
  '}',
].join('\n');

const cppCode = [
  'int rob(vector<int> nums) {',
  '  if (nums.size() == 1) return nums[0];',
  '  int best = 0;',
  '  for (int drop = 0; drop <= 1; drop++) {',
  '    vector<int> a = drop == 0 ? vector<int>(nums.begin(), nums.end() - 1) : vector<int>(nums.begin() + 1, nums.end());',
  '    int prev = 0, cur = 0;',
  '    for (int x : a) {',
  '      int take = prev + x;',
  '      int next = max(cur, take); prev = cur; cur = next;',
  '    }',
  '    best = max(best, cur);',
  '  }',
  '  return best;',
  '}',
].join('\n');

function makeRecorder(length: number): StepRecorder<Table1DState> {
  const size = Math.max(1, length);
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: size }, () => null),
      labels: Array.from({ length: size }, (_value, index) => `dp[${index}]`),
      indexName: 'i',
      caption: 'dp[i] = best loot from houses 0..i of the current linear pass',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  const last = rec.read().values.length - 1;
  rec.at(11).record(`The answer is ${answer}.`, {
    codeLine: 11,
    highlights: [{ pos: [last], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function dependencyHighlights(j: number): Highlight[] {
  if (j === 1) return [{ pos: [0], kind: 'dependency', label: 'previous best' }];
  if (j === 0) return [];
  return [
    { pos: [j - 1], kind: 'dependency', label: `dp[${j - 1}]` },
    { pos: [j - 2], kind: 'dependency', label: `dp[${j - 2}]` },
  ];
}

function iterativeSteps(nums: number[], memo: boolean): Step[] {
  const tableLength = nums.length >= 2 ? nums.length - 1 : 1;
  const rec = makeRecorder(tableLength);
  const label = nums.join(', ');
  let computed = 0;
  let reused = 0;

  rec.at(3).record(
    memo
      ? `Memoization: cache each dp[i] for the houses being tried, reusing dp[i-1] and dp[i-2], so every house is decided once.`
      : `Tabulation: build dp[i] bottom-up for the houses being tried; smaller cells are final before larger ones.`,
    {
      codeLine: 3,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { nums: label, computed: 0, reused: 0 },
    },
  );

  if (nums.length === 0) return finish(rec, 0, { computed, reused });
  if (nums.length === 1) {
    computed = 1;
    rec.at(2).fill([0], nums[0] ?? 0, `Base case: the only house holds ${nums[0] ?? 0}.`, {
      kind: 'base',
      codeLine: 2,
      vars: { nums: label, computed, reused },
    });
    return finish(rec, nums[0] ?? 0, { computed, reused });
  }

  const passes: Array<{ slice: number[]; skip: string }> = [
    { slice: nums.slice(0, -1), skip: `skip the last house (index ${nums.length - 1})` },
    { slice: nums.slice(1), skip: 'skip the first house (index 0)' },
  ];
  let best = 0;

  for (let pass = 0; pass < passes.length; pass += 1) {
    const { slice, skip } = passes[pass] ?? { slice: [], skip: '' };
    rec.at(4).record(`Pass ${pass + 1}: ${skip}, so rob [${slice.join(', ')}] as a line.`, {
      codeLine: 4,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { nums: label, pass: pass + 1, computed, reused },
    });

    const dp: number[] = [];
    for (let j = 0; j < slice.length; j += 1) {
      const value = slice[j] ?? 0;
      if (j === 0) dp[j] = value;
      else if (j === 1) dp[j] = Math.max(dp[0] ?? 0, value);
      else dp[j] = Math.max(dp[j - 1] ?? 0, (dp[j - 2] ?? 0) + value);
      computed += 1;
      reused += j === 0 ? 0 : j === 1 ? 1 : 2;
      rec.at(9).fill(
        [j],
        dp[j] ?? 0,
        j === 0
          ? `Base case: dp[0] = ${value}, rob the first house of this pass.`
          : j === 1
            ? `Base case: dp[1] = max(${dp[0] ?? 0}, ${value}) = ${dp[j] ?? 0} for the first two houses of this pass.`
            : memo
              ? `Cache hit: reuse dp[${j - 1}] = ${dp[j - 1] ?? 0} and dp[${j - 2}] = ${dp[j - 2] ?? 0}; dp[${j}] = max(${dp[j - 1] ?? 0}, ${(dp[j - 2] ?? 0) + value}) = ${dp[j] ?? 0}.`
              : `dp[${j}] = max(dp[${j - 1}], dp[${j - 2}] + house ${value}) = max(${dp[j - 1] ?? 0}, ${(dp[j - 2] ?? 0) + value}) = ${dp[j] ?? 0}. Both dependencies are already final.`,
        {
          codeLine: 9,
          kind: j <= 1 ? 'base' : 'active',
          highlights: dependencyHighlights(j),
          vars: { nums: label, pass: pass + 1, computed, reused, i: j },
        },
      );
    }

    const passBest = dp[dp.length - 1] ?? 0;
    best = Math.max(best, passBest);
    rec.at(10).record(`Pass ${pass + 1} best is ${passBest}; best so far is ${best}.`, {
      codeLine: 10,
      vars: { nums: label, pass: pass + 1, best, computed, reused },
    });
  }

  return finish(rec, best, { computed, reused });
}

function bruteForceSteps(nums: number[]): Step[] {
  const tableLength = nums.length >= 2 ? nums.length - 1 : 1;
  const rec = makeRecorder(tableLength);
  const label = nums.join(', ');
  let calls = 0;

  rec.at(1).record(
    `Brute force: try taking or skipping each house with no cache, for both end-skipped lines. Overlapping choices are recomputed.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { nums: label, calls: 0 },
    },
  );

  if (nums.length === 0) return finish(rec, 0, { calls });
  if (nums.length === 1) {
    rec.at(2).fill([0], nums[0] ?? 0, `Base case: the only house holds ${nums[0] ?? 0}.`, {
      kind: 'base',
      codeLine: 2,
      vars: { nums: label, calls: 1 },
    });
    return finish(rec, nums[0] ?? 0, { calls: 1 });
  }

  const passes: Array<{ slice: number[]; skip: string }> = [
    { slice: nums.slice(0, -1), skip: `skip the last house (index ${nums.length - 1})` },
    { slice: nums.slice(1), skip: 'skip the first house (index 0)' },
  ];
  let best = 0;

  for (let pass = 0; pass < passes.length; pass += 1) {
    const { slice, skip } = passes[pass] ?? { slice: [], skip: '' };
    rec.at(4).record(`Pass ${pass + 1}: ${skip}, so explore [${slice.join(', ')}] as a line.`, {
      codeLine: 4,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { nums: label, pass: pass + 1, calls },
    });

    const solve = (j: number): number => {
      calls += 1;
      if (j >= slice.length) return 0;
      if (j === slice.length - 1) {
        const value = slice[j] ?? 0;
        rec.at(9).fill([j], value, `Base case: only house ${value} remains, so take it.`, {
          kind: 'base',
          codeLine: 9,
          vars: { nums: label, calls, i: j },
        });
        return value;
      }
      const take = (slice[j] ?? 0) + solve(j + 2);
      const skipValue = solve(j + 1);
      const value = Math.max(take, skipValue);
      const deps: Highlight[] = [
        { pos: [j + 1], kind: 'dependency', label: 'skip' },
        { pos: [j + 2], kind: 'dependency', label: 'take' },
      ];
      rec.at(9).fill(
        [j],
        value,
        `Recomputed dp[${j}] = max(skip = ${skipValue}, take house ${slice[j] ?? 0} + ${take - (slice[j] ?? 0)} = ${take}) = ${value}. Nothing was remembered.`,
        { codeLine: 9, highlights: deps, vars: { nums: label, calls, i: j } },
      );
      return value;
    };

    const passBest = solve(0);
    best = Math.max(best, passBest);
    rec.at(10).record(`Pass ${pass + 1} best is ${passBest}; best so far is ${best}.`, {
      codeLine: 10,
      vars: { nums: label, pass: pass + 1, best, calls },
    });
  }

  return finish(rec, best, { calls });
}

function normalizeNums(input: HouseRobberIIInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  return raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, 20) : 0));
}

const houseRobberIIModule: ProblemModule<HouseRobberIIInput> = {
  id: 'house-robber-ii',
  title: 'House Robber II',
  category: '1d',
  difficulty: 'medium',
  summary:
    'Houses form a circle, so the first and last cannot both be robbed. Every optimal plan skips at least one of them; solve the two resulting lines (without the last house, without the first) and take the better total.',
  stateDefinition:
    'For the current linear pass a (a contiguous slice of nums with one end house removed), dp[i] = max loot from houses 0..i of that pass.',
  recurrence:
    'dp[0] = a[0]; dp[1] = max(a[0], a[1]); dp[i] = max(dp[i-1], dp[i-2] + a[i]) for i >= 2; answer = max(rob(nums without last), rob(nums without first)).',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'House values in a circle. The first and last are neighbours, so they cannot both be robbed.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 0,
      max: 20,
    },
  ],
  defaultInput: { nums: [2, 3, 2] },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: HouseRobberIIInput, mode: Mode): Step[] {
    const nums = normalizeNums(input);
    if (mode === 'bruteforce') return bruteForceSteps(nums);
    if (mode === 'memo') return iterativeSteps(nums, true);
    return iterativeSteps(nums, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For nums = [2, 3, 2], what is the maximum loot?',
      options: ['3', '4', '5', '2'],
      answer: 0,
      why: 'Houses 0 and 2 are neighbours on the circle, so you must choose the middle house (3) over robbing both ends.',
    },
    {
      q: 'Why cannot we run the plain linear robber DP on the whole circle?',
      options: [
        'It could rob both the first and last house, but they are neighbours on the circle',
        'Linear DP only works for even-length arrays',
        'It would need exponential memory',
        'House values must be removed before DP',
      ],
      answer: 0,
      why: 'The circle adds the edge between house 0 and house n-1, so any valid plan skips at least one of those two ends.',
    },
    {
      q: 'Which two lines do we solve for the circle?',
      options: [
        'nums without the last house, and nums without the first house',
        'nums without the middle house, and the full nums',
        'The first half and the second half',
        'nums with house 0 doubled, and nums with house n-1 doubled',
      ],
      answer: 0,
      why: 'Every valid plan spares the last house or the first house, so the answer is the better of those two linear solutions.',
    },
    {
      q: 'For nums = [1, 2, 3, 1], what is the maximum loot?',
      options: ['4', '3', '5', '6'],
      answer: 0,
      why: 'Skipping the last house gives [1, 2, 3] -> 1 + 3 = 4; skipping the first gives [2, 3, 1] -> 2 + 1 = 3, so the answer is 4.',
    },
  ],
};

export default houseRobberIIModule;
