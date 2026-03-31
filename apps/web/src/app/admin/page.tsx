import { redirect } from 'next/navigation'

import { CourseEditor } from '@/features/admin/course-editor'
import { loadLaunchCurriculum } from '@/features/curriculum/load-launch-curriculum'
import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
      redirect('/auth/bind')
    }
  }

  const curriculum = await loadLaunchCurriculum()

  return (
    <main className="min-h-screen bg-[#fffaf2] px-6 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">
            内容后台
          </p>
          <h1 className="text-4xl font-black text-slate-950">
            课程和提示管理
          </h1>
        </header>
        <CourseEditor curriculum={curriculum} />
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          这一页同时维护课程步骤、提示文案和语音资源。发布前会先做字符安全校验，避免中文异常内容进入线上。
        </p>
      </section>
    </main>
  )
}
