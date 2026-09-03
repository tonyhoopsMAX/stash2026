import { expect, test } from '@playwright/test';

test('landing page exposes the product and app entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Save now/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open STASH/i }).first()).toHaveAttribute('href', '/app');
  await expect(page.getByText('No account. No subscription. Works offline.')).toBeVisible();
});

test('user can finish onboarding and save a note', async ({ page }) => {
  await page.goto('/app');
  const enter = page.getByRole('button', { name: 'Enter your STASH' });
  await expect(enter).toBeVisible({ timeout: 10_000 });
  await enter.click();
  await expect(enter).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Good evening' })).toBeVisible();
  await page.getByRole('button', { name: 'Note', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Save to STASH' })).toBeVisible();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Launch checklist');
  await dialog.getByRole('textbox', { name: 'Note' }).fill('Verify the offline build and backup export.');
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(page.getByRole('heading', { name: 'Launch checklist' })).toBeVisible();
});
