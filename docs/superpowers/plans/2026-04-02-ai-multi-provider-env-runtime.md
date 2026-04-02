# AI Multi-Provider Env Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-grade environment validation plus a switchable OpenAI-compatible AI runtime so the admin AI workflow can use either cloud or local models without hard-coding `OPENAI_API_KEY`.

**Architecture:** Keep provider registration in environment variables, add one persisted runtime selection row in Supabase, and let admin users choose the global default provider/model from the configured slots. A new `env:check` CLI validates grouped configuration before startup, while AI routes resolve the effective provider/model from env slots plus the stored runtime selection.

**Tech Stack:** Next.js App Router, React, Supabase, Vitest, Playwright, Node ESM scripts, OpenAI-compatible HTTP `fetch`

---

## File Structure

- Modify: `apps/web/package.json`
  Add `env:check` and `env:check:prod` commands.
- Modify: `apps/web/.env.example`
  Replace single-provider AI vars with grouped multi-provider examples.
- Modify: `apps/web/README.md`
  Document env setup, grouped validation, and admin AI runtime selection.
- Modify: `apps/web/src/features/domain/types.ts`
  Add AI provider slot, runtime setting, and resolved AI config types.
- Modify: `apps/web/src/lib/env.ts`
  Parse AI provider slots, preserve Supabase helpers, and expose runtime-safe AI env helpers.
- Create: `apps/web/src/lib/env.test.ts`
  Unit coverage for slot parsing and development/production resolution rules.
- Create: `apps/web/scripts/env-check-core.mjs`
  Pure grouped env report generator and terminal printer.
- Create: `apps/web/scripts/env-check.mjs`
  CLI entrypoint that loads `.env.local`, prints the report, and fails only in prod mode.
- Create: `apps/web/scripts/env-check.test.ts`
  Vitest coverage for grouped report output and severity rules.
- Create: `apps/web/supabase/migrations/20260402_004_ai_runtime_settings.sql`
  Add persisted global AI runtime selection.
- Modify: `apps/web/src/features/admin/launch-curriculum-repository.ts`
  Load and upsert the global AI runtime setting row.
- Create: `apps/web/src/features/admin/ai/ai-runtime-settings.ts`
  Validate saved selections, load admin dashboard data, and resolve the actual AI request config.
- Create: `apps/web/src/features/admin/ai/ai-runtime-settings.test.ts`
  Unit tests for stored selection validation and fallback behavior.
- Modify: `apps/web/src/features/admin/load-admin-lessons.ts`
  Load AI settings state for `/admin` alongside lesson summaries.
- Modify: `apps/web/src/features/admin/admin-api.ts`
  Add browser helper for saving AI runtime settings.
- Create: `apps/web/src/features/admin/ai-settings-card.tsx`
  Admin UI card for choosing the default provider slot and model.
- Create: `apps/web/src/features/admin/ai-settings-card.test.tsx`
  Component tests for selection and save wiring.
- Modify: `apps/web/src/app/admin/page.tsx`
  Render the AI runtime settings card above the curriculum list.
- Create: `apps/web/src/app/api/admin/ai/settings/route.ts`
  Admin-only route for saving the persisted AI runtime selection.
- Modify: `apps/web/src/features/admin/ai/openai-client.ts`
  Accept explicit `{ baseUrl, apiKey, model }` instead of reading `OPENAI_*` directly.
- Modify: `apps/web/src/features/admin/ai/openai-client.test.ts`
  Cover base URL and token usage from resolved config.
- Modify: `apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.ts`
  Accept an injected AI request config.
- Modify: `apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts`
  Assert the selected model is passed through.
- Modify: `apps/web/src/features/admin/ai/generate-launch-lesson-draft.ts`
  Accept an injected AI request config.
- Modify: `apps/web/src/features/admin/ai/generate-launch-lesson-draft.test.ts`
  Assert generated drafts still preserve structure while using selected model.
- Modify: `apps/web/src/app/api/admin/ai/curriculum-skeleton/route.ts`
  Resolve AI runtime config before calling the generation service.
- Modify: `apps/web/src/app/api/admin/ai/lessons/[lessonId]/generate-draft/route.ts`
  Resolve AI runtime config before generating lesson drafts.
- Create: `apps/web/tests/e2e/admin-ai-settings.spec.ts`
  Browser coverage for choosing and saving the default provider/model.
- Modify: `apps/web/tests/e2e/admin-ai-draft.spec.ts`
  Keep AI draft flow green after the runtime config indirection.

### Task 1: Add AI Provider Slot Types And Env Parsing Helpers

**Files:**
- Modify: `apps/web/src/features/domain/types.ts`
- Modify: `apps/web/src/lib/env.ts`
- Test: `apps/web/src/lib/env.test.ts`

- [ ] **Step 1: Write the failing env parsing tests**

```ts
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
})
```

- [ ] **Step 2: Run the tests to verify the helpers do not exist yet**

Run: `cd apps/web; npm run test:run -- src/lib/env.test.ts`

Expected: FAIL with missing exports such as `parseAiProviderSlots` or `resolveAiProviderSelection`.

- [ ] **Step 3: Add the AI runtime types**

```ts
export type AiProviderSlot = 'primary' | 'secondary'

export type AiProviderConfig = {
  slot: AiProviderSlot
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
}

export type AiRuntimeSettingRow = {
  setting_key: string
  default_provider_slot: AiProviderSlot
  default_model: string
  updated_at?: string | null
  updated_by?: string | null
}

export type ResolvedAiProviderSelection = {
  provider: AiProviderConfig
  model: string
  usedFallback: boolean
}

export type ResolvedAiClientConfig = {
  providerName: string
  baseUrl: string
  apiKey: string
  model: string
  usedFallback: boolean
}
```

- [ ] **Step 4: Implement env parsing and selection resolution**

```ts
import type {
  AiProviderConfig,
  AiProviderSlot,
  AiRuntimeSettingRow,
  ResolvedAiProviderSelection,
} from '@/features/domain/types'

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

  if (selectedProvider && selectedProvider.models.includes(stored.default_model)) {
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
  return parseAiProviderSlots(env).length > 0
}
```

- [ ] **Step 5: Run the env helper tests**

Run: `cd apps/web; npm run test:run -- src/lib/env.test.ts`

Expected: PASS with slot parsing, fallback, and legacy `OPENAI_*` rejection covered.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/domain/types.ts apps/web/src/lib/env.ts apps/web/src/lib/env.test.ts
git commit -m "feat: add multi-provider ai env parsing"
```

### Task 2: Add Grouped Env Check Scripts And Developer Docs

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/scripts/env-check-core.mjs`
- Create: `apps/web/scripts/env-check.mjs`
- Test: `apps/web/scripts/env-check.test.ts`
- Modify: `apps/web/.env.example`
- Modify: `apps/web/README.md`

- [ ] **Step 1: Write the failing env check report tests**

```ts
import { describe, expect, it } from 'vitest'

import { createEnvCheckReport } from './env-check-core.mjs'

describe('createEnvCheckReport', () => {
  it('marks a half-configured secondary slot as FAIL in production', () => {
    const report = createEnvCheckReport({
      mode: 'production',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb-publishable',
        SUPABASE_SERVICE_ROLE_KEY: 'sb-service',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_123',
        NEXT_PUBLIC_APP_URL: 'https://kidscoding.example.com',
        AI_PROVIDER_MODE: 'openai_compatible',
        AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
        AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
        AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
        AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini',
        AI_PROVIDER_SECONDARY_NAME: 'Local Ollama',
      },
    })

    expect(report.summary.failCount).toBe(1)
    expect(report.groups.find((group) => group.id === 'ai-secondary')?.status).toBe(
      'FAIL',
    )
  })

  it('warns in development when stripe is missing', () => {
    const report = createEnvCheckReport({
      mode: 'development',
      env: {
        AI_PROVIDER_MODE: 'openai_compatible',
        AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
        AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
        AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
        AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini',
      },
    })

    expect(report.groups.find((group) => group.id === 'stripe')?.status).toBe('WARN')
  })
})
```

- [ ] **Step 2: Run the tests to verify the env check script is missing**

Run: `cd apps/web; npm run test:run -- scripts/env-check.test.ts`

Expected: FAIL with `Cannot find module './env-check-core.mjs'`.

- [ ] **Step 3: Add the grouped report generator, CLI entrypoint, and package scripts**

```js
// apps/web/scripts/env-check-core.mjs
function isValidUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function statusForMissing(mode) {
  return mode === 'production' ? 'FAIL' : 'WARN'
}

function buildFieldResult({ field, value, mode, hint, validator }) {
  if (!value) {
    return {
      field,
      status: statusForMissing(mode),
      impact: hint,
      fix: `Set ${field} in .env.local`,
    }
  }

  if (validator && !validator(value)) {
    return {
      field,
      status: 'FAIL',
      impact: hint,
      fix: `Provide a valid value for ${field}`,
    }
  }

  return {
    field,
    status: 'OK',
    impact: hint,
    fix: '',
  }
}

function buildAiSlotGroup({ env, mode, slot, label }) {
  const prefix = `AI_PROVIDER_${slot.toUpperCase()}`
  const values = {
    name: env[`${prefix}_NAME`],
    baseUrl: env[`${prefix}_BASE_URL`],
    apiKey: env[`${prefix}_API_KEY`],
    models: env[`${prefix}_MODELS`],
  }

  const presentCount = Object.values(values).filter(Boolean).length

  if (presentCount === 0) {
    return {
      id: `ai-${slot}`,
      label,
      status: 'WARN',
      items: [],
    }
  }

  const items = [
    buildFieldResult({
      field: `${prefix}_NAME`,
      value: values.name,
      mode,
      hint: `${label} provider name is shown in admin`,
    }),
    buildFieldResult({
      field: `${prefix}_BASE_URL`,
      value: values.baseUrl,
      mode,
      hint: `${label} cannot be used for AI generation`,
      validator: isValidUrl,
    }),
    buildFieldResult({
      field: `${prefix}_API_KEY`,
      value: values.apiKey,
      mode,
      hint: `${label} cannot authenticate AI requests`,
    }),
    buildFieldResult({
      field: `${prefix}_MODELS`,
      value: values.models,
      mode,
      hint: `${label} cannot offer any models in admin`,
      validator: (value) =>
        value.split(',').map((item) => item.trim()).filter(Boolean).length > 0,
    }),
  ]

  return {
    id: `ai-${slot}`,
    label,
    status: items.some((item) => item.status === 'FAIL')
      ? 'FAIL'
      : items.some((item) => item.status === 'WARN')
        ? 'WARN'
        : 'OK',
    items,
  }
}

export function createEnvCheckReport({ env, mode }) {
  const groups = [
    {
      id: 'supabase',
      label: 'SUPABASE',
      items: [
        buildFieldResult({
          field: 'NEXT_PUBLIC_SUPABASE_URL',
          value: env.NEXT_PUBLIC_SUPABASE_URL,
          mode,
          hint: 'Supabase browser and server flows will not work',
          validator: isValidUrl,
        }),
        buildFieldResult({
          field: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
          value: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          mode,
          hint: 'Browser auth and learner progress sync will be unavailable',
        }),
        buildFieldResult({
          field: 'SUPABASE_SERVICE_ROLE_KEY',
          value: env.SUPABASE_SERVICE_ROLE_KEY,
          mode,
          hint: 'Admin publishing and AI draft persistence will be unavailable',
        }),
      ],
    },
    {
      id: 'stripe',
      label: 'STRIPE',
      items: [
        buildFieldResult({
          field: 'STRIPE_SECRET_KEY',
          value: env.STRIPE_SECRET_KEY,
          mode,
          hint: 'Paid course checkout cannot be created',
          validator: (value) => value.startsWith('sk_'),
        }),
        buildFieldResult({
          field: 'STRIPE_WEBHOOK_SECRET',
          value: env.STRIPE_WEBHOOK_SECRET,
          mode,
          hint: 'Paid entitlements cannot be confirmed from webhooks',
          validator: (value) => value.startsWith('whsec_'),
        }),
      ],
    },
    buildAiSlotGroup({ env, mode, slot: 'primary', label: 'AI PROVIDER PRIMARY' }),
    buildAiSlotGroup({
      env,
      mode,
      slot: 'secondary',
      label: 'AI PROVIDER SECONDARY',
    }),
    {
      id: 'app-url',
      label: 'APP URL',
      items: [
        buildFieldResult({
          field: 'NEXT_PUBLIC_APP_URL',
          value: env.NEXT_PUBLIC_APP_URL,
          mode,
          hint: 'Webhook redirects and absolute links may break',
          validator: isValidUrl,
        }),
      ],
    },
  ].map((group) => ({
    ...group,
    status: group.items.some((item) => item.status === 'FAIL')
      ? 'FAIL'
      : group.items.some((item) => item.status === 'WARN')
        ? 'WARN'
        : 'OK',
  }))

  const summary = groups.reduce(
    (acc, group) => {
      if (group.status === 'FAIL') acc.failCount += 1
      if (group.status === 'WARN') acc.warnCount += 1
      return acc
    },
    { failCount: 0, warnCount: 0 },
  )

  return { groups, summary, mode }
}

export function printEnvCheckReport(report) {
  for (const group of report.groups) {
    console.log(`[${group.status}] ${group.label}`)
    for (const item of group.items) {
      console.log(`  - ${item.field}: ${item.status}`)
      console.log(`    impact: ${item.impact}`)
      if (item.fix) console.log(`    fix: ${item.fix}`)
    }
  }

  console.log(
    report.summary.failCount > 0
      ? `FAILED: ${report.summary.failCount} group(s) block startup`
      : `OK: ${report.summary.warnCount} warning group(s)`,
  )
}
```

```js
// apps/web/scripts/env-check.mjs
import { loadEnvConfig } from '@next/env'

import { createEnvCheckReport, printEnvCheckReport } from './env-check-core.mjs'

const modeArg = process.argv.find((arg) => arg.startsWith('--mode=')) ?? ''
const mode = modeArg === '--mode=production' ? 'production' : 'development'

loadEnvConfig(process.cwd())

const report = createEnvCheckReport({
  env: process.env,
  mode,
})

printEnvCheckReport(report)

if (mode === 'production' && report.summary.failCount > 0) {
  process.exit(1)
}
```

```json
{
  "scripts": {
    "env:check": "node ./scripts/env-check.mjs",
    "env:check:prod": "node ./scripts/env-check.mjs --mode=production"
  }
}
```

- [ ] **Step 4: Update `.env.example` and the app README**

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

STRIPE_SECRET_KEY=sk_test_example
STRIPE_WEBHOOK_SECRET=whsec_example

AI_PROVIDER_MODE=openai_compatible
AI_PROVIDER_PRIMARY_NAME=OpenAI
AI_PROVIDER_PRIMARY_BASE_URL=https://api.openai.com/v1
AI_PROVIDER_PRIMARY_API_KEY=sk_primary_example
AI_PROVIDER_PRIMARY_MODELS=gpt-5-mini,gpt-4.1-mini
AI_PROVIDER_SECONDARY_NAME=Local Ollama
AI_PROVIDER_SECONDARY_BASE_URL=http://127.0.0.1:11434/v1
AI_PROVIDER_SECONDARY_API_KEY=ollama-local
AI_PROVIDER_SECONDARY_MODELS=qwen2.5-coder:7b,llama3.1:8b

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```md
## Environment check

1. Copy `.env.example` to `.env.local`
2. Run `npm run env:check`
3. Before production deployment, run `npm run env:check:prod`

## AI providers

- Configure up to two OpenAI-compatible providers in env
- Use `/admin` to choose the global default provider slot and model
- The admin UI never stores or displays raw API keys
```

- [ ] **Step 5: Run the report tests and both CLI modes**

Run:

```powershell
cd apps/web
npm run test:run -- scripts/env-check.test.ts
npm run env:check
$env:NEXT_PUBLIC_SUPABASE_URL='https://demo.supabase.co'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb-publishable'
$env:SUPABASE_SERVICE_ROLE_KEY='sb-service'
$env:STRIPE_SECRET_KEY='sk_test_123'
$env:STRIPE_WEBHOOK_SECRET='whsec_123'
$env:AI_PROVIDER_MODE='openai_compatible'
$env:AI_PROVIDER_PRIMARY_NAME='OpenAI'
$env:AI_PROVIDER_PRIMARY_BASE_URL='https://api.openai.com/v1'
$env:AI_PROVIDER_PRIMARY_API_KEY='sk-primary'
$env:AI_PROVIDER_PRIMARY_MODELS='gpt-5-mini,gpt-4.1-mini'
$env:NEXT_PUBLIC_APP_URL='https://kidscoding.example.com'
npm run env:check:prod
```

Expected:
- `scripts/env-check.test.ts` passes
- `npm run env:check` exits `0` and prints grouped `OK/WARN/FAIL`
- `npm run env:check:prod` exits `0` with no `FAIL` groups using the temporary formatted values above

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/scripts/env-check-core.mjs apps/web/scripts/env-check.mjs apps/web/scripts/env-check.test.ts apps/web/.env.example apps/web/README.md
git commit -m "feat: add grouped env validation commands"
```

### Task 3: Persist And Validate The Global AI Runtime Selection

**Files:**
- Create: `apps/web/supabase/migrations/20260402_004_ai_runtime_settings.sql`
- Modify: `apps/web/src/features/admin/launch-curriculum-repository.ts`
- Create: `apps/web/src/features/admin/ai/ai-runtime-settings.ts`
- Test: `apps/web/src/features/admin/ai/ai-runtime-settings.test.ts`

- [ ] **Step 1: Write the failing runtime selection tests**

```ts
import { describe, expect, it, vi } from 'vitest'

import { resolveAiRequestConfig, saveAiRuntimeSelection } from './ai-runtime-settings'

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
```

- [ ] **Step 2: Run the tests to verify the runtime settings module is missing**

Run: `cd apps/web; npm run test:run -- src/features/admin/ai/ai-runtime-settings.test.ts`

Expected: FAIL with `Cannot find module './ai-runtime-settings'`.

- [ ] **Step 3: Add the Supabase schema and repository methods**

```sql
create table if not exists ai_runtime_settings (
  setting_key text primary key,
  default_provider_slot text not null check (default_provider_slot in ('primary', 'secondary')),
  default_model text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null
);
```

```ts
async loadAiRuntimeSetting() {
  const { data, error } = await admin
    .from('ai_runtime_settings')
    .select('*')
    .eq('setting_key', 'default')
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as AiRuntimeSettingRow | null
},

async upsertAiRuntimeSetting(row: AiRuntimeSettingRow) {
  const { error } = await admin.from('ai_runtime_settings').upsert(row, {
    onConflict: 'setting_key',
  })

  if (error) throw error
}
```

- [ ] **Step 4: Implement runtime selection loading, saving, and request resolution**

```ts
import type {
  ResolvedAiClientConfig,
  AiRuntimeSettingRow,
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
  repository: RuntimeSettingsRepository
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
```

- [ ] **Step 5: Run the runtime settings tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/ai/ai-runtime-settings.test.ts`

Expected: PASS with invalid-model rejection and stored-selection resolution covered.

- [ ] **Step 6: Commit**

```bash
git add apps/web/supabase/migrations/20260402_004_ai_runtime_settings.sql apps/web/src/features/admin/launch-curriculum-repository.ts apps/web/src/features/admin/ai/ai-runtime-settings.ts apps/web/src/features/admin/ai/ai-runtime-settings.test.ts
git commit -m "feat: persist ai runtime selection"
```

### Task 4: Add The Admin AI Settings Card And Save Route

**Files:**
- Modify: `apps/web/src/features/admin/load-admin-lessons.ts`
- Modify: `apps/web/src/features/admin/admin-api.ts`
- Create: `apps/web/src/features/admin/ai-settings-card.tsx`
- Create: `apps/web/src/features/admin/ai-settings-card.test.tsx`
- Modify: `apps/web/src/app/admin/page.tsx`
- Create: `apps/web/src/app/api/admin/ai/settings/route.ts`

- [ ] **Step 1: Write the failing card component test**

```tsx
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
```

- [ ] **Step 2: Run the tests to verify the UI does not exist yet**

Run: `cd apps/web; npm run test:run -- src/features/admin/ai-settings-card.test.tsx`

Expected: FAIL with `Cannot find module './ai-settings-card'`.

- [ ] **Step 3: Add the admin save route and browser helper**

```ts
// apps/web/src/app/api/admin/ai/settings/route.ts
import { NextResponse } from 'next/server'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { saveAiRuntimeSelection } from '@/features/admin/ai/ai-runtime-settings'
import { createLaunchCurriculumRepository } from '@/features/admin/launch-curriculum-repository'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasServiceRoleEnv, hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: 'admin-unavailable' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = assertAdminUser(data.user)
  const body = (await request.json()) as {
    defaultProviderSlot: 'primary' | 'secondary'
    defaultModel: string
  }

  await saveAiRuntimeSelection({
    env: process.env,
    actorUserId: user.id,
    selection: body,
    repository: createLaunchCurriculumRepository(createAdminClient()),
  })

  return NextResponse.json({ ok: true })
}
```

```ts
// apps/web/src/features/admin/admin-api.ts
export async function saveAiSettings(input: {
  defaultProviderSlot: 'primary' | 'secondary'
  defaultModel: string
}) {
  const response = await fetch('/api/admin/ai/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  return readJson<{ ok: boolean; error?: string }>(response)
}
```

- [ ] **Step 4: Implement the AI settings card and render it on `/admin`**

```tsx
// apps/web/src/features/admin/ai-settings-card.tsx
'use client'

import { useMemo, useState } from 'react'

import type { AiProviderConfig } from '@/features/domain/types'

import { saveAiSettings } from './admin-api'

export function AiSettingsCard(props: {
  providers: Array<Pick<AiProviderConfig, 'slot' | 'name' | 'baseUrl' | 'models'>>
  currentSelection: {
    defaultProviderSlot: 'primary' | 'secondary'
    defaultModel: string
  }
  onSave?: typeof saveAiSettings
}) {
  const onSave = props.onSave ?? saveAiSettings
  const [providerSlot, setProviderSlot] = useState(
    props.currentSelection.defaultProviderSlot,
  )
  const [model, setModel] = useState(props.currentSelection.defaultModel)
  const [message, setMessage] = useState<string | null>(null)

  const selectedProvider = useMemo(
    () => props.providers.find((item) => item.slot === providerSlot) ?? props.providers[0],
    [props.providers, providerSlot],
  )

  async function handleSave() {
    const result = await onSave({
      defaultProviderSlot: providerSlot,
      defaultModel: model,
    })

    setMessage(result.ok ? 'AI runtime settings saved.' : result.error ?? 'Save failed.')
  }

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">AI runtime settings</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {props.providers.map((provider) => (
          <article key={provider.slot} className="rounded-[1.5rem] border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-500">{provider.slot}</p>
            <h3 className="text-lg font-black text-slate-950">{provider.name}</h3>
            <p className="text-sm text-slate-600">{provider.baseUrl}</p>
            <p className="mt-2 text-sm text-slate-600">{provider.models.join(', ')}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <select
          data-testid="admin-ai-provider-select"
          value={providerSlot}
          onChange={(event) => {
            const nextSlot = event.target.value as 'primary' | 'secondary'
            const nextProvider =
              props.providers.find((item) => item.slot === nextSlot) ?? props.providers[0]
            setProviderSlot(nextSlot)
            setModel(nextProvider?.models[0] ?? '')
          }}
        >
          {props.providers.map((provider) => (
            <option key={provider.slot} value={provider.slot}>
              {provider.name}
            </option>
          ))}
        </select>
        <select
          data-testid="admin-ai-model-select"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        >
          {selectedProvider?.models.map((providerModel) => (
            <option key={providerModel} value={providerModel}>
              {providerModel}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        data-testid="admin-ai-settings-save"
        className="mt-4 rounded-full bg-slate-900 px-5 py-3 font-bold text-white"
        onClick={handleSave}
      >
        Save AI settings
      </button>
      {message ? (
        <p data-testid="admin-ai-settings-message" className="mt-3 text-sm font-semibold text-slate-700">
          {message}
        </p>
      ) : null}
    </section>
  )
}
```

```ts
// apps/web/src/features/admin/load-admin-lessons.ts
export async function loadAdminDashboardData() {
  const lessons = await loadAdminLessonSummaries()

  if (!hasServiceRoleEnv()) {
    return {
      lessons,
      ai: {
        providers: parseAiProviderSlots(process.env).map((provider) => ({
          slot: provider.slot,
          name: provider.name,
          baseUrl: provider.baseUrl,
          models: provider.models,
        })),
        currentSelection: {
          defaultProviderSlot: 'primary',
          defaultModel: parseAiProviderSlots(process.env)[0]?.models[0] ?? '',
        },
      },
    }
  }

  const repository = createLaunchCurriculumRepository(createAdminClient())
  const stored = await repository.loadAiRuntimeSetting()
  const resolved = resolveAiProviderSelection({
    env: process.env,
    mode: 'development',
    stored,
  })

  return {
    lessons,
    ai: {
      providers: parseAiProviderSlots(process.env).map((provider) => ({
        slot: provider.slot,
        name: provider.name,
        baseUrl: provider.baseUrl,
        models: provider.models,
      })),
      currentSelection: {
        defaultProviderSlot: resolved.provider.slot,
        defaultModel: resolved.model,
      },
    },
  }
}
```

```tsx
// apps/web/src/app/admin/page.tsx
const dashboardData = await loadAdminDashboardData()

return (
  <main className="min-h-screen bg-[#fffaf2] px-6 py-8">
    <section className="mx-auto max-w-6xl space-y-6">
      <AiSettingsCard
        providers={dashboardData.ai.providers}
        currentSelection={dashboardData.ai.currentSelection}
      />
      <CourseList lessons={dashboardData.lessons} />
    </section>
  </main>
)
```

- [ ] **Step 5: Run the component tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/ai-settings-card.test.tsx`

Expected: PASS with provider/model selection and save wiring covered.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/admin/load-admin-lessons.ts apps/web/src/features/admin/admin-api.ts apps/web/src/features/admin/ai-settings-card.tsx apps/web/src/features/admin/ai-settings-card.test.tsx apps/web/src/app/admin/page.tsx apps/web/src/app/api/admin/ai/settings/route.ts
git commit -m "feat: add admin ai runtime settings ui"
```

### Task 5: Route AI Generation Through The Selected Provider And Verify The Browser Flow

**Files:**
- Modify: `apps/web/src/features/admin/ai/openai-client.ts`
- Modify: `apps/web/src/features/admin/ai/openai-client.test.ts`
- Modify: `apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.ts`
- Modify: `apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts`
- Modify: `apps/web/src/features/admin/ai/generate-launch-lesson-draft.ts`
- Modify: `apps/web/src/features/admin/ai/generate-launch-lesson-draft.test.ts`
- Modify: `apps/web/src/app/api/admin/ai/curriculum-skeleton/route.ts`
- Modify: `apps/web/src/app/api/admin/ai/lessons/[lessonId]/generate-draft/route.ts`
- Create: `apps/web/tests/e2e/admin-ai-settings.spec.ts`
- Modify: `apps/web/tests/e2e/admin-ai-draft.spec.ts`

- [ ] **Step 1: Update the failing AI client and generation tests**

```ts
import { describe, expect, it, vi } from 'vitest'

import { callOpenAiStructuredJson } from './openai-client'

describe('callOpenAiStructuredJson', () => {
  it('posts to the configured provider base URL instead of reading OPENAI_API_KEY', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: '{"ok":true}' }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await callOpenAiStructuredJson({
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama-local',
      model: 'qwen2.5-coder:7b',
      prompt: 'test',
      schemaName: 'demo',
      schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/v1/responses',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer ollama-local',
        }),
      }),
    )
  })
})
```

```ts
import { describe, expect, it, vi } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

import { generateLaunchCurriculumSkeleton } from './generate-launch-curriculum-skeleton'

describe('generateLaunchCurriculumSkeleton', () => {
  it('passes the resolved model into the AI caller', async () => {
    const callModel = vi.fn().mockResolvedValue(
      launchLessons.map((lesson, index) => ({
        lessonId: lesson.id,
        stage: index < 3 ? 'trial' : index < 8 ? 'guided' : index < 12 ? 'story' : 'template',
        lessonObjective: lesson.goal,
        newConcepts: [lesson.goal],
        dependsOn: index === 0 ? [] : [launchLessons[index - 1]!.id],
        childOutcome: `${lesson.id}-done`,
        difficultyLevel: index < 3 ? 1 : index < 8 ? 2 : index < 12 ? 3 : 4,
      })),
    )

    await generateLaunchCurriculumSkeleton({
      aiConfig: {
        baseUrl: 'http://127.0.0.1:11434/v1',
        apiKey: 'ollama-local',
        model: 'qwen2.5-coder:7b',
      },
      callModel,
    })

    expect(callModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'qwen2.5-coder:7b' }),
    )
  })
})
```

- [ ] **Step 2: Run the targeted tests to verify the old signature no longer matches**

Run:

```bash
cd apps/web
npm run test:run -- src/features/admin/ai/openai-client.test.ts src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts src/features/admin/ai/generate-launch-lesson-draft.test.ts
```

Expected: FAIL because the client and generators still depend on `OPENAI_API_KEY` and `OPENAI_MODEL`.

- [ ] **Step 3: Refactor AI generation to use the resolved runtime config**

```ts
// apps/web/src/features/admin/ai/openai-client.ts
export async function callOpenAiStructuredJson<T>(input: {
  baseUrl: string
  apiKey: string
  model: string
  prompt: string
  schemaName: string
  schema: JsonSchema
}) {
  const endpoint = `${input.baseUrl.replace(/\/$/, '')}/responses`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
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
```

```ts
// apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.ts
export async function generateLaunchCurriculumSkeleton(input: {
  aiConfig: {
    baseUrl: string
    apiKey: string
    model: string
  }
  lessons?: LaunchLessonDefinition[]
  callModel?: SkeletonModelCaller
}) {
  const lessons = input.lessons ?? launchLessons
  const callModel =
    input.callModel ??
    ((modelInput) =>
      callOpenAiStructuredJson<LaunchCurriculumSkeleton[]>({
        ...input.aiConfig,
        prompt: modelInput.prompt,
        schemaName: modelInput.schemaName,
        schema: modelInput.schema,
      }))

  const skeleton = await callModel({
    model: input.aiConfig.model,
    prompt: buildSkeletonPrompt(lessons),
    schemaName: 'launch_curriculum_skeleton',
    schema: launchCurriculumSkeletonSchema,
  })

  return skeleton
}
```

```ts
// apps/web/src/features/admin/ai/generate-launch-lesson-draft.ts
export async function generateLaunchLessonDraft(input: {
  lesson: LaunchLessonDefinition
  skeleton: LaunchCurriculumSkeleton
  previousSkeleton?: LaunchCurriculumSkeleton
  nextSkeleton?: LaunchCurriculumSkeleton
  aiConfig: {
    baseUrl: string
    apiKey: string
    model: string
  }
  callModel?: LessonDraftModelCaller
}) {
  const callModel =
    input.callModel ??
    ((modelInput) =>
      callOpenAiStructuredJson<GeneratedLessonCopy>({
        ...input.aiConfig,
        prompt: modelInput.prompt,
        schemaName: modelInput.schemaName,
        schema: modelInput.schema,
      }))

  const generated = await callModel({
    model: input.aiConfig.model,
    prompt: buildLessonDraftPrompt(input),
    schemaName: 'launch_lesson_copy',
    schema: generatedLessonCopySchema,
  })

  return applyGeneratedLessonCopy(input.lesson, generated)
}
```

```ts
// apps/web/src/app/api/admin/ai/curriculum-skeleton/route.ts
const repository = createLaunchCurriculumRepository(createAdminClient())
const aiConfig = await resolveAiRequestConfig({
  env: process.env,
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  repository,
})

const skeletons = await generateLaunchCurriculumSkeleton({
  aiConfig: {
    baseUrl: aiConfig.baseUrl,
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
  },
})
```

```ts
// apps/web/src/app/api/admin/ai/lessons/[lessonId]/generate-draft/route.ts
const repository = createLaunchCurriculumRepository(createAdminClient())
const aiConfig = await resolveAiRequestConfig({
  env: process.env,
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  repository,
})

const draftLesson = await generateLaunchLessonDraft({
  lesson,
  skeleton,
  previousSkeleton,
  nextSkeleton,
  aiConfig: {
    baseUrl: aiConfig.baseUrl,
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
  },
})
```

- [ ] **Step 4: Add browser coverage for saving AI settings and keep draft generation green**

```ts
import { expect, test } from '@playwright/test'

test('admin can save the default ai provider and model', async ({ page }) => {
  await page.route('**/api/admin/ai/settings', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      defaultProviderSlot: 'secondary',
      defaultModel: 'qwen2.5-coder:7b',
    })

    await route.fulfill({
      json: { ok: true },
    })
  })

  await page.goto('/admin')
  await page.getByTestId('admin-ai-provider-select').selectOption('secondary')
  await page.getByTestId('admin-ai-model-select').selectOption('qwen2.5-coder:7b')
  await page.getByTestId('admin-ai-settings-save').click()

  await expect(page.getByTestId('admin-ai-settings-message')).toContainText('saved')
})
```

```ts
// keep the existing admin-ai-draft.spec.ts flow, but assert the lesson editor still works
await page.goto('/admin/lessons/trial-01-move-character')
await page.getByTestId('admin-generate-skeleton').click()
await page.getByTestId('admin-generate-draft').click()
await expect(page.getByTestId('admin-lesson-title')).toHaveValue('AI new title')
```

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
cd apps/web
npm run lint
npm run test:run
npm run test:e2e -- tests/e2e/admin-ai-settings.spec.ts tests/e2e/admin-ai-draft.spec.ts tests/e2e/admin-curriculum-save.spec.ts
npm run build
npm run env:check
```

Expected:
- `lint`, `test:run`, `test:e2e`, and `build` all pass
- `env:check` exits `0` and prints grouped startup diagnostics

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/admin/ai/openai-client.ts apps/web/src/features/admin/ai/openai-client.test.ts apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.ts apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts apps/web/src/features/admin/ai/generate-launch-lesson-draft.ts apps/web/src/features/admin/ai/generate-launch-lesson-draft.test.ts apps/web/src/app/api/admin/ai/curriculum-skeleton/route.ts apps/web/src/app/api/admin/ai/lessons/[lessonId]/generate-draft/route.ts apps/web/tests/e2e/admin-ai-settings.spec.ts apps/web/tests/e2e/admin-ai-draft.spec.ts
git commit -m "feat: route ai generation through selected provider"
```

## Spec Coverage Check

- `2026-04-02-ai-multi-provider-env-design.md`
  Covered by Tasks 1-5.
- Dual provider slots from env plus admin-selected default provider/model
  Covered by Tasks 1, 3, and 4.
- `env:check` and `env:check:prod`
  Covered by Task 2.
- Development fallback versus production hard failure
  Covered by Tasks 1, 2, and 3.
- AI routes using the resolved runtime setting instead of `OPENAI_*`
  Covered by Task 5.
- Existing admin curriculum save/generate flows remaining intact
  Covered by Tasks 3-5 plus the final verification suite.

## Placeholder Scan

- No `TODO`, `TBD`, or deferred "implement later" markers remain.
- Every task names concrete files, commands, and target tests.
- The plan intentionally does not add provider CRUD, secret editing in admin, or network-level health probes because those are out of scope in the approved spec.
