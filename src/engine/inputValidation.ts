import type { InputField } from './types';

export type InputValues = Record<string, unknown>;
export type InputDrafts = Record<string, string>;

export interface ParseResult {
  values: InputValues;
  errors: Record<string, string>;
  ok: boolean;
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export function validateField(field: InputField, value: unknown): string | null {
  switch (field.type) {
    case 'number':
      if (!isNumberInRange(value, field.min, field.max)) {
        return `Enter a number from ${field.min} to ${field.max}.`;
      }
      return null;
    case 'text': {
      if (typeof value !== 'string') return 'Enter text.';
      const min = field.minLength ?? 0;
      if (value.length < min) return `Use at least ${min} characters.`;
      if (value.length > field.maxLength) return `Use at most ${field.maxLength} characters.`;
      if (field.pattern) {
        try {
          if (!new RegExp(field.pattern).test(value)) return 'This text has an unsupported format.';
        } catch {
          return null;
        }
      }
      return null;
    }
    case 'array': {
      if (!Array.isArray(value)) return 'Enter a list of values.';
      if (value.length < field.minItems) return `Add at least ${field.minItems} values.`;
      if (value.length > field.maxItems) return `Use at most ${field.maxItems} values.`;
      if (field.itemType === 'number') {
        if (!value.every((item) => isNumberInRange(item, field.min ?? -Infinity, field.max ?? Infinity))) {
          return 'Every list value must be a number in range.';
        }
      } else if (!value.every((item) => typeof item === 'string' && item.length > 0)) {
        return 'Every list value must be non-empty text.';
      }
      return null;
    }
    case 'matrix': {
      if (!Array.isArray(value) || !value.every(Array.isArray)) return 'Enter one row per line.';
      const rows = value as unknown[][];
      if (rows.length < field.minRows || rows.length > field.maxRows) {
        return `Use ${field.minRows} to ${field.maxRows} rows.`;
      }
      const width = rows[0]?.length ?? 0;
      if (rows.some((row) => row.length === 0 || row.length !== width)) return 'Every row needs the same number of cells.';
      if (width > field.maxCols) return `Use at most ${field.maxCols} columns.`;
      if (field.numeric) {
        if (!rows.every((row) => row.every((cell) => isNumberInRange(cell, field.min, field.max)))) {
          return `Every cell must be a number from ${field.min} to ${field.max}.`;
        }
      } else if (!rows.every((row) => row.every((cell) => typeof cell === 'string'))) {
        return 'Every cell must be text.';
      }
      return null;
    }
    case 'select':
      return field.options.some((option) => option.value === value) ? null : 'Choose one of the options.';
  }
}

export function validateInput(schema: InputField[], values: InputValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of schema) {
    const error = validateField(field, values[field.name]);
    if (error) errors[field.name] = error;
  }
  return errors;
}

export function draftsFromValues(schema: InputField[], values: InputValues): InputDrafts {
  const drafts: InputDrafts = {};
  for (const field of schema) {
    const value = values[field.name];
    switch (field.type) {
      case 'array':
        drafts[field.name] = Array.isArray(value) ? value.map(String).join(', ') : '';
        break;
      case 'matrix':
        drafts[field.name] = Array.isArray(value)
          ? value.map((row) => (Array.isArray(row) ? row.map(String).join(' ') : '')).join('\n')
          : '';
        break;
      default:
        drafts[field.name] = value === undefined || value === null ? '' : String(value);
    }
  }
  return drafts;
}

function parseDraft(field: InputField, draft: string): unknown {
  switch (field.type) {
    case 'number':
      return draft.trim() === '' ? Number.NaN : Number(draft);
    case 'text':
      return draft;
    case 'array': {
      const pieces = (field.itemType === 'number' ? draft.split(/[\s,]+/) : draft.split(','))
        .map((item) => item.trim())
        .filter(Boolean);
      return field.itemType === 'number' ? pieces.map(Number) : pieces;
    }
    case 'matrix': {
      const lines = draft
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (field.numeric) {
        return lines.map((line) => line.split(/[\s,]+/).filter(Boolean).map(Number));
      }
      return lines.map((line) =>
        /[\s,]/.test(line) ? line.split(/[\s,]+/).filter(Boolean) : Array.from(line),
      );
    }
    case 'select':
      return draft;
  }
}

export function parseDrafts(schema: InputField[], drafts: InputDrafts): ParseResult {
  const values: InputValues = {};
  const errors: Record<string, string> = {};
  for (const field of schema) {
    const parsed = parseDraft(field, drafts[field.name] ?? '');
    const error = validateField(field, parsed);
    if (error) errors[field.name] = error;
    else values[field.name] = parsed;
  }
  return { values, errors, ok: Object.keys(errors).length === 0 };
}

function randomInt(min: number, max: number): number {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function randomWord(min: number, max: number): string {
  const length = randomInt(Math.max(1, min), Math.max(Math.max(1, min), max));
  const letters = 'abcdefghij';
  return Array.from({ length }, () => letters[randomInt(0, letters.length - 1)]).join('');
}

export function randomizeInput(schema: InputField[], current: InputValues): InputValues {
  const candidate: InputValues = { ...current };
  for (const field of schema) {
    switch (field.type) {
      case 'number':
        candidate[field.name] = randomInt(field.min, field.max);
        break;
      case 'text':
        candidate[field.name] = field.pattern ? current[field.name] : randomWord(field.minLength ?? 1, field.maxLength);
        break;
      case 'array': {
        const count = randomInt(field.minItems, Math.min(field.maxItems, field.minItems + 5));
        candidate[field.name] = Array.from({ length: count }, () =>
          field.itemType === 'number'
            ? randomInt(field.min ?? 0, field.max ?? 20)
            : String.fromCharCode(randomInt(65, 70)),
        );
        break;
      }
      case 'matrix': {
        const rows = randomInt(field.minRows, Math.min(field.maxRows, field.minRows + 2));
        const cols = randomInt(1, Math.min(field.maxCols, 6));
        candidate[field.name] = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () =>
            field.numeric
              ? randomInt(field.min, field.max)
              : '.#SE'[randomInt(0, 3)],
          ),
        );
        break;
      }
      case 'select': {
        const option = field.options[randomInt(0, field.options.length - 1)];
        if (option) candidate[field.name] = option.value;
        break;
      }
    }
  }
  return Object.keys(validateInput(schema, candidate)).length === 0 ? candidate : { ...current };
}
