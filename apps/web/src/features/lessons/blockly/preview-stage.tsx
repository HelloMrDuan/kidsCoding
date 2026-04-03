export function PreviewStage({ blocks }: { blocks: Array<{ type: string }> }) {
  const moved = blocks.some((block) => block.type === 'move_right')
  const spoke = blocks.some((block) => block.type === 'say_line')
  const hasStart = blocks.some((block) => block.type === 'when_start')
  const hasClickTrigger = blocks.some((block) => block.type === 'when_clicked')
  const switchedScene = blocks.some((block) => block.type === 'switch_scene')

  return (
    <div className="rounded-[2rem] border border-[#dceef7] bg-[linear-gradient(180deg,#dff4ff_0%,#ffffff_100%)] p-6 shadow-[0_14px_32px_rgba(56,189,248,0.08)]">
      <div className="rounded-[1.75rem] bg-white/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">作品舞台</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">先看角色怎么表演出来</h3>
          </div>
          <div className="rounded-full bg-sky-100 px-3 py-2 text-xs font-bold text-sky-700">
            每一步都会马上反馈
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] bg-[linear-gradient(180deg,#8bd3ff_0%,#ddf2ff_45%,#f9f1e3_100%)] p-5">
          <div className="flex items-end gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-300" />
            <div
              className="h-24 w-24 rounded-full bg-orange-400 transition-transform duration-300"
              style={{ transform: moved ? 'translateX(88px)' : 'translateX(0px)' }}
            />
          </div>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-700">
            {spoke && switchedScene
              ? '太好了，旅行已经完整地走到了新场景，整个故事越来越像真的冒险。'
              : spoke && hasClickTrigger
              ? '太好了，角色已经会在点击后先动起来，再用一句话回应你。'
              : spoke
              ? '太好了，角色已经会说话了，故事正在从静态图片变成会动的小舞台。'
              : switchedScene
                ? '太好了，故事已经从森林走到草地了。再接一句收尾的话，旅行就更完整了。'
              : moved && hasClickTrigger
                ? '太好了，角色已经会在点击后动起来了。再接一句回应的话，互动就更完整了。'
              : moved
                ? '太好了，角色已经走上舞台了。再接一句话，故事就会更完整。'
              : hasClickTrigger
                ? '很好，角色已经准备好回应你的点击了。再接一个动作积木，点一下就能看到变化。'
              : hasStart
                ? '很好，角色已经站上舞台了。再接一个动作积木，马上就能看到表演。'
                : '先把开始积木放好，再让角色真正开始表演。'}
          </p>
        </div>
      </div>
    </div>
  )
}
