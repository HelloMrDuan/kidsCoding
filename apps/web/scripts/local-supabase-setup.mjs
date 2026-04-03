import { runLocalSupabaseSetup } from './local-supabase-setup-core.mjs'

runLocalSupabaseSetup({ projectDir: process.cwd() }).catch((error) => {
  console.error('[local:supabase:setup] failed')
  if (error instanceof Error && error.message === 'local-supabase-cli-missing') {
    console.error(
      '未找到 Supabase CLI。请先执行 npm run local:supabase:install-cli，或自行安装系统级 Supabase CLI。',
    )
    process.exit(1)
  }

  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
