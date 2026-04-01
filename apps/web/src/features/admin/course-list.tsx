import Link from 'next/link'

import type { AdminLessonSummary } from '@/features/domain/types'

function formatTime(value: string | null | undefined) {
  if (!value) {
    return '未保存'
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
  })
}

export function CourseList({ lessons }: { lessons: AdminLessonSummary[] }) {
  return (
    <div className="grid gap-4">
      {lessons.map((lesson) => (
        <Link
          key={lesson.id}
          href={`/admin/lessons/${lesson.id}`}
          className="rounded-[1.5rem] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          data-testid={`admin-lesson-link-${lesson.id}`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-500">{lesson.id}</p>
              <h2 className="text-2xl font-black text-slate-950">{lesson.title}</h2>
              <p className="text-sm font-semibold text-slate-600">
                {lesson.phase === 'trial' ? '试听课' : '正式课'}
              </p>
            </div>
            <div className="space-y-2 text-sm font-semibold text-slate-600">
              <p>{lesson.hasUnpublishedChanges ? '有未发布改动' : '草稿与线上一致'}</p>
              <p>草稿更新：{formatTime(lesson.draftUpdatedAt)}</p>
              <p>线上发布：{formatTime(lesson.publishedAt)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
