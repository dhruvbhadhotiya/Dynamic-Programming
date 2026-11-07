import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import treeDiameterModule from './tree-diameter.problem';
import type { TreeDiameterInput } from './tree-diameter.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const FALLBACK = [1, 2, 3, 4, 5, -1, -1];

interface TreeShape {
  ids: number[];
  parent: Array<number | null>;
  left: Array<number | null>;
  right: Array<number | null>;
}

function normalizeRaw(input: TreeDiameterInput): number[] {
  const raw = Array.isArray(input.nodes) ? input.nodes.slice(0, 7) : [];
  if (raw.length === 0) return [...FALLBACK];
  if (typeof raw[0] !== 'number' || !Number.isFinite(raw[0]) || raw[0] < 0) {
    return [...FALLBACK];
  }
  return raw;
}

function treeShape(input: TreeDiameterInput): TreeShape {
  const raw = normalizeRaw(input);
  const exists: boolean[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    if (index === 0) {
      exists.push(true);
      continue;
    }
    const parentIndex = Math.floor((index - 1) / 2);
    const value = raw[index];
    exists.push(
      exists[parentIndex] === true &&
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0,
    );
  }

  const ids: number[] = [];
  const parent: Array<number | null> = [];
  const nodeIndexByLevel = new Map<number, number>();

  for (let index = 0; index < exists.length; index += 1) {
    if (!exists[index]) continue;
    nodeIndexByLevel.set(index, ids.length);
    ids.push(index);
    parent.push(index === 0 ? null : (nodeIndexByLevel.get(Math.floor((index - 1) / 2)) ?? null));
  }

  const left: Array<number | null> = Array.from({ length: ids.length }, () => null);
  const right: Array<number | null> = Array.from({ length: ids.length }, () => null);
  for (let nodeIndex = 1; nodeIndex < ids.length; nodeIndex += 1) {
    const parentIndex = parent[nodeIndex];
    if (parentIndex === null || parentIndex === undefined) continue;
    if (left[parentIndex] === null) left[parentIndex] = nodeIndex;
    else if (right[parentIndex] === null) right[parentIndex] = nodeIndex;
  }

  return { ids, parent, left, right };
}

/** Independent reference: build the undirected tree, then take the largest BFS distance. */
function reference(input: TreeDiameterInput): number {
  const { ids, parent } = treeShape(input);
  const adjacency: number[][] = ids.map(() => []);

  for (let nodeIndex = 1; nodeIndex < ids.length; nodeIndex += 1) {
    const parentIndex = parent[nodeIndex];
    if (parentIndex === null || parentIndex === undefined) continue;
    adjacency[nodeIndex]?.push(parentIndex);
    adjacency[parentIndex]?.push(nodeIndex);
  }

  let best = 0;
  for (let start = 0; start < ids.length; start += 1) {
    const distance = new Array<number>(ids.length).fill(-1);
    distance[start] = 0;
    const queue = [start];
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head];
      if (node === undefined) continue;
      for (const next of adjacency[node] ?? []) {
        if (distance[next] !== -1) continue;
        distance[next] = (distance[node] ?? 0) + 1;
        best = Math.max(best, distance[next]);
        queue.push(next);
      }
    }
  }

  return best;
}

describe('tree-diameter module', () => {
  it('produces valid steps matching the all-pairs BFS reference on 20 seeded trees', () => {
    runModuleChecks(treeDiameterModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const length = rngInt(rng, 1, 7);
        const nodes = Array.from({ length }, (_value, index) =>
          index === 0
            ? rngInt(rng, 1, 9)
            : rngInt(rng, 0, 3) === 0
              ? -1
              : rngInt(rng, 1, 9),
        );
        return { nodes };
      },
    });
  });

  it.each(MODES)('returns known diameters in %s mode', (mode) => {
    expect(finalAnswer(treeDiameterModule.generateSteps({ nodes: FALLBACK }, mode))).toBe(3);
    expect(finalAnswer(treeDiameterModule.generateSteps({ nodes: [1] }, mode))).toBe(0);
    expect(finalAnswer(treeDiameterModule.generateSteps({ nodes: [1, 2] }, mode))).toBe(1);
    expect(finalAnswer(treeDiameterModule.generateSteps({ nodes: [1, 2, 3] }, mode))).toBe(2);
    expect(finalAnswer(treeDiameterModule.generateSteps({ nodes: [1, 2, 3, 4, 5, 6, 7] }, mode))).toBe(
      4,
    );
    expect(finalAnswer(treeDiameterModule.generateSteps({ nodes: [1, 2, -1, 3] }, mode))).toBe(2);
    expect(finalAnswer(treeDiameterModule.generateSteps({ nodes: [1, -1, 2, 3] }, mode))).toBe(1);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(treeDiameterModule.quiz).toHaveLength(4);
    for (const question of treeDiameterModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(treeDiameterModule.defaultInput).toEqual({ nodes: FALLBACK });
    expect(treeDiameterModule.renderer).toBe('treeDP');
    expect(treeDiameterModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...treeDiameterModule.defaultInput };
    expect(validateInput(treeDiameterModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      treeDiameterModule.code.python,
      treeDiameterModule.code.javascript,
      treeDiameterModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      expect(snippet).toContain('best');
      expect(snippet).toContain('return best');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        treeDiameterModule
          .generateSteps({ nodes: FALLBACK }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
