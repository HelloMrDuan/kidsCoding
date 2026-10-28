import Link from 'next/link'

import type { ParentGrowthReport } from './build-parent-growth-report'

// Presentational only: all data comes from the server page, which passes
// exactly the logged-in parent's own records. This component fetches
// nothing and infers nothing.
export function GrowthKnowledgeSection({ report }: { report: ParentGrowthReport }) {
  return (
    <section
      className="kc-surface-3d rounded-[2rem] p-6"
      data-testid="growth-knowledge-report"
    >
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
          成长报告
        </p>
        <h2 className="text-2xl font-black text-slate-950">已完成课程涉及知识点</h2>
        <p className="text-sm leading-7 text-slate-500">
          下面只列出孩子已经完成的课程涉及的知识点，不代表孩子已经掌握这些知识点。
        </p>
        <p className="text-sm font-semibold text-slate-600">
          已完成课程 {report.completedCourseCount} 节
        </p>
      </div>

      {report.knowledgeGroups.length === 0 &&
      report.unregisteredLessons.length === 0 ? (
        <p
          className="mt-5 rounded-[1.6rem] bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-600"
          data-testid="growth-knowledge-empty"
        >
          孩子完成第一课后，这里会显示该课涉及的知识点。现在还没有已完成课程的记录。
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {report.knowledgeGroups.map((group) => (
            <article
              key={group.concept}
              className="rounded-[1.4rem] border border-slate-200 bg-white p-4"
              data-testid="growth-knowledge-group"
            >
              <h3 className="text-lg font-black text-slate-950">{group.concept}</h3>
              <ul className="mt-3 space-y-3">
                {group.courses.map((course) => (
                  <li
                    key={course.lessonId}
                    className="text-sm leading-7 text-slate-600"
                  >
                    <span className="font-bold text-slate-800">
                      {course.lessonTitle}
                    </span>
                    <span> 已完成</span>
                    {typeof course.stars === 'number' ? (
                      <span> · {course.stars} 颗星</span>
                    ) : null}
                    {course.hasWork ? (
                      <span>
                        {' '}
                        <Link
                          className="font-bold text-sky-700 transition hover:text-sky-800"
                          href={`/parent/projects/${course.lessonId}`}
                        >
                          查看作品回放
                        </Link>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          {report.unregisteredLessons.length > 0 ? (
            <div
              className="rounded-[1.4rem] border border-dashed border-slate-200 bg-white p-4"
              data-testid="growth-knowledge-unregistered"
            >
              <p className="text-sm font-semibold text-slate-500">
                以下已完成课程暂未登记知识点：
              </p>
              <ul className="mt-2 space-y-1">
                {report.unregisteredLessons.map((lesson) => (
                  <li
                    key={lesson.lessonId}
                    className="text-sm leading-7 text-slate-600"
                  >
                    {lesson.lessonTitle}：课程知识点未登记
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
