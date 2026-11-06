import { createElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TeacherBar } from '../components/TeacherBar';
import {
  loadTeacherMode,
  teacherModeClass,
  useTeacherMode,
  TEACHER_MODE_STORAGE_KEY,
} from './teacherMode';

beforeEach(() => {
  window.localStorage.clear();
  useTeacherMode.setState({ enabled: false, hideCode: false, fontScale: 'normal' });
  window.localStorage.clear();
});

describe('useTeacherMode store', () => {
  it('toggles and sets enabled, hideCode, and fontScale', () => {
    expect(useTeacherMode.getState().enabled).toBe(false);

    useTeacherMode.getState().setEnabled(true);
    expect(useTeacherMode.getState().enabled).toBe(true);

    useTeacherMode.getState().toggle();
    expect(useTeacherMode.getState().enabled).toBe(false);

    useTeacherMode.getState().toggle();
    expect(useTeacherMode.getState().enabled).toBe(true);

    useTeacherMode.getState().setHideCode(true);
    expect(useTeacherMode.getState().hideCode).toBe(true);

    useTeacherMode.getState().setHideCode(false);
    expect(useTeacherMode.getState().hideCode).toBe(false);

    useTeacherMode.getState().setFontScale('large');
    expect(useTeacherMode.getState().fontScale).toBe('large');

    useTeacherMode.getState().setFontScale('extra-large');
    expect(useTeacherMode.getState().fontScale).toBe('extra-large');

    useTeacherMode.getState().setFontScale('normal');
    expect(useTeacherMode.getState().fontScale).toBe('normal');
  });

  it('persists writes to localStorage and rehydrates via loadTeacherMode', () => {
    act(() => {
      useTeacherMode.getState().setEnabled(true);
      useTeacherMode.getState().setHideCode(true);
      useTeacherMode.getState().setFontScale('large');
    });

    const raw = window.localStorage.getItem(TEACHER_MODE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const persisted: unknown = JSON.parse(raw ?? '{}');
    expect(persisted).toEqual({ enabled: true, hideCode: true, fontScale: 'large' });

    // Simulate a rehydrate from explicitly seeded storage.
    window.localStorage.setItem(
      TEACHER_MODE_STORAGE_KEY,
      JSON.stringify({ enabled: true, hideCode: false, fontScale: 'extra-large' }),
    );
    const loaded = loadTeacherMode();
    expect(loaded).toEqual({ enabled: true, hideCode: false, fontScale: 'extra-large' });

    useTeacherMode.setState(loaded);
    expect(useTeacherMode.getState().enabled).toBe(true);
    expect(useTeacherMode.getState().fontScale).toBe('extra-large');
  });

  it('falls back to defaults for missing or corrupt storage', () => {
    window.localStorage.removeItem(TEACHER_MODE_STORAGE_KEY);
    expect(loadTeacherMode()).toEqual({ enabled: false, hideCode: false, fontScale: 'normal' });

    window.localStorage.setItem(TEACHER_MODE_STORAGE_KEY, 'not-json{{{');
    expect(loadTeacherMode()).toEqual({ enabled: false, hideCode: false, fontScale: 'normal' });

    window.localStorage.setItem(
      TEACHER_MODE_STORAGE_KEY,
      JSON.stringify({ enabled: 'yes', hideCode: 1, fontScale: 'huge' }),
    );
    expect(loadTeacherMode()).toEqual({ enabled: false, hideCode: false, fontScale: 'normal' });
  });
});

describe('teacherModeClass', () => {
  it('returns different classes per fontScale and empty when disabled', () => {
    const normal = teacherModeClass({ enabled: true, fontScale: 'normal' });
    const large = teacherModeClass({ enabled: true, fontScale: 'large' });
    const extraLarge = teacherModeClass({ enabled: true, fontScale: 'extra-large' });

    expect(normal).toContain('teacher-mode');
    expect(large).toContain('teacher-mode-large');
    expect(large).toContain('text-lg');
    expect(extraLarge).toContain('teacher-mode-extra-large');
    expect(extraLarge).toContain('text-xl');

    expect(new Set([normal, large, extraLarge]).size).toBe(3);

    expect(teacherModeClass({ enabled: false, fontScale: 'normal' })).toBe('');
    expect(teacherModeClass({ enabled: false, fontScale: 'large' })).toBe('');
    expect(teacherModeClass({ enabled: false, fontScale: 'extra-large' })).toBe('');
  });
});

describe('TeacherBar', () => {
  it('renders controls and updates the store on interaction', () => {
    render(createElement(TeacherBar));

    const toggle = screen.getByRole('button', { name: /teacher mode/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /hide code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Normal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Large' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Extra large' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: /teacher mode/i })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(useTeacherMode.getState().enabled).toBe(true);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /hide code/i }));
    expect(useTeacherMode.getState().hideCode).toBe(true);
    expect(screen.getByRole('button', { name: /hide code/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Large' }));
    expect(useTeacherMode.getState().fontScale).toBe('large');
    expect(screen.getByRole('button', { name: 'Large' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Extra large' }));
    expect(useTeacherMode.getState().fontScale).toBe('extra-large');

    // Fullscreen must not throw in jsdom where requestFullscreen is undefined.
    fireEvent.click(screen.getByRole('button', { name: /fullscreen/i }));
    expect(useTeacherMode.getState().enabled).toBe(true);
  });
});
