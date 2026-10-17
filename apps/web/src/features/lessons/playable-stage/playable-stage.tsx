import { useEffect, useState } from 'react'

import type { ProjectTemplateDefinition } from '@/features/domain/types'

import { CharacterArt, SceneBackdrop, type SceneId } from './character-art'
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
    run,
    reset,
    clickCharacter,
  } = useBlockExecutor(blocks, requiredBlocks, stepIndex)

  const { mainLabel, secondLabel, sceneCopy } = getTemplateCharacterLabels(template)
  const clickLesson=requiredBlocks[0]==='when_clicked'
  const [prediction,setPrediction]=useState<'automatic'|'needs-click'|null>(null)
  const visualScene=stageScene==='meadow'?'草地':template?.starterScene==='garden'?'花园':'森林'
  const sceneId: SceneId = stageScene==='meadow'?'meadow':template?.starterScene==='garden'?'garden':'forest'
  const mainId = template?.starterCharacters[0] ?? 'fox'
  const secondId = template?.starterCharacters[1]

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
      className="flex flex-1 flex-col"
      data-testid="lesson-playable-stage"
    >
      <div className="kc-stage-scene" data-scene={sceneId}>
        <SceneBackdrop scene={sceneId} />
        <div className="kc-stage-topline">
          <span className="kc-stage-badge">{sceneCopy.badge}</span>
          <span data-testid="stage-current-scene" className="kc-stage-scene-chip">当前实际场景：{visualScene}</span>
        </div>

        <div className="kc-stage-actors">
          <button type="button" aria-label={clickLesson?'点击蝴蝶触发积木程序':mainLabel}
            disabled={!clickLesson||executionState!=='armed'} onClick={()=>void clickCharacter()}
            className="kc-stage-actor kc-stage-actor-main"
            style={{ transform: `translateX(${characterPosition}px)` }}
            data-testid="stage-character-main"
          >
            <CharacterArt id={mainId} className="kc-stage-actor-art" />
            <span className="kc-stage-nametag">{mainLabel}</span>

            {characterMessage && (
              <span className="kc-stage-speech">
                {characterMessage}
              </span>
            )}
          </button>

          {secondLabel ? (
            <div className="kc-stage-actor kc-stage-actor-friend">
              <CharacterArt id={secondId} className="kc-stage-actor-art" />
              <span className="kc-stage-nametag">{secondLabel}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="kc-stage-panel space-y-3">
      {clickLesson ? (
        <div data-testid="garden-prediction" className="rounded-[8px] border border-amber-200 bg-amber-50 p-4">
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
        <div aria-live="polite">
            {clickLesson && executionState==='armed' ? (
              <div data-testid="garden-await-click" className="kc-feedback">
                程序已准备，但蝴蝶还没动。现在请亲自点击舞台上的蝴蝶！
              </div>
            ):null}
            {executionState === 'error' && (
              <div className="kc-feedback kc-feedback-error">
                ⚠️ 积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。
              </div>
            )}

            {executionState === 'success' && (
              <div className="kc-feedback kc-feedback-success">
                🎉 太棒了！运行成功！点击&quot;完成这一步&quot;继续。
              </div>
            )}
          {executionState !== 'error' && executionState !== 'success' && !(clickLesson && executionState==='armed') ? (
            <div className="kc-feedback">准备就绪。点击「运行」观察角色动作与对白。</div>
          ) : null}
        </div>
        <div className="kc-run-actions">
          <button
            type="button"
            className="kc-action-surface disabled:opacity-50"
            onClick={run}
            disabled={executionState === 'running' || executionState === 'armed' || (clickLesson && prediction===null)}
            data-testid="run-code-button"
          >
            {executionState === 'armed' ? '等待点击蝴蝶…' : executionState === 'running' ? '运行中...' : clickLesson?'▶ 启动点击程序':'▶ 运行'}
          </button>
          <button
            type="button"
            className="kc-action-surface kc-btn-outline"
            onClick={handleReset}
            disabled={executionState === 'running'}
            data-testid="reset-code-button"
          >
            ↺ 重置
          </button>
        </div>
      </div>
    </section>
  )
}
