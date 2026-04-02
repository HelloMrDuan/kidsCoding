import { beforeEach, describe, expect, it, vi } from 'vitest'

import { callOpenAiStructuredJson } from './openai-client'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

describe('callOpenAiStructuredJson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to the configured provider base URL and parses the returned json text', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: '{"lessonId":"trial-01","stage":"trial"}',
              },
            ],
          },
        ],
      }),
    })

    const result = await callOpenAiStructuredJson<{
      lessonId: string
      stage: string
    }>({
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama-local',
      model: 'qwen2.5-coder:7b',
      prompt: '生成课程骨架',
      schemaName: 'launch_curriculum_skeleton',
      schema: {
        type: 'object',
      },
    })

    expect(result).toEqual({
      lessonId: 'trial-01',
      stage: 'trial',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer ollama-local',
        }),
      }),
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      model: 'qwen2.5-coder:7b',
      input: '生成课程骨架',
      text: {
        format: {
          type: 'json_schema',
          name: 'launch_curriculum_skeleton',
          strict: true,
          schema: {
            type: 'object',
          },
        },
      },
    })
  })

  it('throws when the responses request fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
    })

    await expect(
      callOpenAiStructuredJson({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-primary',
        model: 'gpt-5-mini',
        prompt: '生成课程骨架',
        schemaName: 'launch_curriculum_skeleton',
        schema: {
          type: 'object',
        },
      }),
    ).rejects.toThrow('openai-request-failed:429')
  })
})
