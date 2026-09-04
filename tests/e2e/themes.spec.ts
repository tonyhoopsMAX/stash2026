import { expect, test, type Page } from '@playwright/test';

// Theme-system product flows on the production bundle.
//
// Verifies the full loop exactly the way a user experiences it:
// Appearance → tap card → instant application → selection indicator →
// persistence across reload (Dexie store + localStorage pre-paint mirror)
// → per-theme mobile layout sanity (no overflow, no heading overlap,
// bottom-nav usable).

const THEME_IDS = [
  'og',
  'archive-paper',
  'neo-brutal',
  'pastel-cloud',
  'noir-atelier',
  'aurora-flow',
  'focused-grid',
  'zen-archive',
  'soft-journal',
  'metro-pop',
] as const;

const isMobile = (page: Page) => page.evaluate(() => window.innerWidth < 700);

async function openAppReady(page: Page) {
  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  const startEmpty = page.getByRole('button', { name: 'Start empty' });
  if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await startEmpty.click();
    await expect(startEmpty).toBeHidden({ timeout: 30_000 });
  }
}

/** Navigate to Appearance and tap a theme card; waits for the applied
 *  attribute so every later assertion measures the right theme. */
async function applyTheme(page: Page, id: string, expectedCssAttr?: string) {
  await page.getByRole('button', { name: /Theme/ }).last().click();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  await page.getByTestId(`theme-card-${id}`).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')), { timeout: 10_000 })
    .toContain(expectedCssAttr ?? id);
}

const layoutBox = (page: Page) =>
  page.evaluate(() => {
    const overlapOf = (titleSel: string, subSel: string) => {
      const t = document.querySelector(titleSel)?.getBoundingClientRect();
      const s = document.querySelector(subSel)?.getBoundingClientRect();
      return t && s ? Math.round(s.top - t.bottom) : null;
    };
    return {
      sw: document.body.scrollWidth,
      cw: document.body.clientWidth,
      gap: overlapOf('.page-header-title', '.page-subtitle'),
      nav: !!document.querySelector('.bottom-nav'),
    };
  });

test('appearance screen is a theme browser with one preview card per theme', async ({ page }) => {
  await openAppReady(page);
  await page.goto('/app?view=settings');
  await page.locator('.app-root').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Theme/ }).last().click();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();

  for (const id of THEME_IDS) {
    await expect(page.getByTestId(`theme-card-${id}`)).toBeVisible();
  }
  // Every card shows name + description (readable in the snapshot).
  await expect(page.getByText('Neo Brutal').first()).toBeVisible();
});

test('tapping a theme applies it instantly and marks the selected card', async ({ page }) => {
  await openAppReady(page);
  await page.goto('/app?view=settings');
  await page.locator('.app-root').waitFor({ state: 'visible' });
  await applyTheme(page, 'neo-brutal', 'neo-brutal variant-nav-bar variant-brutal');

  const brutal = page.getByTestId('theme-card-neo-brutal');
  await expect(brutal).toHaveClass(/is-selected/);
  await expect(page.locator('.theme-card.is-selected .theme-card-check')).toBeVisible();

  // Token actually changed on the document (not just an attribute):
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim()
  );
  expect(bg.toLowerCase()).toBe('#f4f2ea');
});

test('selected theme persists across a reload (store + pre-paint mirror)', async ({ page }) => {
  await openAppReady(page);
  await page.goto('/app?view=settings');
  await page.locator('.app-root').waitFor({ state: 'visible' });
  await applyTheme(page, 'zen-archive', 'zen-archive');

  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  // The bootstrap script must restore the theme pre-paint. Sample a token:
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim()
  );
  expect(bg.toLowerCase()).toBe('#141d19');

  // And the gallery shows the persisted selection.
  await page.goto('/app?view=settings');
  await page.locator('.app-root').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Theme/ }).last().click();
  await expect(page.getByTestId('theme-card-zen-archive')).toHaveClass(/is-selected/);
});

test('every theme is layout-safe on mobile: no horizontal overflow, no heading overlap, nav present', async ({ page }) => {
  // Ten full apply+navigate cycles — production CI runners are slow; give
  // this sweep generous headroom over the 90s project default.
  test.setTimeout(240_000);
  const mobile = await isMobile(page);
  await openAppReady(page);

  for (const id of THEME_IDS) {
    // Apply from the Appearance screen…
    await page.goto('/app?view=settings');
    await page.locator('.app-root').waitFor({ state: 'visible' });
    await applyTheme(page, id);

    // …check the Appearance screen itself (card grid + selected ring)…
    for (const probe of [await layoutBox(page)]) {
      expect(probe.sw, `overflow on appearance under ${id}`).toBeLessThanOrEqual(probe.cw + 1);
    }

    // …then Home and Archive with the theme active.
    for (const view of ['home', 'archive']) {
      await page.goto(`/app${view === 'home' ? '' : `?view=${view}`}`);
      await page.locator('.app-root').waitFor({ state: 'visible' });
      const box = await layoutBox(page);
      expect(box.sw, `horizontal overflow under ${id} on ${view} (sw=${box.sw} cw=${box.cw})`).toBeLessThanOrEqual(box.cw + 1);
      if (mobile && box.gap !== null) {
        // The theme retunes spacing; the gap must never go negative (overlap).
        expect(box.gap, `heading/subtitle collision under ${id} on ${view}`).toBeGreaterThanOrEqual(0);
      }
      if (mobile) expect(box.nav, `bottom nav missing under ${id}`).toBe(true);
    }
  }
});

test('flush-bar themes dock the nav at the viewport bottom; tile themes float', async ({ page }) => {
  await openAppReady(page);
  await page.goto('/app?view=settings');
  await page.locator('.app-root').waitFor({ state: 'visible' });

  // archive-paper uses `variant-nav-bar`: a flush full-width bar.
  await applyTheme(page, 'archive-paper', 'archive-paper variant-nav-bar');
  const flush = await page.evaluate(() => {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return null;
    const r = nav.getBoundingClientRect();
    return {
      bottomGap: Math.round(window.innerHeight - r.bottom),
      sideGap: Math.round(r.left),
      radius: getComputedStyle(nav).borderTopLeftRadius,
    };
  });
  if (await isMobile(page) && flush) {
    expect(flush.bottomGap).toBeLessThanOrEqual(2);
    expect(flush.sideGap).toBe(0);
    expect(flush.radius).toBe('0px');
  }

  // metro-pop keeps the nav floating (tile variant) — the offset is real.
  await applyTheme(page, 'metro-pop', 'metro-pop variant-nav-tiles variant-tiles');
  const floats = await page.evaluate(() => {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return null;
    return Math.round(window.innerHeight - nav.getBoundingClientRect().bottom);
  });
  if (await isMobile(page) && floats !== null) expect(floats).toBeGreaterThan(2);
});

test('dialogs and the keyboard-safe layer keep working under the brutal theme', async ({ page }) => {
  await openAppReady(page);
  await page.goto('/app?view=settings');
  await page.locator('.app-root').waitFor({ state: 'visible' });
  await applyTheme(page, 'neo-brutal', 'neo-brutal variant-nav-bar variant-brutal');

  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible' });

  // The root always carries the data-keyboard-open attribute (keyboard-safe
  // chrome is never gated behind a theme).
  await expect(page.locator('html')).toHaveAttribute('data-keyboard-open', /true|false/);

  // Open the capture dialog through the speed-dial FAB and verify the
  // themed portal surface renders.
  await page.locator('.floating-add').click();
  await page.locator('.fab-menu').getByRole('button', { name: 'Note' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  const input = dialog.getByRole('textbox', { name: 'Title' });
  await input.focus();
  await expect(input).toBeInViewport();

  // Escape closes (Radix contract inside the themed dialog).
  await input.press('Escape');
  await expect(dialog).toBeHidden({ timeout: 10_000 });
});
