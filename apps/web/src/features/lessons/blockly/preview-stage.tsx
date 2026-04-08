import type { ProjectTemplateDefinition } from '@/features/domain/types'

const CHARACTER_LABELS: Record<string, string> = {
  fox: '小狐狸',
  rabbit: '小兔子',
  bird: '草地小鸟',
  butterfly: '小蝴蝶',
  frog: '小青蛙',
  bear: '小熊',
}

const SCENE_LABELS: Record<string, { badge: string; note: string }> = {
  forest: {
    badge: '森林舞台',
    note: '先让角色上场，再看看故事会不会往前走。',
  },
  meadow: {
    badge: '草地舞台',
    note: '先在森林出发，再把故事带到草地。',
  },
  garden: {
    badge: '花园舞台',
    note: '点一下角色，看看它会不会立刻回应你。',
  },
  'forest-stage': {
    badge: '毕业舞台',
    note: '让两个朋友按顺序上场，再一起完成故事。',
  },
}

function getStageCopy(blocks: Array<{ type: string }>) {
  const moved = blocks.some((block) => block.type === 'move_right')
  const spoke = blocks.some((block) => block.type === 'say_line')
  const repeated = blocks.some((block) => block.type === 'repeat_twice')
  const startCount = blocks.filter((block) => block.type === 'when_start').length
  const hasStart = startCount > 0
  const hasSecondStart = startCount > 1
  const hasClickTrigger = blocks.some((block) => block.type === 'when_clicked')
  const switchedScene = blocks.some((block) => block.type === 'switch_scene')

  if (repeated && spoke && hasSecondStart) {
    return '太好了，两个朋友已经会合了，还会一起再向礼物靠近一步，毕业故事更完整了。'
  }

  if (repeated && spoke && switchedScene) {
    return '太好了，故事已经从森林走到草地了，还会在草地上再往前走一步，再说出旅行感受。'
  }

  if (repeated && spoke && hasClickTrigger) {
    return '太好了，角色已经会在点击后连着动两次，再用一句话回应你。'
  }

  if (spoke && switchedScene) {
    return '太好了，故事已经从森林走到草地了。再接一句收尾的话，小旅行就更完整了。'
  }

  if (spoke && hasClickTrigger) {
    return '太好了，角色已经会在点击后先动起来，再用一句话回应你。'
  }

  if (spoke) {
    return '太好了，角色已经会出场，还会开口打招呼了。'
  }

  if (switchedScene) {
    return '太好了，故事已经成功换到新场景了。再接一句收尾的话，旅行就更完整了。'
  }

  if (moved && hasSecondStart) {
    return '太好了，两位朋友已经开始按顺序一起行动了。再接一个收尾动作，毕业故事就更完整了。'
  }

  if (hasSecondStart) {
    return '太好了，第二位朋友也准备好上场了。再接一个动作积木，舞台就会更热闹。'
  }

  if (moved && hasClickTrigger) {
    return '太好了，角色已经会在点击后动起来了。再接一句回应的话，互动就更完整了。'
  }

  if (moved) {
    return '太好了，角色已经走上舞台了。再接一句话，故事就会更完整。'
  }

  if (hasClickTrigger) {
    return '很好，角色已经准备好回应你的点击了。再接一个动作积木，点一下就能看到变化。'
  }

  if (hasStart) {
    return '很好，角色已经准备好开始表演了。再接一个动作积木，马上就能看到变化。'
  }

  return '先把开始积木放好，再让角色真正开始表演。'
}

function getTemplateCharacterLabels(template?: ProjectTemplateDefinition) {
  const first = template?.starterCharacters[0]
  const second = template?.starterCharacters[1]

  return {
    mainLabel: first ? CHARACTER_LABELS[first] ?? '主角' : '主角',
    secondLabel: second ? CHARACTER_LABELS[second] ?? '伙伴' : null,
    sceneCopy: template
      ? SCENE_LABELS[template.starterScene] ?? {
          badge: '故事舞台',
          note: '先把这一步做出来，再看舞台会发生什么变化。',
        }
      : {
          badge: '故事舞台',
          note: '先把这一步做出来，再看舞台会发生什么变化。',
        },
  }
}

export function PreviewStage({
  blocks,
  template,
}: {
  blocks: Array<{ type: string }>
  template?: ProjectTemplateDefinition
}) {
  const moved = blocks.some((block) => block.type === 'move_right')
  const repeated = blocks.some((block) => block.type === 'repeat_twice')
  const startCount = blocks.filter((block) => block.type === 'when_start').length
  const hasSecondStart = startCount > 1
  const switchedScene = blocks.some((block) => block.type === 'switch_scene')
  const { mainLabel, secondLabel, sceneCopy } = getTemplateCharacterLabels(template)
  const primaryOffset = repeated ? 136 : moved ? 88 : 0

  return (
    <section
      className="kc-stage-3d overflow-hidden rounded-[2.5rem] p-5 md:p-6"
      data-testid="lesson-preview-stage"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-700">作品舞台</p>
          <h3 className="mt-1 text-[1.75rem] font-black tracking-tight text-slate-950 md:text-[2rem]">
            看看你的故事现在发生了什么
          </h3>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-sky-700 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
          边做边看结果
        </span>
      </div>

      <div className="mt-5 rounded-[2rem] bg-[radial-gradient(circle_at_top,#ffffff_0%,#d8f0ff_42%,#f7ebd6_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-white/80" />
            <span className="h-3 w-3 rounded-full bg-white/60" />
            <span className="h-3 w-3 rounded-full bg-white/40" />
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-slate-500">
            {sceneCopy.badge}
          </span>
        </div>

        <div className="mt-6 rounded-[1.75rem] bg-[linear-gradient(180deg,#84d2ff_0%,#daf4ff_58%,#f8f2e7_100%)] px-5 pb-6 pt-8 shadow-[0_20px_36px_rgba(125,211,252,0.18)]">
          <div className="relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)] px-4 pb-8 pt-6">
            <div className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full bg-white/35 blur-2xl" />

            <div className="relative flex flex-wrap items-end gap-4">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full bg-orange-400 text-sm font-black text-white shadow-[0_16px_30px_rgba(251,146,60,0.3)] transition-transform duration-300"
                style={{ transform: `translateX(${primaryOffset}px)` }}
              >
                {mainLabel}
              </div>

              {secondLabel ? (
                <div
                  className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${
                    hasSecondStart || template?.starterScene === 'garden'
                      ? 'opacity-100'
                      : 'opacity-70'
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-white shadow-[0_16px_30px_rgba(52,211,153,0.22)]">
                    {secondLabel}
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-bold text-emerald-700">
                    {hasSecondStart ? '第二位朋友' : '舞台伙伴'}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-5 h-6 rounded-full bg-[linear-gradient(90deg,#ffdd94_0%,#ffeec1_100%)] opacity-80" />

            {repeated ? (
              <div className="mt-4 rounded-[1.25rem] bg-white/75 px-3 py-2 text-xs font-bold text-sky-700">
                角色已经学会把刚才的动作再做一次
              </div>
            ) : switchedScene ? (
              <div className="mt-4 rounded-[1.25rem] bg-white/75 px-3 py-2 text-xs font-bold text-sky-700">
                场景已经切换到新的画面
              </div>
            ) : (
              <div className="mt-4 rounded-[1.25rem] bg-white/75 px-3 py-2 text-xs font-bold text-sky-700">
                {sceneCopy.note}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-[1.75rem] bg-white/85 px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold leading-7 text-slate-700">{getStageCopy(blocks)}</p>
        </div>
      </div>
    </section>
  )
}
