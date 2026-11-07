import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import shortestPathAllNodesModule from './shortest-path-all-nodes.problem';
import type { ShortestPathAllNodesInput } from './shortest-path-all-nodes.problem';

const FALLBACK: number[][] = [
  [0, 1, 1, 1],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: ShortestPathAllNodesInput): number[][] {
  const rawRows = Array.isArray(input.graph) ? input.graph : [];
  const width = rawRows[0]?.length ?? 0;
  const square =
    rawRows.length >= 2 &&
    width >= 2 &&
    rawRows.every((row) => Array.isArray(row) && row.length === width);

  if (!square) return FALLBACK.map((row) => [...row]);

  const n = clampInt(Math.min(rawRows.length, width), 2, 4);
  const isEdge = (row: number, col: number): boolean => {
    const forward = rawRows[row]?.[col];
    const backward = rawRows[col]?.[row];
    return (
      (typeof forward === 'number' && Number.isFinite(forward) && forward >= 1) ||
      (typeof backward === 'number' && Number.isFinite(backward) && backward >= 1)
    );
  };
  return Array.from({ length: n }, (_rowValue, row) =>
    Array.from({ length: n }, (_colValue, col) => (row !== col && isEdge(row, col) ? 1 : 0)),
  );
}

/** Independent reference: all-pairs shortest paths, then every visit order. */
function reference(input: ShortestPathAllNodesInput): number {
  const adj = normalize(input);
  const n = adj.length;
  const INF = 1e9;
  const dist: number[][] = adj.map((row, i) =>
    row.map((value, j) => (i === j ? 0 : value === 1 ? 1 : INF)),
  );

  for (let k = 0; k < n; k += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const through = (dist[i]?.[k] ?? INF) + (dist[k]?.[j] ?? INF);
        if (through < (dist[i]?.[j] ?? INF)) {
          const row = dist[i];
          if (row) row[j] = through;
        }
      }
    }
  }

  if (dist.some((row) => row.some((value) => value >= INF))) return -1;

  let best = Number.POSITIVE_INFINITY;
  const visit = (order: number[], remaining: number[]): void => {
    if (remaining.length === 0) {
      let total = 0;
      for (let i = 0; i + 1 < order.length; i += 1) {
        total += dist[order[i] ?? 0]?.[order[i + 1] ?? 0] ?? 0;
      }
      best = Math.min(best, total);
      return;
    }
    for (let i = 0; i < remaining.length; i += 1) {
      const node = remaining[i];
      if (node === undefined) continue;
      visit([...order, node], [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
    }
  };

  visit([], Array.from({ length: n }, (_value, i) => i));
  return best;
}

describe('shortest-path-all-nodes module', () => {
  it('produces valid steps matching the all-pairs-order reference on 20 seeded connected graphs', () => {
    runModuleChecks(shortestPathAllNodesModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const n = rngInt(rng, 2, 4);
        const graph = Array.from({ length: n }, () => new Array<number>(n).fill(0));
        for (let node = 1; node < n; node += 1) {
          const parent = rngInt(rng, 0, node - 1);
          const childRow = graph[node];
          const parentRow = graph[parent];
          if (childRow) childRow[parent] = 1;
          if (parentRow) parentRow[node] = 1;
        }
        return { graph };
      },
    });
  });

  it('returns known values in tabulation mode', () => {
    expect(
      finalAnswer(shortestPathAllNodesModule.generateSteps({ graph: FALLBACK }, 'tabulation')),
    ).toBe(4);
    expect(
      finalAnswer(
        shortestPathAllNodesModule.generateSteps(
          {
            graph: [
              [0, 1, 0, 0],
              [1, 0, 1, 0],
              [0, 1, 0, 1],
              [0, 0, 1, 0],
            ],
          },
          'tabulation',
        ),
      ),
    ).toBe(3);
    expect(
      finalAnswer(
        shortestPathAllNodesModule.generateSteps(
          {
            graph: [
              [0, 1],
              [1, 0],
            ],
          },
          'tabulation',
        ),
      ),
    ).toBe(1);
    expect(
      finalAnswer(
        shortestPathAllNodesModule.generateSteps(
          {
            graph: [
              [0, 1, 0],
              [1, 0, 0],
              [0, 0, 0],
            ],
          },
          'tabulation',
        ),
      ),
    ).toBe(-1);
    expect(
      finalAnswer(
        shortestPathAllNodesModule.generateSteps(
          {
            graph: [
              [0, 1, 1],
              [1, 0, 1],
              [1, 1, 0],
            ],
          },
          'tabulation',
        ),
      ),
    ).toBe(2);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(shortestPathAllNodesModule.quiz).toHaveLength(4);
    for (const question of shortestPathAllNodesModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(shortestPathAllNodesModule.defaultInput).toEqual({ graph: FALLBACK });
    expect(shortestPathAllNodesModule.renderer).toBe('table2d');
    expect(shortestPathAllNodesModule.modes).toEqual(['tabulation']);
    const values: Record<string, unknown> = { ...shortestPathAllNodesModule.defaultInput };
    expect(validateInput(shortestPathAllNodesModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      shortestPathAllNodesModule.code.python,
      shortestPathAllNodesModule.code.javascript,
      shortestPathAllNodesModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(9);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[7]).toContain('dist[');
      expect(snippet).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...shortestPathAllNodesModule
        .generateSteps({ graph: FALLBACK }, 'tabulation')
        .map((step) => step.codeLine),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
