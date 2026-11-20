import { defineConfig } from '@playwright/test'

// A separately hosted, pinned official Scratch GUI must be running. See
// docs/product/scratch-create/README.md for the two-origin setup.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'scratch-create.spec.ts',
  timeout: 120_000,
  expect: { timeout: 15000 },
  workers: 2,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/scratch-create-report' }]],
  outputDir: 'test-results/scratch-create',
  use: {
    baseURL: process.env.KC_SCRATCH_E2E_ORIGIN ?? 'http://127.0.0.1:3110',
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
