import { describe, expect, it } from 'vitest';
import { isCellKind, isRendererState, isStep } from './types';

describe('engine type guards', () => {
  it('recognizes cell kinds only', () => {
    expect(isCellKind('active')).toBe(true);
    expect(isCellKind('highlight')).toBe(false);
    expect(isCellKind(3)).toBe(false);
  });

  it('recognizes renderer states by kind', () => {
    expect(isRendererState({ kind: 'table1d', values: [1, 2] })).toBe(true);
    expect(isRendererState({ kind: 'unknown', values: [] })).toBe(false);
    expect(isRendererState(null)).toBe(false);
  });

  it('validates a step and its highlights', () => {
    const step = {
      state: { kind: 'table1d', values: [1] },
      highlights: [{ pos: [0], kind: 'active' }],
      codeLine: 2,
      message: 'Fill the first cell.',
      vars: { i: 0 },
    };
    expect(isStep(step)).toBe(true);
    expect(isStep({ ...step, codeLine: 0 })).toBe(false);
    expect(isStep({ ...step, highlights: [{ pos: [-1], kind: 'active' }] })).toBe(false);
    expect(isStep({ ...step, message: '  ' })).toBe(false);
  });
});
