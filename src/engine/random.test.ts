import { describe, expect, it } from 'vitest';
import { StepRecorder } from './dpHelpers';
import { createRng, rngInt, rngPick, rngShuffle } from './random';
import { runModuleChecks } from './testUtils';
import type { ProblemModule, Table1DState } from './types';

interface FakeInput {
  n: number;
}

function makeFakeModule(modes?: ProblemModule<FakeInput>['modes']): ProblemModule<FakeInput> {
  const fakeModule: ProblemModule<FakeInput> = {
    id: 'fake-add',
    title: 'Fake Add',
    category: '1d',
    difficulty: 'easy',
    summary: 'Doubles n.',
    stateDefinition: 'answer = 2 * n',
    recurrence: 'none',
    complexity: { time: 'O(1)', space: 'O(1)' },
    renderer: 'table1d',
    inputSchema: [{ name: 'n', label: 'N', type: 'number', min: 1, max: 10 }],
    defaultInput: { n: 3 },
    generateSteps(input, mode) {
      const recorder = new StepRecorder<Table1DState>(
        { kind: 'table1d', values: [null], indexName: 'n' },
        { codeLine: 1 },
      );
      const answer = input.n * 2;
      recorder.fill([0], answer, `The answer (${mode}) is ${answer}.`, {
        kind: 'result',
        vars: { answer },
      });
      return [...recorder.steps];
    },
    code: {
      python: 'def f(n):\n    return n * 2',
      javascript: 'const f = (n) => n * 2;',
      cpp: 'int f(int n) {\n  return n * 2;\n}',
    },
    quiz: [
      { q: 'Q1?', options: ['a', 'b'], answer: 0, why: 'because' },
      { q: 'Q2?', options: ['a', 'b'], answer: 1, why: 'because' },
      { q: 'Q3?', options: ['a', 'b'], answer: 0, why: 'because' },
    ],
  };
  if (modes !== undefined) {
    return { ...fakeModule, modes };
  }
  return fakeModule;
}

const fakeReference = (input: FakeInput): number => input.n * 2;

describe('random helpers', () => {
  it('is deterministic for the same seed', () => {
    const sequence = (seed: number): number[] => {
      const rng = createRng(seed);
      return [rng(), rng(), rng(), rng(), rng()];
    };
    expect(sequence(42)).toEqual(sequence(42));
    expect(sequence(42)).not.toEqual(sequence(43));
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('generates integers inside inclusive bounds', () => {
    const rng = createRng(99);
    for (let i = 0; i < 200; i += 1) {
      const value = rngInt(rng, -5, 10);
      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThanOrEqual(10);
      expect(Number.isInteger(value)).toBe(true);
    }
    expect(rngInt(createRng(1), 4, 4)).toBe(4);
    expect(() => rngInt(createRng(1), 10, 2)).toThrow(RangeError);
  });

  it('picks elements from the input list', () => {
    const rng = createRng(5);
    const items = ['x', 'y', 'z'];
    for (let i = 0; i < 50; i += 1) {
      expect(items).toContain(rngPick(rng, items));
    }
    expect(() => rngPick(createRng(1), [])).toThrow(RangeError);
  });

  it('shuffles without mutating and preserves elements', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const rng = createRng(123);
    const shuffled = rngShuffle(rng, original);
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
    expect(shuffled).not.toBe(original);

    let sawDifferentOrder = false;
    for (let seed = 1; seed <= 20 && !sawDifferentOrder; seed += 1) {
      if (rngShuffle(createRng(seed), original).join(',') !== original.join(',')) {
        sawDifferentOrder = true;
      }
    }
    expect(sawDifferentOrder).toBe(true);
  });
});

describe('runModuleChecks', () => {
  it('passes for a correct reference', () => {
    expect(() => runModuleChecks(makeFakeModule(), fakeReference, { cases: 5, seed: 7 })).not.toThrow();
  });

  it('uses a custom inputGenerator when provided', () => {
    expect(() =>
      runModuleChecks(makeFakeModule(), fakeReference, {
        cases: 3,
        inputGenerator: (_rng, _index) => ({ n: 4 }),
      }),
    ).not.toThrow();
  });

  it('respects module.modes (only those modes run)', () => {
    const seen: string[] = [];
    const mod = makeFakeModule(['memo']);
    const wrapped: ProblemModule<FakeInput> = {
      ...mod,
      generateSteps(input, mode) {
        seen.push(mode);
        return mod.generateSteps(input, mode);
      },
    };
    runModuleChecks(wrapped, fakeReference, { cases: 2, seed: 3 });
    expect(seen.every((mode) => mode === 'memo')).toBe(true);
    expect(seen.length).toBe(2);
  });

  it('throws when the reference disagrees', () => {
    expect(() =>
      runModuleChecks(makeFakeModule(), (input) => input.n * 2 + 1, { cases: 2, seed: 7 }),
    ).toThrow(/fake-add/);
  });

  it('throws when the final message does not mention the answer', () => {
    const mod = makeFakeModule();
    const broken: ProblemModule<FakeInput> = {
      ...mod,
      generateSteps(input, mode) {
        const steps = mod.generateSteps(input, mode);
        const last = steps.at(-1);
        if (last) {
          last.message = 'Done.';
        }
        return steps;
      },
    };
    expect(() => runModuleChecks(broken, fakeReference, { cases: 1 })).toThrow(/answer/);
  });
});
