import { expect, test } from '@playwright/test';

// WebKit/mobile smoke — the ONLY test running on an iPhone profile.
//
// Purpose: catch engine-level regressions that Chromium cannot — PWA meta
// wiring for Add-to-Home-Screen, and that the production bundle hydrates
// and responds to a tap at a 390pt mobile viewport under WebKit. All
// behavioral depth lives in the Chromium suite; keep this file to a single
// fast test.

test('iPhone Safari/WebKit: app boots mobile layout, PWA meta is wired, first tap works', async ({ page }) => {
  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });

  // Installability plumbing the "Add to Home Screen" flow depends on.
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'STASH');
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'black-translucent');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', /^#[0-9a-f]{3,8}$/i);

  // Mobile chrome renders at 390pt: bottom nav visible, no horizontal scroll.
  await expect(page.locator('.bottom-nav')).toBeVisible();
  expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(
    (await page.evaluate(() => document.body.clientWidth)) + 1
  );

  // A first user gesture must do something real (hydration + Dexie OK):
  // clear onboarding if shown, then apply a theme from Appearance.
  const startEmpty = page.getByRole('button', { name: 'Start empty' });
  if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await startEmpty.click();
    await expect(startEmpty).toBeHidden({ timeout: 30_000 });
  }
  await page.goto('/app?view=settings');
  await page.getByRole('button', { name: /Theme/ }).last().click();
  await page.getByTestId('theme-card-pastel-cloud').click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')), { timeout: 15_000 })
    .toContain('pastel-cloud');
});
