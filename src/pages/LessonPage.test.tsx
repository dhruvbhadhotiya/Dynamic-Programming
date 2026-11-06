import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lesson } from '../engine/lessonTypes';
import { validateLesson } from '../engine/lessonTypes';
import type { CellValue, Step, Table1DState } from '../engine/types';
import { usePlayer } from '../engine/usePlayer';
import { LessonPage } from './LessonPage';

const { fakeLesson, fakePlainLesson } = vi.hoisted(() => {
  const table = (values: CellValue[], caption: string): Table1DState => ({
    kind: 'table1d',
    values,
    caption,
    indexName: 'i',
  });
  const steps: Step[] = [
    {
      state: table([0, 1, null], 'First diagram caption'),
      highlights: [{ pos: [1], kind: 'base' }],
      codeLine: 1,
      message: 'First diagram message',
      vars: { i: 1 },
    },
    {
      state: table([0, 1, 1], 'Second diagram caption'),
      highlights: [{ pos: [2], kind: 'result' }],
      codeLine: 2,
      message: 'Second diagram message',
      vars: { i: 2 },
    },
  ];
  const fakeLesson: Lesson = {
    id: 'fake-lesson',
    title: 'Fake Lesson Title',
    category: '1d',
    summary: 'A tiny stand-in lesson for integration tests.',
    sections: [
      {
        heading: 'First Section Heading',
        body: 'First paragraph.\n\nSecond paragraph.',
        bullets: ['Bullet one', 'Bullet two'],
        callout: 'Remember the base case.',
      },
    ],
    diagram: { rendererId: 'table1d', steps },
  };
  const fakePlainLesson: Lesson = {
    id: 'plain-lesson',
    title: 'Plain Lesson Title',
    category: 'strings',
    summary: 'Plain summary.',
    sections: [{ heading: 'Plain Heading', body: 'Only paragraph.' }],
  };
  return { fakeLesson, fakePlainLesson };
});

vi.mock('../engine/lessonTypes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine/lessonTypes')>();
  return {
    ...actual,
    getLesson: (id: string) => {
      if (id === fakeLesson.id) return fakeLesson;
      if (id === fakePlainLesson.id) return fakePlainLesson;
      return undefined;
    },
  };
});

function renderLesson(entry = '/lesson/fake-lesson') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/lesson/:id" element={<LessonPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  usePlayer.setState({ steps: [], index: 0, playing: false, speed: 1 });
});

describe('validateLesson', () => {
  it('catches missing fields', () => {
    const errors = validateLesson({});
    expect(errors.some((e) => e.startsWith('id:'))).toBe(true);
    expect(errors.some((e) => e.startsWith('title:'))).toBe(true);
    expect(errors.some((e) => e.startsWith('category:'))).toBe(true);
    expect(errors.some((e) => e.startsWith('summary:'))).toBe(true);
    expect(errors.some((e) => e.startsWith('sections:'))).toBe(true);
    expect(validateLesson(null)).not.toEqual([]);
  });

  it('accepts a valid lesson', () => {
    expect(validateLesson(fakeLesson)).toEqual([]);
    expect(validateLesson(fakePlainLesson)).toEqual([]);
  });

  it('rejects invalid sections and diagrams', () => {
    const badSections = validateLesson({ ...fakeLesson, sections: [{ heading: '', body: '' }] });
    expect(badSections.some((e) => e.includes('sections[0].heading'))).toBe(true);
    expect(badSections.some((e) => e.includes('sections[0].body'))).toBe(true);

    const badBullets = validateLesson({
      ...fakeLesson,
      sections: [{ heading: 'H', body: 'B', bullets: ['ok', ''] }],
    });
    expect(badBullets.some((e) => e.includes('bullets[1]'))).toBe(true);

    const badDiagram = validateLesson({
      ...fakeLesson,
      diagram: { rendererId: 'bogus', steps: [] },
    });
    expect(badDiagram.some((e) => e.startsWith('diagram.rendererId:'))).toBe(true);
    expect(badDiagram.some((e) => e.startsWith('diagram.steps:'))).toBe(true);

    const badStep = validateLesson({
      ...fakeLesson,
      diagram: { rendererId: 'table1d', steps: [{ message: 'x' }] },
    });
    expect(badStep.some((e) => e.includes('diagram.steps[0]'))).toBe(true);
  });
});

describe('LessonPage', () => {
  it('renders title, summary, paragraphs, bullets and callout', () => {
    renderLesson();

    expect(screen.getByRole('heading', { level: 1, name: 'Fake Lesson Title' })).toBeInTheDocument();
    expect(screen.getByText('A tiny stand-in lesson for integration tests.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'First Section Heading' })).toBeInTheDocument();
    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Bullet one')).toBeInTheDocument();
    expect(screen.getByText('Bullet two')).toBeInTheDocument();
    expect(screen.getByText('Remember the base case.')).toBeInTheDocument();
  });

  it('plays diagram steps with Next, updating caption and message', async () => {
    const user = userEvent.setup();
    renderLesson();

    expect(screen.getByText('First diagram caption')).toBeInTheDocument();
    expect(screen.getByText('First diagram message')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText('Second diagram caption')).toBeInTheDocument();
    expect(screen.queryByText('First diagram caption')).not.toBeInTheDocument();
    expect(screen.getByText('Second diagram message')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  });

  it('renders a plain lesson without diagram controls', () => {
    renderLesson('/lesson/plain-lesson');

    expect(screen.getByRole('heading', { level: 1, name: 'Plain Lesson Title' })).toBeInTheDocument();
    expect(screen.getByText('Only paragraph.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next step' })).not.toBeInTheDocument();
  });

  it('shows a not-found page for an unknown lesson id', () => {
    renderLesson('/lesson/nope');

    expect(screen.getByText('Lesson not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the roadmap/i })).toHaveAttribute('href', '/');
  });
});
