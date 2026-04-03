import { describe, expect, it, vi } from 'vitest'

import {
  buildSupabaseCliDownloadUrl,
  downloadSupabaseCliArchive,
  getSupabaseCliTempRoot,
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

describe('downloadSupabaseCliArchive', () => {
  it('uses curl with a local archive output path', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: '' })

    await downloadSupabaseCliArchive({
      url: 'https://example.com/supabase.tar.gz',
      archivePath: 'D:/temp/supabase.tar.gz',
      exec,
      platform: 'win32',
    })

    expect(exec).toHaveBeenCalledWith('curl.exe', [
      '-L',
      '--fail',
      '--silent',
      '--show-error',
      '-o',
      'D:/temp/supabase.tar.gz',
      'https://example.com/supabase.tar.gz',
    ])
  })
})

describe('getSupabaseCliTempRoot', () => {
  it('keeps temporary downloads inside the repository tools directory', () => {
    expect(getSupabaseCliTempRoot('D:/pyprograms/kidsCoding')).toBe(
      'D:\\pyprograms\\kidsCoding\\.tools\\.tmp',
    )
  })
})
