import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AiSettingsCard } from './ai-settings-card'

describe('AiSettingsCard', () => {
  it('saves the selected provider slot and model', async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true })

    render(
      <AiSettingsCard
        providers={[
          {
            slot: 'primary',
            name: 'OpenAI',
            baseUrl: 'https://api.openai.com/v1',
            models: ['gpt-5-mini'],
          },
          {
            slot: 'secondary',
            name: 'Local Ollama',
            baseUrl: 'http://127.0.0.1:11434/v1',
            models: ['qwen2.5-coder:7b', 'llama3.1:8b'],
          },
        ]}
        currentSelection={{
          defaultProviderSlot: 'primary',
          defaultModel: 'gpt-5-mini',
        }}
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByTestId('admin-ai-provider-select'), {
      target: { value: 'secondary' },
    })
    fireEvent.change(screen.getByTestId('admin-ai-model-select'), {
      target: { value: 'qwen2.5-coder:7b' },
    })
    fireEvent.click(screen.getByTestId('admin-ai-settings-save'))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        defaultProviderSlot: 'secondary',
        defaultModel: 'qwen2.5-coder:7b',
      }),
    )
  })
})
