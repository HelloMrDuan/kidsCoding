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

function summarizeGroup(items) {
  if (items.some((item) => item.status === 'FAIL')) {
    return 'FAIL'
  }

  if (items.some((item) => item.status === 'WARN')) {
    return 'WARN'
  }

  return 'OK'
}

function parseModelList(value) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
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
      isConfigured: false,
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
      validator: (value) => parseModelList(value).length > 0,
    }),
  ]

  return {
    id: `ai-${slot}`,
    label,
    status: summarizeGroup(items),
    items,
    isConfigured: items.every((item) => item.status === 'OK'),
  }
}

export function createEnvCheckReport({ env, mode }) {
  const aiPrimary = buildAiSlotGroup({
    env,
    mode,
    slot: 'primary',
    label: 'AI PROVIDER PRIMARY',
  })
  const aiSecondary = buildAiSlotGroup({
    env,
    mode,
    slot: 'secondary',
    label: 'AI PROVIDER SECONDARY',
  })

  const aiModeStatus =
    env.AI_PROVIDER_MODE === 'openai_compatible'
      ? 'OK'
      : env.AI_PROVIDER_MODE
        ? 'FAIL'
        : statusForMissing(mode)

  const hasConfiguredAiSlot = aiPrimary.isConfigured || aiSecondary.isConfigured

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
    aiPrimary,
    aiSecondary,
    {
      id: 'ai-default',
      label: 'AI DEFAULT SELECTION',
      status:
        aiModeStatus === 'FAIL' || (mode === 'production' && !hasConfiguredAiSlot)
          ? 'FAIL'
          : aiModeStatus === 'WARN' || !hasConfiguredAiSlot
            ? 'WARN'
            : 'OK',
      items: [
        {
          field: 'AI_PROVIDER_MODE',
          status: aiModeStatus,
          impact: 'AI draft generation requires OpenAI-compatible mode',
          fix: 'Set AI_PROVIDER_MODE=openai_compatible',
        },
        {
          field: 'AI_PROVIDER_AVAILABLE_SLOT',
          status:
            mode === 'production'
              ? hasConfiguredAiSlot
                ? 'OK'
                : 'FAIL'
              : hasConfiguredAiSlot
                ? 'OK'
                : 'WARN',
          impact: 'Admin cannot choose a default AI provider without one complete slot',
          fix: 'Configure at least one complete AI provider slot',
        },
      ],
    },
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
    status: group.status ?? summarizeGroup(group.items),
  }))

  const summary = groups.reduce(
    (acc, group) => {
      if (group.status === 'FAIL') {
        acc.failCount += 1
      }

      if (group.status === 'WARN') {
        acc.warnCount += 1
      }

      return acc
    },
    { failCount: 0, warnCount: 0 },
  )

  return {
    mode,
    groups,
    summary,
  }
}

export function printEnvCheckReport(report) {
  for (const group of report.groups) {
    console.log(`[${group.status}] ${group.label}`)

    for (const item of group.items) {
      console.log(`  - ${item.field}: ${item.status}`)
      console.log(`    impact: ${item.impact}`)

      if (item.fix) {
        console.log(`    fix: ${item.fix}`)
      }
    }
  }

  if (report.summary.failCount > 0) {
    console.log(`FAILED: ${report.summary.failCount} group(s) block startup`)
    return
  }

  console.log(`OK: ${report.summary.warnCount} warning group(s)`)
}
