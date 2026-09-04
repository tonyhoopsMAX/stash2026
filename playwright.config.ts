import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // We exercise the PRE-BUILT production bundle (`vinext build --prerender-all`
  // then `vinext start`), not the dev server. The /app route pulls a heavy
  // client bundle (motion, recharts, lucide); in dev that is transformed
  // lazily per request, and on a cold CI runner that on-demand transform +
  // hydration intermittently exceeded a narrow timeout, leaving the app on its
  // splash screen. Running against the production bundle (which is fully
  // pre-bundled and prerendered) removes that cold-start race deterministically
  // while still exercising the real rendered app.
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    navigationTimeout: 60_000,
  },
  webServer: {
    command: 'pnpm build:web && pnpm start',
    url: 'http://localhost:3000/app',
    reuseExistingServer: false,
    timeout: 300_000,
  },
  // Matrix policy (kept deliberately narrow for CI runtime):
  //   * Chromium runs the full product suite. Mobile-specific tests carry
  //     their own viewport overrides (`test.use(...)`) so they stay honest
  //     here instead of relying on separate browser×device projects.
  //   * WebKit runs ONE smoke test (iPhone 14) — enough to catch engine-level
  //     PWA/mobile regressions (safe-area meta, manifest wiring, first tap)
  //     without duplicating every spec across two WebKit device profiles.
  // Registry integrity and per-theme token existence are unit-tested
  // (tests/unit/themes.test.ts) — no need to re-derive them per browser.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'iphone-14-smoke',
      testMatch: 'iphone-smoke.spec.ts',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
