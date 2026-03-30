import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ffe9b5,transparent_32%),linear-gradient(180deg,#fff8ea_0%,#f7f2ff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[85vh] max-w-5xl flex-col justify-between rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_80px_rgba(255,176,63,0.18)] backdrop-blur md:p-12">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
            中文启蒙 · 手机和电脑都能学
          </p>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              做动画学编程
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700">
              先让角色动起来，再一步一步学会故事、互动和逻辑。低龄孩子从积木开始，
              高龄孩子也能顺着路线继续进阶。
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-8 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-4 text-lg font-bold text-white shadow-[0_12px_24px_rgba(249,115,22,0.3)] transition hover:bg-orange-400"
            data-testid="home-start"
            href="/onboarding/age"
          >
            马上开始
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-lg font-bold text-slate-800 transition hover:border-sky-300 hover:text-sky-700"
            href="/parent/overview"
          >
            家长查看
          </Link>
        </div>
      </section>
    </main>
  )
}
