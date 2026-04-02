import { runLocalSupabaseSetup } from './local-supabase-setup-core.mjs'

runLocalSupabaseSetup({ projectDir: process.cwd() }).catch((error) => {
  console.error('[local:supabase:setup] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
