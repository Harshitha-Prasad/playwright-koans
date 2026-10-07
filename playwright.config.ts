import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * Two projects share one config:
 *   koans      the failing tests you fix          (npm run koans)
 *   solutions  one possible answer for each koan  (npm run solutions)
 *
 * The timeouts are deliberately short so an unsolved koan fails in seconds, not half a minute.
 */
export default defineConfig({
  timeout: 15_000,
  expect: { timeout: 3_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['./support/progress-reporter.ts'], ['html', { open: 'never' }]],

  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 3_000,
    // Every failing koan leaves a trace behind: `npx playwright show-report`, then click the test.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'koans', testDir: './koans' },
    { name: 'solutions', testDir: './solutions' },
  ],

  // Playwright starts the demo app for you and stops it when the run ends.
  webServer: {
    command: 'node app/server.mjs',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
  },
});
