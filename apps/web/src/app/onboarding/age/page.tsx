import { AgeBandForm } from '@/features/onboarding/age-band-form'

export default function AgeBandPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8eb_0%,#fffefb_42%,#eef9ff_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="rounded-[2.4rem] bg-[linear-gradient(180deg,#fffdf7_0%,#fff6eb_100%)] px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8">
          <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm">
            第一步
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl md:leading-[1.05]">
            先按年龄找到更合适的起点
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            我们会先按年龄帮孩子进入更合适的入口，再用后面的轻量小测评把起点继续收准。先把上手门槛降下来，孩子会更容易进入状态。
          </p>

          <div className="mt-6 grid gap-3">
            <article className="rounded-[1.4rem] bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold text-slate-500">这一页会帮你做什么</p>
              <p className="mt-2 text-base font-bold leading-7 text-slate-900">
                先找到更适合孩子阅读量、引导强度和操作节奏的学习起点。
              </p>
            </article>
            <article className="rounded-[1.4rem] bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold text-slate-500">后面会发生什么</p>
              <p className="mt-2 text-base font-bold leading-7 text-slate-900">
                下一步会用几道轻量小题，继续把孩子放到更合适的启蒙起点。
              </p>
            </article>
          </div>
        </aside>

        <AgeBandForm />
      </section>
    </main>
  )
}
