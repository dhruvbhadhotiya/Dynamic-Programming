import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { DagGraphState, Mode } from '../../engine/types';
import dagLongestPathModule from './dag-longest-path.problem';
import type { DagLongestPathInput } from './dag-longest-path.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const FALLBACK = [
  [0, 3, 2, 0],
  [0, 0, 5, 1],
  [0, 0, 0, 4],
  [0, 0, 0, 0],
];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: DagLongestPathInput): number[][] {
  const raw = Array.isArray(input.graph) ? input.graph : [];
  const rows = raw.slice(0, 6).filter((row): row is number[] => Array.isArray(row));
  const source = rows.length > 0 ? rows : FALLBACK;
  const n = Math.max(1, Math.min(6, source.length));
  return Array.from({ length: n }, (_value, i) =>
    Array.from({ length: n }, (_cell, j) => {
      const cell = source[i]?.[j];
      return j > i && typeof cell === 'number' && Number.isFinite(cell)
        ? clampInt(cell, 0, 9)
        : 0;
    }),
  );
}

/** Independent reference: enumerate every path from every start and keep the heaviest total. */
function reference(input: DagLongestPathInput): number {
  const matrix = normalize(input);
  const n = matrix.length;
  let best = 0;

  const walk = (u: number, total: number): void => {
    best = Math.max(best, total);
    for (let v = u + 1; v < n; v += 1) {
      const weight = matrix[u]?.[v] ?? 0;
      if (weight > 0) walk(v, total + weight);
    }
  };

  for (let start = 0; start < n; start += 1) walk(start, 0);
  return best;
}

describe('dag-longest-path module', () => {
  it('produces valid steps matching the exhaustive path reference on 20 seeded graphs', () => {
    runModuleChecks(dagLongestPathModule, reference, {
      cases: 20,
      seed: 7,
      inputGenerator: (rng) => {
        const n = rngInt(rng, 1, 6);
        const graph = Array.from({ length: n }, (_row, i) =>
          Array.from({ length: n }, (_cell, j) =>
            j > i && rngInt(rng, 0, 9) > 2 ? rngInt(rng, 1, 9) : 0,
          ),
        );
        return { graph };
      },
    });
  });

  it.each(MODES)('returns known longest distances in %s mode', (mode) => {
    const answer = (graph: number[][]): number =>
      Number(finalAnswer(dagLongestPathModule.generateSteps({ graph }, mode)));

    expect(answer(FALLBACK)).toBe(12);
    expect(answer([[0]])).toBe(0);
    expect(answer([[0, 7], [0, 0]])).toBe(7);
    expect(answer([[0, 2, 0], [0, 0, 3], [0, 0, 0]])).toBe(5);
    expect(answer([[0, 1, 9], [0, 0, 1], [0, 0, 0]])).toBe(9);
    expect(answer([[0, 0], [0, 0]])).toBe(0);
    expect(answer([[0, 1, 1], [0, 0, 1], [0, 0, 0]])).toBe(2);
  });

  it.each(MODES)('reconstructs the winning path in %s mode', (mode) => {
    const steps = dagLongestPathModule.generateSteps({ graph: FALLBACK }, mode);
    const last = steps.at(-1);

    expect(last?.vars?.path).toBe('v0 -> v1 -> v2 -> v3');
    expect(last?.vars?.answer).toBe(12);
    const state = last?.state as DagGraphState;
    expect(state.kind).toBe('dagGraph');
    expect(state.nodes).toHaveLength(4);
    expect(state.edges).toHaveLength(5);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(dagLongestPathModule.quiz).toHaveLength(4);
    for (const question of dagLongestPathModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(dagLongestPathModule.defaultInput).toEqual({ graph: FALLBACK });
    expect(dagLongestPathModule.renderer).toBe('dagGraph');
    expect(dagLongestPathModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...dagLongestPathModule.defaultInput };
    expect(validateInput(dagLongestPathModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      dagLongestPathModule.code.python,
      dagLongestPathModule.code.javascript,
      dagLongestPathModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(16);

    for (const snippet of snippets) {
      expect(snippet).toContain('dp');
      expect(snippet).toContain('nxt');
      expect(snippet).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        dagLongestPathModule
          .generateSteps({ graph: FALLBACK }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
