import { describe, expect, it, vi } from 'vitest'

import {
  SUPABASE_CLI_VERSION,
  getSupabaseCliTarget,
  getSupabaseCliVersionFile,
  resolveSupabaseCliExecutable,
} from './local-supabase-cli.mjs'

describe('getSupabaseCliTarget', () => {
  it('maps win32 x64 to the windows release asset', () => {
    expect(getSupabaseCliTarget('win32', 'x64')).toEqual({
      assetName: 'supabase_windows_amd64.tar.gz',
      binaryName: 'supabase.exe',
      directoryName: 'windows-x64',
      systemCommand: 'supabase.exe',
    })
  })

  it('maps darwin arm64 to the arm64 release asset', () => {
    expect(getSupabaseCliTarget('darwin', 'arm64')).toEqual({
      assetName: 'supabase_darwin_arm64.tar.gz',
      binaryName: 'supabase',
      directoryName: 'darwin-arm64',
      systemCommand: 'supabase',
    })
  })
})

describe('resolveSupabaseCliExecutable', () => {
  it('prefers the repository .tools binary when present', async () => {
    const exists = vi.fn().mockResolvedValue(true)

    await expect(
      resolveSupabaseCliExecutable({
        repoRoot: 'D:/pyprograms/kidsCoding',
        platform: 'linux',
        arch: 'x64',
        exists,
      }),
    ).resolves.toEqual({
      file: 'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\linux-x64\\supabase',
      source: 'repo-tools',
      version: SUPABASE_CLI_VERSION,
    })
  })

  it('falls back to the system command when .tools is missing', async () => {
    const exists = vi.fn().mockResolvedValue(false)

    await expect(
      resolveSupabaseCliExecutable({
        repoRoot: 'D:/pyprograms/kidsCoding',
        platform: 'linux',
        arch: 'x64',
        exists,
      }),
    ).resolves.toEqual({
      file: 'supabase',
      source: 'system-path',
      version: SUPABASE_CLI_VERSION,
    })
  })
})

describe('getSupabaseCliVersionFile', () => {
  it('stores the version marker beside the extracted binary', () => {
    expect(
      getSupabaseCliVersionFile('D:/pyprograms/kidsCoding', getSupabaseCliTarget('win32', 'x64')),
    ).toBe('D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\.version')
  })
})
