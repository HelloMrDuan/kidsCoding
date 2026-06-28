import { describe, expect, it } from 'vitest'

import { resolveBrowserSupabaseConfig } from './browser'

describe('resolveBrowserSupabaseConfig', () => {
  it('returns real config when URL and key are present', () => {
    const config = resolveBrowserSupabaseConfig(
      {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'real-anon-key',
      },
      'http://localhost:3000',
    )

    expect(config).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseKey: 'real-anon-key',
    })
  })

  it('falls back to window origin in explicit test mode', () => {
    const config = resolveBrowserSupabaseConfig(
      {
        NEXT_PUBLIC_SUPABASE_TEST_MODE: 'true',
      },
      'http://127.0.0.1:3100',
    )

    expect(config.supabaseUrl).toBe('http://127.0.0.1:3100')
    expect(config.supabaseKey).toBe('test-mode-placeholder')
  })

  it('throws when URL is missing and test mode is off', () => {
    expect(() =>
      resolveBrowserSupabaseConfig(
        {
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'real-anon-key',
        },
        'http://localhost:3000',
      ),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL is required/)
  })

  it('throws when key is missing and test mode is off', () => {
    expect(() =>
      resolveBrowserSupabaseConfig(
        {
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        },
        'http://localhost:3000',
      ),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required/)
  })

  it('throws when both URL and key are missing and test mode is off', () => {
    expect(() =>
      resolveBrowserSupabaseConfig({}, 'http://localhost:3000'),
    ).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required/,
    )
  })

  it('rejects empty string URL even when test mode is off', () => {
    expect(() =>
      resolveBrowserSupabaseConfig(
        {
          NEXT_PUBLIC_SUPABASE_URL: '   ',
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'real-anon-key',
        },
        'http://localhost:3000',
      ),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL is required/)
  })

  it('rejects empty string key even when test mode is off', () => {
    expect(() =>
      resolveBrowserSupabaseConfig(
        {
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
        },
        'http://localhost:3000',
      ),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required/)
  })
})
