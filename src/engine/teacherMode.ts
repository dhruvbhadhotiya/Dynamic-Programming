import { create } from 'zustand';

export type FontScale = 'normal' | 'large' | 'extra-large';

export const TEACHER_MODE_STORAGE_KEY = 'dp-teacher-mode';

export interface TeacherModeState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  hideCode: boolean;
  setHideCode: (hideCode: boolean) => void;
  fontScale: FontScale;
  setFontScale: (fontScale: FontScale) => void;
}

/** Shape persisted to localStorage (functions excluded). */
export interface PersistedTeacherMode {
  enabled: boolean;
  hideCode: boolean;
  fontScale: FontScale;
}

export interface TeacherModeClassState {
  enabled: boolean;
  fontScale: FontScale;
}

const DEFAULTS: PersistedTeacherMode = {
  enabled: false,
  hideCode: false,
  fontScale: 'normal',
};

function isFontScale(value: unknown): value is FontScale {
  return value === 'normal' || value === 'large' || value === 'extra-large';
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadTeacherMode(): PersistedTeacherMode {
  const storage = getStorage();
  if (storage === null) return { ...DEFAULTS };
  try {
    const raw = storage.getItem(TEACHER_MODE_STORAGE_KEY);
    if (raw === null) return { ...DEFAULTS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULTS };
    }
    const record: Record<string, unknown> = parsed as Record<string, unknown>;
    const enabled = typeof record.enabled === 'boolean' ? record.enabled : DEFAULTS.enabled;
    const hideCode =
      typeof record.hideCode === 'boolean' ? record.hideCode : DEFAULTS.hideCode;
    const fontScale = isFontScale(record.fontScale) ? record.fontScale : DEFAULTS.fontScale;
    return { enabled, hideCode, fontScale };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveTeacherMode(state: PersistedTeacherMode): void {
  const storage = getStorage();
  if (storage === null) return;
  try {
    storage.setItem(TEACHER_MODE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

export const useTeacherMode = create<TeacherModeState>()((set) => ({
  ...loadTeacherMode(),
  setEnabled: (enabled) => set({ enabled }),
  toggle: () => set((state) => ({ enabled: !state.enabled })),
  setHideCode: (hideCode) => set({ hideCode }),
  setFontScale: (fontScale) => set({ fontScale }),
}));

useTeacherMode.subscribe((state) => {
  saveTeacherMode({
    enabled: state.enabled,
    hideCode: state.hideCode,
    fontScale: state.fontScale,
  });
});

/**
 * Returns classes to apply to a root element for teacher mode.
 * Returns '' when teacher mode is disabled so default sizing applies.
 */
export function teacherModeClass(state: TeacherModeClassState): string {
  if (!state.enabled) return '';
  switch (state.fontScale) {
    case 'large':
      return 'teacher-mode teacher-mode-large text-lg';
    case 'extra-large':
      return 'teacher-mode teacher-mode-extra-large text-xl';
    case 'normal':
      return 'teacher-mode';
  }
}
