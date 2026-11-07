import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import burstBalloonsModule from './burst-balloons.problem';
import type { BurstBalloonsInput } from './burst-balloons.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: BurstBalloonsInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const nums = raw
    .slice(0, 6)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 9) : 1,
    );
  return nums.length > 0 ? nums : [1];
}

/** Independent reference: try every possible burst order recursively. */
function reference(input: BurstBalloonsInput): number {
  const burst = (list: number[]): number => {
    if (list.length === 0) return 0;
    let best = 0;
    for (let i = 0; i < list.length; i += 1) {
      const left = i > 0 ? (list[i - 1] ?? 1) : 1;
      const right = i + 1 < list.length ? (list[i + 1] ?? 1) : 1;
      const rest = [...list.slice(0, i), ...list.slice(i + 1)];
      best = Math.max(best, left * (list[i] ?? 1) * right + burst(rest));
    }
    return best;
  };
  return burst(normalize(input));
}

describe('burst-balloons module', () => {
  it('produces valid steps matching the brute-force reference on 20 seeded inputs', () => {
    runModuleChecks(burstBalloonsModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(burstBalloonsModule.generateSteps({ nums: [3, 1, 5, 8] }, mode))).toBe(167);
    expect(finalAnswer(burstBalloonsModule.generateSteps({ nums: [1, 5] }, mode))).toBe(10);
    expect(finalAnswer(burstBalloonsModule.generateSteps({ nums: [2, 4] }, mode))).toBe(12);
    expect(finalAnswer(burstBalloonsModule.generateSteps({ nums: [9] }, mode))).toBe(9);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(burstBalloonsModule.quiz).toHaveLength(4);
    for (const question of burstBalloonsModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(burstBalloonsModule.defaultInput).toEqual({ nums: [3, 1, 5, 8] });
    expect(burstBalloonsModule.renderer).toBe('intervalTriangle');
    expect(burstBalloonsModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...burstBalloonsModule.defaultInput };
    expect(validateInput(burstBalloonsModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      burstBalloonsModule.code.python,
      burstBalloonsModule.code.javascript,
      burstBalloonsModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i][j]');
      expect(lines[6]).toContain('return dp[0][n - 1]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        burstBalloonsModule
          .generateSteps({ nums: [3, 1, 5, 8] }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
