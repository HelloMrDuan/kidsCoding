const pathSteps = [
  {
    title: '让角色动起来',
    subtitle: '第 1-3 节',
    description: '先做单步小谜题，马上学会动作、对白和点击触发。',
    outcome: '第 3 节完成第一支会动的小故事。',
    accent: 'from-[#ffdfae] to-[#fff2dc]',
  },
  {
    title: '把故事讲完整',
    subtitle: '第 4-8 节',
    description: '每 2-3 节课汇成一个小作品，孩子开始学会角色配合和场景变化。',
    outcome: '从“我会做一步”走到“我正在完成一个作品”。',
    accent: 'from-[#cdefff] to-[#eff9ff]',
  },
  {
    title: '自己完成作品',
    subtitle: '第 9-12 节',
    description: '逐步进入模板创作，替换角色、对白和动作，做成自己的故事。',
    outcome: '第 12 节完成启蒙毕业作品，高阶路线再升级。',
    accent: 'from-[#dff6cf] to-[#f5ffe8]',
  },
]

export function GrowthPath() {
  return (
    <section className="rounded-[2.5rem] bg-[#fffdf8] px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:px-10 md:py-10">
      <div className="max-w-3xl space-y-4">
        <p className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          参考优秀儿童编程平台的递进规律，但按你的产品主线重新组织
        </p>
        <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
          三步走进自己的故事舞台
        </h2>
        <p className="text-lg leading-8 text-slate-600">
          前面用单步谜题帮助孩子低门槛上手，后面逐步把控制权交给作品创作。学习过程既清楚，也一直能看到成果。
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {pathSteps.map((step, index) => (
          <article
            key={step.title}
            className={`rounded-[2rem] border border-white bg-gradient-to-b ${step.accent} p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)]`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">{step.subtitle}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-black text-slate-900 shadow-sm">
                {index + 1}
              </span>
            </div>
            <h3 className="mt-6 text-2xl font-black text-slate-950">{step.title}</h3>
            <p className="mt-3 text-base leading-7 text-slate-700">{step.description}</p>
            <div className="mt-6 rounded-[1.5rem] bg-white/80 p-4 text-sm font-semibold leading-7 text-slate-700">
              {step.outcome}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
