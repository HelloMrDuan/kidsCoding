import { NextResponse } from 'next/server'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { saveAiRuntimeSelection } from '@/features/admin/ai/ai-runtime-settings'
import { createLaunchCurriculumRepository } from '@/features/admin/launch-curriculum-repository'
import { hasServiceRoleEnv, hasSupabaseEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: 'admin-unavailable' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = assertAdminUser(data.user)
  const body = (await request.json()) as {
    defaultProviderSlot: 'primary' | 'secondary'
    defaultModel: string
  }

  await saveAiRuntimeSelection({
    env: process.env,
    actorUserId: user.id,
    selection: body,
    repository: createLaunchCurriculumRepository(createAdminClient()),
  })

  return NextResponse.json({ ok: true })
}
