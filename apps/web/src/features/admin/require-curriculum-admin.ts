import { redirect } from 'next/navigation'
import { assertAdminUser } from '@/features/admin/admin-auth'
import { hasSupabaseEnv, isAdminBypassEnabled } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Same gate as existing /admin. Never reveal unpublished teacher material publicly.
export async function requireCurriculumAdmin() {
  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()
    try {
      assertAdminUser(authData.user)
    } catch {
      redirect('/auth/bind')
    }
  } else if (!isAdminBypassEnabled()) {
    redirect('/auth/bind')
  }
}
