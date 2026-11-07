import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import houseRobberIiiModule from './house-robber-iii.problem';
import type { HouseRobberIiiInput } from './house-robber-iii.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const FALLBACK = [3, 2, 3, -1, 3, -1, 1];

interface RobberTree {
  values: number[];
  left: Array<number | null>;
  right: Array<number | null>;
}

function normalizeRaw(input: HouseRobberIiiInput): number[] {
  const raw = Array.isArray(input.nodes) ? input.nodes.slice(0, 7) : [];
  if (raw.length === 0) return [...FALLBACK];
  if (typeof raw[0] !== 'number' || !Number.isFinite(raw[0]) || raw[0] < 0) {
    return [...FALLBACK];
  }
  return raw;
}

function buildTree(input: HouseRobberIiiInput): RobberTree {
  const raw = normalizeRaw(input);
  const exists: boolean[] = [];
  const valuesByLevel: number[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    if (index === 0) {
      exists.push(true);
      valuesByLevel.push(Math.max(0, Math.trunc(raw[0] ?? 0)));
      continue;
    }
    const parent = Math.floor((index - 1) / 2);
    const value = raw[index];
    const valid =
      exists[parent] === true &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0;
    exists.push(valid);
    valuesByLevel.push(valid ? Math.max(0, Math.trunc(value)) : -1);
  }

  const values: number[] = [];
  const levelToNode = new Map<number, number>();
  for (let index = 0; index < exists.length; index += 1) {
    if (!exists[index]) continue;
    levelToNode.set(index, values.length);
    values.push(valuesByLevel[index] ?? 0);
  }

  const left: Array<number | null> = Array.from({ length: values.length }, () => null);
  const right: Array<number | null> = Array.from({ length: values.length }, () => null);
  for (let index = 1; index < exists.length; index += 1) {
    if (!exists[index]) continue;
    const parentNode = levelToNode.get(Math.floor((index - 1) / 2));
    const childNode = levelToNode.get(index);
    if (parentNode === undefined || childNode === undefined) continue;
    if (index % 2 === 1) left[parentNode] = childNode;
    else right[parentNode] = childNode;
  }

  return { values, left, right };
}

/** Independent reference: try every subset that never robs a parent and child together. */
function reference(input: HouseRobberIiiInput): number {
  const tree = buildTree(input);
  const n = tree.values.length;
  const parent: number[] = new Array<number>(n).fill(-1);

  for (let node = 0; node < n; node += 1) {
    const leftChild = tree.left[node];
    const rightChild = tree.right[node];
    if (leftChild !== null && leftChild !== undefined) parent[leftChild] = node;
    if (rightChild !== null && rightChild !== undefined) parent[rightChild] = node;
  }

  let best = 0;
  for (let mask = 0; mask < 1 << n; mask += 1) {
    let valid = true;
    let total = 0;
    for (let node = 0; node < n; node += 1) {
      if ((mask & (1 << node)) === 0) continue;
      const parentNode = parent[node] ?? -1;
      if (parentNode >= 0 && (mask & (1 << parentNode)) !== 0) {
        valid = false;
        break;
      }
      total += tree.values[node] ?? 0;
    }
    if (valid) best = Math.max(best, total);
  }

  return best;
}

describe('house-robber-iii module', () => {
  it('produces valid steps matching the exhaustive robbery reference on 20 seeded trees', () => {
    runModuleChecks(houseRobberIiiModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const length = rngInt(rng, 1, 7);
        const nodes = Array.from({ length }, (_value, index) =>
          index === 0
            ? rngInt(rng, 1, 9)
            : rngInt(rng, 0, 3) === 0
              ? -1
              : rngInt(rng, 0, 9),
        );
        return { nodes };
      },
    });
  });

  it.each(MODES)('returns known hauls in %s mode', (mode) => {
    expect(finalAnswer(houseRobberIiiModule.generateSteps({ nodes: FALLBACK }, mode))).toBe(7);
    expect(finalAnswer(houseRobberIiiModule.generateSteps({ nodes: [3] }, mode))).toBe(3);
    expect(finalAnswer(houseRobberIiiModule.generateSteps({ nodes: [3, 2] }, mode))).toBe(3);
    expect(finalAnswer(houseRobberIiiModule.generateSteps({ nodes: [3, 2, 3] }, mode))).toBe(5);
    expect(
      finalAnswer(
        houseRobberIiiModule.generateSteps({ nodes: [3, 4, 5, 1, 3, -1, 1] }, mode),
      ),
    ).toBe(9);
    expect(finalAnswer(houseRobberIiiModule.generateSteps({ nodes: [0] }, mode))).toBe(0);
    expect(
      finalAnswer(houseRobberIiiModule.generateSteps({ nodes: [1, -1, 2, 3] }, mode)),
    ).toBe(2);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(houseRobberIiiModule.quiz).toHaveLength(4);
    for (const question of houseRobberIiiModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(houseRobberIiiModule.defaultInput).toEqual({ nodes: FALLBACK });
    expect(houseRobberIiiModule.renderer).toBe('treeDP');
    expect(houseRobberIiiModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...houseRobberIiiModule.defaultInput };
    expect(validateInput(houseRobberIiiModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      houseRobberIiiModule.code.python,
      houseRobberIiiModule.code.javascript,
      houseRobberIiiModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(10);

    for (const snippet of snippets) {
      expect(snippet).toContain('rob');
      expect(snippet).toContain('skip');
      expect(snippet).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        houseRobberIiiModule
          .generateSteps({ nodes: FALLBACK }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
