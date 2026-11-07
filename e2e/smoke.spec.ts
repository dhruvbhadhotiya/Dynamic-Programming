// e2e/smoke.spec.ts
//
// Playwright smoke tests per problem page: load / play / predict / no console errors.
//
// Notes:
// - playwright.config.ts: baseURL http://127.0.0.1:4173; webServer runs the Vite
//   dev server (`npm run dev -- --host 127.0.0.1 --port 4173`), reused when not in CI.
// - App uses createHashRouter, so URLs are /#/problem/<id> and /#/lesson/<id>.
// - Run with: npm run e2e  (or: npx playwright test e2e/smoke.spec.ts)

import { expect, test, type Page } from '@playwright/test';

type ProblemCase = { id: string; title: string };

// One problem from each of 4 different categories.
const PROBLEMS: ProblemCase[] = [
  { id: 'climbing-stairs', title: 'Climbing Stairs' }, // 1d
  { id: 'coin-change', title: 'Coin Change' }, // knapsack
  { id: 'edit-distance', title: 'Edit Distance' }, // strings
  { id: 'unique-paths', title: 'Unique Paths' }, // grid
];

const LESSON = { id: 'strings', title: 'String DP' };

function watchErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Offline static build may 404 the favicon; that is not an app error.
    if (text.toLowerCase().includes('favicon')) return;
    consoleErrors.push(text);
  });
  page.on('pageerror', (error: Error) => {
    pageErrors.push(String(error));
  });
  return {
    assertClean: () => {
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    },
  };
}

function positionIndex(position: string | null): number {
  return Number(position?.split('/')[0]?.trim() ?? '0');
}

async function openProblem(page: Page, problem: ProblemCase) {
  await page.goto(`/#/problem/${problem.id}`);
  await expect(page.getByRole('heading', { name: problem.title, level: 1 })).toBeVisible({
    timeout: 10_000,
  });
  const controls = page.getByLabel('Playback controls');
  await expect(controls).toBeVisible();
  await expect(page.getByLabel('Playback position')).toHaveText(/^\d+ \/ \d+$/, {
    timeout: 10_000,
  });
  return controls;
}

test('home page loads and renders problem links', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Learn dynamic programming/, level: 1 }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel('Search problems')).toBeVisible();
  await expect(page.getByText(/^Showing \d+ of \d+ problems$/)).toBeVisible();

  for (const problem of PROBLEMS) {
    const link = page.getByRole('link', { name: problem.title, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', new RegExp(`/problem/${problem.id}`));
  }
  errors.assertClean();
});

for (const problem of PROBLEMS) {
  test(`${problem.id}: loads, plays and steps without console errors`, async ({ page }) => {
    test.slow();
    const errors = watchErrors(page);
    const controls = await openProblem(page, problem);

    const play = controls.getByRole('button', { name: /^(Play|Replay)$/ });
    await expect(play).toBeVisible();
    const position = page.getByLabel('Playback position');
    const text = (await position.textContent()) ?? '1 / 2';
    const [current, total] = text.split('/');
    const before = Number(current?.trim() ?? '0');
    expect(Number(total?.trim() ?? '0')).toBeGreaterThan(1);

    // Clicking Play starts playback and the step advances (~1s per step at 1x).
    await play.click();
    const pause = controls.getByRole('button', { name: 'Pause' });
    await expect(pause).toBeVisible({ timeout: 5_000 });
    await expect
      .poll(async () => positionIndex(await position.textContent()), { timeout: 8_000 })
      .toBeGreaterThan(before);
    await pause.click();

    // Next step advances the position and updates the scrubber/step counter.
    const at = positionIndex(await position.textContent());
    await controls.getByRole('button', { name: 'Next step' }).click();
    await expect
      .poll(async () => positionIndex(await position.textContent()), { timeout: 5_000 })
      .toBe(at + 1);
    await expect(page.getByLabel('Step scrubber')).toHaveAttribute(
      'aria-valuetext',
      /Step \d+ of \d+/,
    );

    errors.assertClean();
  });
}

test('predict mode: toggle solution mode and submit a prediction', async ({ page }) => {
  const errors = watchErrors(page);
  await openProblem(page, { id: 'climbing-stairs', title: 'Climbing Stairs' });

  // PredictMode is always mounted on ProblemPage; toggle the solution mode and
  // assert the prediction UI is present and interactive.
  const modeGroup = page.getByLabel('Solution mode');
  await modeGroup.getByRole('button', { name: /Memoization/ }).click();

  const predict = page.getByLabel('Predict the next cell');
  await expect(predict).toBeVisible();
  const input = page.getByLabel('Your prediction');
  await expect(input).toBeVisible();
  await input.fill('999');
  await predict.getByRole('button', { name: 'Check answer' }).click();
  await expect(predict.getByRole('status')).toContainText(/Correct|Not quite/);
  errors.assertClean();
});

test('lesson page loads', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`/#/lesson/${LESSON.id}`);
  await expect(page.getByRole('heading', { name: LESSON.title, level: 1 })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByRole('link', { name: /All lessons/ })).toBeVisible();
  errors.assertClean();
});

test('no console errors across home, problem and lesson pages', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.goto('/#/problem/climbing-stairs');
  await page.getByLabel('Playback controls').getByRole('button', { name: 'Next step' }).click();
  await page.goto(`/#/lesson/${LESSON.id}`);
  await expect(page.getByRole('heading', { name: LESSON.title, level: 1 })).toBeVisible({
    timeout: 10_000,
  });
  errors.assertClean();
});
