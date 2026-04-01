import { getRequiredEnv } from '@/lib/env'

type JsonSchema = Record<string, unknown>

function extractOutputText(payload: unknown) {
  if (
    payload &&
    typeof payload === 'object' &&
    'output_text' in payload &&
    typeof payload.output_text === 'string'
  ) {
    return payload.output_text
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'output' in payload &&
    Array.isArray(payload.output)
  ) {
    for (const item of payload.output) {
      if (!item || typeof item !== 'object' || !('content' in item)) {
        continue
      }

      const content = item.content

      if (!Array.isArray(content)) {
        continue
      }

      for (const part of content) {
        if (
          part &&
          typeof part === 'object' &&
          'text' in part &&
          typeof part.text === 'string'
        ) {
          return part.text
        }
      }
    }
  }

  throw new Error('openai-output-missing')
}

export async function callOpenAiStructuredJson<T>(input: {
  model: string
  prompt: string
  schemaName: string
  schema: JsonSchema
}) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getRequiredEnv('OPENAI_API_KEY')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      input: input.prompt,
      text: {
        format: {
          type: 'json_schema',
          name: input.schemaName,
          strict: true,
          schema: input.schema,
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`openai-request-failed:${response.status}`)
  }

  const payload = (await response.json()) as unknown
  const outputText = extractOutputText(payload)

  return JSON.parse(outputText) as T
}
