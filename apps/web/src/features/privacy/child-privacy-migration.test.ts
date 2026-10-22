import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// TQ-013 static check: every table created by any migration has RLS enabled somewhere,
// child data tables are owner-read-only, guest_snapshots has no API-role policy, and the
// retention function exists. Behaviour is checked against real PostgreSQL in CI by
// scripts/child-privacy-rls.sql; real Supabase verification is CLOUD-103.
const dir = join(__dirname, '../../../supabase/migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const all = files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n').toLowerCase()
const privacy = readFileSync(join(dir, '202610220011_child_privacy_rls.sql'), 'utf8').toLowerCase()

const created = [...all.matchAll(/create table (?:if not exists )?(?:public\.)?([a-z_]+)/g)]
  .map((m) => m[1])

describe('child privacy migration (TQ-013)', () => {
  it('finds the initial tables', () => {
    for (const t of ['guest_snapshots', 'child_profiles', 'progress_records', 'badge_records', 'card_records', 'project_snapshots']) {
      expect(created).toContain(t)
    }
  })

  it.each(created)('enables row level security on %s', (table) => {
    expect(all).toMatch(new RegExp(`alter table (public\\.)?${table} enable row level security`))
  })

  it.each([
    ['child_profiles', 'user_id'],
    ['progress_records', 'user_id'],
    ['badge_records', 'user_id'],
    ['card_records', 'user_id'],
    ['project_snapshots', 'owner_user_id'],
    ['orders', 'user_id'],
    ['entitlements', 'user_id'],
  ])('%s is readable only by its owner and not writable by API roles', (table, column) => {
    expect(privacy).toMatch(
      new RegExp(`on public\\.${table}\\s+for select to authenticated using \\(\\(select auth\\.uid\\(\\)\\) = ${column}\\)`),
    )
    expect(privacy).not.toMatch(new RegExp(`on public\\.${table}\\s+for (insert|update|delete|all)`))
  })

  it('guest_snapshots is service-role only and old answers are scrubbed', () => {
    expect(all).not.toMatch(/create policy[^;]*on (public\.)?guest_snapshots/)
    expect(privacy).toMatch(/revoke all on public\.guest_snapshots[\s\S]*?from public, anon, authenticated/)
    expect(privacy).toContain("set onboarding = onboarding - 'answers'")
  })

  it('ships a retention purge that API roles cannot call', () => {
    expect(privacy).toContain('create or replace function public.purge_stale_guest_snapshots(retention_days integer default 30)')
    expect(privacy).toContain('revoke all on function public.purge_stale_guest_snapshots(integer) from public, anon, authenticated')
  })
})
