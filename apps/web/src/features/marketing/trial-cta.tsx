import Link from 'next/link'

const routeMoments = [
  '第 1 节先让角色走上舞台',
  '第 6 节完成第二个完整作品',
  '第 12 节完成启蒙毕业作品',
]

const routePromises = [
  {
    title: '先让孩子做出来',
    detail: '先沿着 12 节启蒙主线学会做作品，不在兴趣刚起来时打断。',
  },
  {
    title: '再让家长看到值不值得继续',
    detail: '孩子先做出东西，家长先看到成长，后面的升级决策才会更自然。',
  },
]

export function TrialCta() {
  return (
    <section
      className="relative overflow-hidden rounded-[2.8rem] bg-[linear-gradient(135deg,#26304e_0%,#16233f_100%)] px-6 py-8 text-white shadow-[0_28px_70px_rgba(22,35,63,0.28)] md:px-10 md:py-12"
      data-testid="trial-cta"
    >
      <div className="absolute right-[-4rem] top-[-5rem] h-48 w-48 kc-glow-warm blur-3xl" />
      <div className="absolute bottom-[-4rem] left-[-2rem] h-40 w-40 kc-glow-sky blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div className="space-y-5">
          <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-black text-[#ffd08a]">
            从启蒙主线开始
          </p>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            先把 12 节启蒙主线走完，再决定要不要升级
          </h2>
          <p className="max-w-3xl text-lg leading-8 text-slate-200">
            这 12 节启蒙课先全部开放，让孩子先学会做作品、先完成启蒙毕业故事。高阶付费路线放在作品和成长都已经成立之后。
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            {routeMoments.map((moment) => (
              <div
                key={moment}
                className="rounded-[1.5rem] border border-white/10 bg-white/8 px-4 py-4 text-sm font-semibold leading-7 text-slate-100 backdrop-blur"
              >
                {moment}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white/10 p-5 backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-slate-200">启蒙主线入口</p>
            <p className="mt-2 text-4xl font-black text-white">现在就开始启蒙主线</p>
            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-200">
              学习先成立，升级后决定。现在最重要的是让孩子尽快看到“我真的做出来了”。
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {routePromises.map((item) => (
              <div key={item.title} className="rounded-[1.3rem] bg-white/10 p-4">
                <p className="font-black text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-200">{item.detail}</p>
              </div>
            ))}
          </div>

          <Link
            className="kc-button-3d mt-5 inline-flex items-center justify-center bg-[#ff9b54] px-6 py-4 text-base font-black text-slate-950 transition hover:bg-[#ffb16f]"
            href="/onboarding/age"
          >
            立即开始启蒙主线
          </Link>
        </div>
      </div>
    </section>
  )
}
