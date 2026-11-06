import { useEffect, useState } from 'react';
import type { InputField } from '../engine/types';
import {
  draftsFromValues,
  parseDrafts,
  randomizeInput,
  type InputDrafts,
  type InputValues,
} from '../engine/inputValidation';

export interface InputFormProps {
  schema: InputField[];
  value: InputValues;
  onApply: (value: InputValues) => void;
  disabled?: boolean;
}

function defaultHelp(field: InputField): string {
  switch (field.type) {
    case 'number':
      return `Whole numbers from ${field.min} to ${field.max}.`;
    case 'text':
      return `Between ${field.minLength ?? 0} and ${field.maxLength} characters.`;
    case 'array':
      return 'Separate values with commas.';
    case 'matrix':
      return 'One row per line; separate cells with spaces or commas.';
    case 'select':
      return 'Choose a preset option.';
  }
}

function placeholder(field: InputField): string | undefined {
  if (field.type === 'array') return '1, 2, 3';
  if (field.type === 'matrix') return '1 2 3\n4 5 6';
  return undefined;
}

function FieldInput({
  field,
  draft,
  error,
  disabled,
  onChange,
}: {
  field: InputField;
  draft: string;
  error: string | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = `input-${field.name}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = error ? `${helpId} ${errorId}` : helpId;
  const common = {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    disabled,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(event.target.value),
  };

  return (
    <div className={field.type === 'matrix' ? 'sm:col-span-2' : ''}>
      <label className="label" htmlFor={id}>
        {field.label}
      </label>
      {field.type === 'matrix' ? (
        <textarea className="field min-h-24 font-mono" rows={3} value={draft} placeholder={placeholder(field)} {...common} />
      ) : field.type === 'select' ? (
        <select className="field" value={draft} {...common}>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="field font-mono"
          type={field.type === 'number' ? 'number' : 'text'}
          value={draft}
          placeholder={placeholder(field)}
          min={field.type === 'number' ? field.min : undefined}
          max={field.type === 'number' ? field.max : undefined}
          step={field.type === 'number' ? field.step ?? 1 : undefined}
          {...common}
        />
      )}
      <p id={helpId} className="mt-1 text-xs text-muted">
        {field.help ?? defaultHelp(field)}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs font-semibold text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DiceIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="15" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
      <circle cx="9" cy="15" r="1" fill="currentColor" />
    </svg>
  );
}

export function InputForm({ schema, value, onApply, disabled = false }: InputFormProps) {
  const [drafts, setDrafts] = useState<InputDrafts>(() => draftsFromValues(schema, value));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(draftsFromValues(schema, value));
    setErrors({});
  }, [schema, value]);

  const updateDraft = (name: string, next: string) => {
    setDrafts((current) => ({ ...current, [name]: next }));
    setErrors((current) => {
      if (!(name in current)) return current;
      const copy = { ...current };
      delete copy[name];
      return copy;
    });
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = parseDrafts(schema, drafts);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onApply(result.values);
  };

  const randomize = () => {
    const next = randomizeInput(schema, value);
    setDrafts(draftsFromValues(schema, next));
    setErrors({});
    onApply(next);
  };

  const revert = () => {
    setDrafts(draftsFromValues(schema, value));
    setErrors({});
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Problem input" className="space-y-4">
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Input values</legend>
        {schema.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            draft={drafts[field.name] ?? ''}
            error={errors[field.name]}
            disabled={disabled}
            onChange={(next) => updateDraft(field.name, next)}
          />
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={disabled}>
          Apply input
        </button>
        <button type="button" className="btn-secondary" onClick={randomize} disabled={disabled}>
          <DiceIcon />
          Randomize
        </button>
        <button type="button" className="btn-ghost" onClick={revert} disabled={disabled}>
          Revert
        </button>
      </div>
    </form>
  );
}
