import { expect, test, type Page } from '@playwright/test';

// The /app page is a heavy client component (motion, recharts, lucide) whose
// modules are transformed on first request by the Vite dev server. On a cold
// CI runner that can take a while, so before asserting on the app's UI we wait
// for the client to finish hydrating (the splash that the server prerenders
// gives way to the real `.app-root`). A genuinely broken page never renders
// `.app-root` and the wait still times out — this only shields against slow
// cold-start compilation, not real failures.
async function openApp(page: Page) {
  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
}

test('landing page exposes the product and app entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Save now/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open STASH/i }).first()).toHaveAttribute('href', '/app');
  await expect(page.getByText('No account. No subscription. Works offline.')).toBeVisible();
});

test('fresh user sees onboarding and can start empty, then the app persists completion', async ({ page }) => {
  await openApp(page);

  const startEmpty = page.getByRole('button', { name: 'Start empty' });
  const exploreDemo = page.getByRole('button', { name: 'Explore demo' });
  await expect(startEmpty).toBeVisible({ timeout: 30_000 });
  await expect(exploreDemo).toBeVisible();

  await startEmpty.click();
  await expect(startEmpty).toBeHidden({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'What should we remember?' })).toBeVisible();
  await expect(page.getByText("Your space for what matters.").first()).toBeVisible();

  // Reloading must not show onboarding again — it was completed and persisted.
  await page.reload();
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Start empty' })).toBeHidden({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'What should we remember?' })).toBeVisible();
});

test('user can finish onboarding by exploring the demo and save a note', async ({ page }) => {
  await openApp(page);

  const exploreDemo = page.getByRole('button', { name: 'Explore demo' });
  await expect(exploreDemo).toBeVisible({ timeout: 30_000 });
  await exploreDemo.click();
  await expect(exploreDemo).toBeHidden({ timeout: 30_000 });

  // Demo data is present after seeding.
  await expect(page.getByText('Cabin design inspiration').first()).toBeVisible({ timeout: 30_000 });

  // Open the note capture dialog from the quick capture card.
  await page.getByRole('button', { name: 'Note', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Save to STASH' })).toBeVisible({ timeout: 30_000 });

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Launch checklist');
  await dialog.getByRole('textbox', { name: 'Notes & Reflections' }).fill('Verify the offline build and backup export.');
  await page.getByRole('button', { name: 'Save to STASH' }).click();

  await expect(page.getByRole('heading', { name: 'Launch checklist' })).toBeVisible({ timeout: 30_000 });
});
