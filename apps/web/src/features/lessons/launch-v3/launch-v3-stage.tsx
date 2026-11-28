/**
 * OPS-056：启蒙课 V3 舞台插槽（LaunchStageSlot，按课程 ID 参数化）。
 *
 * 与 OPS-041 ForestStageSlot 同一分工：舞台不跑自己的执行器、不产生第二份运行状态与判定。
 * - 执行快照取自路由 context 的 LaunchRunAdapter（getExecutionSnapshot），经
 *   launchExternalState 映射为 PlayableStage external 字段（含伙伴位置 / 对白 / 当前角色 / 场景）。
 * - 适配器每帧 notify：本插槽订阅后强制重渲染，舞台随播放逐帧更新。
 * - 错误实验、预测回答、双角色课的预测与复盘经会话 store 读写。
 * - 点击课（L07–L09）：外壳运行后适配器 armed，孩子点角色才播放（onExternalCharacterClick）。
 * - 双角色课（L10–L12）：不复用 DuoStage 组件（它自带 useBlockExecutor，会产生第二个运行
 *   与判定来源），只复用其标记（data-testid）、文案与 duo-stage.module.css 样式，
 *   活动块（预测 / 错误实验 / 复盘）、礼物、对白板按旧课堂 DuoStage 原样渲染。
 * - key 按关重挂：切关时舞台内部状态（预测、attempt）全新开始。
 */
'use client'

import { useEffect, useReducer } from 'react'

import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { asksClickPrediction, getPracticeStepFor } from '@/content/curriculum/practice-steps'
import { getKidsBlockLabel, quoteBlock } from '@/features/lessons/blockly/block-labels'
import { getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'
import styles from '@/features/lessons/playable-stage/duo-stage.module.css'
import { PlayableStage } from '@/features/lessons/playable-stage/playable-stage'
import type { StageSlotProps } from '@/features/lessons/workspace/workspace-slots'

import { launchV3Steps } from './launch-v3-contract'
import { launchStarterProgram } from './launch-v3-draft'
import { getLaunchV3Template, launchV3DuoMode } from './launch-v3-lessons'
import { launchExternalState, type LaunchExecutionSnapshot } from './launch-v3-run-adapter'
import {
  useLaunchSession,
  useLaunchSessionState,
  type LaunchDuoPrediction,
  type LaunchDuoReflection,
} from './launch-v3-session'

/** 适配器变化即重渲染（快照每次返回新对象，不适合直接做 useSyncExternalStore 快照）。 */
function useAdapterTick(adapter: { subscribe: (listener: () => void) => () => void }) {
  const [, force] = useReducer((count: number) => count + 1, 0)
  useEffect(() => adapter.subscribe(force), [adapter])
}

export function LaunchStageSlot({ lessonId, sceneActions }: StageSlotProps) {
  const { lessonId: sessionLessonId, store, runAdapter } = useLaunchSession()
  const sessionState = useLaunchSessionState()
  const draft = sessionState.draft
  const id = sessionLessonId || lessonId

  useAdapterTick(runAdapter)

  // OPS-045 纵深防御（同 forest-hello）：切关时清理上一关的运行快照。
  useEffect(() => {
    runAdapter.reset()
  }, [runAdapter, draft.stepIndex])

  const steps = launchV3Steps(id)
  if (steps.length === 0) return null
  const stepIndex = Math.min(Math.max(draft.stepIndex, 0), steps.length - 1)
  const step = steps[stepIndex]
  const stepId = step.id
  const blocks = draft.programs[stepId] ?? launchStarterProgram(id, stepId)
  const template = getLaunchV3Template(id)
  const mistakeStep = getMistakeStep(id, stepId)
  const practiceStep = getPracticeStepFor(id, step)
  const snapshot = runAdapter.getExecutionSnapshot()
  const duoMode = launchV3DuoMode(id)

  function handleMistakeAnswer(choiceId: string) {
    store.setState({ mistakeAnswers: { ...store.getState().mistakeAnswers, [stepId]: choiceId } })
  }

  function handlePracticeAnswer(choiceId: string) {
    store.setState({ practiceAnswers: { ...store.getState().practiceAnswers, [stepId]: choiceId } })
  }

  function handleReloadMistake() {
    if (!mistakeStep) return
    // 只重铺错误程序：观察标记不动（与旧课堂 handleReloadMistake 一致）。
    const wrong = mistakeStep.wrongProgram.map((block) => ({ ...block }))
    const current = store.getState().draft
    store.setState({ draft: { ...current, programs: { ...current.programs, [stepId]: wrong } } })
  }

  return (
    <div data-testid="launch-v3-stage" data-lesson-id={id}>
      <PlayableStage
        key={`${id}:${stepIndex}`}
        blocks={blocks}
        template={template}
        requiredBlocks={step.requiredBlockTypes}
        stepIndex={stepIndex}
        judgeOptions={getStepJudgeOptions(id, stepId)}
        onRunSuccess={() => {}}
        onRunClear={() => {}}
        onRunFailure={() => {}}
        mistake={mistakeStep}
        mistakeObserved={sessionState.observed.includes(stepId)}
        mistakeAnswer={sessionState.mistakeAnswers[stepId] ?? null}
        onMistakeAnswer={handleMistakeAnswer}
        onReloadMistake={mistakeStep ? handleReloadMistake : undefined}
        practice={practiceStep}
        practiceAnswer={sessionState.practiceAnswers[stepId] ?? null}
        onPracticeAnswer={handlePracticeAnswer}
        askClickPrediction={asksClickPrediction(id, stepId)}
        clickPrediction={sessionState.clickPredictions[stepId] ?? null}
        onClickPrediction={(value) =>
          store.setState({ clickPredictions: { ...store.getState().clickPredictions, [stepId]: value } })
        }
        runControls="external"
        sceneActions={sceneActions}
        externalState={launchExternalState(snapshot)}
        onExternalCharacterClick={() => {
          runAdapter.clickCharacter()
        }}
      />
      {duoMode && (
        <LaunchDuoPanel
          key={`${id}:duo:${stepIndex}`}
          mode={duoMode}
          stepIndex={stepIndex}
          snapshot={snapshot}
          observedMistake={sessionState.observed.includes(stepId)}
          prediction={sessionState.duoPredictions[stepId] ?? null}
          reflection={sessionState.duoReflections[stepId] ?? null}
          onPredict={(value) =>
            store.setState({ duoPredictions: { ...store.getState().duoPredictions, [stepId]: value } })
          }
          onReflect={(value) =>
            store.setState({ duoReflections: { ...store.getState().duoReflections, [stepId]: value } })
          }
        />
      )}
    </div>
  )
}

/**
 * 双角色课活动块：标记、文案、样式原样取自旧课堂 DuoStage（第 1 关预测、第 4 关错误实验、
 * 第 5 关复盘、毕业礼物、对白记录板）；状态来自会话 store 与适配器快照，不自带执行器。
 */
function LaunchDuoPanel({
  mode,
  stepIndex,
  snapshot,
  observedMistake,
  prediction,
  reflection,
  onPredict,
  onReflect,
}: {
  mode: 'independent' | 'dialogue' | 'graduation'
  stepIndex: number
  snapshot: LaunchExecutionSnapshot
  observedMistake: boolean
  prediction: LaunchDuoPrediction | null
  reflection: LaunchDuoReflection | null
  onPredict: (value: LaunchDuoPrediction) => void
  onReflect: (value: LaunchDuoReflection) => void
}) {
  const graduation = mode === 'graduation'
  const dialogue = mode === 'dialogue'
  const frame = snapshot.frame
  const showsActivity = stepIndex === 0 || stepIndex === 3 || stepIndex === 4 || graduation || dialogue
  if (!showsActivity) {
    // 复审 HOLD P1：旧课堂 DuoStage 在工具栏始终显示“当前操作”，没有活动的关也要保留角色反馈。
    return (
      <section className={styles.stage} data-testid="launch-v3-duo-actor" aria-label="当前操作的角色">
        <p data-testid="duo-active-actor">当前操作：<strong>{frame.activeActor === 'partner' ? '小熊' : '小狐狸'}</strong></p>
      </section>
    )
  }
  return (
    <section className={styles.stage} data-testid="launch-v3-duo-panel" aria-label="双角色课堂活动">
      <p data-testid="duo-active-actor">当前操作：<strong>{frame.activeActor === 'partner' ? '小熊' : '小狐狸'}</strong></p>
      {stepIndex === 0 && (
        <div className={styles.activity}>
          <p>小狐狸和小熊都在各自的 <strong>0 步起点</strong>。{graduation ? '狐狸在 100 步守住路标，小熊要走到 200 步寻找礼物。两个目标都到位才找到礼物。' : dialogue ? '今天排练出发：各走 100 步后，只有小熊说“我们一起出发吧！”。' : '它们要分别走到 100 步的野餐旗。'}</p>
          <p>先猜一猜：切换到小熊后，下一块{graduation ? `移动后的${quoteBlock('repeat_twice')}会让谁再走 100 步？` : dialogue ? '“说一句话”会让谁说话？' : `${quoteBlock('move_right')}会让谁走？`}</p>
          <div className={styles.buttons}>
            <button type="button" data-testid="duo-predict-bear" aria-pressed={prediction === 'bear'} onClick={() => onPredict('bear')}>只有小熊</button>
            <button type="button" data-testid="duo-predict-both" aria-pressed={prediction === 'both'} onClick={() => onPredict('both')}>两个一起</button>
          </div>
          {prediction ? <p role="status">记住你的预测，接下来亲自运行验证。猜错也可以继续实验。</p> : <p>先选一个预测，再按运行。</p>}
        </div>
      )}
      {stepIndex === 3 && (
        <div className={styles.activity} data-testid="duo-debug-task" data-observed={String(observedMistake)}>
          <strong>{graduation ? '实验：小熊少走一次' : dialogue ? '实验：故意把对白交错朋友' : '实验：故意漏掉切换'}</strong>
          <p>{graduation ? '清空重拼：开始 → 狐狸移动 → 切换 → 小熊移动。亲自运行，观察礼物为什么没有出现。再给小熊补一次移动。' : dialogue ? '清空重拼：开始 → 移动 → 说话 → 切换 → 移动。亲自运行，观察是谁开口。再把说话移到切换之后。' : `清空积木，亲自拼“开始时 → ${getKidsBlockLabel('move_right')} → ${getKidsBlockLabel('move_right')}”并运行。观察小熊，再修好程序。`}</p>
          <p>{observedMistake ? graduation ? '已观察：狐狸 100 步，小熊只有 100 步，礼物尚未找到。给小熊补上 100 步，再试一次。' : dialogue ? '已观察：两位朋友各走了 100 步，但狐狸开口，小熊没有目标对白。现在把说话交给小熊。' : '已观察：小狐狸走了 200 步，小熊仍在 0 步。现在把切换补在两次移动中间。' : '这一关需要先观察真实错误结果，再修复。'}</p>
        </div>
      )}
      {graduation && (
        <div className={styles.gift} data-testid="graduation-gift" data-found={String(snapshot.giftFound)}>
          <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M8 26h44v28H8z" fill="#dfa848"/><path d="M5 19h50v12H5z" fill="#efc56e"/><path d="M26 19h8v35h-8z" fill="#497459"/><path d="M30 19C8 17 15 2 25 10l5 9c22-2 15-17 5-9z" fill="none" stroke="#497459" strokeWidth="4"/></svg>
          <div><strong>{snapshot.giftFound ? '礼物已找到！' : '礼物等待两位朋友到位'}</strong><p>{snapshot.giftFound ? '已验证：狐狸 100 步、小熊 200 步。重跑会重新寻找；重置会收起礼物。' : '狐狸 100 步，小熊 200 步，两个都到才有礼物。'}</p></div>
        </div>
      )}
      {dialogue && (
        <div className={styles.dialogueBoard} data-testid="duo-dialogue-board" aria-label="角色对白记录">
          <p><strong>小狐狸说：</strong><span data-testid="duo-fox-speech-record">{frame.mainMessage || '还没有说话'}</span></p>
          <p><strong>小熊说：</strong><span data-testid="duo-bear-speech-record">{frame.partnerMessage || '还没有说话'}</span></p>
          <small>{stepIndex >= 2 ? '本关目标：小熊说“我们一起出发吧！”；作品关卡可另加狐狸问候。' : '本关先观察或移动，两个对白都留空。'}</small>
        </div>
      )}
      {stepIndex === 4 && (
        <div className={styles.activity}>
          <strong>{graduation ? '我的毕业寻宝作品' : dialogue ? '我的出发排练作品' : '我的野餐作品'}</strong>
          <p>{graduation ? `选一种方案：小熊移动后接${quoteBlock('repeat_twice')}，或给小熊接两块移动。还可以给狐狸加问候、给小熊加庆祝话。保持狐狸 100 步、小熊 200 步，再运行验证。` : dialogue ? '保留小熊的出发对白，也可以在切换前给狐狸另加“你好！”。两位朋友各走 100 步，目标对白仍由小熊说。' : '你可以保留两位朋友各走 100 步，也可以在切换前给小狐狸加一句问候。两种作品都能过关。'}</p>
          <p>想一想：为什么{graduation ? '小熊再做一次时，狐狸仍停在 100 步？' : dialogue ? '小熊说话时，狐狸不会跟着说？' : '两位朋友不会一起移动？'}</p>
          <div className={styles.buttons}>
            <button type="button" data-testid="duo-reflect-own" aria-pressed={reflection === 'own'} onClick={() => onReflect('own')}>动作只给当前角色</button>
            <button type="button" data-testid="duo-reflect-together" aria-pressed={reflection === 'together'} onClick={() => onReflect('together')}>{dialogue ? '说话会让所有角色开口' : '移动会让所有角色走'}</button>
          </div>
          {reflection && <p data-testid="duo-reflection">{reflection === 'own' ? dialogue ? '对！两个角色各有自己的对白，切换决定后面的说话交给谁。' : '对！两个角色各有自己的位置，切换只改变后面动作的目标。' : dialogue ? '再看对白记录：小熊开口时，狐狸的对白不会改变。说话只给当前角色。' : '再观察两条轨道：第一块移动时，小熊还在原地。移动只给当前角色。'}</p>}
          <p>完成后记录本机作品；当前编辑草稿只保留在本浏览器会话。这里是编程练习，不是认证成绩。</p>
        </div>
      )}
    </section>
  )
}

/** 双角色课本关能否过关（与旧课堂 DuoStage 的 ready 条件一致，运行成功另由适配器判定）。 */
export function launchDuoStepReady(
  stepIndex: number,
  state: { prediction: LaunchDuoPrediction | null; observedMistake: boolean; reflection: LaunchDuoReflection | null },
): boolean {
  return (
    (stepIndex !== 0 || state.prediction !== null) &&
    (stepIndex !== 3 || state.observedMistake) &&
    (stepIndex !== 4 || state.reflection === 'own')
  )
}
