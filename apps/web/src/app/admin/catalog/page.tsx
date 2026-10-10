import Link from 'next/link'

import { requireCurriculumAdmin } from '@/features/admin/require-curriculum-admin'
import {
  curriculumTracks,
  getCatalogStatistics,
  getCatalogTrack,
  getLessonContentStage,
} from '@/features/curriculum/full-catalog-access'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import {evaluateReleaseReadiness,releasePilotEvidence} from '@/features/curriculum/release-readiness'

export default async function AdminCatalogPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  await requireCurriculumAdmin()
  const query = await searchParams
  const current = getCatalogTrack(query.track ?? '') ?? curriculumTracks[0]
  const stats = getCatalogStatistics()
  return (
    <main className="min-h-screen bg-[#f3f8f4] px-4 py-7 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/admin" className="text-sm font-bold text-emerald-800">← 返回内容后台</Link>
        <header className="rounded-[2rem] bg-white p-7 shadow-sm">
          <p className="text-xs font-black text-emerald-700">只读内容审阅 / 非课程发布</p>
          <h1 className="mt-2 text-3xl font-black">全学段课程内容库</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">目前新增的课程内容不能直接写入原有12节课程发布表。请先审核教案、引擎能力和素材，再按正式发布流程逐课开放。</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-xl bg-emerald-50 p-3">学习路径：{stats.tracks}</span>
            <span className="rounded-xl bg-sky-50 p-3">单元：{stats.units}</span>
            <span className="rounded-xl bg-amber-50 p-3">课程目录：{stats.lessons}</span>
            <span className="rounded-xl bg-orange-50 p-3">新增详细教案：{stats.detailedNewLessons}</span>
            <span className="rounded-xl bg-violet-50 p-3">原启蒙详细教案：{stats.existingFoundationGuides}</span>
            <span className="rounded-xl bg-rose-50 p-3">毕业项目蓝图：{stats.unitProjectBlueprints}</span>
          </div>
        </header>
        <section className="rounded-[1.5rem] border border-amber-200 bg-white p-6" data-testid="admin-release-readiness">
          <h2 className="text-xl font-black">实验关卡发布验收 · 全部仍未获正式发布授权</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">内容完整、能运行一次、测试通过，不等于已经可以向儿童正式发布。下表逐课列出独立阻塞条件，不会触发任何发布 API。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(releasePilotEvidence).map(([id,evidence])=>{
              const result=evaluateReleaseReadiness(evidence)
              return <div key={id} className="rounded-xl bg-amber-50 p-4 text-sm" data-testid={`release-readiness-${id}`}>
                <p className="font-black text-slate-900">{id} · {result.ready?'允许进入正式发布审核':'禁止正式发布'}</p>
                <p className="mt-2 text-amber-900">剩余 {result.missing.length} 项：</p>
                <p className="mt-1 leading-7 text-slate-700">{result.missing.map(item=>item.label).join('、')}</p>
              </div>
            })}
          </div>
        </section>
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav className="self-start rounded-[1.5rem] bg-white p-4 lg:sticky lg:top-5" aria-label="后台课程路径">
            <h2 className="px-2 pb-3 text-lg font-black">路径筛选</h2>
            <div className="grid gap-1.5">
              {curriculumTracks.map((track) => (
                <Link
                  key={track.id}
                  href={`/admin/catalog?track=${track.id}`}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${current.id === track.id ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-emerald-50'}`}
                  data-testid={`admin-catalog-track-${track.id}`}
                >{track.id} · {track.title}</Link>
              ))}
            </div>
          </nav>
          <div className="space-y-5">
            <section className="rounded-[1.5rem] bg-white p-6">
              <h2 className="text-2xl font-black">{current.title}</h2>
              <p className="mt-2 text-sm text-slate-600">年龄 {current.ageRange} · {current.engine} · 原创规划目录24课</p>
            </section>
            {current.units.map((unit) => (
              <section key={unit.id} className="rounded-[1.5rem] bg-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-black">{unit.title}</h3>
                  <span className="text-xs text-slate-500">{unit.id}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {unit.lessons.map((lesson) => (
                    <Link key={lesson.id} href={`/admin/catalog/${lesson.id}`} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm hover:bg-emerald-50" data-testid={`admin-catalog-lesson-${lesson.id}`}>
                      <span className="font-bold text-slate-900">{lesson.title}</span>
                      <span className="text-slate-600">{getLessonContentStage(lesson.id) === 'detailed' ? '详细教案待审' : '仅大纲'}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            <section className="rounded-[1.5rem] bg-white p-6">
              <h3 className="text-xl font-black">原有12节启蒙教案</h3>
              <p className="mt-2 text-sm text-slate-600">与现有线上课程条目 ID 对应，内容详案与线上发布状态分离。</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {launchLessons.map((lesson) => (
                  <Link key={lesson.id} href={`/admin/catalog/${lesson.id}`} className="rounded-xl border border-slate-100 p-3 text-sm font-bold hover:border-emerald-300">{lesson.title} →</Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
