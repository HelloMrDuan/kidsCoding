import { redirect } from 'next/navigation'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { AiSettingsCard } from '@/features/admin/ai-settings-card'
import { CourseList } from '@/features/admin/course-list'
import { PaymentReconcileCard } from '@/features/admin/payment-reconcile-card'
import { loadAdminDashboardData } from '@/features/admin/load-admin-lessons'
import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()

    try {
      assertAdminUser(authData.user)
    } catch {
      redirect('/auth/bind')
    }
  }

  const dashboardData = await loadAdminDashboardData()

  return (
    <main className="min-h-screen bg-[#fffaf2] px-6 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">
            内容后台
          </p>
          <h1 className="text-4xl font-black text-slate-950">课程列表</h1>
        </header>
        <AiSettingsCard
          providers={dashboardData.ai.providers}
          currentSelection={dashboardData.ai.currentSelection}
        />
        <PaymentReconcileCard />
        <CourseList lessons={dashboardData.lessons} />
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          先进入单课编辑页修改课程标题、目标和步骤文案。保存草稿不会影响孩子端，发布后才会切换线上内容。
        </p>
      </section>
    </main>
  )
}
