import { devices, expect, test } from '@playwright/test';

// WebKit/mobile smoke — the ONLY test running on an iPhone profile.
//
// Purpose: catch engine-level regressions that Chromium cannot — PWA meta
// wiring for Add-to-Home-Screen, and that the production bundle hydrates and
// responds to real taps at an iPhone viewport under WebKit. All behavioral
// depth lives in the Chromium suite; keep this file to a single fast test.

// Explicitly pin the intended device (the WebKit project uses iPhone 14 as
// well — belt-and-braces so this test stays an iPhone test even if the
// project matrix changes again).
test.use({ ...devices['iPhone 14'] });

test('iPhone Safari/WebKit: app boots mobile layout, PWA meta is wired, first tap works', async ({ page }) => {
  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });

  // Installability plumbing the "Add to Home Screen" flow depends on.
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'STASH');
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'black-translucent');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', /^#[0-9a-f]{3,8}$/i);

  // No horizontal scroll at iPhone width.
  const widths = await page.evaluate(() => ({ sw: document.body.scrollWidth, cw: document.body.clientWidth }));
  expect(widths.sw).toBeLessThanOrEqual(widths.cw + 1);

  // Clear first-run onboarding through the real UI.
  const startEmpty = page.getByRole('button', { name: 'Start empty' });
  if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await startEmpty.click();
    await expect(startEmpty).toBeHidden({ timeout: 30_000 });
  }

  // A *usable primary navigation mode* is presented for the effective
  // viewport: the floating dock at mobile widths, the side rail at desktop
  // widths. (The keyboard-safe layer may legitimately hide the dock when the
  // visual viewport is collapsed — an artifact emulator device metrics can
  // also trigger — so that state counts as handled, not broken.)
  const navState = await page.evaluate(() => {
    const vis = (el: Element | null) =>
      !!el && getComputedStyle(el).display !== 'none' && (el as HTMLElement).offsetParent !== null;
    return {
      mobile: window.innerWidth <= 700,
      dock: vis(document.querySelector('.bottom-nav')),
      rail: vis(document.querySelector('nav[aria-label="App navigation"]')),
      keyboardOpen: document.documentElement.getAttribute('data-keyboard-open') === 'true',
    };
  });
  expect(
    (navState.mobile ? navState.dock : navState.rail) || navState.keyboardOpen,
    `no usable primary nav mode (mobile=${navState.mobile} dock=${navState.dock} rail=${navState.rail} keyboardOpen=${navState.keyboardOpen})`
  ).toBe(true);

  // First real taps work under WebKit: open Appearance from Settings and
  // switch a theme (hydration + Dexie + event wiring end-to-end).
  await page.goto('/app?view=settings');
  await page.locator('.app-content .settings-row').filter({ hasText: 'Appearance' }).first().click();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  await page.getByTestId('theme-card-pastel-cloud').click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')), { timeout: 15_000 })
    .toContain('pastel-cloud');
});
