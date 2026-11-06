import { useEffect } from 'react';
import { create } from 'zustand';
import type { Step } from './types';

export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3, 4] as const;

export function stepDurationMs(speed: number): number {
  return Math.round(1000 / Math.max(0.25, Math.min(4, speed)));
}

export interface PlayerState {
  steps: Step[];
  index: number;
  playing: boolean;
  speed: number;
  load: (steps: Step[], options?: { autoplay?: boolean }) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  advance: () => void;
  stepForward: () => void;
  stepBack: () => void;
  goTo: (index: number) => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  speedUp: () => void;
  speedDown: () => void;
}

function bounded(index: number, length: number): number {
  return Math.max(0, Math.min(Math.max(0, length - 1), index));
}

export const usePlayer = create<PlayerState>()((set, get) => ({
  steps: [],
  index: 0,
  playing: false,
  speed: 1,

  load: (steps, options = {}) =>
    set({
      steps,
      index: 0,
      playing: Boolean(options.autoplay) && steps.length > 1,
    }),

  play: () => {
    const { steps, index } = get();
    if (steps.length < 2) return;
    set({ playing: true, index: index >= steps.length - 1 ? 0 : index });
  },

  pause: () => set({ playing: false }),

  toggle: () => {
    if (get().playing) get().pause();
    else get().play();
  },

  advance: () => {
    const { steps, index, playing } = get();
    if (index >= steps.length - 1) {
      if (playing) set({ playing: false });
      return;
    }
    const next = index + 1;
    set({ index: next, playing: playing && next < steps.length - 1 });
  },

  stepForward: () => {
    const { steps, index } = get();
    set({ index: bounded(index + 1, steps.length), playing: false });
  },

  stepBack: () => {
    const { index } = get();
    set({ index: bounded(index - 1, get().steps.length), playing: false });
  },

  goTo: (index) => {
    const { steps } = get();
    set({ index: bounded(index, steps.length), playing: false });
  },

  reset: () => set({ index: 0, playing: false }),

  setSpeed: (speed) => set({ speed: Math.max(0.25, Math.min(4, speed)) }),

  speedUp: () => {
    const current = get().speed;
    const next = PLAYBACK_SPEEDS.find((speed) => speed > current) ?? PLAYBACK_SPEEDS.at(-1)!;
    set({ speed: next });
  },

  speedDown: () => {
    const current = get().speed;
    const next = [...PLAYBACK_SPEEDS].reverse().find((speed) => speed < current) ?? PLAYBACK_SPEEDS[0]!;
    set({ speed: next });
  },
}));

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function isNativeSpaceControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ['BUTTON', 'A', 'SUMMARY'].includes(target.tagName);
}

/** Registers classroom-friendly shortcuts once per mounted page. */
export function usePlayerKeyboard(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const player = usePlayer.getState();

      switch (event.key) {
        case ' ':
        case 'k':
          if (event.key === ' ' && isNativeSpaceControl(event.target)) return;
          event.preventDefault();
          player.toggle();
          break;
        case 'ArrowRight':
          event.preventDefault();
          player.stepForward();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          player.stepBack();
          break;
        case 'Home':
          event.preventDefault();
          player.reset();
          break;
        case 'End':
          event.preventDefault();
          player.goTo(player.steps.length - 1);
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          player.reset();
          break;
        case ']':
          event.preventDefault();
          player.speedUp();
          break;
        case '[':
          event.preventDefault();
          player.speedDown();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
