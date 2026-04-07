import Link from 'next/link'

const trustSignals = [
  '最近作品、成长轨迹和下一步建议都会回到家长眼前。',
  '家长看的是作品和变化，不是只看抽象分数。',
  '孩子卡住时有微补课接住，家长不需要全程陪在旁边。',
]

const parentMoments = [
  { label: '最近作品', value: '花园互动秀' },
  { label: '当前单元', value: '第三单元' },
  { label: '下一步', value: '进入双角色毕业作品' },
]

const growthRows = [
  {
    title: '最近做出了什么',
    detail: '家长先看到孩子最近做成的作品，再决定怎么继续陪。',
  },
  {
    title: '已经走到哪一段',
    detail: '四个启蒙单元会按成长顺序展示，不会只剩一串课程编号。',
  },
  {
    title: '下一步怎么往前走',
    detail: '每次都会给一句下一步建议，把陪学成本压到很低。',
  },
]

export function ParentConfidence() {
  return (
    <section
      className="grid gap-8 rounded-[2.75rem] border border-[#dfeef9] bg-[linear-gradient(180deg,#f8fdff_0%,#eef8ff_100%)] px-6 py-8 shadow-[0_24px_60px_rgba(36,99,235,0.08)] md:px-10 md:py-10 lg:grid-cols-[0.95fr_1.05fr]"
      data-testid="parent-confidence"
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            Parent confidence
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            家长能一眼看懂孩子已经走到哪里
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            最近作品、成长轨迹和下一步建议都会回到家长眼前。孩子负责把故事做出来，家长负责看见变化、轻轻陪一把。
          </p>
        </div>

        <div className="grid gap-4">
          {trustSignals.map((signal) => (
            <div
              key={signal}
              className="flex items-start gap-3 rounded-[1.5rem] bg-white/80 px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
            >
              <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sm font-black text-sky-700">
                ✓
              </div>
              <p className="text-base leading-7 text-slate-700">{signal}</p>
            </div>
          ))}
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white px-6 py-4 text-base font-bold text-sky-800 transition hover:border-sky-300 hover:bg-sky-50"
          href="/parent/overview"
        >
          进入家长成长页
        </Link>
      </div>

      <div
        className="rounded-[2rem] bg-white/92 p-5 shadow-[0_16px_36px_rgba(14,116,144,0.1)]"
        data-testid="parent-confidence-preview"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">家长成长页预览</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              学习成果先回到家长眼前
            </h3>
          </div>
          <div className="rounded-full bg-sky-100 px-3 py-2 text-xs font-bold text-sky-700">
            最近更新 2 分钟前
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {parentMoments.map((moment) => (
            <div key={moment.label} className="rounded-[1.5rem] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">{moment.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{moment.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3 rounded-[1.75rem] bg-[linear-gradient(135deg,#fff7ea_0%,#ffffff_100%)] p-5">
          {growthRows.map((row) => (
            <div key={row.title} className="rounded-[1.2rem] bg-white/80 p-4">
              <p className="font-bold text-slate-950">{row.title}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{row.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
