import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

/**
 * Tests for the website in site/ (npm run site:test).
 * Kept apart from playwright.config.ts so that running the koans never builds or serves the site.
 */
export default defineConfig({
  testDir: './site/tests',
  outputDir: 'test-results-site',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-site' }]],

  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
  },

  webServer: {
    command: 'node site/build.mjs && node site/serve.mjs',
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
  },
});
