import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import type { Rng } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import decodeWaysModule from './decode-ways.problem';
import type { DecodeWaysInput } from './decode-ways.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function reference(input: DecodeWaysInput): number {
  const s = input.s;
  const n = s.length;
  if (n === 0) return 0;
  let prev2 = 1;
  let prev1 = s[0] !== '0' ? 1 : 0;
  if (n === 1) return prev1;
  for (let i = 2; i <= n; i += 1) {
    let cur = 0;
    if (s[i - 1] !== '0') cur += prev1;
    const two = Number(s.slice(i - 2, i));
    if (two >= 10 && two <= 26) cur += prev2;
    prev2 = prev1;
    prev1 = cur;
  }
  return prev1;
}

function randomDigits(rng: Rng): DecodeWaysInput {
  const len = rngInt(rng, 1, 12);
  let s = '';
  for (let j = 0; j < len; j += 1) {
    s += String(rngInt(rng, 0, 9));
  }
  return { s };
}

describe('decode-ways module', () => {
  it(
    'produces valid steps matching the reference on 20 seeded inputs',
    () => {
      runModuleChecks(decodeWaysModule, reference, {
        cases: 20,
        seed: 1,
        inputGenerator: (rng) => randomDigits(rng),
      });
    },
    30000,
  );

  it.each(MODES)('returns 226->3, 06->0, 12->2, 10->1 in %s mode', (mode) => {
    expect(finalAnswer(decodeWaysModule.generateSteps({ s: '226' }, mode))).toBe(3);
    expect(finalAnswer(decodeWaysModule.generateSteps({ s: '06' }, mode))).toBe(0);
    expect(finalAnswer(decodeWaysModule.generateSteps({ s: '12' }, mode))).toBe(2);
    expect(finalAnswer(decodeWaysModule.generateSteps({ s: '10' }, mode))).toBe(1);
  });

  it('has at least 3 quiz questions with valid answer indexes', () => {
    expect(decodeWaysModule.quiz.length).toBeGreaterThanOrEqual(3);
    expect(decodeWaysModule.quiz.length).toBeLessThanOrEqual(5);
    for (const question of decodeWaysModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(decodeWaysModule.defaultInput).toEqual({ s: '226' });
    expect(decodeWaysModule.renderer).toBe('table1d');
    const values: Record<string, unknown> = { s: decodeWaysModule.defaultInput.s };
    expect(validateInput(decodeWaysModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      decodeWaysModule.code.python,
      decodeWaysModule.code.javascript,
      decodeWaysModule.code.cpp,
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
        decodeWaysModule.generateSteps({ s: '226' }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
