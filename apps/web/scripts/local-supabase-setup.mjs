import { runLocalSupabaseSetup } from './local-supabase-setup-core.mjs'

runLocalSupabaseSetup({ projectDir: process.cwd() }).catch((error) => {
  console.error('[local:supabase:setup] failed')
  if (error instanceof Error && error.message === 'local-supabase-cli-missing') {
    console.error('Supabase CLI 未安装。请先安装 Supabase CLI，再重新执行 npm run local:supabase:setup。')
    process.exit(1)
  }

  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
