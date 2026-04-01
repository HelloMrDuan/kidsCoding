import { NextResponse } from 'next/server'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { validateCourseContent } from '@/features/admin/validate-course-content'
import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()

    try {
      assertAdminUser(data.user)
    } catch {
      return NextResponse.json({ ok: false, issues: [] }, { status: 401 })
    }
  }

  const payload = (await request.json()) as {
    lessons: Array<{
      id: string
      title: string
      steps: Array<{ title: string; instruction: string }>
    }>
  }
  const issues = payload.lessons.flatMap((lesson) =>
    validateCourseContent({
      mode: 'draft',
      lessonId: lesson.id,
      title: lesson.title,
      goal: '',
      steps: lesson.steps,
    }),
  )

  if (issues.length > 0) {
    return NextResponse.json({ ok: false, issues }, { status: 422 })
  }

  return NextResponse.json({ ok: true, issues: [] })
}
