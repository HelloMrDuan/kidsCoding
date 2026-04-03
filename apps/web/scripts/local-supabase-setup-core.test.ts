import { describe, expect, it, vi } from 'vitest'

import {
  buildLocalSupabaseExecEnv,
  runLocalSupabaseSetup,
} from './local-supabase-setup-core.mjs'

describe('buildLocalSupabaseExecEnv', () => {
  it('always bypasses proxies for localhost and 127.0.0.1', () => {
    expect(
      buildLocalSupabaseExecEnv({
        HTTPS_PROXY: 'http://127.0.0.1:7890',
        NO_PROXY: 'example.com',
      }),
    ).toMatchObject({
      NO_PROXY: '127.0.0.1,localhost,example.com',
      no_proxy: '127.0.0.1,localhost,example.com',
    })
  })
})

describe('runLocalSupabaseSetup', () => {
  it('prefers the repository cli binary before the system PATH command', async () => {
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
    const resolveCli = vi.fn().mockResolvedValue({
      file: 'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\supabase.exe',
      source: 'repo-tools',
      version: '2.84.6',
    })

    await runLocalSupabaseSetup({
      exec,
      resolveCli,
      writeEnv,
      projectDir: 'D:/pyprograms/kidsCoding/apps/web',
    })

    expect(resolveCli).toHaveBeenCalledWith({
      repoRoot: 'D:\\pyprograms\\kidsCoding',
    })

    expect(exec.mock.calls).toEqual([
      [
        'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\supabase.exe',
        ['start'],
        'D:/pyprograms/kidsCoding/apps/web',
      ],
      [
        'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\supabase.exe',
        ['status', '-o', 'env'],
        'D:/pyprograms/kidsCoding/apps/web',
      ],
      [
        'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\supabase.exe',
        ['db', 'reset', '--yes'],
        'D:/pyprograms/kidsCoding/apps/web',
      ],
      [
        'node',
        ['./scripts/seed-local-admin.mjs'],
        'D:/pyprograms/kidsCoding/apps/web',
        {
          env: expect.objectContaining({
            NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-local-key',
            SUPABASE_SERVICE_ROLE_KEY: 'service-local-key',
            LOCAL_SUPABASE_ENABLED: 'true',
            LOCAL_SUPABASE_ADMIN_EMAIL: 'admin-local@kidscoding.test',
            LOCAL_SUPABASE_ADMIN_PASSWORD: 'KidsCodingLocalAdmin123!',
          }),
        },
      ],
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

  it('recovers from the kong storage timeout after db reset and still seeds the admin', async () => {
    const timeoutError = new Error([
      'Command failed: supabase db reset --yes',
      'Restarting containers...',
      'failed to execute http request: Get "http://127.0.0.1:54321/storage/v1/bucket": context deadline exceeded (Client.Timeout exceeded while awaiting headers)',
    ].join('\n'))

    const exec = vi
      .fn()
      .mockResolvedValueOnce({ stdout: '' })
      .mockResolvedValueOnce({
        stdout: `API_URL=http://127.0.0.1:54321
ANON_KEY=anon-local-key
SERVICE_ROLE_KEY=service-local-key
`,
      })
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({ stdout: '' })

    const recoverAfterDbResetFailure = vi.fn().mockResolvedValue(undefined)

    await runLocalSupabaseSetup({
      exec,
      recoverAfterDbResetFailure,
      resolveCli: vi.fn().mockResolvedValue({
        file: 'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\supabase.exe',
        source: 'repo-tools',
        version: '2.84.6',
      }),
      writeEnv: vi.fn().mockResolvedValue(undefined),
      projectDir: 'D:/pyprograms/kidsCoding/apps/web',
    })

    expect(recoverAfterDbResetFailure).toHaveBeenCalledWith({
      exec,
      projectDir: 'D:/pyprograms/kidsCoding/apps/web',
      values: expect.objectContaining({
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'service-local-key',
      }),
    })

    expect(exec).toHaveBeenLastCalledWith(
      'node',
      ['./scripts/seed-local-admin.mjs'],
      'D:/pyprograms/kidsCoding/apps/web',
      {
        env: expect.objectContaining({
          SUPABASE_SERVICE_ROLE_KEY: 'service-local-key',
        }),
      },
    )
  })
})
