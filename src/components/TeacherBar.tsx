import { useEffect, useState } from 'react';
import { useTeacherMode } from '../engine/teacherMode';

const FONT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'extra-large', label: 'Extra large' },
] as const;

export function TeacherBar(): React.JSX.Element {
  const enabled = useTeacherMode((state) => state.enabled);
  const toggle = useTeacherMode((state) => state.toggle);
  const hideCode = useTeacherMode((state) => state.hideCode);
  const setHideCode = useTeacherMode((state) => state.setHideCode);
  const fontScale = useTeacherMode((state) => state.fontScale);
  const setFontScale = useTeacherMode((state) => state.setFontScale);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    () => Boolean(document.fullscreenElement),
  );

  useEffect(() => {
    const onFullscreenChange = (): void => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  async function onFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        if (typeof document.exitFullscreen === 'function') {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      } else {
        const element = document.documentElement;
        if (typeof element.requestFullscreen === 'function') {
          await element.requestFullscreen();
          setIsFullscreen(Boolean(document.fullscreenElement));
        }
      }
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }

  return (
    <div
      id="teacher"
      role="toolbar"
      aria-label="Teacher mode"
      tabIndex={-1}
      className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <button
        type="button"
        className={enabled ? 'btn-primary' : 'btn-secondary'}
        aria-pressed={enabled}
        onClick={toggle}
      >
        <span aria-hidden="true">{enabled ? '👩‍🏫' : '🧑‍🏫'}</span>
        <span>Teacher mode</span>
        <span aria-hidden="true">{enabled ? 'On' : 'Off'}</span>
      </button>

      <button
        type="button"
        className={hideCode ? 'btn-primary' : 'btn-secondary'}
        aria-pressed={hideCode}
        disabled={!enabled}
        onClick={() => setHideCode(!hideCode)}
      >
        <span aria-hidden="true">{hideCode ? '🙈' : '👁'}</span>
        <span>Hide code</span>
        <span aria-hidden="true">{hideCode ? 'Hidden' : 'Shown'}</span>
      </button>

      <div role="group" aria-label="Font size" className="flex flex-wrap items-center gap-1">
        {FONT_OPTIONS.map((option) => {
          const selected = fontScale === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={selected ? 'btn-primary' : 'btn-secondary'}
              aria-pressed={selected}
              disabled={!enabled}
              onClick={() => setFontScale(option.value)}
            >
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn-ghost"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        aria-pressed={isFullscreen}
        onClick={() => void onFullscreen()}
      >
        <span aria-hidden="true">{isFullscreen ? '🗗' : '⛶'}</span>
        <span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
      </button>
    </div>
  );
}
