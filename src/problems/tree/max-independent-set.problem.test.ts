import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import maxIndependentSetModule from './max-independent-set.problem';
import type { MaxIndependentSetInput } from './max-independent-set.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const FALLBACK = {
  parents: [-1, 0, 0, 2, 2],
  values: [3, 2, 3, 2, 1],
};

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: MaxIndependentSetInput): { parents: number[]; values: number[] } {
  const rawParents = Array.isArray(input.parents) ? input.parents.slice(0, 7) : [];
  const baseParents = rawParents.length > 0 ? rawParents : [...FALLBACK.parents];
  const parents = baseParents.map((value, index) => {
    if (index === 0) return -1;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return -1;
    return clampInt(value, 0, index - 1);
  });
  const rawValues = Array.isArray(input.values) ? input.values : [];
  const values = parents.map((_parent, index) => {
    const value = rawValues[index];
    return typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 9) : 1;
  });
  return { parents, values };
}

/** Independent reference: try every subset and reject any parent-child pair. */
function reference(input: MaxIndependentSetInput): number {
  const { parents, values } = normalize(input);
  const n = parents.length;
  let best = 0;

  for (let mask = 0; mask < 1 << n; mask += 1) {
    let valid = true;
    let total = 0;
    for (let node = 0; node < n; node += 1) {
      if ((mask & (1 << node)) === 0) continue;
      const parent = parents[node] ?? -1;
      if (parent >= 0 && (mask & (1 << parent)) !== 0) {
        valid = false;
        break;
      }
      total += values[node] ?? 0;
    }
    if (valid) best = Math.max(best, total);
  }

  return best;
}

describe('max-independent-set module', () => {
  it('produces valid steps matching the exhaustive subset reference on 20 seeded trees', () => {
    runModuleChecks(maxIndependentSetModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const length = rngInt(rng, 1, 7);
        const parents = Array.from({ length }, (_value, index) =>
          index === 0 ? -1 : rngInt(rng, -1, index - 1),
        );
        const values = Array.from({ length }, () => rngInt(rng, 1, 9));
        return { parents, values };
      },
    });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(maxIndependentSetModule.generateSteps(FALLBACK, mode))).toBe(6);
    expect(
      finalAnswer(maxIndependentSetModule.generateSteps({ parents: [-1], values: [7] }, mode)),
    ).toBe(7);
    expect(
      finalAnswer(maxIndependentSetModule.generateSteps({ parents: [-1, 0], values: [9, 1] }, mode)),
    ).toBe(9);
    expect(
      finalAnswer(
        maxIndependentSetModule.generateSteps({ parents: [-1, 0, 1], values: [1, 2, 3] }, mode),
      ),
    ).toBe(4);
    expect(
      finalAnswer(
        maxIndependentSetModule.generateSteps(
          { parents: [-1, 0, 0, 0], values: [1, 9, 9, 9] },
          mode,
        ),
      ),
    ).toBe(27);
    expect(
      finalAnswer(
        maxIndependentSetModule.generateSteps({ parents: [-1, 0, -1], values: [5, 4, 9] }, mode),
      ),
    ).toBe(14);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(maxIndependentSetModule.quiz).toHaveLength(4);
    for (const question of maxIndependentSetModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(maxIndependentSetModule.defaultInput).toEqual(FALLBACK);
    expect(maxIndependentSetModule.renderer).toBe('treeDP');
    expect(maxIndependentSetModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...maxIndependentSetModule.defaultInput };
    expect(validateInput(maxIndependentSetModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      maxIndependentSetModule.code.python,
      maxIndependentSetModule.code.javascript,
      maxIndependentSetModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(11);

    for (const snippet of snippets) {
      expect(snippet).toContain('skip');
      expect(snippet).toContain('take');
      expect(snippet).toContain('answer');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        maxIndependentSetModule
          .generateSteps(FALLBACK, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
