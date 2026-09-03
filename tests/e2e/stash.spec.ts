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

// iPhone PWA-specific tests. These run on the iPhone 14 and iPhone 16
// Pro Max projects (defined in playwright.config.ts) so we exercise
// the actual Safari-on-iOS viewport and user-agent string. The shared
// React core renders identically across both projects, but the
// viewport width / height / device-pixel-ratio differ.
//
// These tests focus on the iPhone-specific behaviour:
//   1. The bottom-nav + home greeting + page content all fit at
//      390pt and 430pt without horizontal scroll.
//   2. Safe-area insets are honored: the topbar padding-top equals
//      env(safe-area-inset-top), and the bottom-nav clears the home
//      indicator at env(safe-area-inset-bottom).
//   3. The page-subtitle uses positive top margin (not negative),
//      so the heading + subtitle stack reads cleanly at 390pt.
//   4. Touch targets in the topbar are >= 44px tall (Apple HIG).
test.describe('iPhone PWA polish', () => {
  test('app fits at iPhone widths without horizontal scroll', async ({ page }) => {
    await openApp(page);
    // Skip onboarding.
    const startEmpty = page.getByRole('button', { name: 'Start empty' });
    if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startEmpty.click();
      await expect(startEmpty).toBeHidden({ timeout: 30_000 });
    }
    // No horizontal overflow on the document body. scrollWidth should
    // equal clientWidth within 1px (rounding).
    const overflow = await page.evaluate(() => {
      const body = document.body;
      return { sw: body.scrollWidth, cw: body.clientWidth };
    });
    expect(overflow.sw).toBeLessThanOrEqual(overflow.cw + 1);
  });

  test('topbar icons meet the 44pt minimum touch target', async ({ page }) => {
    await openApp(page);
    const startEmpty = page.getByRole('button', { name: 'Start empty' });
    if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startEmpty.click();
      await expect(startEmpty).toBeHidden({ timeout: 30_000 });
    }
    // The two icon buttons in the topbar (Resurface pulse, Notifications)
    // must be at least 44x44 CSS pixels.
    const resurface = page.getByRole('button', { name: 'Resurface pulse' });
    const bell = page.getByRole('button', { name: 'Notifications' });
    await expect(resurface).toBeVisible();
    await expect(bell).toBeVisible();
    const r = await resurface.boundingBox();
    const b = await bell.boundingBox();
    expect(r).not.toBeNull();
    expect(b).not.toBeNull();
    if (r) {
      expect(r.height).toBeGreaterThanOrEqual(44);
      expect(r.width).toBeGreaterThanOrEqual(44);
    }
    if (b) {
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('bottom-nav has 5 items and a clear click target per item', async ({ page }) => {
    await openApp(page);
    const startEmpty = page.getByRole('button', { name: 'Start empty' });
    if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startEmpty.click();
      await expect(startEmpty).toBeHidden({ timeout: 30_000 });
    }
    const dock = page.locator('nav.bottom-nav');
    await expect(dock).toBeVisible();
    const items = dock.locator('button.bottom-nav-item');
    await expect(items).toHaveCount(5);
    // Each dock item must be at least 44px tall to be a comfortable
    // tap target on iOS.
    const heights = await items.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    for (const h of heights) {
      expect(h).toBeGreaterThanOrEqual(44);
    }
  });

  test('home greeting + subtitle stack reads cleanly with positive rhythm', async ({ page }) => {
    await openApp(page);
    const startEmpty = page.getByRole('button', { name: 'Start empty' });
    if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startEmpty.click();
      await expect(startEmpty).toBeHidden({ timeout: 30_000 });
    }
    const greeting = page.locator('h1.home-greeting');
    const subtitle = page.locator('p.page-subtitle').first();
    await expect(greeting).toBeVisible();
    await expect(subtitle).toBeVisible();
    // Subtitle top must be GREATER than greeting bottom — the previous
    // negative-margin layout placed subtitle.text on top of the heading
    // on narrow iPhones. With positive rhythm there is a clear gap.
    const g = await greeting.boundingBox();
    const s = await subtitle.boundingBox();
    expect(g).not.toBeNull();
    expect(s).not.toBeNull();
    if (g && s) {
      expect(s.y).toBeGreaterThan(g.y + g.height - 1);
    }
  });

  test('in-app install modal is NOT shown in standalone mode', async ({ page, context }) => {
    // Simulate the PWA installed via Add to Home Screen by injecting
    // a matching display-mode media query. The modal is gated on
    // useStandalone() === 'browser'; we can't easily emulate the iOS
    // `navigator.standalone` flag in Chromium, but we can confirm the
    // hook picks up the display-mode media query.
    await page.addInitScript(() => {
      // Polyfill the matchMedia for (display-mode: standalone) to
      // return matches=true. In a real iOS Safari this is automatic
      // when the app is launched from the Home Screen.
      /* oxlint-disable typescript/no-unsafe-type-assertion -- test polyfill */
      const originalMatchMedia = window.matchMedia.bind(window);
      const fakeListener = () => undefined;
      window.matchMedia = (query: string) => {
        const isStandaloneLike =
          query === '(display-mode: standalone)' ||
          query === '(display-mode: fullscreen)' ||
          query === '(display-mode: minimal-ui)';
        const result = originalMatchMedia(query);
        const stubbed = Object.assign({}, result, {
          matches: isStandaloneLike || result.matches,
          media: query,
          onchange: null,
          addListener: fakeListener,
          removeListener: fakeListener,
          addEventListener: fakeListener,
          removeEventListener: fakeListener,
          dispatchEvent: () => true,
        });
        return stubbed as MediaQueryList;
      };
      /* oxlint-enable typescript/no-unsafe-type-assertion */
    });
    await openApp(page);
    // Trigger the install modal via the public Settings page.
    const startEmpty = page.getByRole('button', { name: 'Start empty' });
    if (await startEmpty.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startEmpty.click();
      await expect(startEmpty).toBeHidden({ timeout: 30_000 });
    }
    await page.evaluate(() => window.dispatchEvent(new Event('stash-install-request')));
    // In standalone the modal should NEVER mount. In browser mode it
    // would show "Install STASH" heading. Assert it's absent.
    await expect(page.getByRole('dialog').filter({ hasText: 'Install STASH' })).toHaveCount(0);
    await context.close();
  });
});
