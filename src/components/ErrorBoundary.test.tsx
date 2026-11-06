import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

afterEach(() => {
  vi.restoreAllMocks();
});

function wrap(node: ReactNode): ReactNode {
  return <MemoryRouter>{node}</MemoryRouter>;
}

function Thrower(): ReactNode {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(wrap(
      <ErrorBoundary>
        <p>Hello content</p>
      </ErrorBoundary>,
    ));

    expect(screen.getByText('Hello content')).toBeInTheDocument();
  });

  it('renders the friendly fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(wrap(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    ));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('This page hit a snag.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the playground/i })).toBeInTheDocument();
  });

  it('retry button re-renders children after the error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    let shouldThrow = true;

    function Flaky(): ReactNode {
      if (shouldThrow) {
        throw new Error('boom');
      }
      return <p>Recovered content</p>;
    }

    render(wrap(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    ));

    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('respects a custom fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(wrap(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <Thrower />
      </ErrorBoundary>,
    ));

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('This page hit a snag.')).not.toBeInTheDocument();
  });

  it('uses a custom title when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(wrap(
      <ErrorBoundary title="Custom title">
        <Thrower />
      </ErrorBoundary>,
    ));

    expect(screen.getByText('Custom title')).toBeInTheDocument();
  });
});
