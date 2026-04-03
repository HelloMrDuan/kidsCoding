import Link from 'next/link'

const freeLessons = [
  '第 1 节就让角色动起来',
  '第 2 节把对白和表情接进来',
  '第 3 节完成第一支可回放的小故事',
]

export function TrialCta() {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#1f2937_0%,#0f172a_100%)] px-6 py-8 text-white shadow-[0_28px_70px_rgba(15,23,42,0.28)] md:px-10 md:py-12">
      <div className="absolute right-[-4rem] top-[-5rem] h-48 w-48 rounded-full bg-[#ffb86b]/25 blur-3xl" />
      <div className="absolute bottom-[-4rem] left-[-2rem] h-40 w-40 rounded-full bg-[#5dd6ff]/25 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#ffd08a]">
            Free start
          </p>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            先免费学会，再决定要不要升级
          </h2>
          <p className="max-w-3xl text-lg leading-8 text-slate-200">
            启蒙 12 节全部开放，先让孩子真的完成第一支动画故事。学完之后，再进入更复杂的互动故事高阶路线。
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {freeLessons.map((lesson) => (
              <div
                key={lesson}
                className="rounded-[1.5rem] border border-white/10 bg-white/8 px-4 py-4 text-sm font-semibold leading-7 text-slate-100 backdrop-blur"
              >
                {lesson}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white/10 p-5 backdrop-blur">
          <p className="text-sm font-semibold text-slate-200">开始路径</p>
          <p className="mt-2 text-4xl font-black text-white">免费试听 3 节</p>
          <p className="mt-3 max-w-sm text-sm leading-7 text-slate-200">
            孩子先做出东西，家长再看到成果。学习主线先成立，付费决策自然放到高阶升级阶段。
          </p>
          <Link
            className="mt-5 inline-flex items-center justify-center rounded-full bg-[#ff9b54] px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-[#ffb16f]"
            href="/onboarding/age"
          >
            开始免费试听
          </Link>
        </div>
      </div>
    </section>
  )
}
