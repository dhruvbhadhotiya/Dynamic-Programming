import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import digitDpModule from './digit-dp.problem';
import type { DigitDpInput } from './digit-dp.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalize(input: DigitDpInput): DigitDpInput {
  return { n: clampInt(input?.n, 0, 999, 19) };
}

/** Independent reference: brute-force check every x from 0 to n. */
function reference(input: DigitDpInput): number {
  const { n } = normalize(input);
  let count = 0;
  for (let x = 0; x <= n; x += 1) {
    if (!String(x).includes('4')) count += 1;
  }
  return count;
}

describe('digit-dp module', () => {
  it('produces valid steps matching brute force on 20 seeded inputs', () => {
    runModuleChecks(digitDpModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(digitDpModule.generateSteps({ n: 0 }, mode))).toBe(1);
    expect(finalAnswer(digitDpModule.generateSteps({ n: 4 }, mode))).toBe(4);
    expect(finalAnswer(digitDpModule.generateSteps({ n: 9 }, mode))).toBe(9);
    expect(finalAnswer(digitDpModule.generateSteps({ n: 19 }, mode))).toBe(18);
    expect(finalAnswer(digitDpModule.generateSteps({ n: 49 }, mode))).toBe(36);
    expect(finalAnswer(digitDpModule.generateSteps({ n: 99 }, mode))).toBe(81);
  });

  it('normalizes bad inputs safely and agrees with the reference', () => {
    const messy: DigitDpInput[] = [
      { n: Number.NaN },
      { n: 19.6 },
      { n: 9999 },
      { n: -3 },
      { n: Number.POSITIVE_INFINITY },
      { n: -0.4 },
    ];

    for (const input of messy) {
      for (const mode of MODES) {
        expect(finalAnswer(digitDpModule.generateSteps(input, mode)), JSON.stringify(input)).toBe(
          reference(input),
        );
      }
    }
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(digitDpModule.quiz).toHaveLength(4);
    for (const question of digitDpModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has the required default input, metadata, and table2d layout', () => {
    expect(digitDpModule.id).toBe('digit-dp');
    expect(digitDpModule.category).toBe('counting');
    expect(digitDpModule.difficulty).toBe('hard');
    expect(digitDpModule.title).toBe('Digit DP: Numbers With No 4');
    expect(digitDpModule.defaultInput).toEqual({ n: 19 });
    expect(finalAnswer(digitDpModule.generateSteps(digitDpModule.defaultInput, 'tabulation'))).toBe(18);
    expect(digitDpModule.renderer).toBe('table2d');
    expect(digitDpModule.modes).toEqual(['memo', 'tabulation']);

    const values: Record<string, unknown> = { ...digitDpModule.defaultInput };
    expect(validateInput(digitDpModule.inputSchema, values)).toEqual({});

    const steps = digitDpModule.generateSteps({ n: 19 }, 'tabulation');
    const state = steps.at(-1)?.state;
    expect(state).toMatchObject({ kind: 'table2d' });
    if (typeof state === 'object' && state !== null && 'values' in state) {
      const table = state as { values: unknown[][]; colLabels?: string[]; rowLabels?: string[]; caption?: string };
      expect(table.values).toHaveLength(3);
      expect(table.values[0]).toHaveLength(4);
      expect(table.colLabels).toHaveLength(4);
      expect(table.rowLabels).toHaveLength(3);
      expect(table.caption ?? '').toContain('tight');
      expect(table.caption ?? '').toContain('loose');
      expect(table.caption ?? '').toContain('no4');
    }
  });

  it('keeps every step codeLine valid and aligned in all three snippets', () => {
    const snippets = [
      digitDpModule.code.python,
      digitDpModule.code.javascript,
      digitDpModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(11);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[9]).toContain('dp[pos');
      expect(lines[10]).toContain('return dp[');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        digitDpModule.generateSteps({ n: 19 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
