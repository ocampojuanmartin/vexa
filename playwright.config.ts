import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for Vexa smoke tests.
 *
 * Tests are read-only (login + navigate + assert UI). They use the demo admin
 * account `demo@vexa.app` which lives in the shared Supabase project, so do
 * NOT add tests that create/update/delete rows without a cleanup step.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000/welcome',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
