import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface MonotonicQueueInput {
  nums: number[];
  k: number;
}

const MAX_ITEMS = 10;

const pythonCode = [
  'def best_gold(nums, k):',
  '    n = len(nums)',
  '    prev = [None] * n',
  '    prev[0] = nums[0]',
  '    for _ in range(k):',
  '        dq = []',
  '        cur = prev[:]',
  '        for i in range(n):',
  '            j = i - 1',
  '            if j >= 0 and prev[j] is not None:',
  '                while dq and prev[dq[-1]] <= prev[j]:',
  '                    dq.pop()',
  '                dq.append(j)',
  '            if dq:',
  '                best_prev = prev[dq[0]]',
  '                cand = nums[i] + best_prev',
  '                cur[i] = cand if prev[i] is None else max(prev[i], cand)',
  '        prev = cur',
  '    return max(v for v in prev if v is not None)',
].join('\n');

const javascriptCode = [
  'function bestGold(nums, k) {',
  '  const n = nums.length;',
  '  let prev = new Array(n).fill(null);',
  '  prev[0] = nums[0];',
  '  for (let t = 0; t < k; t++) {',
  '    const dq = [];',
  '    const cur = prev.slice();',
  '    for (let i = 0; i < n; i++) {',
  '      if (i > 0 && prev[i - 1] !== null) {',
  '        while (dq.length && prev[dq[dq.length - 1]] <= prev[i - 1]) dq.pop();',
  '        dq.push(i - 1);',
  '      }',
  '      if (dq.length) {',
  '        const cand = nums[i] + prev[dq[0]];',
  '        cur[i] = prev[i] === null ? cand : Math.max(prev[i], cand);',
  '      }',
  '    }',
  '    prev = cur; }',
  '  return Math.max(...prev.filter((v) => v !== null));',
  '}',
].join('\n');

const cppCode = [
  'int bestGold(vector<int>& nums, int k) {',
  '  int n = nums.size();',
  '  const int NEG = -1000000000;',
  '  vector<int> prev(n, NEG);',
  '  prev[0] = nums[0];',
  '  for (int t = 0; t < k; t++) {',
  '    deque<int> dq;',
  '    vector<int> cur = prev;',
  '    for (int i = 0; i < n; i++) {',
  '      if (i > 0 && prev[i - 1] != NEG) {',
  '        while (!dq.empty() && prev[dq.back()] <= prev[i - 1]) dq.pop_back();',
  '        dq.push_back(i - 1);',
  '      }',
  '      if (!dq.empty()) {',
  '        int cand = nums[i] + prev[dq.front()];',
  '        cur[i] = prev[i] == NEG ? cand : max(prev[i], cand);',
  '      }',
  '    }',
  '    prev = cur; }',
  '  return *max_element(prev.begin(), prev.end());',
  '}',
].join('\n');

function normalizeInput(input: MonotonicQueueInput): { nums: number[]; k: number } {
  const rawNums = Array.isArray(input?.nums) ? input.nums : [];
  const nums = rawNums
    .slice(0, MAX_ITEMS)
    .map((v) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.trunc(v), -5, 9) : 0));
  const rawK = typeof input?.k === 'number' && Number.isFinite(input.k) ? Math.trunc(input.k) : 1;
  return { nums: nums.length > 0 ? nums : [0], k: clamp(rawK, 1, 4) };
}

function generateSteps(input: MonotonicQueueInput, _mode: Mode): Step[] {
  const { nums, k } = normalizeInput(input);
  const n = nums.length;
  const rec = new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n }, () => null),
      labels: Array.from({ length: n }, (_v, i) => `dp[${i}]`),
      indexName: 'i',
      caption:
        'Final layer dp[i] = best gold arriving at i using at most k jumps. null means unreachable (only the 0-jump start before layer 1). Answer = max over the final layer (you may stop at any index).',
    },
    { codeLine: 1 },
  );

  let prev: (number | null)[] = Array.from({ length: n }, () => null);
  prev[0] = nums[0] ?? 0;
  rec.at(5).record(
    `Layered tabulation (Jump Game VI style): start at index 0 with nums[0] = ${prev[0]} using 0 jumps. Each layer adds one jump of any forward length; a monotone decreasing deque keeps max prev[j] for j < i in O(1) amortised time.`,
    { codeLine: 5, highlights: [{ pos: [0], kind: 'base', label: 'start' }], vars: { k, n } },
  );
  rec.at(4).fill([0], prev[0], `Base: prev[0] = nums[0] = ${prev[0]}. All other positions are unreachable with 0 jumps (null).`, {
    kind: 'base',
    codeLine: 4,
    vars: { k, n },
  });

  for (let layer = 1; layer <= k; layer += 1) {
    const dq: number[] = [];
    const cur = prev.slice();
    for (let i = 0; i < n; i += 1) {
      if (i > 0 && prev[i - 1] !== null && prev[i - 1] !== undefined) {
        const j = i - 1;
        const v = prev[j] as number;
        while (dq.length > 0 && (prev[dq[dq.length - 1] as number] as number) <= v) dq.pop();
        dq.push(j);
      }
      const front = dq[0];
      const bestPrev = front === undefined ? null : prev[front];
      if (bestPrev !== null && bestPrev !== undefined) {
        const cand = (nums[i] ?? 0) + bestPrev;
        cur[i] = prev[i] === null || prev[i] === undefined ? cand : Math.max(prev[i] as number, cand);
        rec
          .at(14)
          .fill([i], cur[i] ?? null, `Layer ${layer}: deque ${JSON.stringify(dq)} front j=${front} (prev=${bestPrev}). dp[${i}] = max(prev=${prev[i] ?? 'null'}, nums[${i}] + ${bestPrev} = ${cand}) = ${cur[i] ?? 'null'}.`, {
            codeLine: 14,
            highlights: [{ pos: [front ?? 0], kind: 'dependency', label: `max prev` }],
            vars: { layer, i, deque: dq.join(','), bestPrev, k, n },
          });
      } else {
        rec.at(8).fill([i], cur[i] ?? null, `Layer ${layer}: no predecessor j < ${i} reachable yet (deque empty); dp[${i}] stays ${cur[i] ?? 'null'}.`, {
          codeLine: 8,
          vars: { layer, i, deque: '', k, n },
        });
      }
    }
    prev = cur;
  }

  let answer = prev[0] ?? 0;
  let answerIdx = 0;
  prev.forEach((v, i) => {
    if (v !== null && v !== undefined && v > answer) {
      answer = v;
      answerIdx = i;
    }
  });
  rec.at(19).record(`The answer is ${answer}: the maximum over the final layer, reached at index ${answerIdx} using at most ${k} jumps.`, {
    codeLine: 19,
    highlights: [{ pos: [answerIdx], kind: 'result', label: 'answer' }],
    vars: { answer, answerIdx, k, n },
  });
  return [...rec.steps];
}

const monotonicQueueModule: ProblemModule<MonotonicQueueInput> = {
  id: 'monotonic-queue',
  title: 'Monotonic Queue DP: Best Gold With K Jumps',
  category: 'advanced',
  difficulty: 'hard',
  summary:
    'Start at index 0 collecting nums[0]; each jump may move forward to any later index and collects that index value. With at most k jumps, dp[i] is the best gold arriving at i. A monotone decreasing deque maintains max prev[j] over j < i, so each of the k layers is O(n). Answer = max over the final layer (best arrival at any index, not necessarily the last).',
  stateDefinition:
    'After the final layer, dp[i] = maximum gold collectible arriving at position i using at most k jumps. With 0 jumps only dp[0] = nums[0] is reachable; other cells start as null (unreachable).',
  recurrence:
    'dp_new[i] = max(dp_old[i], nums[i] + max_{j < i} dp_old[j]); the deque front is that max and is maintained in decreasing dp_old order.',
  complexity: { time: 'O(k * n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'Gold at each position. A jump may land on any later index.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: -5,
      max: 9,
    },
    {
      name: 'k',
      label: 'k',
      help: 'Maximum number of jumps.',
      type: 'number',
      min: 1,
      max: 4,
    },
  ],
  defaultInput: { nums: [2, 2, -1, -2, -2, 2, 0, 2], k: 1 },
  modes: ['tabulation'],
  generateSteps,
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default input ([2, 2, -1, -2, -2, 2, 0, 2], k = 1), what is the answer?',
      options: ['4', '2', '6', '3'],
      answer: 0,
      why: 'One jump from index 0 adds the best later value (2), so the answer is 2 + 2 = 4.',
    },
    {
      q: 'Why does a monotone decreasing deque give the right max predecessor?',
      options: [
        'Its front always holds the largest prev[j] seen so far for j < i',
        'It stores every index exactly once',
        'It sorts nums in descending order',
        'It only keeps the last index',
      ],
      answer: 0,
      why: 'Entries are popped from the back while they are <= the new prev[j], so the deque stays decreasing and its front is the maximum over all j < i.',
    },
    {
      q: 'What is the answer semantics here?',
      options: [
        'Max over the final layer: best arrival at any index using at most k jumps',
        'Only dp[n-1] of the final layer',
        'Sum of all nums',
        'Best value at index 0',
      ],
      answer: 0,
      why: 'You may stop at any index, and carrying dp_old[i] forward makes the final layer represent at most k jumps; the answer is its maximum.',
    },
    {
      q: 'How does the deque version compare to scanning all predecessors each time?',
      options: ['O(k*n) vs O(k*n^2)', 'O(k*n^2) vs O(k*n)', 'Same time', 'O(n) vs O(k*n)'],
      answer: 0,
      why: 'Each index enters and leaves the deque once per layer, so each layer is O(n); scanning all j < i for every i is O(n^2) per layer.',
    },
  ],
};

export default monotonicQueueModule;
