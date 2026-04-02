import { describe, expect, it } from 'vitest'

import {
  hasAiEnv,
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
