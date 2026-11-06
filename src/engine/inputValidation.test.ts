import { describe, expect, it } from 'vitest';
import type { InputField } from './types';
import {
  draftsFromValues,
  parseDrafts,
  randomizeInput,
  validateInput,
  type InputValues,
} from './inputValidation';

const schema: InputField[] = [
  { name: 'n', label: 'N', type: 'number', min: 1, max: 12 },
  { name: 'text', label: 'Text', type: 'text', minLength: 2, maxLength: 6 },
  { name: 'nums', label: 'Numbers', type: 'array', itemType: 'number', minItems: 1, maxItems: 8, min: -5, max: 10 },
  { name: 'grid', label: 'Grid', type: 'matrix', minRows: 1, maxRows: 5, maxCols: 5, min: 0, max: 9, numeric: true },
  { name: 'mode', label: 'Mode', type: 'select', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
];

const valid: InputValues = { n: 4, text: 'abc', nums: [1, -2], grid: [[1, 2], [3, 4]], mode: 'a' };

describe('input validation', () => {
  it('accepts valid values and catches each kind of error', () => {
    expect(validateInput(schema, valid)).toEqual({});
    expect(validateInput(schema, { ...valid, n: 99 }).n).toMatch(/1 to 12/);
    expect(validateInput(schema, { ...valid, text: 'x' }).text).toMatch(/at least 2/);
    expect(validateInput(schema, { ...valid, nums: [1, 11] }).nums).toMatch(/in range/);
    expect(validateInput(schema, { ...valid, grid: [[1, 2], [3]] }).grid).toMatch(/same number/);
    expect(validateInput(schema, { ...valid, grid: [['x']] }).grid).toMatch(/number/);
    expect(validateInput(schema, { ...valid, mode: 'z' }).mode).toMatch(/options/);
  });

  it('round-trips values through editable drafts', () => {
    const drafts = draftsFromValues(schema, valid);
    expect(drafts).toMatchObject({ n: '4', text: 'abc', nums: '1, -2', mode: 'a' });
    const parsed = parseDrafts(schema, drafts);
    expect(parsed.ok).toBe(true);
    expect(parsed.values).toEqual(valid);
  });

  it('parses arrays and matrices from friendly text', () => {
    const result = parseDrafts(schema, {
      n: '3',
      text: 'hi',
      nums: '4, 5, 6',
      grid: '0 1 2\n3 4 5',
      mode: 'b',
    });
    expect(result.ok).toBe(true);
    expect(result.values.nums).toEqual([4, 5, 6]);
    expect(result.values.grid).toEqual([[0, 1, 2], [3, 4, 5]]);
  });

  it('reports invalid drafts instead of applying them', () => {
    const result = parseDrafts(schema, {
      n: '',
      text: 'toolong',
      nums: '1,x',
      grid: '1 2\n3',
      mode: 'b',
    });
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors)).toEqual(['n', 'text', 'nums', 'grid']);
  });

  it('generates valid random inputs inside the limits', () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const random = randomizeInput(schema, valid);
      expect(validateInput(schema, random)).toEqual({});
      expect(random.n).toBeGreaterThanOrEqual(1);
      expect(random.n).toBeLessThanOrEqual(12);
      expect((random.nums as number[]).length).toBeLessThanOrEqual(8);
      expect((random.grid as number[][]).length).toBeLessThanOrEqual(5);
    }
  });
});
