import { describe, expect, it, vi } from 'vitest'

import {
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
})
