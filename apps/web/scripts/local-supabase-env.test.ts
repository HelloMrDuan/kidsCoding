import { describe, expect, it } from 'vitest'

import {
  LOCAL_SUPABASE_BLOCK_END,
  LOCAL_SUPABASE_BLOCK_START,
  buildLocalSupabaseValues,
  parseSupabaseStatusEnv,
  upsertLocalSupabaseBlock,
} from './local-supabase-env.mjs'

describe('parseSupabaseStatusEnv', () => {
  it('maps Supabase CLI env output into app env keys', () => {
    const parsed = parseSupabaseStatusEnv(`
API_URL=http://127.0.0.1:54321
ANON_KEY=anon-local-key
SERVICE_ROLE_KEY=service-local-key
`)

    expect(parsed).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-local-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-local-key',
    })
  })

  it('strips surrounding quotes from Supabase CLI env output', () => {
    const parsed = parseSupabaseStatusEnv(`
API_URL="http://127.0.0.1:54321"
ANON_KEY="anon-local-key"
SERVICE_ROLE_KEY="service-local-key"
`)

    expect(parsed).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-local-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-local-key',
    })
  })
})

describe('upsertLocalSupabaseBlock', () => {
  it('replaces only the managed block and keeps unrelated keys', () => {
    const values = buildLocalSupabaseValues({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-local-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-local-key',
    })

    const next = upsertLocalSupabaseBlock(
      `STRIPE_SECRET_KEY=keep-me
${LOCAL_SUPABASE_BLOCK_START}
OLD=1
${LOCAL_SUPABASE_BLOCK_END}
ADMIN_SETUP_TOKEN=keep-token
`,
      values,
    )

    expect(next).toContain('STRIPE_SECRET_KEY=keep-me')
    expect(next).toContain('ADMIN_SETUP_TOKEN=keep-token')
    expect(next).toContain('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321')
    expect(next).not.toContain('OLD=1')
  })
})
