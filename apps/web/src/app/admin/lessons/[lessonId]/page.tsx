import Link from 'next/link'

import { notFound, redirect } from 'next/navigation'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { LessonEditor } from '@/features/admin/lesson-editor'
import { loadAdminLessonPageData } from '@/features/admin/load-admin-lessons'
import { hasSupabaseEnv, isAdminBypassEnabled } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AdminLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
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

  const { lessonId } = await params
  let pageData: Awaited<ReturnType<typeof loadAdminLessonPageData>>

  try {
    pageData = await loadAdminLessonPageData(lessonId)
  } catch {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-6 py-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <Link href={`/admin/catalog/${lessonId}`} className="inline-flex rounded-full bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100" data-testid="admin-lesson-open-guide">查看此课的完整教案与评价标准 →</Link>
        <LessonEditor
          lesson={pageData.lesson}
          draftUpdatedAt={pageData.draftUpdatedAt}
          publishedAt={pageData.publishedAt}
          hasUnpublishedChanges={pageData.hasUnpublishedChanges}
        />
      </section>
    </main>
  )
}
