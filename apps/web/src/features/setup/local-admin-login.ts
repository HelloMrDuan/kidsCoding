import { getLocalSupabaseAdminEmail, isLocalSupabaseEnabled } from '@/lib/env'

export function readLocalAdminLoginConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  const email = getLocalSupabaseAdminEmail(env)
  const enabled = isLocalSupabaseEnabled(env) && email.length > 0

  return {
    enabled,
    email,
  }
}
