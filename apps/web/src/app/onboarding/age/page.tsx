import { AgeBandForm } from '@/features/onboarding/age-band-form'

export default function AgeBandPage() {
  return (
    <main className="min-h-screen bg-[#fff7eb] px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
            第一步
          </p>
          <h1 className="text-4xl font-black text-slate-950">
            先选一个适合你的起点
          </h1>
          <p className="text-lg leading-8 text-slate-600">
            先按年龄进入，再用几道轻量小题帮你找到更适合的学习路线。
          </p>
        </header>
        <AgeBandForm />
      </section>
    </main>
  )
}
