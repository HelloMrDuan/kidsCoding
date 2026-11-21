import { defineConfig } from '@playwright/test'

// Scratch cases also require the pinned GUI host. Both suites use the real
// Chrome channel and the production Web build in CI.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['scratch-create.spec.ts', 'python-create.spec.ts', 'g2-golden-concert.spec.ts', 'g3-golden-meteor.spec.ts'],
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
