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
      AI_PROVIDER_MODE: 'openai_compatible',
      AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
      AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
      AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
      AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini,gpt-4.1-mini',
      AI_PROVIDER_SECONDARY_NAME: 'Local Ollama',
      AI_PROVIDER_SECONDARY_BASE_URL: 'http://127.0.0.1:11434/v1',
      AI_PROVIDER_SECONDARY_API_KEY: 'ollama-local',
      AI_PROVIDER_SECONDARY_MODELS: 'qwen2.5-coder:7b,llama3.1:8b',
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
