export function PreviewStage({ blocks }: { blocks: Array<{ type: string }> }) {
  const moved = blocks.some((block) => block.type === 'move_right')
  const spoke = blocks.some((block) => block.type === 'say_line')
  const hasStart = blocks.some((block) => block.type === 'when_start')

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-b from-sky-100 to-white p-6">
      <div className="rounded-[1.5rem] bg-white/70 p-5">
        <div className="flex items-end gap-4">
          <div className="h-10 w-10 rounded-full bg-amber-300" />
          <div
            className="h-24 w-24 rounded-full bg-orange-400 transition-transform duration-300"
            style={{ transform: moved ? 'translateX(88px)' : 'translateX(0px)' }}
          />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700">
          {spoke
            ? '你好呀，我已经会说话啦。'
            : hasStart
              ? '很好，角色已经准备好了。'
              : '先把积木摆好，让角色开始表演。'}
        </p>
      </div>
    </div>
  )
}
