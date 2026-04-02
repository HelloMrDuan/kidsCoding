import { NextResponse } from 'next/server'

import {
  bootstrapFirstAdmin,
  resolveFirstAdminBootstrapState,
} from '@/features/setup/first-admin-bootstrap'
import { createFirstAdminBootstrapRepository } from '@/features/setup/first-admin-bootstrap-repository'
import { getAdminSetupToken, hasServiceRoleEnv, hasSupabaseEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: 'setup-unavailable' }, { status: 503 })
  }

  const url = new URL(request.url)
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const repository = createFirstAdminBootstrapRepository(createAdminClient())
  const state = resolveFirstAdminBootstrapState({
    expectedToken: getAdminSetupToken(),
    providedToken: url.searchParams.get('token'),
    user: data.user ?? null,
    hasAnyAdmin: await repository.hasAnyAdmin(),
  })

  return NextResponse.json(state)
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: 'setup-unavailable' }, { status: 503 })
  }

  const body = (await request.json()) as { token?: string }
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const repository = createFirstAdminBootstrapRepository(createAdminClient())

  try {
    const result = await bootstrapFirstAdmin({
      expectedToken: getAdminSetupToken(),
      providedToken: body.token ?? null,
      user: data.user ?? null,
      repository,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'admin-bootstrap-failed'

    if (message === 'admin-bootstrap-token-invalid') {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    if (message === 'admin-bootstrap-auth-required') {
      return NextResponse.json({ error: message }, { status: 401 })
    }

    if (message === 'admin-bootstrap-closed') {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: 'admin-bootstrap-failed' }, { status: 500 })
  }
}
