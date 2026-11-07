import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import diceSumsModule from './dice-sums.problem';
import type { DiceSumsInput } from './dice-sums.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalize(input: DiceSumsInput): DiceSumsInput {
  return {
    n: clampInt(input?.n, 1, 4, 2),
    k: clampInt(input?.k, 2, 6, 6),
    target: clampInt(input?.target, 0, 18, 7),
  };
}

/** Independent reference: enumerate all k^n ordered outcomes and count the target sum. */
function reference(input: DiceSumsInput): number {
  const { n, k, target } = normalize(input);
  let count = 0;

  const enumerate = (dice: number, total: number): void => {
    if (dice === n) {
      if (total === target) count += 1;
      return;
    }
    for (let face = 1; face <= k; face += 1) {
      enumerate(dice + 1, total + face);
    }
  };

  enumerate(0, 0);
  return count;
}

describe('dice-sums module', () => {
  it('produces valid steps matching exhaustive enumeration on 20 seeded inputs', () => {
    runModuleChecks(diceSumsModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(diceSumsModule.generateSteps({ n: 2, k: 6, target: 7 }, mode))).toBe(6);
    expect(finalAnswer(diceSumsModule.generateSteps({ n: 1, k: 6, target: 3 }, mode))).toBe(1);
    expect(finalAnswer(diceSumsModule.generateSteps({ n: 3, k: 6, target: 10 }, mode))).toBe(27);
    expect(finalAnswer(diceSumsModule.generateSteps({ n: 2, k: 2, target: 0 }, mode))).toBe(0);
    expect(finalAnswer(diceSumsModule.generateSteps({ n: 1, k: 6, target: 8 }, mode))).toBe(0);
    expect(finalAnswer(diceSumsModule.generateSteps({ n: 2, k: 2, target: 10 }, mode))).toBe(0);
  });

  it('normalizes bad inputs safely and agrees with the reference', () => {
    const messy: DiceSumsInput[] = [
      { n: Number.NaN, k: -4, target: 99 },
      { n: 2.6, k: 6.4, target: 6.6 },
      { n: 999, k: 1, target: 999 },
      { n: -3, k: 100, target: -5 },
    ];

    for (const input of messy) {
      for (const mode of MODES) {
        expect(finalAnswer(diceSumsModule.generateSteps(input, mode)), JSON.stringify(input)).toBe(
          reference(input),
        );
      }
    }
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(diceSumsModule.quiz).toHaveLength(4);
    for (const question of diceSumsModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has the required default input and metadata', () => {
    expect(diceSumsModule.id).toBe('dice-sums');
    expect(diceSumsModule.category).toBe('counting');
    expect(diceSumsModule.difficulty).toBe('medium');
    expect(diceSumsModule.defaultInput).toEqual({ n: 2, k: 6, target: 7 });
    expect(diceSumsModule.renderer).toBe('table2d');
    expect(diceSumsModule.modes).toEqual(['memo', 'tabulation']);

    const values: Record<string, unknown> = { ...diceSumsModule.defaultInput };
    expect(validateInput(diceSumsModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid and aligned in all three snippets', () => {
    const snippets = [
      diceSumsModule.code.python,
      diceSumsModule.code.javascript,
      diceSumsModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[d][s]');
      expect(lines[7]).toContain('return dp[n][target]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        diceSumsModule
          .generateSteps({ n: 2, k: 6, target: 7 }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
