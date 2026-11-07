import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface SosDpInput {
  values: number[];
  bits: number;
  query: number;
}

const MIN_BITS = 1;
const MAX_BITS = 4;
const MIN_VALUE = 1;
const MAX_VALUE = 9;
const MAX_QUERY = 15;

const pythonCode = [
  'def sos(values, bits, query):',
  '    n = 1 << bits',
  '    dp = list(values)',
  '    for i in range(bits):',
  '        for mask in range(n):',
  '            if mask & (1 << i): dp[mask] += dp[mask ^ (1 << i)]',
  '    return dp[query]',
].join('\n');

const javascriptCode = [
  'function sos(values, bits, query) {',
  '  const n = 1 << bits;',
  '  const dp = values.slice();',
  '  for (let i = 0; i < bits; i++)',
  '    for (let mask = 0; mask < n; mask++)',
  '      if (mask & (1 << i)) dp[mask] += dp[mask ^ (1 << i)];',
  '  return dp[query];',
  '}',
].join('\n');

const cppCode = [
  'int sos(vector<int> values, int bits, int query) {',
  '  int n = 1 << bits;',
  '  vector<int> dp = values;',
  '  for (int i = 0; i < bits; i++)',
  '    for (int mask = 0; mask < n; mask++)',
  '      if (mask & (1 << i)) dp[mask] += dp[mask ^ (1 << i)];',
  '  return dp[query];',
  '}',
].join('\n');

function formatMask(mask: number, bits: number): string {
  return mask.toString(2).padStart(bits, '0');
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), min, max);
}

function normalizeInput(input: SosDpInput): SosDpInput {
  const bits = clampInt(input?.bits, MIN_BITS, MAX_BITS, 3);
  const size = 1 << bits;
  const raw = Array.isArray(input?.values) ? input.values : [];
  const values = Array.from({ length: size }, (_value, index) =>
    clampInt(raw[index], MIN_VALUE, MAX_VALUE, 1),
  );
  const query = clampInt(input?.query, 0, Math.min(MAX_QUERY, size - 1), size - 1);
  return { values, bits, query };
}

function makeRecorder(values: number[], bits: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: values.map(() => null),
      labels: values.map((_value, mask) => `mask ${formatMask(mask, bits)}`),
      indexName: 'mask',
      caption: 'SOS DP: dp[mask] = sum of values[sub] over all submasks sub of mask',
    },
    { codeLine: 3 },
  );
}

function tabulationSteps(input: SosDpInput): Step[] {
  const { values, bits, query } = input;
  const size = 1 << bits;
  const rec = makeRecorder(values, bits);
  const dp = values.slice();
  const queryBits = formatMask(query, bits);

  rec.at(3).record(
    `Copy the start array into dp. The query mask is ${query} (binary ${queryBits}); the goal is the sum over all of its submasks. With bits = ${bits} there are ${size} masks, copied in mask order 000, 001, ..., ${formatMask(size - 1, bits)}.`,
    {
      codeLine: 3,
      highlights: [{ pos: [query], kind: 'active', label: `mask ${queryBits}` }],
      vars: { bits, query, size, fills: 0 },
    },
  );

  let fills = 0;
  for (let mask = 0; mask < size; mask += 1) {
    fills += 1;
    rec.at(3).fill([mask], dp[mask] ?? 0, `Start: dp[mask ${formatMask(mask, bits)}] = ${dp[mask] ?? 0} (one term: the mask itself).`, {
      kind: 'base',
      codeLine: 3,
      vars: { bits, query, size, fills, mask },
    });
  }

  for (let i = 0; i < bits; i += 1) {
    const bit = 1 << i;
    rec.at(4).record(
      `Bit ${i} pass (line 4): allow submask members to differ in bit ${i}. Every mask whose bit ${i} is set absorbs the submask obtained by clearing it.`,
      {
        codeLine: 4,
        highlights: [{ pos: [query], kind: 'active', label: `bit ${i}` }],
        vars: { bits, query, size, fills, i, bit },
      },
    );

    for (let mask = 0; mask < size; mask += 1) {
      if ((mask & bit) === 0) continue;
      const cleared = mask ^ bit;
      const before = dp[mask] ?? 0;
      const added = dp[cleared] ?? 0;
      dp[mask] = before + added;
      fills += 1;
      rec.at(6).fill(
        [mask],
        dp[mask] ?? 0,
        `Bit ${i}: mask ${formatMask(mask, bits)} has bit ${i} set, so dp[mask ${formatMask(mask, bits)}] += dp[mask ${formatMask(cleared, bits)}]: ${before} + ${added} = ${dp[mask] ?? 0}.`,
        {
          kind: 'result',
          codeLine: 6,
          highlights: [{ pos: [cleared], kind: 'dependency', label: `mask ${formatMask(cleared, bits)}` }],
          vars: { bits, query, size, fills, i, mask, cleared, added },
        },
      );
    }
  }

  const answer = dp[query] ?? 0;
  rec.at(7).record(
    `The answer is ${answer}: dp[mask ${queryBits}] = ${answer}, the total sum over all submasks of query ${query} (binary ${queryBits}).`,
    {
      codeLine: 7,
      highlights: [{ pos: [query], kind: 'result', label: 'answer' }],
      vars: { answer, bits, query, size, fills },
    },
  );
  return [...rec.steps];
}

const sosDpModule: ProblemModule<SosDpInput> = {
  id: 'sos-dp',
  title: 'Sum Over Subsets DP',
  category: 'advanced',
  difficulty: 'hard',
  summary:
    'Precompute, for every mask, the total of values[sub] over all submasks sub of mask. With bits small (at most 4) the table has 2^bits cells; one pass per bit folds each whole submask family into its supermasks in O(bits × 2^bits) instead of enumerating 3^bits submasks.',
  stateDefinition:
    'dp[mask] after the pass over bit i is the sum of a[sub] over every submask sub of mask that differs from mask only in bits 0..i. Initially dp[mask] = values[mask]. The answer to a query is dp[query] after all bits passes.',
  recurrence:
    'Start dp = values. For each bit i in 0..bits-1, for each mask in 0..2^bits-1: if (mask & (1<<i)) != 0 then dp[mask] += dp[mask ^ (1<<i)]. After all bits, dp[mask] = sum over all submask sub of mask of values[sub]; the answer is dp[query].',
  complexity: { time: 'O(bits × 2^bits)', space: 'O(2^bits)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'bits',
      label: 'bits',
      help: 'Number of bits (1 to 4), so the table has 2^bits masks (at most 16).',
      type: 'number',
      min: MIN_BITS,
      max: MAX_BITS,
      step: 1,
    },
    {
      name: 'values',
      label: 'values',
      help: 'One value per mask, in mask order 000, 001, ..., 111. Give exactly 2^bits values, each 1 to 9.',
      type: 'array',
      itemType: 'number',
      minItems: 2,
      maxItems: 16,
      min: MIN_VALUE,
      max: MAX_VALUE,
    },
    {
      name: 'query',
      label: 'query',
      help: 'The mask (0 to 15) whose submasks are summed. It must fit in bits, so for bits = 3 the largest query is 7 (111).',
      type: 'number',
      min: 0,
      max: MAX_QUERY,
      step: 1,
    },
  ],
  defaultInput: { values: [1, 2, 3, 4, 5, 6, 7, 8], bits: 3, query: 7 },
  modes: ['tabulation'],
  generateSteps(input: SosDpInput, mode: Mode): Step[] {
    void mode;
    return tabulationSteps(normalizeInput(input));
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'With bits = 3 and values [1,2,3,4,5,6,7,8] in mask order 000..111, what is dp[7] (mask 111)?',
      options: ['36', '28', '16', '8'],
      answer: 0,
      why: 'Every mask is a submask of 111, so dp[7] sums the whole table: 1+2+3+4+5+6+7+8 = 36.',
    },
    {
      q: 'What does one bit pass add to dp[mask] when (mask & (1<<i)) is non-zero?',
      options: [
        'dp[mask] += dp[mask ^ (1<<i)], folding in submasks that drop bit i',
        'dp[mask] = dp[mask ^ (1<<i)] * 2',
        'dp[mask] -= values[mask]',
        'dp[mask] += values[mask ^ (1<<i)] only',
      ],
      answer: 0,
      why: 'It absorbs the family below mask with bit i cleared, which is exactly the set of submask sums that newly become reachable by using bit i.',
    },
    {
      q: 'Why does the in-place update not double-count within one bit pass?',
      options: [
        'Because masks are visited in increasing order',
        'Because dp[mask ^ (1<<i)] has bit i cleared, so it was not updated in this pass',
        'Because values are all positive',
        'Because there are only bits passes total',
      ],
      answer: 1,
      why: 'The source cell differs only by the cleared bit, so this pass has not touched it yet; each submasks group is folded in exactly once.',
    },
    {
      q: 'What is the running time of SOS DP over bits passes?',
      options: [
        'O(bits × 2^bits) time and O(2^bits) space',
        'O(3^bits) time and O(2^bits) space',
        'O(bits × 2^bits) time and O(bits × 2^bits) space',
        'O(2^bits) time and O(1) space',
      ],
      answer: 0,
      why: 'The table holds 2^bits cells and each of the bits passes touches every cell once, beating the 3^bits cost of enumerating all submask pairs directly.',
    },
  ],
};

export default sosDpModule;
