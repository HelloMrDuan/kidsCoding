import type {
  AiProviderConfig,
  AiProviderSlot,
  AiRuntimeSettingRow,
  ResolvedAiProviderSelection,
} from '@/features/domain/types'

export function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getAdminSetupToken(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return (env.ADMIN_SETUP_TOKEN ?? '').trim()
}

export function isLocalSupabaseEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return (env.LOCAL_SUPABASE_ENABLED ?? '').trim() === 'true'
}

export function getLocalSupabaseAdminEmail(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return (env.LOCAL_SUPABASE_ADMIN_EMAIL ?? '').trim()
}

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}

export function hasServiceRoleEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

// Admin pages must enforce server-side auth when Supabase is configured.
// When Supabase is NOT configured (e.g. local dev without Docker, or E2E
// route-mock environments), admin pages would otherwise render content with
// no auth check at all — a real authorization bypass.
//
// The bypass is allowed ONLY when one of the following holds:
//   1. NEXT_PUBLIC_SUPABASE_TEST_MODE is 'true' (explicit E2E/test opt-in)
//      AND ENABLE_ADMIN_BYPASS is 'true'. This is the path used by Playwright,
//      which runs against a production build (NODE_ENV=production) but with
//      test-only env injected at `next start` time.
//   2. NODE_ENV is not 'production' AND ENABLE_ADMIN_BYPASS is 'true'. This
//      is the local-dev path (`next dev`).
//
// Rationale: a real production deployment never sets
// NEXT_PUBLIC_SUPABASE_TEST_MODE=true, so the first path cannot fire in prod.
// The second path is guarded by NODE_ENV, which `next start` forces to
// 'production'. Both paths require the explicit ENABLE_ADMIN_BYPASS flag.
export function isAdminBypassEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  const bypassFlag = (env.ENABLE_ADMIN_BYPASS ?? '').trim() === 'true'
  if (!bypassFlag) {
    return false
  }

  const testMode = (env.NEXT_PUBLIC_SUPABASE_TEST_MODE ?? '').trim() === 'true'
  if (testMode) {
    return true
  }

  return env.NODE_ENV !== 'production'
}

export function getDefaultPaymentProvider(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return env.PAYMENT_PROVIDER_DEFAULT === 'stripe' ? 'stripe' : 'aggregated_cn'
}

export function getCnPaymentProviderEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return {
    baseUrl: (env.CN_PAYMENT_PROVIDER_BASE_URL ?? '').trim(),
    appId: (env.CN_PAYMENT_PROVIDER_APP_ID ?? '').trim(),
    appSecret: (env.CN_PAYMENT_PROVIDER_APP_SECRET ?? '').trim(),
    webhookSecret: (env.CN_PAYMENT_PROVIDER_WEBHOOK_SECRET ?? '').trim(),
  }
}

const AI_SLOT_PREFIX: Record<AiProviderSlot, string> = {
  primary: 'AI_PROVIDER_PRIMARY',
  secondary: 'AI_PROVIDER_SECONDARY',
}

function splitModels(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function readAiSlot(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  slot: AiProviderSlot,
): AiProviderConfig | null {
  const prefix = AI_SLOT_PREFIX[slot]
  const name = env[`${prefix}_NAME`]
  const baseUrl = env[`${prefix}_BASE_URL`]
  const apiKey = env[`${prefix}_API_KEY`]
  const models = splitModels(env[`${prefix}_MODELS`])

  if (!name && !baseUrl && !apiKey && models.length === 0) {
    return null
  }

  if (!name || !baseUrl || !apiKey || models.length === 0) {
    throw new Error(`ai-provider-slot-incomplete:${slot}`)
  }

  return {
    slot,
    name,
    baseUrl,
    apiKey,
    models,
  }
}

export function parseAiProviderSlots(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  if (env.AI_PROVIDER_MODE !== 'openai_compatible') {
    return []
  }

  return (['primary', 'secondary'] as const).flatMap((slot) => {
    const config = readAiSlot(env, slot)

    return config ? [config] : []
  })
}

export function resolveAiProviderSelection(input: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>
  mode: 'development' | 'production'
  stored?: Pick<
    AiRuntimeSettingRow,
    'default_provider_slot' | 'default_model'
  > | null
}): ResolvedAiProviderSelection {
  const providers = parseAiProviderSlots(input.env ?? process.env)

  if (providers.length === 0) {
    throw new Error('ai-provider-unavailable')
  }

  const stored = input.stored ?? null
  const selectedProvider = stored
    ? providers.find((item) => item.slot === stored.default_provider_slot)
    : undefined

  if (
    stored &&
    selectedProvider &&
    selectedProvider.models.includes(stored.default_model)
  ) {
    return {
      provider: selectedProvider,
      model: stored.default_model,
      usedFallback: false,
    }
  }

  if (input.mode === 'production') {
    throw new Error('ai-runtime-selection-invalid')
  }

  return {
    provider: providers[0]!,
    model: providers[0]!.models[0]!,
    usedFallback: true,
  }
}

export function hasAiEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  try {
    return parseAiProviderSlots(env).length > 0
  } catch {
    return false
  }
}
