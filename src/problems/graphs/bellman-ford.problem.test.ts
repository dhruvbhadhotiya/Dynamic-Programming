import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { DagGraphState, Mode } from '../../engine/types';
import bellmanFordModule from './bellman-ford.problem';
import type { BellmanFordInput } from './bellman-ford.problem';

const MODES: readonly Mode[] = ['tabulation'];
const FALLBACK = [
  [0, 6, 7, 0, 0],
  [0, 0, 8, 5, -4],
  [0, 0, 0, -3, 9],
  [0, -2, 0, 0, 0],
  [2, 0, 0, 7, 0],
];
const INF = Number.POSITIVE_INFINITY;

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: BellmanFordInput): number[][] {
  const raw = Array.isArray(input.graph) ? input.graph : [];
  const rows = raw.slice(0, 5).filter((row): row is number[] => Array.isArray(row));
  const source = rows.length > 0 ? rows : FALLBACK;
  const n = Math.max(1, Math.min(5, source.length));
  return Array.from({ length: n }, (_row, i) =>
    Array.from({ length: n }, (_cell, j) => {
      if (i === j) return 0;
      const cell = source[i]?.[j];
      return typeof cell === 'number' && Number.isFinite(cell) && cell !== 0
        ? clampInt(cell, -9, 9)
        : 0;
    }),
  );
}

function at(matrix: number[][], i: number, j: number): number {
  return matrix[i]?.[j] ?? INF;
}

/** Independent reference: Floyd–Warshall, then check for a negative cycle reachable from v0. */
function reference(input: BellmanFordInput): number | string {
  const weights = normalize(input);
  const n = weights.length;
  const dist: number[][] = weights.map((row, i) =>
    row.map((weight, j) => (i === j ? 0 : weight === 0 ? INF : weight)),
  );

  for (let k = 0; k < n; k += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const candidate = at(dist, i, k) + at(dist, k, j);
        if (candidate < at(dist, i, j)) {
          const row = dist[i];
          if (row) row[j] = candidate;
        }
      }
    }
  }

  for (let k = 0; k < n; k += 1) {
    if (at(dist, k, k) < 0 && at(dist, 0, k) < INF) return 'negative-cycle';
  }

  const target = at(dist, 0, n - 1);
  return target === INF ? 'unreachable' : target;
}

describe('bellman-ford module', () => {
  it('produces valid steps matching the Floyd-Warshall reference on 20 seeded graphs', () => {
    runModuleChecks(bellmanFordModule, reference, {
      cases: 20,
      seed: 13,
      inputGenerator: (rng) => {
        const n = rngInt(rng, 1, 5);
        const graph = Array.from({ length: n }, (_row, i) =>
          Array.from({ length: n }, (_cell, j) => {
            if (i === j) return 0;
            if (rngInt(rng, 0, 9) < 4) return 0;
            const weight = rngInt(rng, -9, 9);
            return weight === 0 ? 1 : weight;
          }),
        );
        return { graph };
      },
    });
  });

  it.each(MODES)('returns known answers in %s mode', (mode) => {
    const answer = (graph: number[][]): unknown =>
      finalAnswer(bellmanFordModule.generateSteps({ graph }, mode));

    expect(answer(FALLBACK)).toBe(-2);
    expect(answer([[0]])).toBe(0);
    expect(answer([[0, -5], [0, 0]])).toBe(-5);
    expect(answer([[0, 0], [0, 0]])).toBe('unreachable');
    expect(answer([[0, 1], [1, 0]])).toBe(1);
    expect(
      answer([
        [0, 1, 0],
        [0, 0, -2],
        [0, 1, 0],
      ]),
    ).toBe('negative-cycle');
    expect(
      answer([
        [0, 0, 0, 0],
        [0, 0, -2, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ]),
    ).toBe('unreachable');
    expect(
      answer([
        [0, 1, 0, 0],
        [0, 0, -2, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ]),
    ).toBe('negative-cycle');
  });

  it('leaves the final distance details on the graph in tabulation mode', () => {
    const steps = bellmanFordModule.generateSteps({ graph: FALLBACK }, 'tabulation');
    const last = steps.at(-1);

    expect(last?.vars?.answer).toBe(-2);
    expect(last?.message.toLowerCase()).toContain('answer');
    const state = last?.state as DagGraphState;
    expect(state.kind).toBe('dagGraph');
    expect(state.nodes.map((node) => node.detail)).toContain('dist -2');
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(bellmanFordModule.quiz).toHaveLength(4);
    for (const question of bellmanFordModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(bellmanFordModule.defaultInput).toEqual({ graph: FALLBACK });
    expect(bellmanFordModule.renderer).toBe('dagGraph');
    expect(bellmanFordModule.modes).toEqual(['tabulation']);
    const values: Record<string, unknown> = { ...bellmanFordModule.defaultInput };
    expect(validateInput(bellmanFordModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      bellmanFordModule.code.python,
      bellmanFordModule.code.javascript,
      bellmanFordModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(12);

    for (const snippet of snippets) {
      expect(snippet).toContain('dist');
      expect(snippet).toContain('edges');
      expect(snippet).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        bellmanFordModule
          .generateSteps({ graph: FALLBACK }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
