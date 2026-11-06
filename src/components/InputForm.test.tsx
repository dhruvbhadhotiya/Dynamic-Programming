import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { validateInput } from '../engine/inputValidation';
import type { InputField } from '../engine/types';
import { InputForm } from './InputForm';

const schema: InputField[] = [
  { name: 'n', label: 'Number of steps', type: 'number', min: 1, max: 12 },
  { name: 'nums', label: 'Values', type: 'array', itemType: 'number', minItems: 1, maxItems: 8, min: 0, max: 20 },
  { name: 'grid', label: 'Grid', type: 'matrix', minRows: 1, maxRows: 4, maxCols: 4, min: 0, max: 9, numeric: true },
];

const value = { n: 4, nums: [1, 2], grid: [[1, 2], [3, 4]] };

describe('InputForm', () => {
  it('applies parsed values and reports validation errors', () => {
    const onApply = vi.fn();
    render(<InputForm schema={schema} value={value} onApply={onApply} />);

    fireEvent.change(screen.getByLabelText('Number of steps'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: '3, 4, 5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply input' }));
    expect(onApply).toHaveBeenCalledWith({ n: 6, nums: [3, 4, 5], grid: [[1, 2], [3, 4]] });

    fireEvent.change(screen.getByLabelText('Number of steps'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply input' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/1 to 12/);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('parses textarea matrices and reverts edits', () => {
    const onApply = vi.fn();
    render(<InputForm schema={schema} value={value} onApply={onApply} />);

    fireEvent.change(screen.getByLabelText('Grid'), { target: { value: '9 8\n7 6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply input' }));
    expect(onApply).toHaveBeenCalledWith({ n: 4, nums: [1, 2], grid: [[9, 8], [7, 6]] });

    fireEvent.change(screen.getByLabelText('Number of steps'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revert' }));
    expect(screen.getByLabelText('Number of steps')).toHaveValue(4);
  });

  it('randomizes to a valid input', () => {
    const onApply = vi.fn();
    render(<InputForm schema={schema} value={value} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }));

    const applied = onApply.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(applied).toBeDefined();
    expect(validateInput(schema, applied)).toEqual({});
    expect(screen.getByRole('button', { name: 'Randomize' })).toBeEnabled();
  });
});
