'use client'

import Link from 'next/link'

const promiseChips = [
  '适合 6-8 岁孩子，从零开始也能跟着做',
  '卡住时有语音、动画和微补课接住孩子',
  '12 节启蒙主线全部开放，先学会再升级高阶创作',
]

const parentFacts = [
  { label: '适合年龄', value: '6-8 岁启蒙阶段' },
  { label: '学习方式', value: '孩子自己点、自己做、自己看到结果' },
  { label: '完成结果', value: '第 12 节做出双角色启蒙毕业作品' },
]

const stageMoments = [
  {
    title: '角色先走上舞台',
    detail: '先让小狐狸出场，孩子马上看到“是我让它动起来了”。',
  },
  {
    title: '故事会开口说话',
    detail: '再接上对白和场景变化，小动作就变成会讲述的小故事。',
  },
  {
    title: '点一下就会回应',
    detail: '孩子点到角色，舞台立刻有反应，成就感会立刻立住。',
  },
]

export function StoryStage() {
  return (
    <section className="kc-scene-shell relative overflow-hidden rounded-[2.8rem] px-6 py-8 shadow-[var(--kc-shadow-deep)] md:px-10 md:py-12" data-testid="story-stage-hero">
      <div className="absolute inset-x-0 top-0 h-44 kc-glow-warm" />
      <div className="absolute right-0 top-10 h-56 w-56 kc-glow-sky blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[1fr_1.02fr] lg:items-center">
        <div className="space-y-7">
          <div className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-black text-[#ff7c26] shadow-[var(--kc-shadow-soft)]">
            高品质动画式儿童创作学习产品
          </div>

          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-[var(--kc-text-strong)] md:text-6xl md:leading-[1.04]">
              孩子可以自己
              <br />
              做出动画故事
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--kc-text-soft)] md:text-xl">
              从单步小任务开始，慢慢学会动作、对白、场景切换和互动触发。每 2-3 节就做出一个小作品，孩子持续有成就感，家长也能看见真实结果。
            </p>
          </div>

          <div className="flex flex-wrap gap-3" data-testid="story-stage-promises">
            {promiseChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-[#16233f] px-4 py-2 text-sm font-black text-white shadow-[0_12px_24px_rgba(22,35,63,0.16)]"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-4 pt-1 sm:flex-row">
            <Link
              className="kc-button-3d inline-flex items-center justify-center bg-[#ff8b47] px-7 py-4 text-lg font-black text-white transition hover:bg-[#ff7b38]"
              data-testid="home-start"
              href="/onboarding/age"
            >
              开始学第一节
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-[#cfe8fb] bg-white/85 px-6 py-4 text-lg font-black text-sky-800 transition hover:bg-sky-50"
              href="/parent/overview"
            >
              看看家长如何陪学
            </Link>
          </div>

          <div className="kc-surface-3d grid gap-3 p-5 sm:grid-cols-3">
            {parentFacts.map((fact) => (
              <div key={fact.label} className="space-y-1">
                <p className="text-sm font-semibold text-slate-500">{fact.label}</p>
                <p className="text-base font-black leading-7 text-[var(--kc-text-strong)]">
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative" data-testid="story-stage-stage">
          <div className="absolute -left-6 top-10 h-24 w-24 kc-glow-warm blur-2xl" />
          <div className="absolute -right-6 top-20 h-28 w-28 kc-glow-sky blur-2xl" />

          <div className="kc-panel-3d relative overflow-hidden p-5">
            <div className="kc-surface-3d p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">孩子作品舞台</p>
                  <p className="mt-1 text-xl font-black text-[var(--kc-text-strong)]">
                    今天做出的故事，值得被认真展示
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/85 px-4 py-2 text-xs font-black text-slate-600 shadow-[0_10px_20px_rgba(22,35,63,0.08)]">
                  第 12 节完成启蒙毕业作品
                </span>
              </div>

              <div className="kc-stage-3d relative mt-5 overflow-hidden px-5 py-6">
                <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_center,#9fd98c,transparent_72%)]" />
                <div className="absolute left-7 top-6 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  你好呀，我们一起去找会发光的小礼物吧。
                </div>
                <div className="absolute right-7 top-20 rounded-full bg-[#fff3cf] px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm">
                  点一下舞台，角色就会继续往前走。
                </div>

                <div className="relative h-[20rem]">
                  <div className="absolute bottom-14 left-10 h-28 w-20 rounded-[2rem_2rem_1.3rem_1.3rem] bg-[#ff9f6a] shadow-[0_14px_22px_rgba(255,159,106,0.35)]">
                    <div className="absolute left-4 top-4 h-3 w-3 rounded-full bg-slate-900" />
                    <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-slate-900" />
                    <div className="absolute left-6 top-11 h-2 w-8 rounded-full bg-white/85" />
                    <div className="absolute left-3 top-[-1.8rem] h-8 w-14 rounded-full bg-[#5f85ff]" />
                  </div>

                  <div className="absolute bottom-16 right-14 h-24 w-16 rounded-[1.8rem_1.8rem_1.1rem_1.1rem] bg-[#6fc98b] shadow-[0_14px_22px_rgba(111,201,139,0.3)]">
                    <div className="absolute left-3 top-4 h-3 w-3 rounded-full bg-slate-900" />
                    <div className="absolute right-3 top-4 h-3 w-3 rounded-full bg-slate-900" />
                    <div className="absolute left-4 top-10 h-2 w-8 rounded-full bg-white/85" />
                    <div className="absolute left-[-0.6rem] top-[-1.1rem] h-5 w-5 rounded-full bg-[#ffe27a]" />
                  </div>

                  <div className="absolute right-8 top-8 text-3xl text-[#ffd54d]">✦</div>
                  <div className="absolute right-20 top-12 text-2xl text-[#ffd54d]">✦</div>
                  <div className="absolute left-24 top-20 text-xl text-white/70">✦</div>
                  <div className="absolute left-14 top-28 text-2xl text-white/80">✦</div>
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
                      <p className="mt-3 font-black text-[var(--kc-text-strong)]">{step.title}</p>
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
