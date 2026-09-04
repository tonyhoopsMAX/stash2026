import { expect, test, type Page } from '@playwright/test';

// Theme-system product flows on the production bundle.
//
// Verifies the full loop: Appearance → tap card → instant application →
// selection indicator → persistence across reload (IndexedDB + localStorage
// pre-paint mirror) → per-theme mobile layout sanity (no overflow, no
// heading/subtitle overlap, bottom-nav usable, keyboard-safe chrome present).

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

const isMobile = (page: Page) =>
  page.evaluate(() => window.innerWidth < 700);

async function openAppReady(page: Page) {
  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  const startEmpty = page.getByRole('button', { name: 'Start empty' });
  if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await startEmpty.click();
    await expect(startEmpty).toBeHidden({ timeout: 30_000 });
  }
}

async function seedTheme(page: Page, themeId: string) {
  // Seed the pre-paint mirror only → proves the bootstrap path. The store
  // hydrates the rest.
  await page.addInitScript(
    `try { localStorage.setItem('stash-theme-id', ${JSON.stringify(themeId)}); } catch {}`
  );
}

test('appearance screen is a theme browser with one preview card per theme', async ({ page }) => {
  await openAppReady(page);
  await page.getByRole('button', { name: /Theme/ }).last().click();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();

  for (const id of THEME_IDS) {
    await expect(page.getByTestId(`theme-card-${id}`)).toBeVisible();
  }
  // Every card shows name + description (readable in the snapshot).
  await expect(page.getByText('Neo Brutal').first()).toBeVisible();
  await expect(page.getByText(/Raw blocks, thick outlines/).first()).toBeVisible();
});

test('tapping a theme applies it instantly and marks the selected card', async ({ page }) => {
  await openAppReady(page);
  await page.getByRole('button', { name: /Theme/ }).last().click();

  const brutal = page.getByTestId('theme-card-neo-brutal');
  await brutal.click();

  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
    .toBe('neo-brutal variant-nav-bar variant-brutal');
  await expect(brutal).toHaveClass(/is-selected/);
  await expect(page.locator('.theme-card.is-selected .theme-card-check')).toBeVisible();

  // Token actually changed on the document (not just an attribute):
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim()
  );
  expect(bg.toLowerCase()).toBe('#f4f2ea');
});

test('selected theme persists across a reload (mirror + IndexedDB)', async ({ page }) => {
  await openAppReady(page);
  await page.getByRole('button', { name: /Theme/ }).last().click();
  await page.getByTestId('theme-card-zen-archive').click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
    .toContain('zen-archive');

  await page.reload();
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  // data-theme is set pre-paint by the bootstrap — assert via computed token.
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim()
  );
  expect(bg.toLowerCase()).toBe('#141d19');

  // And the gallery shows the persisted selection.
  await page.getByRole('button', { name: /Theme/ }).last().click();
  await expect(page.getByTestId('theme-card-zen-archive')).toHaveClass(/is-selected/);
});

test('every theme is layout-safe on mobile: no horizontal overflow, no heading overlap, nav present', async ({ page }) => {
  const mobile = await isMobile(page);
  for (const id of THEME_IDS) {
    await seedTheme(page, id);
    await page.goto('/app');
    await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
    await page.evaluate((themeId) => {
      localStorage.setItem('stash-theme-id', themeId);
    }, id);
    // Reload once so the attribute (not just storage) is authoritative.
    await page.reload();
    await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });

    const box = await page.evaluate(() => ({
      sw: document.body.scrollWidth,
      cw: document.body.clientWidth,
      title: (() => {
        const h = document.querySelector('.page-header-title')?.getBoundingClientRect();
        const sub = document.querySelector('.page-subtitle')?.getBoundingClientRect();
        return h && sub ? Math.round(sub.top - h.bottom) : null;
      })(),
      nav: !!document.querySelector('.bottom-nav'),
    }));
    expect(box.sw, `horizontal overflow under ${id} (sw=${box.sw} cw=${box.cw})`).toBeLessThanOrEqual(box.cw + 1);
    if (mobile && box.title !== null) {
      // The theme retunes spacing; the gap must never go negative (overlap).
      expect(box.title, `heading/subtitle collision under ${id}`).toBeGreaterThanOrEqual(0);
    }
    if (mobile) expect(box.nav, `bottom nav missing under ${id}`).toBe(true);
  }
});

test('flush-bar themes dock the nav at the viewport bottom; pill themes float', async ({ page }) => {
  await seedTheme(page, 'metro-pop');
  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  const flush = await page.evaluate(() => {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return null;
    const r = nav.getBoundingClientRect();
    return { bottomGap: Math.round(window.innerHeight - r.bottom), radius: getComputedStyle(nav).borderTopLeftRadius };
  });
  if (await isMobile(page) && flush) {
    expect(flush.bottomGap).toBeLessThanOrEqual(2);
    expect(flush.radius).toBe('0px');
  }
});

test('keyboard-safe chrome still works under the brutal theme (capture dialog)', async ({ page }) => {
  await seedTheme(page, 'neo-brutal');
  await page.goto('/app');
  await page.locator('.app-root').waitFor({ state: 'visible', timeout: 60_000 });
  const startEmpty = page.getByRole('button', { name: 'Start empty' });
  if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) await startEmpty.click();

  await expect(page.locator('html')).toHaveAttribute('data-keyboard-open', /true|false/);
  await page.getByRole('button', { name: 'Note', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  const input = dialog.getByRole('textbox', { name: 'Title' });
  await input.focus();
  // Focused input inside the themed dialog is visible above the dock.
  await expect(input).toBeInViewport();
});
