import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3100',
  },
  webServer: {
    command: 'npm run build && npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 240 * 1000,
    env: {
      ...process.env,
      // AI provider fixtures used by admin AI surfaces
      AI_PROVIDER_MODE: 'openai_compatible',
      AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
      AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
      AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
      AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini,gpt-4.1-mini',
      AI_PROVIDER_SECONDARY_NAME: 'Local Ollama',
      AI_PROVIDER_SECONDARY_BASE_URL: 'http://127.0.0.1:11434/v1',
      AI_PROVIDER_SECONDARY_API_KEY: 'ollama-local',
      AI_PROVIDER_SECONDARY_MODELS: 'qwen2.5-coder:7b,llama3.1:8b',
      // E2E runs without a real Supabase instance. Route mocks intercept
      // GoTrue requests by matching the (relative) origin path. This flag
      // MUST stay false-y in production builds.
      NEXT_PUBLIC_SUPABASE_TEST_MODE: 'true',
      // Admin pages enforce auth when Supabase is configured; without Supabase
      // they would render with no auth check. The explicit bypass lets the
      // E2E server render admin surfaces for the admin spec. APIs still 503.
      ENABLE_ADMIN_BYPASS: 'true',
      // Force the E2E server to treat Supabase as unconfigured so that:
      //   - admin APIs return 503 (never trust the caller)
      //   - admin pages rely on the explicit bypass above
      //   - browser client uses test-mode origin fallback for route mocks
      // Override any values that might leak from .env.local on dev machines.
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
    },
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        channel: 'chrome',
      },
    },
  ],
})
