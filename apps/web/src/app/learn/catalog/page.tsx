import Link from 'next/link'

import {
  curriculumTracks,
  getCatalogStatistics,
  getCatalogTrack,
  getLessonContentStage,
} from '@/features/curriculum/full-catalog-access'

const engineLabels: Record<string, string> = {
  blockly: '图形化积木', scratch: 'Scratch', python: 'Python',
  cpp: 'C++', web: '网页编程', ai: 'AI 素养', 'ai-python': 'Python AI',
  hardware: '机器人与硬件', literacy: '数字安全', math: '数学编程', steam: 'STEAM',
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>
}) {
  const query = await searchParams
  const current = getCatalogTrack(query.track ?? '') ?? curriculumTracks[0]
  const stats = getCatalogStatistics()
  return (
    <main className="min-h-screen bg-[linear-gradient(165deg,#ecf9f2_0%,#f3f8ff_45%,#fff9ec_100%)] px-4 py-8 text-slate-900 md:px-7">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="rounded-[2.5rem] border border-white bg-white/85 p-7 shadow-[0_18px_60px_rgba(43,83,93,0.08)] md:p-9">
          <p className="text-sm font-black text-emerald-700">KidsCoding · 学习路线图</p>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">找到你的下一场编程冒险</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            从图形化积木、Scratch、Python 到人工智能与机器人，先了解知识路线，再选择适合自己的挑战。下面的完整目录仍在逐步制作，未开放的课程不会让你进入空白关卡。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">{stats.tracks} 条学习路径</span>
            <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-800">{stats.units} 个单元</span>
            <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">{stats.lessons} 节规划课程</span>
            <Link className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white" href="/learn/map">进入现有12节启蒙地图 →</Link>
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
          <nav aria-label="课程路径" className="self-start rounded-[2rem] bg-white p-4 shadow-sm lg:sticky lg:top-5">
            <h2 className="px-3 py-3 text-lg font-black">选择学习方向</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {curriculumTracks.map((track) => (
                <Link
                  key={track.id}
                  href={`/learn/catalog?track=${track.id}`}
                  aria-current={track.id === current.id ? 'page' : undefined}
                  className={`rounded-2xl px-4 py-3 transition ${current.id === track.id ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-emerald-50'}`}
                  data-testid={`catalog-track-${track.id}`}
                >
                  <span className="text-sm font-bold">{track.title}</span>
                  <span className={`mt-1 block text-xs ${track.id === current.id ? 'text-emerald-50' : 'text-slate-500'}`}>
                    {engineLabels[track.engine] ?? track.engine} · {track.ageRange}岁 · 24课
                  </span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-7 shadow-sm">
              <p className="text-xs font-black tracking-widest text-emerald-600">{current.id} / 学习路线</p>
              <h2 className="mt-2 text-3xl font-black">{current.title}</h2>
              <p className="mt-2 text-sm text-slate-600">建议年龄 {current.ageRange} 岁 · 4 单元 · 24 课 · 当前以内容建设为主</p>
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">课程目录不代表在线开放。显示「教案已备」的课程也需要素材、执行引擎和测试完成之后才能解锁。</p>
            </section>
            {current.units.map((unit, index) => (
              <section key={unit.id} className="rounded-[2rem] bg-white p-6 shadow-sm" data-testid={`catalog-unit-${unit.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-black">第 {index + 1} 单元 · {unit.title}</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{unit.concepts.join(' · ')}</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {unit.lessons.map((lesson, lessonIndex) => (
                    <Link
                      key={lesson.id}
                      href={`/learn/catalog/${lesson.id}`}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
                      data-testid={`catalog-lesson-${lesson.id}`}
                    >
                      <span className="text-xs font-black text-slate-500">第 {index * 6 + lessonIndex + 1} 课 · {lesson.phase}</span>
                      <h4 className="mt-2 text-base font-bold">{lesson.title}</h4>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{lesson.learningOutcome}</p>
                      <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                        {getLessonContentStage(lesson.id) === 'detailed' ? '教案已备 · 待开发' : '大纲规划 · 待开发'}
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-emerald-800">🏆 单元作品：{unit.lessons.at(-1)?.title}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
