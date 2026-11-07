import { fireEvent, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Step } from './types';
import { PLAYBACK_SPEEDS, stepDurationMs, usePlayer, usePlayerKeyboard } from './usePlayer';

const steps: Step[] = Array.from({ length: 4 }, (_, index) => ({
  state: { kind: 'table1d', values: [index] },
  highlights: [{ pos: [0], kind: 'active' }],
  codeLine: 1,
  message: `Step ${index}`,
}));

beforeEach(() => {
  usePlayer.setState({ steps: [], index: 0, playing: false, speed: 1 });
});

describe('usePlayer', () => {
  it('loads, moves, scrubs and clamps', () => {
    const player = usePlayer.getState();
    player.load(steps);
    expect(usePlayer.getState().index).toBe(0);

    usePlayer.getState().stepForward();
    expect(usePlayer.getState().index).toBe(1);
    usePlayer.getState().stepBack();
    usePlayer.getState().stepBack();
    expect(usePlayer.getState().index).toBe(0);

    usePlayer.getState().goTo(99);
    expect(usePlayer.getState().index).toBe(3);
    usePlayer.getState().reset();
    expect(usePlayer.getState()).toMatchObject({ index: 0, playing: false });
  });

  it('plays, stops at the end, and restarts from the end', () => {
    usePlayer.getState().load(steps, { autoplay: true });
    expect(usePlayer.getState().playing).toBe(true);
    usePlayer.getState().advance();
    usePlayer.getState().advance();
    expect(usePlayer.getState()).toMatchObject({ index: 2, playing: true });
    usePlayer.getState().advance();
    expect(usePlayer.getState()).toMatchObject({ index: 3, playing: false });
    usePlayer.getState().toggle();
    expect(usePlayer.getState()).toMatchObject({ index: 0, playing: true });
  });

  it('caps enormous step lists on load with an honest truncation message', () => {
    const big: Step[] = Array.from({ length: 600 }, (_, index) => {
      const step: Step = {
        state: { kind: 'table1d', values: [index] },
        highlights: [{ pos: [0], kind: 'active' }],
        codeLine: 1,
        message: index === 599 ? 'The answer is 42.' : `Step ${index}.`,
      };
      if (index === 599) step.vars = { answer: 42 };
      return step;
    });

    usePlayer.getState().load(big);
    const stored = usePlayer.getState().steps;
    expect(stored).toHaveLength(500);
    const truncation = stored.at(-1);
    expect(truncation?.message).toContain('first 499 of 600 steps');
    expect(truncation?.message).toContain('The answer is 42.');
    expect(truncation?.vars?.answer).toBe(42);
  });

  it('loads small step lists unchanged', () => {
    usePlayer.getState().load(steps);
    expect(usePlayer.getState().steps).toBe(steps);
  });

  it('clamps speeds and steps through the speed scale', () => {
    usePlayer.getState().setSpeed(99);
    expect(usePlayer.getState().speed).toBe(4);
    usePlayer.getState().setSpeed(0);
    expect(usePlayer.getState().speed).toBe(0.25);
    usePlayer.getState().speedUp();
    expect(usePlayer.getState().speed).toBe(0.5);
    usePlayer.getState().setSpeed(4);
    usePlayer.getState().speedUp();
    expect(usePlayer.getState().speed).toBe(PLAYBACK_SPEEDS.at(-1));
    expect(stepDurationMs(1)).toBe(1000);
    expect(stepDurationMs(0.25)).toBe(4000);
  });
});

describe('keyboard shortcuts', () => {
  it('steps, resets and changes speed', () => {
    renderHook(() => usePlayerKeyboard());
    usePlayer.getState().load(steps);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(usePlayer.getState().index).toBe(1);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(usePlayer.getState().index).toBe(0);
    fireEvent.keyDown(window, { key: 'End' });
    expect(usePlayer.getState().index).toBe(3);
    fireEvent.keyDown(window, { key: 'Home' });
    expect(usePlayer.getState().index).toBe(0);
    fireEvent.keyDown(window, { key: ']' });
    expect(usePlayer.getState().speed).toBe(1.5);
  });

  it('ignores typing targets and modified keys', () => {
    renderHook(() => usePlayerKeyboard());
    usePlayer.getState().load(steps);
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(usePlayer.getState().index).toBe(0);
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true });
    expect(usePlayer.getState().index).toBe(0);
    input.remove();
  });
});
