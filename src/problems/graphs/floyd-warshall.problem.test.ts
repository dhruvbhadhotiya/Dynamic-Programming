import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode, Table2DState } from '../../engine/types';
import floydWarshallModule from './floyd-warshall.problem';
import type { FloydWarshallInput } from './floyd-warshall.problem';

const MODES: readonly Mode[] = ['tabulation'];
const FALLBACK = [
  [0, 3, 9, -1],
  [-1, 0, 1, 6],
  [-1, -1, 0, 2],
  [-1, -1, -1, 0],
];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: FloydWarshallInput): number[][] {
  const raw = Array.isArray(input.graph) ? input.graph : [];
  const rows = raw.slice(0, 6).filter((row): row is number[] => Array.isArray(row));
  const source = rows.length > 0 ? rows : FALLBACK;
  const n = Math.max(1, Math.min(6, source.length));
  return Array.from({ length: n }, (_row, i) =>
    Array.from({ length: n }, (_cell, j) => {
      if (i === j) return 0;
      const cell = source[i]?.[j];
      return typeof cell === 'number' && Number.isFinite(cell) && cell > 0
        ? clampInt(cell, 1, 9)
        : -1;
    }),
  );
}

/** Independent reference: Dijkstra from v0, then read the distance to the last vertex. */
function reference(input: FloydWarshallInput): number {
  const weights = normalize(input);
  const n = weights.length;
  const dist = new Array<number>(n).fill(Number.POSITIVE_INFINITY);
  const done = new Array<boolean>(n).fill(false);
  dist[0] = 0;

  for (let round = 0; round < n; round += 1) {
    let u = -1;
    for (let node = 0; node < n; node += 1) {
      if (done[node]) continue;
      if (u < 0 || (dist[node] ?? Number.POSITIVE_INFINITY) < (dist[u] ?? Number.POSITIVE_INFINITY)) {
        u = node;
      }
    }
    if (u < 0 || dist[u] === Number.POSITIVE_INFINITY) break;
    done[u] = true;
    const base = dist[u] ?? 0;
    for (let v = 0; v < n; v += 1) {
      const weight = weights[u]?.[v] ?? -1;
      if (weight <= 0) continue;
      if (base + weight < (dist[v] ?? Number.POSITIVE_INFINITY)) dist[v] = base + weight;
    }
  }

  const target = dist[n - 1] ?? Number.POSITIVE_INFINITY;
  return target === Number.POSITIVE_INFINITY ? -1 : target;
}

describe('floyd-warshall module', () => {
  it('produces valid steps matching the Dijkstra reference on 20 seeded graphs', () => {
    runModuleChecks(floydWarshallModule, reference, {
      cases: 20,
      seed: 11,
      inputGenerator: (rng) => {
        const n = rngInt(rng, 1, 6);
        const graph = Array.from({ length: n }, (_row, i) =>
          Array.from({ length: n }, (_cell, j) =>
            i === j ? 0 : rngInt(rng, 0, 3) === 0 ? -1 : rngInt(rng, 1, 9),
          ),
        );
        return { graph };
      },
    });
  });

  it.each(MODES)('returns known all-pairs answers in %s mode', (mode) => {
    const answer = (graph: number[][]): number =>
      Number(finalAnswer(floydWarshallModule.generateSteps({ graph }, mode)));

    expect(answer(FALLBACK)).toBe(6);
    expect(answer([[0]])).toBe(0);
    expect(answer([[0, 5], [-1, 0]])).toBe(5);
    expect(answer([[0, -1], [-1, 0]])).toBe(-1);
    expect(answer([[0, 2, -1], [-1, 0, 3], [-1, -1, 0]])).toBe(5);
    expect(answer([[0, 4, 9], [-1, 0, 3], [-1, -1, 0]])).toBe(7);
  });

  it.each(MODES)('leaves the full final distance table in %s mode', (mode) => {
    const steps = floydWarshallModule.generateSteps({ graph: FALLBACK }, mode);
    const last = steps.at(-1);
    const state = last?.state as Table2DState;

    expect(state.kind).toBe('table2d');
    expect(state.values[0]?.[0]).toBe(0);
    expect(state.values[0]?.[2]).toBe(4);
    expect(state.values[0]?.[3]).toBe(6);
    expect(state.values[1]?.[3]).toBe(3);
    expect(state.values[2]?.[3]).toBe(2);
    expect(last?.vars?.answer).toBe(6);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(floydWarshallModule.quiz).toHaveLength(4);
    for (const question of floydWarshallModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(floydWarshallModule.defaultInput).toEqual({ graph: FALLBACK });
    expect(floydWarshallModule.renderer).toBe('table2d');
    expect(floydWarshallModule.modes).toEqual(['tabulation']);
    const values: Record<string, unknown> = { ...floydWarshallModule.defaultInput };
    expect(validateInput(floydWarshallModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      floydWarshallModule.code.python,
      floydWarshallModule.code.javascript,
      floydWarshallModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(10);

    for (const snippet of snippets) {
      expect(snippet).toContain('dist');
      expect(snippet).toContain('return');
      expect(snippet).toContain('k');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        floydWarshallModule
          .generateSteps({ graph: FALLBACK }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
