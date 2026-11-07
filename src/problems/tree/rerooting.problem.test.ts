import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import rerootingModule from './rerooting.problem';
import type { RerootingInput } from './rerooting.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const FALLBACK = [-1, 0, 1, 2];

function normalize(input: RerootingInput): number[] {
  const raw = Array.isArray(input.parents) ? input.parents.slice(0, 7) : [];
  if (raw.length === 0) return [...FALLBACK];
  return raw.map((value, index) => {
    if (index === 0) return -1;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
    return Math.min(index - 1, Math.max(0, Math.trunc(value)));
  });
}

/** Independent reference: all-pairs BFS, then minimise each node's distance sum. */
function reference(input: RerootingInput): number {
  const parents = normalize(input);
  const n = parents.length;
  const adjacency: number[][] = Array.from({ length: n }, () => []);
  for (let node = 1; node < n; node += 1) {
    const parent = parents[node] ?? 0;
    adjacency[node]?.push(parent);
    adjacency[parent]?.push(node);
  }

  let best = Number.POSITIVE_INFINITY;
  for (let start = 0; start < n; start += 1) {
    const distance = new Array<number>(n).fill(-1);
    distance[start] = 0;
    const queue = [start];
    let total = 0;
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head];
      if (node === undefined) continue;
      for (const next of adjacency[node] ?? []) {
        if (distance[next] !== -1) continue;
        distance[next] = (distance[node] ?? 0) + 1;
        total += distance[next];
        queue.push(next);
      }
    }
    best = Math.min(best, total);
  }

  return best;
}

describe('rerooting module', () => {
  it('produces valid steps matching the all-pairs BFS reference on 20 seeded trees', () => {
    runModuleChecks(rerootingModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const length = rngInt(rng, 1, 7);
        const parents = Array.from({ length }, (_value, index) =>
          index === 0 ? -1 : rngInt(rng, 0, index - 1),
        );
        return { parents };
      },
    });
  });

  it.each(MODES)('returns known minimum totals in %s mode', (mode) => {
    expect(finalAnswer(rerootingModule.generateSteps({ parents: FALLBACK }, mode))).toBe(4);
    expect(finalAnswer(rerootingModule.generateSteps({ parents: [-1] }, mode))).toBe(0);
    expect(finalAnswer(rerootingModule.generateSteps({ parents: [-1, 0] }, mode))).toBe(1);
    expect(finalAnswer(rerootingModule.generateSteps({ parents: [-1, 0, 1] }, mode))).toBe(2);
    expect(finalAnswer(rerootingModule.generateSteps({ parents: [-1, 0, 0, 0] }, mode))).toBe(3);
    expect(
      finalAnswer(rerootingModule.generateSteps({ parents: [-1, 0, 0, 1, 1, 2, 2] }, mode)),
    ).toBe(10);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(rerootingModule.quiz).toHaveLength(4);
    for (const question of rerootingModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(rerootingModule.defaultInput).toEqual({ parents: FALLBACK });
    expect(rerootingModule.renderer).toBe('treeDP');
    expect(rerootingModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...rerootingModule.defaultInput };
    expect(validateInput(rerootingModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      rerootingModule.code.python,
      rerootingModule.code.javascript,
      rerootingModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(10);

    for (const snippet of snippets) {
      expect(snippet).toContain('size');
      expect(snippet).toContain('total');
      expect(snippet).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        rerootingModule
          .generateSteps({ parents: FALLBACK }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
