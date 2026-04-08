import { AgeBandForm } from '@/features/onboarding/age-band-form'

export default function AgeBandPage() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="kc-scene-shell rounded-[2.8rem] px-6 py-7 shadow-[var(--kc-shadow-soft)] md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-700">
              第一步
            </span>
            <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black text-slate-600">
              先选年龄，再进入学习
            </span>
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-[var(--kc-text-strong)] md:text-5xl">
            先选孩子的年龄
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--kc-text-soft)] md:text-lg">
            这里只做一件事：先找到更合适的开始入口。选完之后，马上进入下一步，不需要比较太久。
          </p>
        </header>

        <AgeBandForm />
      </section>
    </main>
  )
}
