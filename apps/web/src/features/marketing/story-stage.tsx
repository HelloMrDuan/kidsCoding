import Link from 'next/link'

const promiseChips = [
  '适合 6-8 岁孩子，从零开始也能跟着做',
  '语音、动画和微补课会在卡住时接住孩子',
  '12 节启蒙主线全部开放，先学会再升级高阶创作',
]

const parentFacts = [
  { label: '适合年龄', value: '6-8 岁启蒙阶段' },
  { label: '学习方式', value: '孩子自己点、自己做、自己看到结果' },
  { label: '完成结果', value: '第 12 节做出双角色启蒙毕业作品' },
]

const stageMoments = [
  {
    title: '角色走上舞台',
    detail: '先让小狐狸从森林里走出来，孩子一眼就能看到“是我让它动起来了”。',
  },
  {
    title: '故事会开口说话',
    detail: '再接上对白和场景切换，把小动作变成会讲述的小故事。',
  },
  {
    title: '点一下就会回应',
    detail: '孩子点击角色，舞台马上有反应，成就感会一下子立住。',
  },
]

export function StoryStage() {
  return (
    <section
      className="relative overflow-hidden rounded-[2.75rem] border border-white/70 bg-[linear-gradient(180deg,#fffdf7_0%,#fff6eb_55%,#fffdf7_100%)] px-6 py-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] md:px-10 md:py-12"
      data-testid="story-stage-hero"
    >
      <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,#ffd89a,transparent_62%)]" />
      <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-[#d9f3ff]/70 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[1fr_1.02fr] lg:items-center">
        <div className="space-y-7">
          <div className="inline-flex rounded-full border border-amber-200 bg-white/85 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm">
            高品质儿童创作学习产品
          </div>

          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl md:leading-[1.04]">
              孩子可以自己做出动画故事
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700 md:text-xl">
              从单步小谜题开始，慢慢学会动作、对白、场景切换和互动触发。每 2-3 节就能做出一个小作品，家长看得见成果，孩子也一直有成就感。
            </p>
          </div>

          <div
            className="flex flex-wrap gap-3"
            data-testid="story-stage-promises"
          >
            {promiseChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-4 pt-1 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[#ff8b4e] px-6 py-4 text-lg font-bold text-white shadow-[0_18px_32px_rgba(255,139,78,0.32)] transition hover:bg-[#ff7b38]"
              data-testid="home-start"
              href="/onboarding/age"
            >
              免费开启启蒙主线
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-6 py-4 text-lg font-bold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
              href="/parent/overview"
            >
              看看家长如何陪学
            </Link>
          </div>

          <div className="grid gap-3 rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:grid-cols-3">
            {parentFacts.map((fact) => (
              <div key={fact.label} className="space-y-1">
                <p className="text-sm font-semibold text-slate-500">{fact.label}</p>
                <p className="text-base font-bold leading-7 text-slate-900">{fact.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative" data-testid="story-stage-stage">
          <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-[#ffe59f]/90 blur-2xl" />
          <div className="absolute -right-6 top-20 h-28 w-28 rounded-full bg-[#b9efff]/90 blur-2xl" />

          <div className="relative overflow-hidden rounded-[2.25rem] border border-[#ffe4ca] bg-[linear-gradient(180deg,#fff4df_0%,#ffeedb_42%,#fffaf3_100%)] p-5 shadow-[0_28px_70px_rgba(255,153,83,0.18)]">
            <div className="rounded-[1.9rem] border border-white/70 bg-white/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">孩子作品舞台</p>
                  <p className="mt-1 text-xl font-black text-slate-950">今天做出的故事，值得被认真展示</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/85 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
                  第 12 节完成启蒙毕业作品
                </span>
              </div>

              <div className="relative mt-5 overflow-hidden rounded-[1.8rem] border border-white/80 bg-[linear-gradient(180deg,#92d7ff_0%,#dff5ff_42%,#fff4df_100%)] px-5 py-6">
                <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_center,#9ad57b,transparent_72%)]" />
                <div className="absolute left-7 top-6 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  你好呀，我们一起去找会发光的小礼物吧。
                </div>
                <div className="absolute right-7 top-20 rounded-full bg-[#fff3cf] px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm">
                  点一下舞台，角色就会继续往前走。
                </div>

                <div className="relative h-[20rem]">
                  <div className="absolute left-10 bottom-14 h-28 w-20 rounded-[2rem_2rem_1.3rem_1.3rem] bg-[#ff9f6a] shadow-[0_14px_22px_rgba(255,159,106,0.35)]">
                    <div className="absolute left-4 top-4 h-3 w-3 rounded-full bg-slate-900" />
                    <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-slate-900" />
                    <div className="absolute left-6 top-11 h-2 w-8 rounded-full bg-white/85" />
                    <div className="absolute left-3 top-[-1.8rem] h-8 w-14 rounded-full bg-[#5f85ff]" />
                  </div>

                  <div className="absolute right-14 bottom-16 h-24 w-16 rounded-[1.8rem_1.8rem_1.1rem_1.1rem] bg-[#6fc98b] shadow-[0_14px_22px_rgba(111,201,139,0.3)]">
                    <div className="absolute left-3 top-4 h-3 w-3 rounded-full bg-slate-900" />
                    <div className="absolute right-3 top-4 h-3 w-3 rounded-full bg-slate-900" />
                    <div className="absolute left-4 top-10 h-2 w-8 rounded-full bg-white/85" />
                    <div className="absolute left-[-0.6rem] top-[-1.1rem] h-5 w-5 rounded-full bg-[#ffe27a]" />
                  </div>

                  <div className="absolute right-8 top-8 text-3xl text-[#ffd54d]">✦</div>
                  <div className="absolute right-20 top-12 text-2xl text-[#ffd54d]">✦</div>
                  <div className="absolute left-24 top-20 text-xl text-white/70">☁</div>
                  <div className="absolute left-14 top-28 text-2xl text-white/80">☁</div>
                </div>

                <div className="grid gap-3 rounded-[1.4rem] bg-white/90 p-4 shadow-[0_12px_24px_rgba(15,23,42,0.12)] md:grid-cols-3">
                  {stageMoments.map((step, index) => (
                    <div
                      key={step.title}
                      className="rounded-[1.2rem] border border-slate-100 bg-white/85 p-4"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1d7] text-sm font-black text-amber-700">
                        {index + 1}
                      </div>
                      <p className="mt-3 font-bold text-slate-900">{step.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
