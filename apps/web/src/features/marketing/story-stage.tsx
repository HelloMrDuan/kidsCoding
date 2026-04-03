import Link from 'next/link'

const promiseChips = [
  '适合 6-8 岁孩子，从零开始也能自己学',
  '卡住时有语音、动画和补课提示',
  '先完成 12 节启蒙课，再升级高阶创作',
]

const storySteps = [
  { title: '角色动起来', detail: '先把角色送上舞台，马上看到动作效果。' },
  { title: '故事说出来', detail: '让角色说话、切场景，像搭小剧场一样学逻辑。' },
  { title: '互动接进来', detail: '加上点击触发和节奏变化，作品马上更像自己写的故事。' },
]

export function StoryStage() {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/85 px-6 py-8 shadow-[0_30px_90px_rgba(16,24,40,0.12)] backdrop-blur md:px-10 md:py-12">
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,#ffd89a,transparent_60%)]" />
      <div className="relative grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="space-y-7">
          <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
            高品质儿童学习产品 · 作品先抓住孩子，路径先安抚家长
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl md:leading-[1.05]">
              孩子可以自己做出动画故事
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700 md:text-xl">
              先用单步小谜题学会动作、对白和触发，再把 2-3 节课合成一个小作品。孩子能一路看到成果，家长也能一路看到成长。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {promiseChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-4 pt-2 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[#ff8b4e] px-6 py-4 text-lg font-bold text-white shadow-[0_18px_32px_rgba(255,139,78,0.35)] transition hover:bg-[#ff7b38]"
              data-testid="home-start"
              href="/onboarding/age"
            >
              免费试听 3 节
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-6 py-4 text-lg font-bold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
              href="/parent/overview"
            >
              查看家长成长页
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-[#ffe59f] blur-2xl" />
          <div className="absolute -right-6 top-20 h-28 w-28 rounded-full bg-[#b9efff] blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#ffe1c4] bg-[linear-gradient(180deg,#fff7df_0%,#fff0d8_45%,#fef7ee_100%)] p-5 shadow-[0_24px_60px_rgba(255,153,83,0.18)]">
            <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,#8bd3ff_0%,#dff5ff_38%,#fdf6ee_100%)] p-5">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>孩子作品舞台</span>
                <span className="rounded-full bg-white/75 px-3 py-1 text-xs text-slate-600">
                  第 3 节可完成第一支故事
                </span>
              </div>

              <div className="relative mt-5 h-[22rem] overflow-hidden rounded-[1.5rem] border border-white/70 bg-[linear-gradient(180deg,#7dcdf8_0%,#d8f1ff_45%,#f8f2e8_100%)] px-5 py-6">
                <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_center,#98d77a,transparent_72%)]" />
                <div className="absolute left-6 top-5 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  “你好呀，我要去找发光的星星。”
                </div>
                <div className="absolute right-5 top-16 rounded-full bg-[#fff0c4] px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm">
                  点击舞台，星星就会亮起来
                </div>

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

                <div className="absolute inset-x-5 bottom-4 grid gap-3 rounded-[1.25rem] bg-white/90 p-4 shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
                  {storySteps.map((step, index) => (
                    <div key={step.title} className="grid grid-cols-[2.2rem_1fr] gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1d7] text-sm font-black text-amber-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{step.title}</p>
                        <p className="text-sm leading-6 text-slate-600">{step.detail}</p>
                      </div>
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
