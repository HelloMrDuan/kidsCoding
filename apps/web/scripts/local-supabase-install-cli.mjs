import { join } from 'node:path'

import { installSupabaseCli } from './local-supabase-install-cli-core.mjs'

installSupabaseCli({
  repoRoot: join(process.cwd(), '..', '..'),
}).catch((error) => {
  console.error('[local:supabase:install-cli] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
