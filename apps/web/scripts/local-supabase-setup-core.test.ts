import { describe, expect, it, vi } from 'vitest'

import {
  resolveExecInvocation,
  runLocalSupabaseSetup,
} from './local-supabase-setup-core.mjs'

describe('resolveExecInvocation', () => {
  it('uses the installed Supabase CLI directly on Windows', () => {
    expect(resolveExecInvocation('supabase', ['status', '-o', 'env'], 'win32')).toEqual({
      file: 'supabase.exe',
      args: ['status', '-o', 'env'],
    })
  })
})

describe('runLocalSupabaseSetup', () => {
  it('starts supabase, reads env, and resets the local database', async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce({ stdout: '' })
      .mockResolvedValueOnce({
        stdout: `API_URL=http://127.0.0.1:54321
ANON_KEY=anon-local-key
SERVICE_ROLE_KEY=service-local-key
`,
      })
      .mockResolvedValueOnce({ stdout: '' })

    const writeEnv = vi.fn().mockResolvedValue(undefined)

    await runLocalSupabaseSetup({
      exec,
      writeEnv,
      projectDir: 'D:/pyprograms/kidsCoding/apps/web',
    })

    expect(exec.mock.calls).toEqual([
      ['supabase', ['start'], 'D:/pyprograms/kidsCoding/apps/web'],
      ['supabase', ['status', '-o', 'env'], 'D:/pyprograms/kidsCoding/apps/web'],
      ['supabase', ['db', 'reset', '--yes'], 'D:/pyprograms/kidsCoding/apps/web'],
      ['node', ['./scripts/seed-local-admin.mjs'], 'D:/pyprograms/kidsCoding/apps/web'],
    ])

    expect(writeEnv).toHaveBeenCalledWith(
      'D:\\pyprograms\\kidsCoding\\apps\\web\\.env.local',
      expect.objectContaining({
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-local-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-local-key',
      }),
    )
  })
})
