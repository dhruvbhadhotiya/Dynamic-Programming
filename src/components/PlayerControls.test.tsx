import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Step } from '../engine/types';
import { usePlayer } from '../engine/usePlayer';
import { PlayerControls } from './PlayerControls';

const steps: Step[] = Array.from({ length: 4 }, (_, index) => ({
  state: { kind: 'table1d', values: [index] },
  highlights: [],
  codeLine: 1,
  message: `Step ${index + 1}`,
}));

beforeEach(() => {
  usePlayer.setState({ steps: [], index: 0, playing: false, speed: 1 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PlayerControls', () => {
  it('moves, scrubs, resets and changes speed', () => {
    usePlayer.setState({ steps, index: 0, playing: false, speed: 1 });
    render(<PlayerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(usePlayer.getState().index).toBe(1);
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Step scrubber' })).toHaveValue('1');

    fireEvent.change(screen.getByRole('slider', { name: 'Step scrubber' }), { target: { value: '3' } });
    expect(usePlayer.getState().index).toBe(3);

    fireEvent.click(screen.getByRole('button', { name: 'Reset to first step' }));
    expect(usePlayer.getState().index).toBe(0);

    fireEvent.change(screen.getByRole('combobox', { name: 'Playback speed' }), { target: { value: '2' } });
    expect(usePlayer.getState().speed).toBe(2);
    expect(screen.getByText('2×')).toBeInTheDocument();
  });

  it('auto-advances while playing', () => {
    vi.useFakeTimers();
    usePlayer.setState({ steps, index: 0, playing: false, speed: 1 });
    render(<PlayerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(usePlayer.getState().playing).toBe(true);
    act(() => vi.advanceTimersByTime(1010));
    expect(usePlayer.getState().index).toBe(1);
    act(() => vi.advanceTimersByTime(1010));
    expect(usePlayer.getState().index).toBe(2);
  });

  it('disables controls when there are no steps', () => {
    render(<PlayerControls />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Step scrubber' })).toBeDisabled();
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });
});
