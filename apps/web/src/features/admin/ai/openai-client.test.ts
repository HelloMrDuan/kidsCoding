import { beforeEach, describe, expect, it, vi } from 'vitest'

import { callOpenAiStructuredJson } from './openai-client'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

describe('callOpenAiStructuredJson', () => {
  const originalApiKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
  })

  it('sends a structured responses request and parses the returned json text', async () => {
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
      model: 'gpt-5-mini',
      prompt: '生成骨架',
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
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      model: 'gpt-5-mini',
      input: '生成骨架',
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
        model: 'gpt-5-mini',
        prompt: '生成骨架',
        schemaName: 'launch_curriculum_skeleton',
        schema: {
          type: 'object',
        },
      }),
    ).rejects.toThrow('openai-request-failed:429')
  })

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey
  })
})
