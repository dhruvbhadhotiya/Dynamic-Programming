import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { CellValue, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface JumpGameInput {
  nums: number[];
}

const MAX_ITEMS = 8;
const MAX_JUMP = 5;

const pythonCode = [
  'def can_jump(nums):',
  '    n = len(nums)',
  '    dp = [False] * n',
  '    dp[0] = True',
  '    for i in range(n):',
  '        if dp[i]:',
  '            for j in range(i + 1, min(i + nums[i] + 1, n)):',
  '                dp[j] = True',
  '    return dp[n - 1]',
].join('\n');

const javascriptCode = [
  'function canJump(nums) {',
  '  const n = nums.length;',
  '  const dp = new Array(n).fill(false);',
  '  dp[0] = true;',
  '  for (let i = 0; i < n; i++)',
  '    if (dp[i])',
  '      for (let j = i + 1; j < Math.min(i + nums[i] + 1, n); j++)',
  '        dp[j] = true;',
  '  return dp[n - 1];',
  '}',
].join('\n');

const cppCode = [
  'bool canJump(vector<int> nums) {',
  '  int n = nums.size();',
  '  vector<bool> dp(n, false);',
  '  dp[0] = true;',
  '  for (int i = 0; i < n; i++)',
  '    if (dp[i])',
  '      for (int j = i + 1; j < min(i + nums[i] + 1, n); j++)',
  '        dp[j] = true;',
  '  return dp[n - 1];',
  '}',
].join('\n');

function makeRecorder(nums: number[]): StepRecorder<Table1DState> {
  const n = nums.length;
  const values: CellValue[] = Array.from({ length: n }, () => null);
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values,
      labels: Array.from({ length: n }, (_value, index) => `can[${index}]`),
      indexName: 'i',
      caption: 'Jump-game table dp[i] = index i is reachable from index 0',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  n: number,
  answer: boolean,
  extra: Record<string, string | number | boolean>,
): Step[] {
  rec.at(9).record(`The answer is ${answer ? 'true' : 'false'}: index ${n - 1} is ${answer ? 'reachable' : 'not reachable'} from index 0.`, {
    codeLine: 9,
    highlights: [{ pos: [n - 1], kind: 'result', label: 'answer' }],
    vars: { answer, n, ...extra },
  });
  return [...rec.steps];
}

function generateStepsForMode(nums: number[], mode: Mode): Step[] {
  const rec = makeRecorder(nums);
  const n = nums.length;
  const dp: boolean[] = Array.from({ length: n }, () => false);
  let computed = 0;
  let reused = 0;

  const intro =
    mode === 'bruteforce'
      ? `Brute force: start from index 0 and expand every reachable index into a reachable set. Each jump range is tried directly, with no cache.`
      : mode === 'memo'
        ? `Memoization: cache each reachability decision once. Once dp[i] is settled, reuse it instead of re-exploring paths into i.`
        : `Tabulation: build dp bottom-up from index 0. Each index is settled once before larger indexes are expanded.`;

  rec.at(1).record(intro, {
    codeLine: 1,
    highlights: [{ pos: [0], kind: 'active', label: 'can[0]' }],
    vars: { n, computed: 0, reused: 0 },
  });

  dp[0] = true;
  computed = 1;
  rec.at(4).fill([0], true, 'Base case: index 0 is always reachable — you start there.', {
    kind: 'base',
    codeLine: 4,
    vars: { n, computed, reused, i: 0 },
  });

  for (let i = 0; i < n; i += 1) {
    if (!dp[i]) {
      rec.at(6).record(`Index ${i} is not reachable, so no jumps leave it.`, {
        codeLine: 6,
        highlights: [{ pos: [i], kind: 'pruned', label: `can[${i}]=false` }],
        vars: { n, computed, reused, i },
      });
      continue;
    }

    const maxReach = Math.min(i + (nums[i] ?? 0), n - 1);
    rec.at(6).record(`Index ${i} is reachable (nums[${i}] = ${nums[i] ?? 0}), so it can jump to every index up to ${maxReach}.`, {
      codeLine: 6,
      highlights: [{ pos: [i], kind: 'active', label: `can[${i}]=true` }],
      vars: { n, computed, reused, i },
    });

    for (let j = i + 1; j <= maxReach; j += 1) {
      if (dp[j]) {
        reused += 1;
        rec.at(8).record(`Jump from ${i} to ${j} lands on an index that is already reachable; no change.`, {
          codeLine: 8,
          highlights: [
            { pos: [j], kind: 'dependency', label: `can[${j}]` },
            { pos: [i], kind: 'dependency', label: `nums[${i}]=${nums[i] ?? 0}` },
          ],
          vars: { n, computed, reused, i, j },
        });
        continue;
      }

      dp[j] = true;
      computed += 1;
      rec.at(8).fill(
        [j],
        true,
        mode === 'bruteforce'
          ? `Reachable set: index ${j} joins the set because index ${i} (nums[${i}] = ${nums[i] ?? 0}) can jump there.`
          : mode === 'memo'
            ? `Cache: index ${j} becomes reachable via index ${i}; its decision is now cached for every later check.`
            : `dp[${j}] = true because dp[${i}] is true and ${i} + nums[${i}] = ${i + (nums[i] ?? 0)} >= ${j}.`,
        {
          codeLine: 8,
          highlights: [{ pos: [i], kind: 'dependency', label: `nums[${i}]=${nums[i] ?? 0}` }],
          vars: { n, computed, reused, i, j },
        },
      );
    }
  }

  return finish(rec, n, dp[n - 1] ?? false, { computed, reused });
}

function normalizeInput(input: JumpGameInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, MAX_JUMP) : 0));
  return cleaned.length > 0 ? cleaned : [0];
}

const jumpGameModule: ProblemModule<JumpGameInput> = {
  id: 'jump-game',
  title: 'Jump Game',
  category: '1d',
  difficulty: 'easy',
  summary:
    'Decide whether the last index is reachable when each position can jump up to nums[i] steps forward. Brute force expands a reachable set directly; memoization caches each decision and tabulation fills dp bottom-up, so every index is settled once.',
  stateDefinition: 'dp[i] = true if index i can be reached from index 0, for 0 <= i < n.',
  recurrence: 'dp[0] = true; dp[j] = true if there is i < j with dp[i] = true and i + nums[i] >= j.',
  complexity: { time: 'O(n^2)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'Max jump length at each index. Reach the last index to answer true.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 0,
      max: MAX_JUMP,
    },
  ],
  defaultInput: { nums: [2, 3, 1, 1, 4] },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: JumpGameInput, mode: Mode): Step[] {
    const nums = normalizeInput(input);
    return generateStepsForMode(nums, mode);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'Can you reach the last index in [2, 3, 1, 1, 4]?',
      options: ['Yes', 'No', 'Only with exactly 4 jumps', 'Only if you skip index 1'],
      answer: 0,
      why: 'Jump 0 -> 1 (length 3), then 1 -> 4 (length 3) reaches the last index.',
    },
    {
      q: 'Can you reach the last index in [3, 2, 1, 0, 4]?',
      options: ['No', 'Yes', 'Yes, via the 0', 'Only if you jump from index 2 over the 0'],
      answer: 0,
      why: 'Index 3 is a 0, and no index before it can jump past it (2 + 1 = 3 is the farthest reach), so index 4 is unreachable.',
    },
    {
      q: 'What does dp[i] mean in this problem?',
      options: ['Index i is reachable from index 0', 'Index i holds nums[i] jumps', 'The answer is reachable in i jumps', 'Index i was last expanded'],
      answer: 0,
      why: 'dp[i] stores whether there is a chain of jumps from index 0 that lands exactly on index i.',
    },
    {
      q: 'What is the answer for [0]?',
      options: ['True — you already start at the last index', 'False — nums[0] is 0 so you cannot move', 'False — a jump is required', 'True only for length 2'],
      answer: 0,
      why: 'With one element, index 0 is both the start and the last index, so it is reachable with zero jumps.',
    },
  ],
};

export default jumpGameModule;
