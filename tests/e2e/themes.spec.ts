import { expect, test, type Page } from '@playwright/test';

// Theme-system E2E — representative flows only (Chromium project).
//
// The full per-theme token contract is unit-tested (tests/unit/themes.test.ts
// asserts all 10 registry entries + CSS blocks); here we prove the *product
// loop* end-to-end on the production bundle: apply from Appearance → instant
// re-skin → selection state → persistence across reload, plus layout sanity
// for a light theme, a dark theme, and a mobile viewport, and the themed
// dialog/keyboard-safe layer. Each test covers a distinct failure mode — no
// theme × device × browser matrix.

async function openAppReady(page: Page) {
  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  const startEmpty = page.getByRole('button', { name: 'Start empty' });
  if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await startEmpty.click();
    await expect(startEmpty).toBeHidden({ timeout: 30_000 });
  }
}

/** Navigate to Appearance and tap a theme card; waits until the applied
 *  attribute (id + variant tokens) is live so later assertions measure the
 *  right theme. `expectedCssAttr` pins the full variant list when relevant. */
async function applyTheme(page: Page, id: string, expectedCssAttr?: string) {
  await page.goto('/app?view=settings');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  await page.getByRole('button', { name: /Theme/ }).last().click();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  await page.getByTestId(`theme-card-${id}`).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')), { timeout: 15_000 })
    .toContain(expectedCssAttr ?? id);
}

const layoutBox = (page: Page) =>
  page.evaluate(() => {
    const t = document.querySelector('.page-header-title')?.getBoundingClientRect();
    const s = document.querySelector('.page-subtitle')?.getBoundingClientRect();
    return {
      sw: document.body.scrollWidth,
      cw: document.body.clientWidth,
      gap: t && s ? Math.round(s.top - t.bottom) : null,
    };
  });

/** Assert no horizontal overflow and no heading/subtitle overlap. */
async function expectCleanLayout(page: Page, label: string) {
  const box = await layoutBox(page);
  expect(box.sw, `horizontal overflow on ${label} (${box.sw} vs ${box.cw})`).toBeLessThanOrEqual(box.cw + 1);
  if (box.gap !== null) {
    expect(box.gap, `heading/subtitle collision on ${label}`).toBeGreaterThanOrEqual(0);
  }
}

test('switching a theme in Appearance applies it instantly and marks the card', async ({ page }) => {
  await openAppReady(page);
  await page.goto('/app?view=settings');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });

  // Every theme card renders (registry → gallery wiring; descriptions in the
  // unit suite). Count instead of per-card visibility churn.
  await expect(page.getByTestId(/^theme-card-/)).toHaveCount(10);
  await expect(page.getByText(/Raw blocks, thick outlines/).first()).toBeVisible();

  await page.getByTestId('theme-card-neo-brutal').click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
    .toBe('neo-brutal variant-nav-bar variant-brutal');

  const brutal = page.getByTestId('theme-card-neo-brutal');
  await expect(brutal).toHaveClass(/is-selected/);
  await expect(page.locator('.theme-card.is-selected .theme-card-check')).toBeVisible();

  // The document actually re-skinned (token value, not just an attribute):
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim()
  );
  expect(bg.toLowerCase()).toBe('#f4f2ea');
});

test('selected theme persists across a reload via store + pre-paint mirror', async ({ page }) => {
  await openAppReady(page);
  await applyTheme(page, 'zen-archive');

  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim()
  );
  expect(bg.toLowerCase()).toBe('#141d19');

  // The gallery reflects the persisted selection after a fresh hydration.
  await page.goto('/app?view=settings');
  await page.locator('.app-root').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Theme/ }).last().click();
  await expect(page.getByTestId('theme-card-zen-archive')).toHaveClass(/is-selected/);
});

test('light theme (Archive Paper): readable surfaces, no overlap, light scheme flagged', async ({ page }) => {
  await openAppReady(page);
  await applyTheme(page, 'archive-paper', 'archive-paper variant-nav-bar');

  // Scheme flips to light (status-bar meta + form-control safety nets key off it).
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');

  await expectCleanLayout(page, 'appearance');
  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible' });
  await expectCleanLayout(page, 'home');
});

test('dark theme (Noir Atelier): no overlap across screens', async ({ page }) => {
  await openAppReady(page);
  await applyTheme(page, 'noir-atelier');

  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark');
  await expectCleanLayout(page, 'settings/appearance');

  for (const view of ['home', 'archive']) {
    await page.goto(`/app${view === 'home' ? '' : `?view=${view}`}`);
    await page.locator('.app-root').waitFor({ state: 'visible' });
    await expectCleanLayout(page, `${view} under noir-atelier`);
  }
});

test.describe('mobile viewport (Pixel 7 + metro-pop): nav docks, nothing overflows', () => {
  // Chromium project with an explicit mobile viewport — one representative
  // 390–412pt sweep instead of whole-suite device projects.
  test.use({ viewport: { width: 412, height: 915 } });

  test('412pt layout stays clean under the tile theme', async ({ page }) => {
    await openAppReady(page);
    await applyTheme(page, 'metro-pop', 'metro-pop variant-nav-tiles variant-tiles');

    for (const view of ['home', 'archive', 'settings']) {
      await page.goto(`/app${view === 'home' ? '' : `?view=${view}`}`);
      await page.locator('.app-root').waitFor({ state: 'visible' });
      await expect(page.locator('.bottom-nav'), `bottom nav missing on ${view}`).toBeVisible();
      await expect(page.locator('.floating-add'), `FAB missing on ${view}`).toBeVisible();
      await expectCleanLayout(page, `${view} @412w`);
    }
  });
});

test('keyboard-safe chrome + themed dialog (Neo Brutal)', async ({ page }) => {
  await openAppReady(page);
  await applyTheme(page, 'neo-brutal', 'neo-brutal variant-nav-bar variant-brutal');

  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible' });

  // The root always carries data-keyboard-open (keyboard-safe layer is never
  // gated behind a theme).
  await expect(page.locator('html')).toHaveAttribute('data-keyboard-open', /true|false/);

  // Speed-dial → Note opens the capture dialog; its themed portal surface
  // renders with a usable, in-viewport title field; Escape closes (Radix).
  await page.locator('.floating-add').click();
  await page.locator('.fab-menu').getByRole('button', { name: 'Note' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  const input = dialog.getByRole('textbox', { name: 'Title' });
  await input.focus();
  await expect(input).toBeInViewport();
  await input.press('Escape');
  await expect(dialog).toBeHidden({ timeout: 10_000 });
});
