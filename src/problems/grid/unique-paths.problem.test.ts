import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import uniquePathsModule from './unique-paths.problem';
import type { UniquePathsInput } from './unique-paths.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function reference(input: UniquePathsInput): number {
  const m =
    typeof input.m === 'number' && Number.isFinite(input.m) ? clampInt(input.m, 1, 5) : 1;
  const n =
    typeof input.n === 'number' && Number.isFinite(input.n) ? clampInt(input.n, 1, 7) : 1;
  const total = m - 1 + (n - 1);
  const k = Math.min(m - 1, n - 1);
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result = (result * (total - k + i)) / i;
  }
  return Math.round(result);
}

describe('unique-paths module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(uniquePathsModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(uniquePathsModule.generateSteps({ m: 3, n: 7 }, mode))).toBe(28);
    expect(finalAnswer(uniquePathsModule.generateSteps({ m: 3, n: 2 }, mode))).toBe(3);
    expect(finalAnswer(uniquePathsModule.generateSteps({ m: 1, n: 1 }, mode))).toBe(1);
    expect(finalAnswer(uniquePathsModule.generateSteps({ m: 1, n: 5 }, mode))).toBe(1);
    expect(finalAnswer(uniquePathsModule.generateSteps({ m: 2, n: 2 }, mode))).toBe(2);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(uniquePathsModule.quiz).toHaveLength(4);
    for (const question of uniquePathsModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(uniquePathsModule.defaultInput).toEqual({ m: 3, n: 7 });
    expect(uniquePathsModule.renderer).toBe('table2d');
    expect(uniquePathsModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...uniquePathsModule.defaultInput };
    expect(validateInput(uniquePathsModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      uniquePathsModule.code.python,
      uniquePathsModule.code.javascript,
      uniquePathsModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][j]');
      expect(lines[7]).toContain('return dp[m-1][n-1]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        uniquePathsModule.generateSteps({ m: 3, n: 7 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
