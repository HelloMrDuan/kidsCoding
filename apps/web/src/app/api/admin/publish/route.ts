import { NextResponse } from 'next/server'

import { validateCourseContent } from '@/features/admin/validate-course-content'
import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
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
      lessonId: lesson.id,
      title: lesson.title,
      steps: lesson.steps,
    }),
  )

  if (issues.length > 0) {
    return NextResponse.json({ ok: false, issues }, { status: 422 })
  }

  return NextResponse.json({ ok: true, issues: [] })
}
