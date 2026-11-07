import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface MatrixExpInput {
  n: number;
}

const MIN_N = 0;
const MAX_N = 20;
const DEFAULT_N = 10;

const CAPTION =
  'Table: cell e (label step e) holds F(2^e), the top-right entry of M^(2^e) with M = [[1,1],[1,0]]: step 0 = F(1) = 1, step 1 = F(2) = 1, step 2 = F(4) = 3, step 3 = F(8) = 21. Cells fill left to right as the squaring chain advances (each squaring doubles the exponent). The final F(n) is read from the accumulated result matrix and is not necessarily a table cell. Exception: n = 0 has no bits, so its single cell holds F(0) = 0.';

const pythonCode = [
  '# mat_mul(A, B) multiplies two 2x2 matrices; M = [[1, 1], [1, 0]]',
  'def fib_matrix(n):',
  '    if n == 0: return 0',
  '    base = [[1, 1], [1, 0]]  # M = M^(2^0)',
  '    result = [[1, 0], [0, 1]]  # identity',
  '    bit = 0',
  '    while (1 << bit) <= n:',
  '        power = base[0][1]  # F(2^bit)',
  '        if ((n >> bit) & 1) == 1:',
  '            result = mat_mul(result, base)',
  '        base = mat_mul(base, base)',
  '        bit += 1',
  '    return result[0][1]',
].join('\n');

const javascriptCode = [
  '// matMul(A, B) multiplies two 2x2 matrices; M = [[1, 1], [1, 0]]',
  'function fibMatrix(n) {',
  '  if (n === 0) return 0;',
  '  let base = [[1, 1], [1, 0]]; // M = M^(2^0)',
  '  let result = [[1, 0], [0, 1]]; // identity',
  '  let bit = 0;',
  '  while ((1 << bit) <= n) {',
  '    const power = base[0][1]; // F(2^bit)',
  '    if (((n >> bit) & 1) === 1)',
  '      result = matMul(result, base);',
  '    base = matMul(base, base);',
  '    bit += 1;',
  '  return result[0][1]; }',
].join('\n');

const cppCode = [
  '// matMul(A, B) multiplies two 2x2 matrices; M = {{1, 1}, {1, 0}}',
  'int fibMatrix(int n) {',
  '  if (n == 0) return 0;',
  '  vector<vector<int>> base = {{1, 1}, {1, 0}}; // M = M^(2^0)',
  '  vector<vector<int>> result = {{1, 0}, {0, 1}}; // identity',
  '  int bit = 0;',
  '  while ((1 << bit) <= n) {',
  '    int power = base[0][1]; // F(2^bit)',
  '    if (((n >> bit) & 1) == 1)',
  '      result = matMul(result, base);',
  '    base = matMul(base, base);',
  '    bit += 1;',
  '  return result[0][1]; }',
].join('\n');

type Mat2 = [[number, number], [number, number]];

function matMul(a: Mat2, b: Mat2): Mat2 {
  return [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
  ];
}

function bitCount(n: number): number {
  let count = 0;
  while ((1 << count) <= n) count += 1;
  return count;
}

function makeRecorder(bits: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: bits }, () => null),
      labels: Array.from({ length: bits }, (_value, index) => `step ${index}`),
      indexName: 'bit',
      caption: CAPTION,
    },
    { codeLine: 2 },
  );
}

function normalizeInput(input: MatrixExpInput): number {
  const raw: unknown = typeof input === 'object' && input !== null ? input.n : undefined;
  const rounded = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : 0;
  return clamp(rounded, MIN_N, MAX_N);
}

function generateTabulation(n: number): Step[] {
  if (n === 0) {
    const rec = makeRecorder(1);
    rec.at(2).record(
      'n = 0 is the empty product: M^0 = I, whose top-right entry is 0, so the early return fires. The table has one cell, step 0, holding F(0) = 0.',
      { codeLine: 2, highlights: [{ pos: [0], kind: 'active' }], vars: { n: 0 } },
    );
    rec.at(3).fill([0], 0, 'Early return: F(0) = 0, so step 0 holds 0.', {
      kind: 'base',
      codeLine: 3,
      vars: { n: 0 },
    });
    rec.at(13).record('The answer is 0: F(0) = 0.', {
      codeLine: 13,
      highlights: [{ pos: [0], kind: 'result', label: 'answer F(0)' }],
      vars: { answer: 0, n: 0 },
    });
    return [...rec.steps];
  }

  const bits = bitCount(n);
  const binary = n.toString(2);
  const rec = makeRecorder(bits);
  rec.at(2).record(
    `Binary exponentiation of M = [[1,1],[1,0]] for n = ${n} (${binary} in binary, LSB first). base starts as M = M^(2^0) and squares each step; result starts as I and is multiplied by base only where the bit is 1. Cell e (step e) records F(2^e).`,
    { codeLine: 2, highlights: [{ pos: [0], kind: 'active' }], vars: { n, bits } },
  );

  let base: Mat2 = [
    [1, 1],
    [1, 0],
  ];
  let result: Mat2 = [
    [1, 0],
    [0, 1],
  ];
  let multiplies = 0;

  for (let e = 0; e < bits; e += 1) {
    const power = base[0][1];
    const exponent = 2 ** e;
    const bit = (n >> e) & 1;

    rec.at(8).fill(
      [e],
      power,
      `Bit e = ${e}: base = M^(${exponent}), so power = base[0][1] = F(2^${e}) = ${power}. Cell step ${e} records this power of two. Bit ${e} of ${n} is ${bit}.`,
      { kind: 'active', codeLine: 8, vars: { n, e, bit, power } },
    );

    if (bit === 1) {
      result = matMul(result, base);
      multiplies += 1;
      rec.at(10).record(
        `Bit ${e} is 1, so result = result * M^(${exponent}). The accumulated matrix top-right is now ${result[0][1]}; this is a partial product, not yet the final F(${n}).`,
        {
          codeLine: 10,
          highlights: [{ pos: [e], kind: 'result', label: `result * M^${exponent}` }],
          vars: { n, e, bit, power, partial: result[0][1], multiplies },
        },
      );
    } else {
      rec.at(9).record(
        `Bit ${e} is 0, so skip the multiply: result is unchanged and stays ${result[0][1]} at the top-right. Only base advances by squaring.`,
        {
          codeLine: 9,
          highlights: [{ pos: [e], kind: 'dependency', label: `bit ${e} = 0` }],
          vars: { n, e, bit, power, partial: result[0][1], multiplies },
        },
      );
    }

    base = matMul(base, base);
    const nextExponent = 2 ** (e + 1);
    const nextPower = base[0][1];
    const last = e === bits - 1;
    rec.at(11).record(
      last
        ? `Square base one last time: base = base * base = M^(${nextExponent}), whose top-right would be F(${nextExponent}) = ${nextPower}. The loop then exits because 2^${bits} > ${n}; this final squaring is not a table cell.`
        : `Square base for the next bit: base = base * base = M^(${nextExponent}); its top-right F(${nextExponent}) = ${nextPower} will be recorded as cell step ${e + 1} next.`,
      {
        codeLine: 11,
        highlights: [{ pos: [e], kind: 'dependency', label: `M^${nextExponent}` }],
        vars: { n, e, bit, power: nextPower, squarings: e + 1 },
      },
    );
  }

  const answer = result[0][1];
  rec.at(13).record(`The answer is ${answer}: F(${n}) = ${answer}, read from result[0][1] of M^${n}.`, {
    codeLine: 13,
    highlights: [{ pos: [bits - 1], kind: 'result', label: `answer F(${n})` }],
    vars: { answer, n, bits, multiplies },
  });
  return [...rec.steps];
}

const matrixExponentiationModule: ProblemModule<MatrixExpInput> = {
  id: 'matrix-exponentiation',
  title: 'Matrix Exponentiation: Fast Fibonacci',
  category: 'advanced',
  difficulty: 'hard',
  summary:
    'Compute F(n) by binary exponentiation of M = [[1,1],[1,0]], where M^n = [[F(n+1),F(n)],[F(n),F(n-1)]]. Write n in binary; each set bit multiplies the result by M^(2^e). The table records the squaring chain: cell e (step e) = F(2^e) = 1, 1, 3, 21, ..., so the animation jumps in powers of two rather than stepping one Fibonacci number at a time.',
  stateDefinition:
    'M = [[1,1],[1,0]]; M^n = [[F(n+1), F(n)], [F(n), F(n-1)]] for n >= 1, and M^0 = I. result starts as I; for each bit e of n (LSB first), if the bit is 1 then result = result * M^(2^e). The animation table ignores the matrix entries and records only power[e] = F(2^e).',
  recurrence:
    'base_0 = M (so base_0 = M^(2^0)); base_{e+1} = base_e * base_e = M^(2^(e+1)). result_0 = I; result_{e+1} = result_e * base_e if bit e of n is 1, else result_e. F(n) = result[0][1] for n >= 1; F(0) = 0 by the early return.',
  complexity: { time: 'O(log n)', space: 'O(1)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'n',
      label: 'n',
      help: 'Fibonacci index. n = 10 gives F(10) = 55; allowed 0..20 keeps every matrix entry small.',
      type: 'number',
      min: MIN_N,
      max: MAX_N,
      step: 1,
    },
  ],
  defaultInput: { n: DEFAULT_N },
  modes: ['tabulation'],
  generateSteps(input: MatrixExpInput, mode: Mode): Step[] {
    void mode;
    return generateTabulation(normalizeInput(input));
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'With M = [[1,1],[1,0]], what is the top-right entry of M^2 (that is, F(2))?',
      options: ['1', '2', '3', '5'],
      answer: 0,
      why: 'M^2 = [[2,1],[1,1]], so the top-right entry is 1, equal to F(2). In general M^n = [[F(n+1),F(n)],[F(n),F(n-1)]].',
    },
    {
      q: 'For n = 10 (binary 1010), which powers does binary exponentiation multiply into the result?',
      options: ['M^2 and M^8', 'M^1 and M^8', 'M^1 and M^2', 'Every power from M^1 up to M^8'],
      answer: 0,
      why: 'Bits 1 (2) and 3 (8) are set, so result = M^2 * M^8 = M^10. Bits 0 and 2 are zero and are skipped.',
    },
    {
      q: 'What does table cell step 2 hold for any n >= 4?',
      options: ['F(4) = 3', 'F(2) = 1', 'F(8) = 21', 'F(10) = 55'],
      answer: 0,
      why: 'Cell e holds F(2^e); for e = 2 that is F(4) = 3, the top-right entry of M^4.',
    },
    {
      q: 'What are the time and space complexities of binary exponentiation to n?',
      options: ['O(log n) time, O(1) space', 'O(n) time, O(1) space', 'O(log n) time, O(n) space', 'O(2^n) time, O(1) space'],
      answer: 0,
      why: 'Only O(log n) squarings and multiplies are needed (one per bit of n), and only the constant-size 2x2 matrices are stored.',
    },
  ],
};

export default matrixExponentiationModule;
