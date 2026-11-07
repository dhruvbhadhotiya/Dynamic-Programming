import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import monotonicQueueModule from './monotonic-queue.problem';
import type { MonotonicQueueInput } from './monotonic-queue.problem';

/** Independent O(k*n^2) reference: brute-force max over all predecessors per layer. */
function reference(input: MonotonicQueueInput): number {
  const nums = input.nums;
  const n = nums.length;
  let prev: (number | null)[] = Array.from({ length: n }, () => null);
  prev[0] = nums[0] ?? 0;
  for (let layer = 0; layer < input.k; layer += 1) {
    const cur = prev.slice();
    for (let i = 0; i < n; i += 1) {
      let best: number | null = null;
      for (let j = 0; j < i; j += 1) {
        const v = prev[j];
        if (v !== null && v !== undefined && (best === null || v > best)) best = v;
      }
      if (best !== null) {
        const cand = (nums[i] ?? 0) + best;
        cur[i] = cur[i] === null || cur[i] === undefined ? cand : Math.max(cur[i] as number, cand);
      }
    }
    prev = cur;
  }
  let answer = prev[0] ?? 0;
  for (const v of prev) {
    if (v !== null && v !== undefined && v > answer) answer = v;
  }
  return answer;
}

describe('monotonic-queue module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(monotonicQueueModule, reference, { cases: 20, seed: 1 });
  });

  it('returns known values in tabulation mode', () => {
    const run = (input: MonotonicQueueInput) =>
      finalAnswer(monotonicQueueModule.generateSteps(input, 'tabulation'));
    // k=1 single jump: 2 + max later (2) = 4.
    expect(run({ nums: [2, 2, -1, -2, -2, 2, 0, 2], k: 1 })).toBe(4);
    // All-negative tail: best is to stay at the start.
    expect(run({ nums: [5, -3, -2, -4], k: 2 })).toBe(5);
    // Single cell, negative start; no jump needed.
    expect(run({ nums: [-3], k: 4 })).toBe(-3);
    // k >= n-1: can visit 1, 2, 3, 4 in 3 jumps.
    expect(run({ nums: [1, 2, 3, 4], k: 3 })).toBe(10);
    // Two jumps via a big middle value: 1 + 9 + 9.
    expect(run({ nums: [1, 9, 9], k: 2 })).toBe(19);
    // Default input answer.
    expect(run(monotonicQueueModule.defaultInput)).toBe(4);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(monotonicQueueModule.quiz).toHaveLength(4);
    for (const question of monotonicQueueModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(monotonicQueueModule.defaultInput).toEqual({
      nums: [2, 2, -1, -2, -2, 2, 0, 2],
      k: 1,
    });
    expect(monotonicQueueModule.renderer).toBe('table1d');
    expect(monotonicQueueModule.modes).toEqual(['tabulation']);
    const values: Record<string, unknown> = {
      nums: monotonicQueueModule.defaultInput.nums,
      k: monotonicQueueModule.defaultInput.k,
    };
    expect(validateInput(monotonicQueueModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      monotonicQueueModule.code.python,
      monotonicQueueModule.code.javascript,
      monotonicQueueModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    const maxCodeLine = Math.max(
      ...monotonicQueueModule
        .generateSteps(monotonicQueueModule.defaultInput, 'tabulation')
        .map((step) => step.codeLine),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
