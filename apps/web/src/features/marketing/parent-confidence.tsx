import Link from 'next/link'

const confidenceSignals = [
  '每节课完成状态和最近学习时间一眼可见',
  '作品回放页保留孩子的故事成果，不只是分数',
  '卡片和成就展示帮助孩子持续保持兴趣',
  '家长页给出下一步陪学建议，不需要全程坐在旁边',
]

const parentMoments = [
  { label: '最近完成', value: '森林小冒险' },
  { label: '连续学习', value: '5 天' },
  { label: '已解锁卡片', value: '12 张' },
]

export function ParentConfidence() {
  return (
    <section className="grid gap-8 rounded-[2.5rem] border border-[#dfeef9] bg-[linear-gradient(180deg,#f8fdff_0%,#eef8ff_100%)] px-6 py-8 shadow-[0_24px_60px_rgba(36,99,235,0.08)] md:px-10 md:py-10 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[2rem] bg-white/90 p-5 shadow-[0_16px_36px_rgba(14,116,144,0.1)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">家长成长页预览</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">成长记录家长看得见</h3>
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

        <div className="mt-5 rounded-[1.75rem] bg-[linear-gradient(135deg,#fff7ea_0%,#ffffff_100%)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">下一个推荐</p>
              <p className="mt-1 text-xl font-black text-slate-950">第 7 节：让故事对点击做出反应</p>
            </div>
            <div className="rounded-full bg-[#ffe4b3] px-3 py-2 text-xs font-bold text-amber-800">
              适合今天继续
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            陪孩子一起回看最近作品，问一句“如果点一下树叶，会发生什么？”就能自然过渡到下一节。
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            Parent confidence
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            作品、进度和建议都能回到家长眼前
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            孩子端负责激发兴趣，家长页负责建立信任。家长不用盯着每一步，也能知道孩子是不是在真实学习。
          </p>
        </div>

        <div className="grid gap-4">
          {confidenceSignals.map((signal) => (
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
    </section>
  )
}
