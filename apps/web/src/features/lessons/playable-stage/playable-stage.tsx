import { useEffect } from 'react'

import type { ProjectTemplateDefinition } from '@/features/domain/types'

import { useBlockExecutor } from './use-block-executor'

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

export function PlayableStage({
  blocks,
  template,
  requiredBlocks,
  stepIndex,
  onRunSuccess,
  onRunClear,
}: {
  blocks: Array<{ type: string }>
  template?: ProjectTemplateDefinition
  requiredBlocks: string[]
  stepIndex: number
  onRunSuccess: () => void
  onRunClear?: () => void
}) {
  const {
    executionState,
    characterPosition,
    characterMessage,
    run,
    reset,
  } = useBlockExecutor(blocks, requiredBlocks, stepIndex)

  const { mainLabel, secondLabel, sceneCopy } = getTemplateCharacterLabels(template)

  useEffect(() => {
    if (executionState === 'success') {
      onRunSuccess()
    }
  }, [executionState, onRunSuccess])

  function handleReset() {
    reset()
    if (onRunClear) {
      onRunClear()
    }
  }

  return (
    <section
      className="kc-stage-3d overflow-hidden rounded-[2.5rem] p-5 md:p-6"
      data-testid="lesson-playable-stage"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-700">可运行舞台</p>
          <h3 className="mt-1 text-[1.75rem] font-black tracking-tight text-slate-950 md:text-[2rem]">
            运行你的代码看看
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
            onClick={handleReset}
            disabled={executionState === 'running'}
            data-testid="reset-code-button"
          >
            重置
          </button>
          <button
            type="button"
            className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-white shadow-[0_10px_22px_rgba(16,185,129,0.3)] transition hover:bg-emerald-600 disabled:opacity-50"
            onClick={run}
            disabled={executionState === 'running'}
            data-testid="run-code-button"
          >
            {executionState === 'running' ? '运行中...' : '▶ 运行'}
          </button>
        </div>
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
          <div className="relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)] px-4 pb-8 pt-6 min-h-[200px]">
            <div className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full bg-white/35 blur-2xl" />

            <div className="relative flex flex-wrap items-end gap-4 h-[120px]">
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-orange-400 text-sm font-black text-white shadow-[0_16px_30px_rgba(251,146,60,0.3)] transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(${characterPosition}px)` }}
                data-testid="stage-character-main"
              >
                {mainLabel}

                {characterMessage && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-[1rem] bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-lg whitespace-nowrap">
                    {characterMessage}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
                  </div>
                )}
              </div>

              {secondLabel ? (
                <div className="flex flex-col items-center gap-2 transition-opacity duration-300 opacity-70">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-white shadow-[0_16px_30px_rgba(52,211,153,0.22)]">
                    {secondLabel}
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-bold text-emerald-700">
                    舞台伙伴
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-5 h-6 rounded-full bg-[linear-gradient(90deg,#ffdd94_0%,#ffeec1_100%)] opacity-80" />

            {executionState === 'error' && (
              <div className="mt-4 rounded-[1.25rem] bg-red-100 px-4 py-3 text-sm font-bold text-red-700 border border-red-200">
                ⚠️ 积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。
              </div>
            )}

            {executionState === 'success' && (
              <div className="mt-4 rounded-[1.25rem] bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-700 border border-emerald-200">
                🎉 太棒了！运行成功！点击&quot;完成这一步&quot;继续。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
