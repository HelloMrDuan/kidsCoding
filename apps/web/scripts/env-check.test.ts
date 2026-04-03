import { describe, expect, it } from 'vitest'

import { createEnvCheckReport } from './env-check-core.mjs'

describe('createEnvCheckReport', () => {
  it('marks a half-configured secondary slot as FAIL in production', () => {
    const report = createEnvCheckReport({
      mode: 'production',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb-publishable',
        SUPABASE_SERVICE_ROLE_KEY: 'sb-service',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_123',
        NEXT_PUBLIC_APP_URL: 'https://kidscoding.example.com',
        PAYMENT_PROVIDER_DEFAULT: 'stripe',
        AI_PROVIDER_MODE: 'openai_compatible',
        AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
        AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
        AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
        AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini',
        AI_PROVIDER_SECONDARY_NAME: 'Local Ollama',
      },
    })

    expect(report.summary.failCount).toBe(1)
    expect(report.groups.find((group) => group.id === 'ai-secondary')?.status).toBe(
      'FAIL',
    )
  })

  it('warns in development when stripe is missing', () => {
    const report = createEnvCheckReport({
      mode: 'development',
      env: {
        PAYMENT_PROVIDER_DEFAULT: 'aggregated_cn',
        AI_PROVIDER_MODE: 'openai_compatible',
        AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
        AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
        AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
        AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini',
      },
    })

    expect(report.groups.find((group) => group.id === 'stripe')?.status).toBe(
      'WARN',
    )
    expect(report.groups.find((group) => group.id === 'cn-payment')?.status).toBe(
      'WARN',
    )
  })

  it('fails in production when no AI provider slot is fully configured', () => {
    const report = createEnvCheckReport({
      mode: 'production',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb-publishable',
        SUPABASE_SERVICE_ROLE_KEY: 'sb-service',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_123',
        NEXT_PUBLIC_APP_URL: 'https://kidscoding.example.com',
        AI_PROVIDER_MODE: 'openai_compatible',
      },
    })

    expect(report.summary.failCount).toBeGreaterThan(0)
    expect(report.groups.find((group) => group.id === 'ai-default')?.status).toBe(
      'FAIL',
    )
  })

  it('fails in production when aggregated_cn is the default without provider credentials', () => {
    const report = createEnvCheckReport({
      mode: 'production',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb-publishable',
        SUPABASE_SERVICE_ROLE_KEY: 'sb-service',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_123',
        NEXT_PUBLIC_APP_URL: 'https://kidscoding.example.com',
        PAYMENT_PROVIDER_DEFAULT: 'aggregated_cn',
        AI_PROVIDER_MODE: 'openai_compatible',
        AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
        AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
        AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
        AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini',
      },
    })

    expect(report.groups.find((group) => group.id === 'cn-payment')?.status).toBe(
      'FAIL',
    )
  })
})
