import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import jumpGameModule from './jump-game.problem';
import type { JumpGameInput } from './jump-game.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function reference(input: JumpGameInput): boolean {
  const nums = input.nums;
  const n = nums.length;
  if (n === 0) return true;
  const can = new Array<boolean>(n).fill(false);
  can[n - 1] = true;
  for (let i = n - 2; i >= 0; i -= 1) {
    const jump = nums[i] ?? 0;
    for (let j = 1; j <= jump && i + j < n; j += 1) {
      if (can[i + j]) {
        can[i] = true;
        break;
      }
    }
  }
  return can[0] ?? false;
}

describe('jump-game module', () => {
  it(
    'produces valid steps matching the reference on 20 seeded inputs',
    () => {
      runModuleChecks(jumpGameModule, reference, { cases: 20, seed: 1 });
    },
    30000,
  );

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(jumpGameModule.generateSteps({ nums: [2, 3, 1, 1, 4] }, mode))).toBe(true);
    expect(finalAnswer(jumpGameModule.generateSteps({ nums: [3, 2, 1, 0, 4] }, mode))).toBe(false);
    expect(finalAnswer(jumpGameModule.generateSteps({ nums: [0] }, mode))).toBe(true);
    expect(finalAnswer(jumpGameModule.generateSteps({ nums: [0, 0] }, mode))).toBe(false);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(jumpGameModule.quiz).toHaveLength(4);
    for (const question of jumpGameModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(jumpGameModule.defaultInput).toEqual({ nums: [2, 3, 1, 1, 4] });
    expect(jumpGameModule.renderer).toBe('table1d');
    expect(jumpGameModule.modes).toEqual(['bruteforce', 'memo', 'tabulation']);
    const values: Record<string, unknown> = { nums: jumpGameModule.defaultInput.nums };
    expect(validateInput(jumpGameModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      jumpGameModule.code.python,
      jumpGameModule.code.javascript,
      jumpGameModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(9);

    // The compute line (line 8) and return line (line 9) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[7]).toContain('dp[j]');
      expect(lines[8]).toContain('dp[n - 1]');
      expect(lines[8]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        jumpGameModule.generateSteps({ nums: [2, 3, 1, 1, 4] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
