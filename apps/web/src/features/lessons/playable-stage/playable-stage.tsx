import { useEffect, useState } from 'react'

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
    stageScene,
    partnerPosition,
    partnerMessage,
    activeActor,
    actionLog,
    run,
    reset,
    clickCharacter,
  } = useBlockExecutor(blocks, requiredBlocks, stepIndex,template?.id==='forest-graduation-show')

  const { mainLabel, secondLabel, sceneCopy } = getTemplateCharacterLabels(template)
  const duoLesson=template?.id==='forest-graduation-show'
  const giftCollected=duoLesson&&characterPosition>=100&&partnerPosition>=200
  const clickLesson=requiredBlocks[0]==='when_clicked'
  const [prediction,setPrediction]=useState<'automatic'|'needs-click'|null>(null)
  const visualScene=stageScene==='meadow'?'草地':template?.starterScene==='garden'?'花园':'森林'

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
      {clickLesson ? (
        <div data-testid="garden-prediction" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-950">先猜一猜：只点“运行”，没有点蝴蝶，它会自己飞起来吗？</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" data-testid="garden-predict-auto" aria-pressed={prediction==='automatic'}
              className={`rounded-full border px-4 py-2 text-sm font-bold ${prediction==='automatic'?'bg-amber-600 text-white':'bg-white text-amber-950'}`}
              onClick={()=>setPrediction('automatic')}>会，马上飞</button>
            <button type="button" data-testid="garden-predict-click" aria-pressed={prediction==='needs-click'}
              className={`rounded-full border px-4 py-2 text-sm font-bold ${prediction==='needs-click'?'bg-amber-600 text-white':'bg-white text-amber-950'}`}
              onClick={()=>setPrediction('needs-click')}>不会，要点蝴蝶</button>
          </div>
          {executionState==='success' && prediction ? (
            <p data-testid="garden-reflection" className="mt-3 text-sm font-semibold text-amber-900">
              {prediction==='needs-click'?'你预测对了：点击事件发生后，积木才开始执行。':'观察到了吗？只有点击蝴蝶后程序才执行，再想想“被点击时”的意义。'}
            </p>
          ) : null}
        </div>
      ) : null}
      {duoLesson ? (
        <div className="mb-5 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-950">
          <p className="font-black">双角色任务：先控制第一位朋友，再用“切换到另一位朋友”让第二位执行后续积木。</p>
          <p className="mt-2">观察两位朋友的坐标分别变化，而不是两个角色一起跟着走。</p>
        </div>
      ) : null}
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
            disabled={executionState === 'running' || executionState === 'armed' || (clickLesson && prediction===null)}
            data-testid="run-code-button"
          >
            {executionState === 'armed' ? '等待点击蝴蝶…' : executionState === 'running' ? '运行中...' : clickLesson?'▶ 启动点击程序':'▶ 运行'}
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
          <span data-testid="stage-current-scene" className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">当前实际场景：{visualScene}</span>
        </div>

        <div className={`mt-6 rounded-[1.75rem] px-5 pb-6 pt-8 shadow-[0_20px_36px_rgba(125,211,252,0.18)] ${stageScene === "meadow" ? "bg-[linear-gradient(180deg,#8ed6ae_0%,#d5f5b4_60%,#fff4bc_100%)]" : template?.starterScene === 'garden' ? "bg-[linear-gradient(180deg,#ffe9fa_0%,#def8de_58%,#fff5c9_100%)]" : "bg-[linear-gradient(180deg,#84d2ff_0%,#daf4ff_58%,#f8f2e7_100%)]"}`}>
          <div className="relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)] px-4 pb-8 pt-6 min-h-[200px]">
            <div className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full bg-white/35 blur-2xl" />

            <div className="relative flex flex-wrap items-end gap-4 h-[120px]">
              <button type="button" aria-label={clickLesson?'点击蝴蝶触发积木程序':mainLabel}
                disabled={!clickLesson||executionState!=='armed'} onClick={()=>void clickCharacter()}
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
              </button>

              {secondLabel ? (
                <div className="relative flex flex-col items-center gap-2 transition-transform duration-500"
                  style={{transform: `translateX(${partnerPosition}px)`}}
                  data-testid="stage-character-partner">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-white shadow-[0_16px_30px_rgba(52,211,153,0.22)]">
                    {secondLabel}
                    {partnerMessage && (
                      <div data-testid="stage-partner-speech" className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-lg">{partnerMessage}</div>
                    )}
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-bold text-emerald-700">
                    {duoLesson?(activeActor==='partner'?'正在编程的角色':'等待加入'):'舞台伙伴'}
                  </span>
                </div>
              ) : null}
            </div>

            {duoLesson ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span data-testid="stage-main-distance" className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700">第一位：{characterPosition} 步</span>
                <span data-testid="stage-partner-distance" className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700">第二位：{partnerPosition} 步</span>
                <span data-testid="stage-gift-status" className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">{giftCollected?'🎁 已找到毕业礼物':'🎁 礼物等待伙伴一起完成旅程'}</span>
              </div>
            ):null}
            <div className="mt-5 h-6 rounded-full bg-[linear-gradient(90deg,#ffdd94_0%,#ffeec1_100%)] opacity-80" />
            {duoLesson&&actionLog.length>0 ? (
              <ol data-testid="stage-duo-actions" className="mt-3 list-inside list-decimal rounded-2xl bg-white/85 p-3 text-xs text-slate-700">
                {actionLog.map((item,index)=><li key={index}>{item}</li>)}
              </ol>
            ):null}

            {clickLesson && executionState==='armed' ? (
              <div data-testid="garden-await-click" className="mt-4 rounded-2xl bg-indigo-100 p-3 text-sm font-bold text-indigo-900">
                程序已准备，但蝴蝶还没动。现在请亲自点击舞台上的蝴蝶！
              </div>
            ):null}
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
