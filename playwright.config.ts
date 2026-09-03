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
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    // iPhone 14 (390x844) — the most common iPhone Safari viewport.
    { name: 'iphone-14', use: { ...devices['iPhone 14'] } },
    // iPhone 16 Pro Max (430x932) — the largest iPhone, useful to confirm
    // the type scale / bottom-nav / safe-area all still work at the edge.
    { name: 'iphone-16-pro-max', use: { ...devices['iPhone 16 Pro Max'] } },
  ],
});
