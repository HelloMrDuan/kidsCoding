import type {
  AiRuntimeSettingRow,
  ResolvedAiClientConfig,
} from '@/features/domain/types'
import { parseAiProviderSlots, resolveAiProviderSelection } from '@/lib/env'

type RuntimeSettingsRepository = {
  loadAiRuntimeSetting: () => Promise<AiRuntimeSettingRow | null>
  upsertAiRuntimeSetting: (row: AiRuntimeSettingRow) => Promise<void>
}

function buildDefaultAiRuntimeSetting(input: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>
}) {
  const providers = parseAiProviderSlots(input.env ?? process.env)
  const provider = providers[0]

  if (!provider || !provider.models[0]) {
    throw new Error('ai-provider-unavailable')
  }

  return {
    setting_key: 'default',
    default_provider_slot: provider.slot,
    default_model: provider.models[0],
    updated_at: new Date().toISOString(),
    updated_by: null,
  } satisfies AiRuntimeSettingRow
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

export async function ensureAiRuntimeSelection(input: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>
  mode: 'development' | 'production'
  repository: RuntimeSettingsRepository
}) {
  const stored = await input.repository.loadAiRuntimeSetting()

  if (!stored) {
    const created = buildDefaultAiRuntimeSetting({ env: input.env })
    await input.repository.upsertAiRuntimeSetting(created)

    return created
  }

  const resolved = resolveAiProviderSelection({
    env: input.env ?? process.env,
    mode: input.mode,
    stored,
  })

  if (!resolved.usedFallback) {
    return {
      setting_key: stored.setting_key,
      default_provider_slot: stored.default_provider_slot,
      default_model: stored.default_model,
      updated_at: stored.updated_at ?? new Date().toISOString(),
      updated_by: stored.updated_by ?? null,
    } satisfies AiRuntimeSettingRow
  }

  const repaired = buildDefaultAiRuntimeSetting({ env: input.env })
  await input.repository.upsertAiRuntimeSetting(repaired)

  return repaired
}

export async function resolveAiRequestConfig(input: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>
  mode: 'development' | 'production'
  repository: RuntimeSettingsRepository
}): Promise<ResolvedAiClientConfig> {
  const stored = await ensureAiRuntimeSelection(input)
  const resolved = resolveAiProviderSelection({
    env: input.env ?? process.env,
    mode: input.mode,
    stored,
  })

  return {
    providerName: resolved.provider.name,
    baseUrl: resolved.provider.baseUrl,
    apiKey: resolved.provider.apiKey,
    model: resolved.model,
    usedFallback: false,
  }
}
