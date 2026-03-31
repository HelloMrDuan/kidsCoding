import { NextResponse } from 'next/server'

import { launchCoursePack } from '@/features/billing/course-pack'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    return NextResponse.json({ hasLaunchPack: false })
  }

  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('status')
    .eq('user_id', user.id)
    .eq('product_code', launchCoursePack.productCode)
    .maybeSingle()

  return NextResponse.json({
    hasLaunchPack: entitlement?.status === 'active',
  })
}
