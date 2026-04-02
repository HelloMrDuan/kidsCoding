import type {
  AiRuntimeSettingRow,
  ResolvedAiClientConfig,
} from '@/features/domain/types'
import { parseAiProviderSlots, resolveAiProviderSelection } from '@/lib/env'

type RuntimeSettingsRepository = {
  loadAiRuntimeSetting: () => Promise<AiRuntimeSettingRow | null>
  upsertAiRuntimeSetting: (row: AiRuntimeSettingRow) => Promise<void>
}

export async function saveAiRuntimeSelection(input: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>
  actorUserId: string
  selection: {
    defaultProviderSlot: 'primary' | 'secondary'
    defaultModel: string
  }
  repository: Pick<RuntimeSettingsRepository, 'upsertAiRuntimeSetting'>
}) {
  const providers = parseAiProviderSlots(input.env ?? process.env)
  const provider = providers.find(
    (item) => item.slot === input.selection.defaultProviderSlot,
  )

  if (!provider) {
    throw new Error('ai-provider-slot-unavailable')
  }

  if (!provider.models.includes(input.selection.defaultModel)) {
    throw new Error('ai-model-unavailable')
  }

  await input.repository.upsertAiRuntimeSetting({
    setting_key: 'default',
    default_provider_slot: input.selection.defaultProviderSlot,
    default_model: input.selection.defaultModel,
    updated_at: new Date().toISOString(),
    updated_by: input.actorUserId,
  })
}

export async function resolveAiRequestConfig(input: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>
  mode: 'development' | 'production'
  repository: Pick<RuntimeSettingsRepository, 'loadAiRuntimeSetting'>
}): Promise<ResolvedAiClientConfig> {
  const stored = await input.repository.loadAiRuntimeSetting()
  const resolved = resolveAiProviderSelection({
    env: input.env ?? process.env,
    mode: input.mode,
    stored: stored
      ? {
          default_provider_slot: stored.default_provider_slot,
          default_model: stored.default_model,
        }
      : null,
  })

  return {
    providerName: resolved.provider.name,
    baseUrl: resolved.provider.baseUrl,
    apiKey: resolved.provider.apiKey,
    model: resolved.model,
    usedFallback: resolved.usedFallback,
  }
}
