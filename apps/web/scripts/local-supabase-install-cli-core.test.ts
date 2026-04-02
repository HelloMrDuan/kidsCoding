import { describe, expect, it, vi } from 'vitest'

import {
  buildSupabaseCliDownloadUrl,
  installSupabaseCli,
} from './local-supabase-install-cli-core.mjs'

describe('buildSupabaseCliDownloadUrl', () => {
  it('uses GitHub releases by default', () => {
    expect(
      buildSupabaseCliDownloadUrl({
        version: '2.84.6',
        assetName: 'supabase_windows_amd64.tar.gz',
      }),
    ).toBe(
      'https://github.com/supabase/cli/releases/download/v2.84.6/supabase_windows_amd64.tar.gz',
    )
  })

  it('uses the override base url when configured', () => {
    expect(
      buildSupabaseCliDownloadUrl({
        version: '2.84.6',
        assetName: 'supabase_windows_amd64.tar.gz',
        baseUrl: 'https://mirror.example.com/supabase/cli/releases/download',
      }),
    ).toBe(
      'https://mirror.example.com/supabase/cli/releases/download/v2.84.6/supabase_windows_amd64.tar.gz',
    )
  })
})

describe('installSupabaseCli', () => {
  it('skips download when the requested version is already installed', async () => {
    const ensureDir = vi.fn()
    const download = vi.fn()
    const extract = vi.fn()
    const readText = vi.fn().mockResolvedValue('2.84.6')
    const exists = vi
      .fn()
      .mockImplementation(async (filePath) => filePath.endsWith('supabase.exe'))

    await expect(
      installSupabaseCli({
        repoRoot: 'D:/pyprograms/kidsCoding',
        platform: 'win32',
        arch: 'x64',
        exists,
        readText,
        ensureDir,
        download,
        extract,
      }),
    ).resolves.toEqual({
      binaryPath: 'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\supabase.exe',
      skipped: true,
      version: '2.84.6',
    })

    expect(download).not.toHaveBeenCalled()
    expect(extract).not.toHaveBeenCalled()
  })
})
