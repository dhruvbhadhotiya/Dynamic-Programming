import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import climbingStairsModule from './climbing-stairs.problem';
import type { ClimbingStairsInput } from './climbing-stairs.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function reference(input: ClimbingStairsInput): number {
  if (input.n <= 1) return 1;
  let prev2 = 1;
  let prev1 = 1;
  for (let i = 2; i <= input.n; i += 1) {
    const next = prev1 + prev2;
    prev2 = prev1;
    prev1 = next;
  }
  return prev1;
}

describe('climbing-stairs module', () => {
  it(
    'produces valid steps matching the reference on 20 seeded inputs',
    () => {
      runModuleChecks(climbingStairsModule, reference, { cases: 20, seed: 1 });
    },
    30000,
  );

  it.each(MODES)('returns ways(1)=1, ways(5)=8, ways(10)=89 in %s mode', (mode) => {
    expect(finalAnswer(climbingStairsModule.generateSteps({ n: 1 }, mode))).toBe(1);
    expect(finalAnswer(climbingStairsModule.generateSteps({ n: 5 }, mode))).toBe(8);
    expect(finalAnswer(climbingStairsModule.generateSteps({ n: 10 }, mode))).toBe(89);
  });

  it('has at least 3 quiz questions with valid answer indexes', () => {
    expect(climbingStairsModule.quiz.length).toBeGreaterThanOrEqual(3);
    expect(climbingStairsModule.quiz.length).toBeLessThanOrEqual(5);
    for (const question of climbingStairsModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(climbingStairsModule.defaultInput).toEqual({ n: 5 });
    expect(climbingStairsModule.renderer).toBe('table1d');
    const values: Record<string, unknown> = { n: climbingStairsModule.defaultInput.n };
    expect(validateInput(climbingStairsModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      climbingStairsModule.code.python,
      climbingStairsModule.code.javascript,
      climbingStairsModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    // The compute line (line 6) and return line (line 7) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i]');
      expect(lines[6]).toContain('return dp[n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        climbingStairsModule.generateSteps({ n: 5 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
