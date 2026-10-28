import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// CLOUD-105 static check: the guardian consent table exists with owner-only
// row level security, a (user_id, scope) key, and account-delete cascade.
// Behaviour is checked against the mocked Supabase client by the
// guardian-consent route tests; real Supabase verification runs in CI.
const sql = readFileSync(
  join(__dirname, '../../../supabase/migrations/202610280012_guardian_consents.sql'),
  'utf8',
).toLowerCase()

describe('guardian consent migration (CLOUD-105)', () => {
  it('creates the consent table keyed by account and scope', () => {
    expect(sql).toContain('create table if not exists public.guardian_consents')
    expect(sql).toMatch(/primary key \(user_id, scope\)/)
    expect(sql).toMatch(/user_id uuid not null references auth\.users\(id\) on delete cascade/)
    expect(sql).toContain('granted_at timestamptz')
  })

  it('enables row level security and grants only the authenticated role', () => {
    expect(sql).toMatch(/alter table public\.guardian_consents enable row level security/)
    expect(sql).toContain('grant select, insert, update, delete on public.guardian_consents to authenticated')
    expect(sql).not.toMatch(/to anon|to public[^_]/)
  })

  it.each(['select', 'insert', 'update', 'delete'])('has an owner-only %s policy', (action) => {
    expect(sql).toMatch(new RegExp(`create policy "guardian_consents_${action}_own" on public\\.guardian_consents`))
    expect(sql).toMatch(new RegExp(`for ${action} to authenticated[\\s\\S]*?\\(\\(select auth\\.uid\\(\\)\\) = user_id\\)`))
  })
})
