import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface PrefixSumInput {
  nums: number[];
  target: number;
}

const MAX_LEN = 8;
const MIN_VAL = -3;
const MAX_VAL = 9;
const MIN_TARGET = -5;
const MAX_TARGET = 15;
const DEFAULT_NUMS = [1, 2, 3, -3, 1];

const CAPTION =
  'Table shows only the prefix array P[0..n] (P[i] = sum of the first i elements); a second table cannot fit in one table1d, so the running frequency counts are narrated in each step message and vars.';

const pythonCode = [
  'def subarray_sum_equals_k(nums, target):',
  '    # freq[p] = number of earlier prefix sums equal to p',
  '    freq = {0: 1}',
  '    prefix = 0',
  '    count = 0',
  '    for x in nums:',
  '        prefix += x',
  '        count += freq.get(prefix - target, 0)',
  '        freq[prefix] = freq.get(prefix, 0) + 1',
  '    return count',
].join('\n');

const javascriptCode = [
  'function subarraySumEqualsK(nums, target) {',
  '  // freq[p] = number of earlier prefix sums equal to p',
  '  const freq = new Map([[0, 1]]);',
  '  let prefix = 0;',
  '  let count = 0;',
  '  for (const x of nums) {',
  '    prefix += x;',
  '    count += freq.get(prefix - target) ?? 0;',
  '    freq.set(prefix, (freq.get(prefix) ?? 0) + 1); }',
  '  return count;',
  '}',
].join('\n');

const cppCode = [
  'int subarray_sum_equals_k(vector<int> nums, int target) {',
  '  // freq[p] = number of earlier prefix sums equal to p',
  '  unordered_map<int, int> freq{{0, 1}};',
  '  int prefix = 0;',
  '  int count = 0;',
  '  for (int x : nums) {',
  '    prefix += x;',
  '    count += freq[prefix - target];',
  '    freq[prefix] += 1; }',
  '  return count;',
  '}',
].join('\n');

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), min, max);
}

function normalizeInput(input: PrefixSumInput): PrefixSumInput {
  const rawNums = Array.isArray(input?.nums) && input.nums.length > 0 ? input.nums : DEFAULT_NUMS;
  const nums = rawNums.slice(0, MAX_LEN).map((v) => clampInt(v, MIN_VAL, MAX_VAL, 0));
  return { nums: nums.length > 0 ? nums : [...DEFAULT_NUMS], target: clampInt(input?.target, MIN_TARGET, MAX_TARGET, 3) };
}

function generateSteps(input: PrefixSumInput, _mode: Mode): Step[] {
  const { nums, target } = normalizeInput(input);
  const n = nums.length;
  const rec = new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n + 1 }, () => null),
      labels: Array.from({ length: n + 1 }, (_v, i) => `P[${i}]`),
      indexName: 'i',
      caption: CAPTION,
    },
    { codeLine: 3 },
  );

  const freq = new Map<number, number>([[0, 1]]);
  let prefix = 0;
  let count = 0;

  rec
    .at(3)
    .fill([0], 0, 'Base case: P[0] = 0 (the empty prefix) and freq = { 0: 1 } — one earlier prefix sum equal to 0.', {
      kind: 'base',
      codeLine: 3,
      vars: { target, count, prefix, freq0: 1 },
    });

  for (let j = 1; j <= n; j += 1) {
    prefix += nums[j - 1] ?? 0;
    const need = prefix - target;
    const added = freq.get(need) ?? 0;
    count += added;
    const freqNow = freq.get(prefix) ?? 0;

    rec
      .at(7)
      .fill([j], prefix, `P[${j}] = P[${j - 1}] + nums[${j - 1}] = ${prefix - (nums[j - 1] ?? 0)} + ${nums[j - 1]} = ${prefix}.`, {
        codeLine: 7,
        vars: { j, prefix, need, added, count, target },
      })
      .at(8)
      .record(
        `Need P[i] = P[${j}] - target = ${need}: freq[${need}] = ${added}, so count grows by ${added} to ${count}. Occurrences seen so far: ${[...freq.entries()].map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}.`,
        {
          codeLine: 8,
          highlights: [{ pos: [j], kind: 'active', label: `need ${need}` }],
          vars: { j, prefix, need, added, count, target, freqNeed: added },
        },
      )
      .at(9)
      .record(
        `Record prefix ${prefix}: freq[${prefix}] ${freqNow} -> ${freqNow + 1} for future positions.`,
        {
          codeLine: 9,
          highlights: [{ pos: [j], kind: 'dependency', label: `freq ${freqNow + 1}` }],
          vars: { j, prefix, need, added, count, target, freqNow: freqNow + 1 },
        },
      );
    freq.set(prefix, freqNow + 1);
  }

  rec.at(10).record(`The answer is ${count}: exactly ${count} subarrays of [${nums.join(', ')}] sum to ${target}.`, {
    codeLine: 10,
    highlights: [{ pos: [n], kind: 'result', label: 'answer' }],
    vars: { answer: count, count, target, n },
  });
  return [...rec.steps];
}

const prefixSumModule: ProblemModule<PrefixSumInput> = {
  id: 'prefix-sum-optimization',
  title: 'Prefix-Sum Optimization: Subarray Sum Equals K',
  category: 'advanced',
  difficulty: 'medium',
  summary:
    'Count subarrays whose sum is k in O(n) using prefix sums. Subarray (i, j] sums to k iff P[i] = P[j] - k, so a frequency map of earlier prefix sums answers each step in O(1). The table shows only P[0..n]; the running freq counts live in step messages/vars because one table1d cannot show both.',
  stateDefinition:
    'P[0] = 0 and P[i] = nums[0] + ... + nums[i-1]. A subarray (i, j] with i < j sums to target iff P[j] - P[i] = target, i.e. P[i] = P[j] - target. freq[p] counts how many earlier prefix sums equal p.',
  recurrence:
    'count = sum over j of freq[P[j] - target], with freq updated incrementally as each P[j] is computed; start with freq = {0: 1} so P[0] is counted.',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'List of 1 to 8 numbers, each from -3 to 9.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_LEN,
      min: MIN_VAL,
      max: MAX_VAL,
    },
    {
      name: 'target',
      label: 'target',
      help: 'Subarray sum to count, from -5 to 15.',
      type: 'number',
      min: MIN_TARGET,
      max: MAX_TARGET,
      step: 1,
    },
  ],
  defaultInput: { nums: [1, 2, 3, -3, 1], target: 3 },
  modes: ['tabulation'],
  generateSteps,
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For nums = [1, 2, 3, -3, 1] and target = 3, what is the count?',
      options: ['4', '3', '5', '2'],
      answer: 0,
      why: 'Verified by enumeration: [1,2] = 3, [3] = 3, [1,2,3,-3] = 3 and [2,3,-3,1] = 3, so the answer is 4 (not 3).',
    },
    {
      q: 'What does P[i] mean, and why do we start with P[0] = 0?',
      options: [
        'P[i] is the i-th array element; P[0] is unused',
        'P[i] is the sum of the first i elements; P[0] = 0 seeds the internal (empty) prefix so subarrays starting at index 0 are counted',
        'P[i] is the number of subarrays ending at i-1',
        'P[i] is target minus the i-th prefix sum',
      ],
      answer: 1,
      why: 'Subarray (i, j] has sum P[j] - P[i]. The empty prefix before the array (i = 0) is a valid start, so freq starts as {0: 1}.',
    },
    {
      q: 'At position j with prefix P[j], what must freq hold and what do we add?',
      options: [
        'Add freq[target] directly to the count',
        'Add freq[P[j] - target] to the count, then record P[j] in freq',
        'Add 1 whenever P[j] equals target',
        'Add freq[P[j] + target] to the count',
      ],
      answer: 1,
      why: 'A subarray ending at j sums to target exactly when its start prefix equals P[j] - target, and freq tells how many such starts have been seen.',
    },
    {
      q: 'Why do we query freq before updating it with the current P[j]?',
      options: [
        'It does not matter; updating first gives the same count',
        'Otherwise the current position could pair with itself, wrongly counting the empty subarray when target is 0',
        'Updating first makes the loop run in O(n^2)',
        'It keeps the table values sorted',
      ],
      answer: 1,
      why: 'Starts must be strictly before j (i < j). Recording P[j] first would let need = P[j] - target match the just-recorded prefix when target = 0.',
    },
  ],
};

export default prefixSumModule;
