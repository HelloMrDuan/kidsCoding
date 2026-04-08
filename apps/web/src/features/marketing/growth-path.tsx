const unitSteps = [
  {
    id: '1',
    title: '森林见面会',
    lessons: '第 1-3 节',
    summary: '先让角色走上舞台、开口说话，孩子很快做出第一支小故事。',
    result: '完成第一个完整作品：小狐狸的第一次见面。',
    accent: 'from-[#ffe1b3] via-[#fff2dd] to-[#fffaf1]',
  },
  {
    id: '2',
    title: '小动物去旅行',
    lessons: '第 4-6 节',
    summary: '故事开始学会换场景、排顺序，作品第一次有了真正的前后段落。',
    result: '完成第二个完整作品：从森林走到草地的小旅行。',
    accent: 'from-[#d7f2ff] via-[#eef9ff] to-[#fbfeff]',
  },
  {
    id: '3',
    title: '花园互动秀',
    lessons: '第 7-9 节',
    summary: '孩子第一次学会点击触发，让自己的故事会回应操作。',
    result: '完成第三个完整作品：会回应点击的互动故事。',
    accent: 'from-[#dff6cf] via-[#f3ffe7] to-[#fbfff8]',
  },
  {
    id: '4',
    title: '动物朋友合作演出',
    lessons: '第 10-12 节',
    summary: '两个角色一起出场、一起配合，把前面学到的能力组合成毕业作品。',
    result: '第 12 节完成启蒙毕业作品，再自然升级高阶创作。',
    accent: 'from-[#ffe6cc] via-[#fff2e5] to-[#fffaf5]',
  },
]

export function GrowthPath() {
  return (
    <section
      className="kc-scene-shell relative overflow-hidden rounded-[2.8rem] px-6 py-8 shadow-[var(--kc-shadow-soft)] md:px-10 md:py-10"
      data-testid="growth-path"
    >
      <div className="absolute inset-x-0 top-0 h-40 kc-glow-warm" />

      <div className="relative max-w-3xl space-y-4">
        <p className="inline-flex rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-700 shadow-[0_10px_24px_rgba(22,35,63,0.08)]">
          沿着 4 个启蒙单元，一步一步做出真正的动画故事
        </p>
        <h2 className="text-3xl font-black tracking-tight text-[var(--kc-text-strong)] md:text-4xl">
          每 2 节学会能力，第 3 节就做出一个完整作品
        </h2>
        <p className="text-lg leading-8 text-[var(--kc-text-soft)]">
          孩子不会一直重复同一个动作。每个单元都会往上加一层能力，让作品从“角色动起来”一路长成“两个角色一起完成故事”。
        </p>
      </div>

      <div className="relative mt-10">
        <div className="absolute left-6 right-6 top-9 hidden h-2 rounded-full bg-[linear-gradient(90deg,#ffd79f_0%,#cfeeff_34%,#dff5cf_66%,#ffe9cb_100%)] lg:block" />

        <div className="grid gap-5 lg:grid-cols-4">
          {unitSteps.map((step) => (
            <article
              key={step.id}
              className={`relative overflow-hidden rounded-[2rem] border border-white bg-gradient-to-b ${step.accent} p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)]`}
              data-testid={`growth-path-unit-${step.id}`}
            >
              <div className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-black text-slate-900 shadow-sm">
                {step.id}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-500">{step.lessons}</p>
                  <h3 className="max-w-[12rem] text-2xl font-black leading-8 text-slate-950">
                    {step.title}
                  </h3>
                </div>

                <p className="text-base leading-7 text-slate-700">{step.summary}</p>

                <div className="rounded-[1.4rem] bg-white/85 p-4 text-sm font-semibold leading-7 text-slate-700 shadow-sm">
                  {step.result}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
