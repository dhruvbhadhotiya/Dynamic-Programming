import { describe, expect, it } from 'vitest';
import { finalAnswer } from './dpHelpers';
import { capStepCount, capSteps, DEFAULT_MAX_STEPS, shouldCap } from './stepCap';
import { isStep } from './types';
import type { Step } from './types';

function makeSteps(count: number, finalMessage?: string, finalVars?: Step['vars']): Step[] {
  return Array.from({ length: count }, (_, i) => {
    const isLast = i === count - 1;
    const step: Step = {
      state: { kind: 'table1d', values: [i] },
      highlights: [{ pos: [0], kind: 'active' }],
      codeLine: 1,
      message: isLast && finalMessage !== undefined ? finalMessage : `Step ${i + 1}.`,
    };
    if (isLast && finalVars !== undefined) step.vars = { ...finalVars };
    return step;
  });
}

describe('capSteps', () => {
  it('returns steps unchanged (same reference) when under the cap', () => {
    const steps = makeSteps(3);
    const result = capSteps(steps, 5);
    expect(result).toBe(steps);
    expect(result).toHaveLength(3);
    expect(result).toEqual(steps);
  });

  it('returns steps unchanged when exactly at the cap', () => {
    const steps = makeSteps(5);
    expect(capSteps(steps, 5)).toBe(steps);
    expect(shouldCap(steps, 5)).toBe(false);
    expect(capStepCount(5, 5)).toBe(false);
  });

  it('truncates to exactly max steps when over the cap', () => {
    const steps = makeSteps(10);
    const result = capSteps(steps, 5);
    expect(result).toHaveLength(5);
    expect(result.slice(0, 4)).toEqual(steps.slice(0, 4));
    expect(shouldCap(steps, 5)).toBe(true);
    expect(capStepCount(10, 5)).toBe(true);
  });

  it('defaults to DEFAULT_MAX_STEPS (500)', () => {
    expect(DEFAULT_MAX_STEPS).toBe(500);
    const steps = makeSteps(600);
    const result = capSteps(steps);
    expect(result).toHaveLength(500);
    expect(capStepCount(600)).toBe(true);
  });

  it('truncation step passes isStep with codeLine >= 1', () => {
    const result = capSteps(makeSteps(10), 5);
    const truncation = result.at(-1);
    expect(truncation).toBeDefined();
    expect(isStep(truncation)).toBe(true);
    expect(truncation?.codeLine).toBeGreaterThanOrEqual(1);
    result.forEach((step) => expect(isStep(step)).toBe(true));
  });

  it('truncation message reports kept and total counts (never silent)', () => {
    const result = capSteps(makeSteps(10), 5);
    const message = result.at(-1)?.message ?? '';
    expect(message).toContain('first 4 of 10 steps');
    expect(message).toContain('4');
    expect(message).toContain('10');
  });

  it('preserves the final answer stated in the last step message', () => {
    const steps = makeSteps(10, 'The answer is 7.', { answer: 7 });
    const result = capSteps(steps, 5);
    const truncation = result.at(-1);
    expect(truncation?.message).toContain('The answer is 7.');
    expect(truncation?.message.toLowerCase()).toContain('answer');
    expect(truncation?.vars?.answer).toBe(7);
    expect(finalAnswer(result)).toBe(7);
  });

  it('preserves vars.answer in the message when the last message omits the word answer', () => {
    const steps = makeSteps(10, 'Done.', { answer: 42 });
    const result = capSteps(steps, 5);
    const truncation = result.at(-1);
    expect(truncation?.message).toContain('The answer is 42.');
    expect(finalAnswer(result)).toBe(42);
  });

  it('handles an empty array', () => {
    const steps: Step[] = [];
    expect(capSteps(steps)).toBe(steps);
    expect(capSteps(steps)).toEqual([]);
    expect(shouldCap(steps)).toBe(false);
  });

  it('handles max = 1 by returning a single valid truncation step', () => {
    const steps = makeSteps(8, 'The answer is 3.', { answer: 3 });
    const result = capSteps(steps, 1);
    expect(result).toHaveLength(1);
    expect(isStep(result[0])).toBe(true);
    expect(result[0]?.message).toContain('first 0 of 8 steps');
    expect(result[0]?.message).toContain('The answer is 3.');
    expect(finalAnswer(result)).toBe(3);
  });
});
