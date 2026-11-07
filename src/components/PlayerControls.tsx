import { useEffect } from 'react';
import { PLAYBACK_SPEEDS, stepDurationMs, usePlayer } from '../engine/usePlayer';

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      {playing ? <path d="M7 5h4v14H7zm6 0h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
    </svg>
  );
}

function StepIcon({ direction }: { direction: 'back' | 'forward' }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      {direction === 'back' ? <path d="M15 5v14l-9-7z" /> : <path d="M9 5v14l9-7z" />}
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4v6h6" />
      <path d="M5.5 15a7 7 0 1 0 1-8" />
    </svg>
  );
}

export function PlayerControls() {
  const index = usePlayer((state) => state.index);
  const total = usePlayer((state) => state.steps.length);
  const playing = usePlayer((state) => state.playing);
  const speed = usePlayer((state) => state.speed);
  const toggle = usePlayer((state) => state.toggle);
  const stepForward = usePlayer((state) => state.stepForward);
  const stepBack = usePlayer((state) => state.stepBack);
  const reset = usePlayer((state) => state.reset);
  const goTo = usePlayer((state) => state.goTo);
  const setSpeed = usePlayer((state) => state.setSpeed);
  const advance = usePlayer((state) => state.advance);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(advance, stepDurationMs(speed));
    return () => window.clearInterval(timer);
  }, [advance, playing, speed]);

  const empty = total === 0;
  const atEnd = total > 0 && index === total - 1;

  return (
    <section className="card p-3 sm:p-4" aria-label="Playback controls">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary min-w-24"
          onClick={toggle}
          disabled={empty}
          aria-label={playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
        >
          <PlayIcon playing={playing} />
          <span>{playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}</span>
        </button>
        <button type="button" className="btn-secondary" onClick={stepBack} disabled={empty || index === 0} aria-label="Previous step">
          <StepIcon direction="back" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={stepForward}
          disabled={empty || atEnd}
          aria-label="Next step"
        >
          <span className="hidden sm:inline">Next</span>
          <StepIcon direction="forward" />
        </button>
        <button type="button" className="btn-ghost" onClick={reset} disabled={empty || index === 0} aria-label="Reset to first step">
          <ResetIcon />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <div className="ms-auto flex items-center gap-2">
          <label htmlFor="player-speed" className="text-xs font-semibold text-muted">
            Speed
          </label>
          <select
            id="player-speed"
            className="field min-h-9 w-20 py-1"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            aria-label="Playback speed"
          >
            {PLAYBACK_SPEEDS.map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={Math.max(1, total - 1)}
          step={1}
          value={index}
          onChange={(event) => goTo(Number(event.target.value))}
          disabled={total < 2}
          className="h-2 flex-1 cursor-pointer accent-[rgb(var(--brand))] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Step scrubber"
          aria-valuetext={empty ? 'No steps' : `Step ${index + 1} of ${total}`}
        />
        <output className="min-w-20 text-right text-xs font-semibold tabular-nums text-muted" aria-label="Playback position">
          {empty ? '0 / 0' : `${index + 1} / ${total}`}
        </output>
      </div>

      <p role="note" className="mt-3 hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted md:flex" aria-label="Keyboard shortcuts">
        <span><kbd className="kbd">Space</kbd> play</span>
        <span><kbd className="kbd">←</kbd><kbd className="kbd">→</kbd> step</span>
        <span><kbd className="kbd">R</kbd> reset</span>
        <span><kbd className="kbd">[</kbd><kbd className="kbd">]</kbd> speed</span>
      </p>
    </section>
  );
}
