import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getCnPaymentProviderEnv,
  hasAiEnv,
  hasServiceRoleEnv,
  hasSupabaseEnv,
  isAdminBypassEnabled,
  parseAiProviderSlots,
  resolveAiProviderSelection,
} from './env'

describe('parseAiProviderSlots', () => {
  it('returns both configured slots with parsed model arrays', () => {
    const providers = parseAiProviderSlots({
      AI_PROVIDER_MODE: 'openai_compatible',
      AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
      AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
      AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
      AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini,gpt-4.1-mini',
      AI_PROVIDER_SECONDARY_NAME: 'Local Ollama',
      AI_PROVIDER_SECONDARY_BASE_URL: 'http://127.0.0.1:11434/v1',
      AI_PROVIDER_SECONDARY_API_KEY: 'ollama-local',
      AI_PROVIDER_SECONDARY_MODELS: 'qwen2.5-coder:7b,llama3.1:8b',
    })

    expect(providers).toEqual([
      {
        slot: 'primary',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-primary',
        models: ['gpt-5-mini', 'gpt-4.1-mini'],
      },
      {
        slot: 'secondary',
        name: 'Local Ollama',
        baseUrl: 'http://127.0.0.1:11434/v1',
        apiKey: 'ollama-local',
        models: ['qwen2.5-coder:7b', 'llama3.1:8b'],
      },
    ])
  })
})

describe('resolveAiProviderSelection', () => {
  const env = {
    AI_PROVIDER_MODE: 'openai_compatible',
    AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
    AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
    AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
    AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini,gpt-4.1-mini',
  }

  it('falls back to the first configured slot in development when stored selection is invalid', () => {
    const resolved = resolveAiProviderSelection({
      env,
      mode: 'development',
      stored: {
        default_provider_slot: 'secondary',
        default_model: 'missing-model',
      },
    })

    expect(resolved.provider.slot).toBe('primary')
    expect(resolved.model).toBe('gpt-5-mini')
    expect(resolved.usedFallback).toBe(true)
  })

  it('throws in production when the stored selection is invalid', () => {
    expect(() =>
      resolveAiProviderSelection({
        env,
        mode: 'production',
        stored: {
          default_provider_slot: 'secondary',
          default_model: 'missing-model',
        },
      }),
    ).toThrowError('ai-runtime-selection-invalid')
  })
})

describe('hasAiEnv', () => {
  it('requires the openai_compatible mode plus one complete slot', () => {
    expect(
      hasAiEnv({
        AI_PROVIDER_MODE: 'openai_compatible',
        AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
        AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
        AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
        AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini',
      }),
    ).toBe(true)

    expect(hasAiEnv({ OPENAI_API_KEY: 'legacy-only' })).toBe(false)
  })

  it('returns false instead of throwing when a slot is half-configured', () => {
    expect(
      hasAiEnv({
        AI_PROVIDER_MODE: 'openai_compatible',
        AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
      }),
    ).toBe(false)
  })
})

describe('getCnPaymentProviderEnv', () => {
  it('returns trimmed CN payment provider settings', () => {
    const env = getCnPaymentProviderEnv({
      CN_PAYMENT_PROVIDER_BASE_URL: ' https://payments.example.com ',
      CN_PAYMENT_PROVIDER_APP_ID: ' demo-app-id ',
      CN_PAYMENT_PROVIDER_APP_SECRET: ' demo-app-secret ',
      CN_PAYMENT_PROVIDER_WEBHOOK_SECRET: ' demo-webhook-secret ',
    })

    expect(env).toEqual({
      baseUrl: 'https://payments.example.com',
      appId: 'demo-app-id',
      appSecret: 'demo-app-secret',
      webhookSecret: 'demo-webhook-secret',
    })
  })
})

describe('isAdminBypassEnabled', () => {
  it('returns false when bypass flag is absent', () => {
    expect(
      isAdminBypassEnabled({
        NODE_ENV: 'development',
      }),
    ).toBe(false)
  })

  it('returns false when bypass flag is not true', () => {
    expect(
      isAdminBypassEnabled({
        NODE_ENV: 'development',
        ENABLE_ADMIN_BYPASS: 'false',
      }),
    ).toBe(false)
  })

  it('returns false in production without test mode even if flag is true', () => {
    expect(
      isAdminBypassEnabled({
        NODE_ENV: 'production',
        ENABLE_ADMIN_BYPASS: 'true',
      }),
    ).toBe(false)
  })

  it('returns true in non-production when flag is true (local dev path)', () => {
    expect(
      isAdminBypassEnabled({
        NODE_ENV: 'development',
        ENABLE_ADMIN_BYPASS: 'true',
      }),
    ).toBe(true)

    expect(
      isAdminBypassEnabled({
        NODE_ENV: 'test',
        ENABLE_ADMIN_BYPASS: 'true',
      }),
    ).toBe(true)
  })

  it('returns true in production when both test mode and bypass flag are set (E2E path)', () => {
    expect(
      isAdminBypassEnabled({
        NODE_ENV: 'production',
        ENABLE_ADMIN_BYPASS: 'true',
        NEXT_PUBLIC_SUPABASE_TEST_MODE: 'true',
      }),
    ).toBe(true)
  })

  it('returns false in production with test mode but without bypass flag', () => {
    expect(
      isAdminBypassEnabled({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_TEST_MODE: 'true',
      }),
    ).toBe(false)
  })

  it('trims whitespace from flag values', () => {
    expect(
      isAdminBypassEnabled({
        NODE_ENV: 'development',
        ENABLE_ADMIN_BYPASS: '  true  ',
      }),
    ).toBe(true)

    expect(
      isAdminBypassEnabled({
        NODE_ENV: 'production',
        ENABLE_ADMIN_BYPASS: '  true  ',
        NEXT_PUBLIC_SUPABASE_TEST_MODE: '  true  ',
      }),
    ).toBe(true)
  })
})

// hasSupabaseEnv / hasServiceRoleEnv read process.env directly (they are used
// by server components and route handlers that cannot accept an env arg).
// We stub process.env to exercise the test-mode short-circuit, which prevents
// `.env.local` leakage from turning 503 responses into 500s in E2E builds.
describe('hasSupabaseEnv / hasServiceRoleEnv test-mode guard', () => {
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_TEST_MODE',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of keys) saved[k] = process.env[k]
  })
  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
    vi.unstubAllEnvs()
  })

  it('returns true when Supabase env is present and test mode is off', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pk')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sk')
    delete process.env.NEXT_PUBLIC_SUPABASE_TEST_MODE
    expect(hasSupabaseEnv()).toBe(true)
    expect(hasServiceRoleEnv()).toBe(true)
  })

  it('returns false in test mode even when Supabase env would be present', () => {
    // Simulates `.env.local` leaking real values into a Playwright build:
    // NEXT_PUBLIC_* are inlined at build time, so the runtime sees real
    // values. Test mode must force the no-Supabase branch so admin APIs
    // return 503 instead of reaching assertAdminUser and throwing 500.
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_TEST_MODE', 'true')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pk')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sk')
    expect(hasSupabaseEnv()).toBe(false)
    expect(hasServiceRoleEnv()).toBe(false)
  })

  it('returns false when Supabase env is absent', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_TEST_MODE
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(hasSupabaseEnv()).toBe(false)
    expect(hasServiceRoleEnv()).toBe(false)
  })
})
