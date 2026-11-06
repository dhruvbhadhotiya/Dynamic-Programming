import { describe, expect, it } from 'vitest';
import {
  StepRecorder,
  clamp,
  create2D,
  finalAnswer,
  range,
  sum,
} from './dpHelpers';
import type { Table2DState } from './types';

const blank = (): Table2DState => ({
  kind: 'table2d',
  values: [
    [null, null, null],
    [null, null, null],
  ],
  rowHeader: 'item',
  colHeader: 'capacity',
});

describe('StepRecorder', () => {
  it('never leaks state between snapshots', () => {
    const initial = blank();
    const rec = new StepRecorder(initial, { codeLine: 4 });
    initial.values[0]![0] = 99;

    rec.fill([0, 0], 0, 'Base row is zero.', { kind: 'base', codeLine: 3 });
    rec.fill([1, 1], 5, 'Take five.', {
      highlights: [{ pos: [0, 0], kind: 'dependency', label: 'above' }],
      vars: { row: 1, col: 1 },
    });

    const steps = rec.steps;
    expect(steps).toHaveLength(2);
    const first = steps[0]!.state as Table2DState;
    const second = steps[1]!.state as Table2DState;
    expect(first.values[0]![0]).toBe(0);
    expect(second.values[0]![0]).toBe(0);
    expect(second.values[1]![1]).toBe(5);
    expect(steps[1]!.highlights[0]).toMatchObject({ pos: [1, 1], kind: 'active' });
    expect(steps[1]!.highlights[1]).toMatchObject({ pos: [0, 0], kind: 'dependency' });
    expect(steps[1]!.codeLine).toBe(4);
    expect(rec.valueAt([1, 1])).toBe(5);
  });

  it('supports 1D tables and explicit line changes', () => {
    const rec = new StepRecorder(
      { kind: 'table1d', values: [null, null], indexName: 'i' },
      { codeLine: 2 },
    );
    rec.fill([0], 1, 'First value.', { kind: 'base' });
    rec.at(6).fill([1], 2, 'Second value.');
    expect(rec.steps[1]!.codeLine).toBe(6);
    expect(rec.read().values).toEqual([1, 2]);
  });

  it('rejects out-of-range writes', () => {
    const rec = new StepRecorder({ kind: 'table1d', values: [null] });
    expect(() => rec.fill([4], 1, 'Bad write.')).toThrow(/outside/);
  });
});

describe('table and value helpers', () => {
  it('creates independent rows', () => {
    const grid = create2D(2, 2, () => 0);
    grid[0]![0] = 7;
    expect(grid[1]![0]).toBe(0);
    expect(range(3)).toEqual([0, 1, 2]);
  });

  it('handles numbers and final answers', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(-1, 0, 10)).toBe(0);
    const steps = [
      { state: {}, highlights: [], codeLine: 1, message: 'Start' },
      { state: {}, highlights: [], codeLine: 2, message: 'Done', vars: { answer: 42 } },
    ];
    expect(finalAnswer(steps)).toBe(42);
    expect(() => finalAnswer([])).toThrow(/vars.answer/);
  });
});
