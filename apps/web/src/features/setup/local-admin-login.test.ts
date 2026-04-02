import { describe, expect, it } from 'vitest'

import { readLocalAdminLoginConfig } from './local-admin-login'

describe('readLocalAdminLoginConfig', () => {
  it('enables the page only when local mode and email are configured', () => {
    expect(
      readLocalAdminLoginConfig({
        LOCAL_SUPABASE_ENABLED: 'true',
        LOCAL_SUPABASE_ADMIN_EMAIL: 'admin-local@kidscoding.test',
      }),
    ).toEqual({
      enabled: true,
      email: 'admin-local@kidscoding.test',
    })
  })

  it('disables the page when local mode is off', () => {
    expect(
      readLocalAdminLoginConfig({
        LOCAL_SUPABASE_ENABLED: 'false',
        LOCAL_SUPABASE_ADMIN_EMAIL: 'admin-local@kidscoding.test',
      }),
    ).toEqual({
      enabled: false,
      email: 'admin-local@kidscoding.test',
    })
  })
})
