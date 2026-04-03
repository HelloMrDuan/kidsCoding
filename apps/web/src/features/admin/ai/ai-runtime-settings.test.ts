import { describe, expect, it, vi } from 'vitest'

import {
  ensureAiRuntimeSelection,
  resolveAiRequestConfig,
  saveAiRuntimeSelection,
} from './ai-runtime-settings'

const env = {
  AI_PROVIDER_MODE: 'openai_compatible',
  AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
  AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
  AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
  AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini,gpt-4.1-mini',
  AI_PROVIDER_SECONDARY_NAME: 'Local Ollama',
  AI_PROVIDER_SECONDARY_BASE_URL: 'http://127.0.0.1:11434/v1',
  AI_PROVIDER_SECONDARY_API_KEY: 'ollama-local',
  AI_PROVIDER_SECONDARY_MODELS: 'qwen2.5-coder:7b,llama3.1:8b',
}

describe('saveAiRuntimeSelection', () => {
  it('rejects a model that does not belong to the chosen slot', async () => {
    await expect(
      saveAiRuntimeSelection({
        env,
        actorUserId: 'admin-1',
        selection: {
          defaultProviderSlot: 'primary',
          defaultModel: 'qwen2.5-coder:7b',
        },
        repository: {
          upsertAiRuntimeSetting: vi.fn(),
        },
      }),
    ).rejects.toThrowError('ai-model-unavailable')
  })
})

describe('resolveAiRequestConfig', () => {
  it('returns the stored slot and model when valid', async () => {
    const result = await resolveAiRequestConfig({
      env,
      mode: 'production',
      repository: {
        loadAiRuntimeSetting: vi.fn().mockResolvedValue({
          default_provider_slot: 'secondary',
          default_model: 'qwen2.5-coder:7b',
        }),
      },
    })

    expect(result.baseUrl).toBe('http://127.0.0.1:11434/v1')
    expect(result.model).toBe('qwen2.5-coder:7b')
  })

  it('bootstraps the default runtime row when none exists', async () => {
    const upsertAiRuntimeSetting = vi.fn().mockResolvedValue(undefined)

    const result = await resolveAiRequestConfig({
      env,
      mode: 'development',
      repository: {
        loadAiRuntimeSetting: vi.fn().mockResolvedValue(null),
        upsertAiRuntimeSetting,
      },
    })

    expect(result.baseUrl).toBe('https://api.openai.com/v1')
    expect(result.model).toBe('gpt-5-mini')
    expect(result.usedFallback).toBe(false)
    expect(upsertAiRuntimeSetting).toHaveBeenCalledWith(
      expect.objectContaining({
        setting_key: 'default',
        default_provider_slot: 'primary',
        default_model: 'gpt-5-mini',
        updated_by: null,
      }),
    )
  })

  it('repairs an invalid stored selection in development', async () => {
    const upsertAiRuntimeSetting = vi.fn().mockResolvedValue(undefined)

    const result = await resolveAiRequestConfig({
      env,
      mode: 'development',
      repository: {
        loadAiRuntimeSetting: vi.fn().mockResolvedValue({
          setting_key: 'default',
          default_provider_slot: 'secondary',
          default_model: 'missing-model',
        }),
        upsertAiRuntimeSetting,
      },
    })

    expect(result.providerName).toBe('OpenAI')
    expect(result.model).toBe('gpt-5-mini')
    expect(result.usedFallback).toBe(false)
    expect(upsertAiRuntimeSetting).toHaveBeenCalledWith(
      expect.objectContaining({
        setting_key: 'default',
        default_provider_slot: 'primary',
        default_model: 'gpt-5-mini',
        updated_by: null,
      }),
    )
  })
})

describe('ensureAiRuntimeSelection', () => {
  it('returns the stored selection unchanged when it is valid', async () => {
    const upsertAiRuntimeSetting = vi.fn()

    const result = await ensureAiRuntimeSelection({
      env,
      mode: 'development',
      repository: {
        loadAiRuntimeSetting: vi.fn().mockResolvedValue({
          setting_key: 'default',
          default_provider_slot: 'secondary',
          default_model: 'qwen2.5-coder:7b',
        }),
        upsertAiRuntimeSetting,
      },
    })

    expect(result).toEqual({
      setting_key: 'default',
      default_provider_slot: 'secondary',
      default_model: 'qwen2.5-coder:7b',
      updated_by: null,
      updated_at: expect.any(String),
    })
    expect(upsertAiRuntimeSetting).not.toHaveBeenCalled()
  })
})
