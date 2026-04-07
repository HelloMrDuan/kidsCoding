import { AgeBandForm } from '@/features/onboarding/age-band-form'

export default function AgeBandPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff9ef_0%,#fffdf8_38%,#eef8ff_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="rounded-[2.5rem] bg-[linear-gradient(180deg,#fffdf8_0%,#fff4e6_100%)] px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8">
          <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm">
            第一步
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl md:leading-[1.05]">
            先按年龄找到更合适的开始方式
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            这里只做一件事：先帮孩子找到更合适的起点。选完后就继续下一步，不需要比较太久。
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-[1.5rem] bg-white/90 px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold text-slate-500">你现在要做什么</p>
              <p className="mt-2 text-base font-bold leading-7 text-slate-900">
                选一个最接近孩子年龄的入口。
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white/90 px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold text-slate-500">下一步会发生什么</p>
              <p className="mt-2 text-base font-bold leading-7 text-slate-900">
                我们会用几道很短的小题，把起点再收准一点，然后直接进入学习地图。
              </p>
            </div>
          </div>
        </aside>

        <AgeBandForm />
      </section>
    </main>
  )
}
