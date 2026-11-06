import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import minCostClimbingStairsModule from './min-cost-climbing-stairs.problem';
import type { MinCostClimbingStairsInput } from './min-cost-climbing-stairs.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

/** Exhaustive search over every climb path; deliberately avoids the dp recurrence. */
function reference(input: MinCostClimbingStairsInput): number {
  const cost = input.cost;
  const n = cost.length;
  const landCost = (i: number): number => (i < n ? cost[i] ?? 0 : 0);
  const bestFrom = (i: number): number => {
    if (i >= n) return 0;
    return Math.min(landCost(i + 1) + bestFrom(i + 1), landCost(i + 2) + bestFrom(i + 2));
  };
  return Math.min(landCost(0) + bestFrom(0), landCost(1) + bestFrom(1));
}

describe('min-cost-climbing-stairs module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(minCostClimbingStairsModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns 15 for [10,15,20] and 10 for [10,15] in %s mode', (mode) => {
    expect(finalAnswer(minCostClimbingStairsModule.generateSteps({ cost: [10, 15, 20] }, mode))).toBe(15);
    expect(finalAnswer(minCostClimbingStairsModule.generateSteps({ cost: [10, 15] }, mode))).toBe(10);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(minCostClimbingStairsModule.quiz).toHaveLength(4);
    for (const question of minCostClimbingStairsModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(minCostClimbingStairsModule.defaultInput).toEqual({ cost: [10, 15, 20] });
    expect(minCostClimbingStairsModule.renderer).toBe('table1d');
    const values: Record<string, unknown> = { cost: minCostClimbingStairsModule.defaultInput.cost };
    expect(validateInput(minCostClimbingStairsModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      minCostClimbingStairsModule.code.python,
      minCostClimbingStairsModule.code.javascript,
      minCostClimbingStairsModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i]');
      expect(lines[7]).toContain('return dp[n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        minCostClimbingStairsModule.generateSteps({ cost: [10, 15, 20] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
