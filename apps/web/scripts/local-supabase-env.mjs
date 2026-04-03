export const LOCAL_SUPABASE_BLOCK_START = '# BEGIN LOCAL_SUPABASE_MANAGED'
export const LOCAL_SUPABASE_BLOCK_END = '# END LOCAL_SUPABASE_MANAGED'

function stripOptionalQuotes(value) {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

export function parseSupabaseStatusEnv(output) {
  const record = Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split('='))
      .map(([key, ...rest]) => [key, stripOptionalQuotes(rest.join('='))]),
  )

  if (!record.API_URL || !record.ANON_KEY || !record.SERVICE_ROLE_KEY) {
    throw new Error('local-supabase-status-invalid')
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: record.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: record.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: record.SERVICE_ROLE_KEY,
  }
}

export function buildLocalSupabaseValues(input) {
  return {
    ...input,
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    LOCAL_SUPABASE_ENABLED: 'true',
    LOCAL_SUPABASE_ADMIN_EMAIL: 'admin-local@kidscoding.test',
    LOCAL_SUPABASE_ADMIN_PASSWORD: 'KidsCodingLocalAdmin123!',
  }
}

export function upsertLocalSupabaseBlock(current, values) {
  const block = [
    LOCAL_SUPABASE_BLOCK_START,
    ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
    LOCAL_SUPABASE_BLOCK_END,
  ].join('\n')

  const pattern = new RegExp(
    `${LOCAL_SUPABASE_BLOCK_START}[\\s\\S]*?${LOCAL_SUPABASE_BLOCK_END}`,
    'm',
  )

  if (pattern.test(current)) {
    return current.replace(pattern, block)
  }

  return `${current.trimEnd()}\n\n${block}\n`
}
