import { AgeBandForm } from '@/features/onboarding/age-band-form'

export default function AgeBandPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff9ef_0%,#fffdf8_40%,#eef8ff_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[2.5rem] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
              第一步
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              先选年龄，再进入学习
            </span>
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            先选孩子的年龄
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
            这里只做一件事：先找到更合适的开始入口。选完之后，马上进入下一步，不需要比较太久。
          </p>
        </header>

        <AgeBandForm />
      </section>
    </main>
  )
}
