import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import binaryTreeCamerasModule from './binary-tree-cameras.problem';
import type { BinaryTreeCamerasInput } from './binary-tree-cameras.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const FALLBACK = [0, 0, -1, 0, 0];

interface CameraTree {
  left: Array<number | null>;
  right: Array<number | null>;
  parent: number[];
}

function normalizeRaw(input: BinaryTreeCamerasInput): number[] {
  const raw = Array.isArray(input.nodes) ? input.nodes.slice(0, 7) : [];
  if (raw.length === 0) return [...FALLBACK];
  if (typeof raw[0] !== 'number' || !Number.isFinite(raw[0]) || raw[0] < 0) {
    return [...FALLBACK];
  }
  return raw;
}

function buildTree(input: BinaryTreeCamerasInput): CameraTree {
  const raw = normalizeRaw(input);
  const exists: boolean[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    if (index === 0) {
      exists.push(true);
      continue;
    }
    const parent = Math.floor((index - 1) / 2);
    const value = raw[index];
    exists.push(
      exists[parent] === true &&
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0,
    );
  }

  const levelToNode = new Map<number, number>();
  for (let index = 0; index < exists.length; index += 1) {
    if (exists[index]) levelToNode.set(index, levelToNode.size);
  }

  const n = levelToNode.size;
  const left: Array<number | null> = Array.from({ length: n }, () => null);
  const right: Array<number | null> = Array.from({ length: n }, () => null);
  const parent: number[] = new Array<number>(n).fill(-1);

  for (let index = 1; index < exists.length; index += 1) {
    if (!exists[index]) continue;
    const parentNode = levelToNode.get(Math.floor((index - 1) / 2));
    const childNode = levelToNode.get(index);
    if (parentNode === undefined || childNode === undefined) continue;
    if (index % 2 === 1) left[parentNode] = childNode;
    else right[parentNode] = childNode;
    parent[childNode] = parentNode;
  }

  return { left, right, parent };
}

/** Independent reference: try every camera subset and check coverage. */
function reference(input: BinaryTreeCamerasInput): number {
  const tree = buildTree(input);
  const n = tree.parent.length;
  let best = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 1 << n; mask += 1) {
    let covered = true;
    let cameras = 0;
    for (let node = 0; node < n; node += 1) {
      if ((mask & (1 << node)) !== 0) cameras += 1;
    }
    if (cameras >= best) continue;

    for (let node = 0; node < n && covered; node += 1) {
      const own = (mask & (1 << node)) !== 0;
      const parentNode = tree.parent[node] ?? -1;
      const parentCamera = parentNode >= 0 && (mask & (1 << parentNode)) !== 0;
      const leftChild = tree.left[node];
      const rightChild = tree.right[node];
      const childCamera =
        (leftChild !== null && leftChild !== undefined && (mask & (1 << leftChild)) !== 0) ||
        (rightChild !== null && rightChild !== undefined && (mask & (1 << rightChild)) !== 0);
      if (!own && !parentCamera && !childCamera) covered = false;
    }

    if (covered) best = cameras;
  }

  return best;
}

describe('binary-tree-cameras module', () => {
  it('produces valid steps matching the exhaustive camera-subset reference on 20 seeded trees', () => {
    runModuleChecks(binaryTreeCamerasModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const length = rngInt(rng, 1, 7);
        const nodes = Array.from({ length }, (_value, index) =>
          index === 0 ? 0 : rngInt(rng, 0, 3) === 0 ? -1 : 0,
        );
        return { nodes };
      },
    });
  });

  it.each(MODES)('returns known camera counts in %s mode', (mode) => {
    expect(finalAnswer(binaryTreeCamerasModule.generateSteps({ nodes: FALLBACK }, mode))).toBe(1);
    expect(finalAnswer(binaryTreeCamerasModule.generateSteps({ nodes: [0] }, mode))).toBe(1);
    expect(finalAnswer(binaryTreeCamerasModule.generateSteps({ nodes: [0, 0] }, mode))).toBe(1);
    expect(finalAnswer(binaryTreeCamerasModule.generateSteps({ nodes: [0, 0, 0] }, mode))).toBe(1);
    expect(
      finalAnswer(binaryTreeCamerasModule.generateSteps({ nodes: [0, 0, 0, 0, 0, 0, 0] }, mode)),
    ).toBe(2);
    expect(
      finalAnswer(binaryTreeCamerasModule.generateSteps({ nodes: [0, 0, -1, 0] }, mode)),
    ).toBe(1);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(binaryTreeCamerasModule.quiz).toHaveLength(4);
    for (const question of binaryTreeCamerasModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(binaryTreeCamerasModule.defaultInput).toEqual({ nodes: FALLBACK });
    expect(binaryTreeCamerasModule.renderer).toBe('treeDP');
    expect(binaryTreeCamerasModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...binaryTreeCamerasModule.defaultInput };
    expect(validateInput(binaryTreeCamerasModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      binaryTreeCamerasModule.code.python,
      binaryTreeCamerasModule.code.javascript,
      binaryTreeCamerasModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(13);

    for (const snippet of snippets) {
      expect(snippet).toContain('cameras');
      expect(snippet).toContain('state');
      expect(snippet).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        binaryTreeCamerasModule
          .generateSteps({ nodes: FALLBACK }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
