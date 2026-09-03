import { expect, test } from '@playwright/test';

test('landing page exposes the product and app entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Save now/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open STASH/i }).first()).toHaveAttribute('href', '/app');
  await expect(page.getByText('No account. No subscription. Works offline.')).toBeVisible();
});

test('fresh user sees onboarding and can start empty, then the app persists completion', async ({ page }) => {
  await page.goto('/app');

  const startEmpty = page.getByRole('button', { name: 'Start empty' });
  const exploreDemo = page.getByRole('button', { name: 'Explore demo' });
  await expect(startEmpty).toBeVisible({ timeout: 10_000 });
  await expect(exploreDemo).toBeVisible();

  await startEmpty.click();
  await expect(startEmpty).toBeHidden();
  await expect(page.getByRole('heading', { name: 'What should we remember?' })).toBeVisible();
  await expect(page.getByText("Your space for what matters.").first()).toBeVisible();

  // Reloading must not show onboarding again — it was completed and persisted.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start empty' })).toBeHidden({ timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'What should we remember?' })).toBeVisible();
});

test('user can finish onboarding by exploring the demo and save a note', async ({ page }) => {
  await page.goto('/app');

  const exploreDemo = page.getByRole('button', { name: 'Explore demo' });
  await expect(exploreDemo).toBeVisible({ timeout: 10_000 });
  await exploreDemo.click();
  await expect(exploreDemo).toBeHidden();

  // Demo data is present after seeding.
  await expect(page.getByText('Cabin design inspiration').first()).toBeVisible();

  // Open the note capture dialog from the quick capture card.
  await page.getByRole('button', { name: 'Note', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Save to STASH' })).toBeVisible();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Launch checklist');
  await dialog.getByRole('textbox', { name: 'Notes & Reflections' }).fill('Verify the offline build and backup export.');
  await page.getByRole('button', { name: 'Save to STASH' }).click();

  await expect(page.getByRole('heading', { name: 'Launch checklist' })).toBeVisible();
});
