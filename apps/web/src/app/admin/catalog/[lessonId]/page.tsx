import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireCurriculumAdmin } from '@/features/admin/require-curriculum-admin'
import { getCatalogLesson, getLessonGuide } from '@/features/curriculum/full-catalog-access'

export default async function AdminCatalogLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  await requireCurriculumAdmin()
  const { lessonId } = await params
  const guide = getLessonGuide(lessonId)
  const fromCatalog = getCatalogLesson(lessonId)
  if (!guide && !fromCatalog) notFound()
  const trackId = fromCatalog?.track.id ?? 'G0'
  return (
    <main className="min-h-screen bg-[#f3f8f4] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link className="text-sm font-bold text-emerald-800" href={`/admin/catalog?track=${trackId}`}>← 返回课程内容库</Link>
        <header className="rounded-[1.8rem] bg-white p-7">
          <p className="text-xs font-bold tracking-wide text-emerald-700">课程内容审阅 · 不会直接发布</p>
          <h1 className="mt-3 text-3xl font-black">{guide?.title ?? fromCatalog?.lesson.title}</h1>
          <p className="mt-2 text-xs text-slate-500">{lessonId}</p>
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {guide ? '已具备内容脚本，仍需引擎、素材及评测验收' : '当前仅编写课程大纲'}。本页面只读。
          </p>
          {guide ? <p className="mt-5 text-base leading-8 text-slate-700">{guide.story}</p> : (
            <p className="mt-5 leading-8 text-slate-700">{fromCatalog?.lesson.learningOutcome}</p>
          )}
        </header>
        {guide ? (
          <>
            <section className="rounded-[1.8rem] bg-white p-7">
              <h2 className="text-xl font-black">教学目标</h2>
              <div className="mt-4 space-y-2">{guide.goals.map((goal, index) => <p key={index} className="rounded-xl bg-slate-50 px-4 py-3 text-sm">{index + 1}. {goal}</p>)}</div>
            </section>
            <section className="rounded-[1.8rem] bg-white p-7">
              <h2 className="text-xl font-black">逐步教案与可观察验收</h2>
              <div className="mt-5 space-y-4">{guide.steps.map((step) => (
                <article key={step.order} className="rounded-2xl border border-slate-100 p-5">
                  <p className="text-sm font-black text-emerald-700">第 {step.order} 步</p>
                  <p className="mt-2 text-sm leading-7">教师引导：{step.prompt}</p>
                  <p className="mt-1 text-sm leading-7">学生操作：{step.action}</p>
                  <p className="mt-1 text-sm font-bold leading-7 text-sky-700">完成证据：{step.check}</p>
                  <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600">配音参考：{step.voiceover}</p>
                </article>
              ))}</div>
            </section>
            <section className="rounded-[1.8rem] bg-white p-7">
              <h2 className="text-xl font-black">错误诊断与三层提示</h2>
              <div className="mt-4 space-y-3">
                {guide.errors.map((item, index) => <p key={index} className="rounded-xl bg-rose-50 p-4 text-sm"><strong>{item.symptom}</strong> → {item.suggestion}</p>)}
              </div>
            </section>
            <section className="rounded-[1.8rem] bg-white p-7">
              <h2 className="text-xl font-black">评价与结课证据</h2>
              <div className="mt-4 space-y-3">{guide.rubric.map((item) => (
                <div key={item.criterion} className="rounded-xl bg-emerald-50 p-4">
                  <p className="font-bold">{item.criterion} · {item.weight}分</p>
                  <p className="mt-2 text-sm leading-7">{item.evidence}</p>
                </div>
              ))}</div>
              <p className="mt-5 text-sm font-bold">拓展任务：{guide.extension}</p>
              <p className="mt-4 text-sm text-slate-500">内容状态：{guide.status}。并未执行线上发布操作。</p>
            </section>
          </>
        ) : (
          <section className="rounded-[1.8rem] bg-white p-7">
            <h2 className="text-xl font-black">大纲验收目标</h2>
            <p className="mt-3 leading-8 text-slate-700">{fromCatalog?.lesson.evidence}</p>
            <p className="mt-4 font-bold text-amber-800">需要进一步编写剧情、逐步操作、错误诊断和测评题。</p>
          </section>
        )}
      </div>
    </main>
  )
}
