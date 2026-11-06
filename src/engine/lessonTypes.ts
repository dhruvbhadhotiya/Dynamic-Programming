import { isRecord, isStep } from './types';
import type { CategoryId, RendererId, Step } from './types';
import { CATEGORY_IDS, RENDERER_IDS, isCategoryId, isRendererId } from './registry';

export interface LessonSection {
  heading: string;
  body: string;
  bullets?: string[];
  callout?: string;
}

export interface LessonDiagram {
  rendererId: RendererId;
  steps: Step[];
}

export interface Lesson {
  id: string;
  title: string;
  category: CategoryId;
  summary: string;
  sections: LessonSection[];
  diagram?: LessonDiagram;
}

export interface LessonRegistry {
  lessons: Lesson[];
  warnings: string[];
  byId: Record<string, Lesson>;
  getLesson(id: string): Lesson | undefined;
  getLessonsByCategory(category: CategoryId): Lesson[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function unwrap(mod: unknown): unknown {
  if (isRecord(mod) && 'default' in mod && !('id' in mod)) return mod['default'];
  return mod;
}

export function validateLesson(candidate: unknown): string[] {
  const errors: string[] = [];
  const lesson = unwrap(candidate);

  if (!isRecord(lesson)) return ['lesson: expected an object with id/title/category/summary/sections'];

  if (!isNonEmptyString(lesson['id'])) errors.push('id: must be a non-empty string');
  if (!isNonEmptyString(lesson['title'])) errors.push('title: must be a non-empty string');
  if (!isCategoryId(lesson['category'])) {
    errors.push(`category: must be one of ${CATEGORY_IDS.join(', ')}`);
  }
  if (!isNonEmptyString(lesson['summary'])) errors.push('summary: must be a non-empty string');

  const sections = lesson['sections'];
  if (!Array.isArray(sections) || sections.length === 0) {
    errors.push('sections: must be a non-empty array');
  } else {
    sections.forEach((raw, index) => {
      if (!isRecord(raw)) {
        errors.push(`sections[${index}]: must be a section object`);
        return;
      }
      if (!isNonEmptyString(raw['heading'])) {
        errors.push(`sections[${index}].heading: must be a non-empty string`);
      }
      if (!isNonEmptyString(raw['body'])) {
        errors.push(`sections[${index}].body: must be a non-empty string`);
      }
      const bullets = raw['bullets'];
      if (bullets !== undefined) {
        if (!Array.isArray(bullets)) {
          errors.push(`sections[${index}].bullets: must be an array of non-empty strings`);
        } else {
          bullets.forEach((bullet, bulletIndex) => {
            if (!isNonEmptyString(bullet)) {
              errors.push(`sections[${index}].bullets[${bulletIndex}]: must be a non-empty string`);
            }
          });
        }
      }
      if (raw['callout'] !== undefined && !isNonEmptyString(raw['callout'])) {
        errors.push(`sections[${index}].callout: must be a non-empty string`);
      }
    });
  }

  const diagram = lesson['diagram'];
  if (diagram !== undefined) {
    if (!isRecord(diagram)) {
      errors.push('diagram: must be an object with rendererId and steps');
    } else {
      if (!isRendererId(diagram['rendererId'])) {
        errors.push(`diagram.rendererId: must be one of ${RENDERER_IDS.join(', ')}`);
      }
      const steps = diagram['steps'];
      if (!Array.isArray(steps) || steps.length === 0) {
        errors.push('diagram.steps: must be a non-empty array');
      } else {
        steps.forEach((step, index) => {
          if (!isStep(step)) errors.push(`diagram.steps[${index}]: invalid step`);
        });
      }
    }
  }

  return errors;
}

export function createLessonRegistry(modules: readonly unknown[]): LessonRegistry {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const valid: Lesson[] = [];

  for (const raw of modules) {
    const candidate = unwrap(raw);
    const errors = validateLesson(candidate);
    if (errors.length > 0 || !isRecord(candidate)) {
      const label = isRecord(candidate) && typeof candidate['id'] === 'string' ? candidate['id'] : 'unknown';
      warnings.push(`Skipped invalid lesson "${label}": ${errors.join('; ')}`);
      continue;
    }
    const lesson = candidate as unknown as Lesson;
    if (seen.has(lesson.id)) {
      warnings.push(`Duplicate lesson id "${lesson.id}": kept the first occurrence`);
      continue;
    }
    seen.add(lesson.id);
    valid.push(lesson);
  }

  const lessons = [...valid].sort((a, b) => a.id.localeCompare(b.id));
  const byId: Record<string, Lesson> = {};
  for (const lesson of lessons) byId[lesson.id] = lesson;

  return {
    lessons,
    warnings,
    byId,
    getLesson: (id) => byId[id],
    getLessonsByCategory: (category) => lessons.filter((lesson) => lesson.category === category),
  };
}

const globbed = import.meta.glob<Lesson>('../lessons/*.lesson.ts', { eager: true, import: 'default' });

const defaultRegistry = createLessonRegistry(Object.values(globbed));

export const LESSON_REGISTRY: LessonRegistry = defaultRegistry;
export const lessons: Lesson[] = defaultRegistry.lessons;
export const lessonWarnings: string[] = defaultRegistry.warnings;

export function getLesson(id: string): Lesson | undefined {
  return defaultRegistry.getLesson(id);
}
