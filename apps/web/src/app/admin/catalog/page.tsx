import Link from 'next/link'

import { requireCurriculumAdmin } from '@/features/admin/require-curriculum-admin'
import {
  curriculumTracks,
  getCatalogStatistics,
  getCatalogTrack,
} from '@/features/curriculum/full-catalog-access'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { releaseEvidence, releaseRequirements } from '@/features/curriculum/release-readiness'
import { getLessonMaturity, getLessonRelease } from '@/features/curriculum/lesson-maturity'

const RELEASE_PAGE_SIZE = 6

export default async function AdminCatalogPage({ searchParams }: { searchParams: Promise<{ track?: string; rp?: string }> }) {
  await requireCurriculumAdmin()
  const query = await searchParams
  const current = getCatalogTrack(query.track ?? '') ?? curriculumTracks[0]
  const stats = getCatalogStatistics()
  const releaseIds = Object.keys(releaseEvidence)
  const releasePages = Math.max(1, Math.ceil(releaseIds.length / RELEASE_PAGE_SIZE))
  const releasePage = Math.min(releasePages, Math.max(1, Number(query.rp) || 1))
  const releaseSlice = releaseIds.slice((releasePage - 1) * RELEASE_PAGE_SIZE, releasePage * RELEASE_PAGE_SIZE)
  const trackParam = query.track ? `track=${query.track}&` : ''
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
          <h2 className="text-xl font-black">发布七门禁 · {releaseIds.length} 节试玩课全部未获正式发布授权</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">每道门禁必须附证据（仓库文件、本仓库 CI 或 PR 链接）、审阅人和日期才算通过；AI 评分和实现者自评不算，人审只认负责人且必须排在最后。本页只读，不会触发任何发布 API。</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600" aria-label="门禁说明">
            {releaseRequirements.map((r, i) => <span key={r.key} className="rounded-lg bg-slate-50 px-2 py-1">{i + 1} {r.short}：{r.label}</span>)}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {releaseSlice.map((id) => {
              const result = getLessonRelease(id)
              return <div key={id} className="min-w-0 rounded-xl bg-amber-50 p-4 text-sm" data-testid={`release-readiness-${id}`}>
                <p className="break-words font-black text-slate-900">{id} · {result.ready ? '允许正式发布' : '禁止正式发布'}</p>
                <p className="mt-1 text-amber-900">已通过 {result.passedCount}/7 · 剩余 {result.missing.length} 项</p>
                <ul className="mt-2 space-y-1.5">
                  {result.gates.map((g) => (
                    <li key={g.key} className="flex min-w-0 gap-2" data-testid={`release-gate-${id}-${g.key}`} data-passed={g.passed ? 'true' : 'false'}>
                      <span className={`shrink-0 self-start rounded-md px-1.5 text-xs font-black ${g.passed ? 'bg-emerald-600 text-white' : g.status === 'fail' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{g.short}</span>
                      <span className="min-w-0 break-words text-xs leading-5 text-slate-700">{g.passed ? `${g.reviewer} · ${g.date}` : g.reasons[0]}{g.evidence.length ? ` · 已附证据 ${g.evidence.length}` : ''}{!g.passed && g.note ? <span className="hidden sm:inline">（{g.note}）</span> : null}</span>
                    </li>
                  ))}
                </ul>
              </div>
            })}
          </div>
          <nav className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold" aria-label="发布门禁分页" data-testid="release-readiness-pager">
            {Array.from({ length: releasePages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`/admin/catalog?${trackParam}rp=${n}`} aria-current={n === releasePage ? 'page' : undefined} className={`rounded-lg px-3 py-1.5 ${n === releasePage ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}>{n}</Link>
            ))}
            <span className="text-xs text-slate-500">第 {releasePage}/{releasePages} 页，每页 {RELEASE_PAGE_SIZE} 节</span>
          </nav>
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
                      {(() => { const m = getLessonMaturity(lesson.id)!; return <span className="text-slate-600" data-testid={`admin-lesson-maturity-${lesson.id}`}>L{m.level} {m.label}{m.blockers[0] ? ` · 未发布：${m.blockers[0]}` : ''}</span> })()}
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
                  <Link key={lesson.id} href={`/admin/catalog/${lesson.id}`} className="rounded-xl border border-slate-100 p-3 text-sm font-bold hover:border-emerald-300">{lesson.title} · L{getLessonMaturity(lesson.id)!.level} →</Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
