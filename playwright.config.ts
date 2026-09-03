import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // The /app route pulls in a heavy client bundle (motion, recharts, lucide)
  // that the Vite dev server transforms on first request. On a cold CI runner
  // that first transform + hydration can exceed a narrow timeout, so give each
  // test a generous wall-clock budget and wait for the app to actually become
  // ready rather than racing it. This is test-harness robustness, not a way of
  // hiding real failures: a genuinely broken page will still time out.
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
    command: 'pnpm dev',
    url: 'http://localhost:3000/app',
    reuseExistingServer: true,
    timeout: 240_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
