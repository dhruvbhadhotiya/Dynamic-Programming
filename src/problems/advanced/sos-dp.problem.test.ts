import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import type { Rng } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import sosDpModule from './sos-dp.problem';
import type { SosDpInput } from './sos-dp.problem';

const MODES: readonly Mode[] = ['tabulation'];

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Mirror of the module normalization: clamp bits, rebuild values to length 2^bits, clamp the query. */
function normalize(input: SosDpInput): SosDpInput {
  const bits = clampInt(input?.bits, 1, 4, 3);
  const size = 1 << bits;
  const raw = Array.isArray(input?.values) ? input.values : [];
  const values = Array.from({ length: size }, (_value, index) => clampInt(raw[index], 1, 9, 1));
  const query = clampInt(input?.query, 0, Math.min(15, size - 1), size - 1);
  return { values, bits, query };
}

/**
 * Independent reference: enumerate the submask lattice directly.
 * Visits every sub of mask via sub = (sub - 1) & mask and sums values[sub].
 */
function reference(input: SosDpInput): number {
  const { values, query } = normalize(input);
  let total = 0;
  for (let sub = query; ; sub = (sub - 1) & query) {
    total += values[sub] ?? 0;
    if (sub === 0) break;
  }
  return total;
}

/** Coupled-field generator: bits first, then exactly 2^bits values and a fitting query. */
function inputGenerator(rng: Rng): SosDpInput {
  const bits = rngInt(rng, 1, 4);
  const size = 1 << bits;
  const values = Array.from({ length: size }, () => rngInt(rng, 1, 9));
  const query = rngInt(rng, 0, size - 1);
  return { values, bits, query };
}

describe('sos-dp module', () => {
  it('produces valid steps matching the submask-enumeration reference on 20 seeded inputs', () => {
    runModuleChecks(sosDpModule, reference, { cases: 20, seed: 1, inputGenerator });
  });

  it.each(MODES)('returns the known values in %s mode', (mode) => {
    expect(finalAnswer(sosDpModule.generateSteps({ values: [5, 7], bits: 1, query: 1 }, mode))).toBe(12);
    expect(finalAnswer(sosDpModule.generateSteps({ values: [5, 7], bits: 1, query: 0 }, mode))).toBe(5);
    expect(finalAnswer(sosDpModule.generateSteps({ values: [1, 2, 3, 4], bits: 2, query: 2 }, mode))).toBe(4);
    expect(finalAnswer(sosDpModule.generateSteps({ values: [1, 2, 3, 4], bits: 2, query: 3 }, mode))).toBe(10);
    expect(
      finalAnswer(
        sosDpModule.generateSteps(
          { values: [1, 2, 3, 4, 5, 6, 7, 8], bits: 3, query: 7 },
          mode,
        ),
      ),
    ).toBe(36);
  });

  it('normalizes bad inputs safely and agrees with the reference', () => {
    const messy: SosDpInput[] = [
      { values: [1, 2, 3, 4], bits: Number.NaN, query: 7 },
      { values: [1, 2, 3, 4], bits: 2.6, query: 2.4 },
      { values: [3], bits: 99, query: 99 },
      { values: [0, -5, 100, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], bits: -3, query: -2 },
      { values: [], bits: 1, query: 0 },
    ];

    for (const input of messy) {
      for (const mode of MODES) {
        expect(finalAnswer(sosDpModule.generateSteps(input, mode)), JSON.stringify(input)).toBe(
          reference(input),
        );
      }
    }
  });

  it('has exactly 4 quiz questions with valid answer indexes', () => {
    expect(sosDpModule.quiz).toHaveLength(4);
    for (const question of sosDpModule.quiz) {
      expect(question.options.length).toBeGreaterThan(1);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput and metadata', () => {
    expect(sosDpModule.id).toBe('sos-dp');
    expect(sosDpModule.category).toBe('advanced');
    expect(sosDpModule.difficulty).toBe('hard');
    expect(sosDpModule.defaultInput).toEqual({ values: [1, 2, 3, 4, 5, 6, 7, 8], bits: 3, query: 7 });
    expect(sosDpModule.renderer).toBe('table1d');
    expect(sosDpModule.modes).toEqual(['tabulation']);

    const values: Record<string, unknown> = { ...sosDpModule.defaultInput };
    expect(validateInput(sosDpModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid and aligned in all three snippets', () => {
    const snippets = [sosDpModule.code.python, sosDpModule.code.javascript, sosDpModule.code.cpp];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[mask]');
      expect(lines[6]).toContain('return dp[query]');
    }

    const steps = sosDpModule.generateSteps(sosDpModule.defaultInput, 'tabulation');
    expect(Math.max(...steps.map((step) => step.codeLine))).toBeLessThanOrEqual(minLines);
    expect(steps.at(-1)?.codeLine).toBe(7);
    expect(steps.at(-1)?.message.toLowerCase()).toContain('answer');
    expect(finalAnswer(steps)).toBe(36);
  });
});
