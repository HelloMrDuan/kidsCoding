import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { isDesignedMistakeRun, type MistakeStepDesign } from '@/content/curriculum/mistake-steps'
import { isPracticeAnswered, type PracticeStepDesign } from '@/content/curriculum/practice-steps'
import type { ProjectTemplateDefinition } from '@/features/domain/types'
import { ResetIcon } from '@/features/ui/reset-icon'
import { evaluateObservable, type JudgeOptions, type ProgramBlock, type RunFailureCode } from '../blockly/observable-run'
import { motionVerbForTemplate, motionWord } from '../blockly/block-labels'
import { explainRunFailure } from '../blockly/run-feedback'

import { CharacterArt, SceneBackdrop, type SceneId } from './character-art'
import { useBlockExecutor, type ProgramJudge } from './use-block-executor'

/**
 * TQ-009: steps are story distance, not pixels. 200 steps (the longest walk in lessons 01–09)
 * is “arrived”: the walker stops right BESIDE the friend at every viewport, never on top of it.
 * Longer (wrong) programs still report their real step count but stay beside the friend.
 */
export const STAGE_ARRIVAL_STEPS = 200

export function stageWalkProgress(steps: number) {
  if (!Number.isFinite(steps) || steps <= 0) return 0
  return Math.min(steps, STAGE_ARRIVAL_STEPS) / STAGE_ARRIVAL_STEPS
}

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
  // TQ-009: this stage starts in the forest; a “草地舞台” badge over a forest scene confused kids.
  meadow: {
    badge: '旅行舞台',
    note: '先在森林出发，再把故事带到草地。',
  },
  garden: {
    badge: '花园舞台',
    note: '点一下蝴蝶，看看它会不会立刻回应你。',
  },
  'forest-stage': {
    badge: '毕业舞台',
    note: '让两个朋友按顺序上场，再一起完成故事。',
  },
}

/** TQ-008: name used in kid-facing failure reasons (“小狐狸还没开口呢！”). */
export function getMainCharacterLabel(template?: ProjectTemplateDefinition) {
  const first = template?.starterCharacters[0]
  return first ? CHARACTER_LABELS[first] ?? '小狐狸' : '小狐狸'
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
          note: '先把这一关做出来，再看舞台会发生什么变化。',
        }
      : {
          badge: '故事舞台',
          note: '先把这一关做出来，再看舞台会发生什么变化。',
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
  onRunFailure,
  judgeOptions,
  mistake,
  mistakeObserved = false,
  mistakeAnswer = null,
  onMistakeAnswer,
  onReloadMistake,
  practice,
  practiceAnswer = null,
  onPracticeAnswer,
  askClickPrediction,
  judge,
  successMessage,
}: {
  blocks: ProgramBlock[]
  template?: ProjectTemplateDefinition
  requiredBlocks: string[]
  stepIndex: number
  onRunSuccess: () => void
  onRunClear?: () => void
  /**
   * TQ-008: a run failed; the kid-friendly reason comes from the judge result.
   * TQ-010: `designedMistake` marks the designed wrong run of a mistake step (the experiment,
   * not a failed attempt).
   */
  onRunFailure?: (failure: { code: RunFailureCode | null; message: string; designedMistake?: boolean }) => void
  judgeOptions?: JudgeOptions
  /** TQ-010: this step is the lesson's designed mistake → observe → fix step. */
  mistake?: MistakeStepDesign
  /** TQ-010: the designed wrong program was run and its failure seen on stage. */
  mistakeObserved?: boolean
  /** TQ-010: the child's answer to “what did you see?”. */
  mistakeAnswer?: string | null
  onMistakeAnswer?: (choiceId: string) => void
  /** TQ-010: put the designed wrong program back on the workspace. */
  onReloadMistake?: () => void
  /** TQ-011: this step is the lesson's second practice (a goal different from the main build). */
  practice?: PracticeStepDesign
  /** TQ-011: the child's guess (predict) or comparison answer (compare). */
  practiceAnswer?: string | null
  onPracticeAnswer?: (choiceId: string) => void
  /**
   * TQ-011: ask the garden “先猜一猜” before starting a click program. Defaults to every click
   * step; the classroom asks it only where it teaches something (lesson-07 main + mistake).
   */
  askClickPrediction?: boolean
  /** TQ-012: custom judge (unit projects accept several programs); replaces evaluateObservable. */
  judge?: ProgramJudge
  /** TQ-012: success copy outside the classroom (no “完成这一关” button there). */
  successMessage?: string
}) {
  const {
    executionState,
    characterPosition,
    characterMessage,
    partnerPosition,
    partnerMessage,
    activeActor,
    actorActions,
    actionLog,
    stageScene,
    errorMessage,
    run,
    reset,
    clickCharacter,
  } = useBlockExecutor(blocks, requiredBlocks, stepIndex, false, judgeOptions, judge)

  const { mainLabel, secondLabel, sceneCopy } = getTemplateCharacterLabels(template)
  // TQ-008: the same judge the executor used, explained for a 5–7 year old.
  const verdict = useMemo(() => (judge ? judge(blocks) : evaluateObservable(requiredBlocks, blocks, judgeOptions)), [requiredBlocks, blocks, judgeOptions, judge])
  const failureCode = verdict.passed ? null : verdict.code
  // TQ-009: the butterfly flies (“飞”), the fox walks (“走”) — feedback and the distance chip follow the stage.
  const motionVerb = motionVerbForTemplate(template?.id)
  const kidReason = (verdict.passed ? '' : explainRunFailure(verdict, getMainCharacterLabel(template), motionVerb)) || errorMessage || '再看看积木的顺序吧！'
  // Each press of “运行” is one attempt; a failed attempt is reported exactly once,
  // even when two failures in a row leave executionState at 'error'.
  const [attemptId, setAttemptId] = useState(0)
  const reportedAttemptRef = useRef(-1)
  const clickLesson=requiredBlocks[0]==='when_clicked'
  const askPrediction = askClickPrediction ?? clickLesson
  const [prediction,setPrediction]=useState<'automatic'|'needs-click'|null>(null)
  // TQ-011: second practice. predict = guess before running; compare = answer after a successful run.
  const practicePick = practice?.choices.find((choice) => choice.id === practiceAnswer)
  const practiceGuessNeeded = practice?.mode === 'predict' && !practicePick
  const practiceQuestionVisible = practice ? practice.mode === 'predict' || executionState === 'success' || Boolean(practicePick) : false
  const practiceDone = Boolean(practice && executionState === 'success' && isPracticeAnswered(practice, practiceAnswer))
  const practiceLocked = practice?.mode === 'predict' && executionState !== 'idle' && executionState !== 'error'
  const visualScene=stageScene==='meadow'?'草地':template?.starterScene==='garden'?'花园':'森林'
  const sceneId: SceneId = stageScene==='meadow'?'meadow':template?.starterScene==='garden'?'garden':'forest'
  const mainId = template?.starterCharacters[0] ?? 'fox'
  const pickedChoice = mistake?.choices.find((choice) => choice.id === mistakeAnswer)
  const mistakeAnswered = Boolean(pickedChoice?.correct)
  // TQ-010: decided when “运行” is pressed (the verdict depends only on the blocks), so the
  // designed wrong run never shows the failure-style “哎呀” box — the mistake panel explains it.
  const [designedRun, setDesignedRun] = useState(false)
  const secondId = template?.starterCharacters[1]

  useEffect(() => {
    if (executionState === 'success') {
      onRunSuccess()
    }
  }, [executionState, onRunSuccess])

  useEffect(() => {
    if (executionState !== 'error' || reportedAttemptRef.current === attemptId) return
    reportedAttemptRef.current = attemptId
    onRunFailure?.(mistake ? { code: failureCode, message: kidReason, designedMistake: designedRun } : { code: failureCode, message: kidReason })
  }, [executionState, attemptId, onRunFailure, failureCode, kidReason, mistake, designedRun])

  function handleRun() {
    setAttemptId((id) => id + 1)
    setDesignedRun(isDesignedMistakeRun(mistake, failureCode, mistakeObserved))
    void run()
  }

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
      data-active-actor={activeActor}
    >
      <div className="kc-stage-scene" data-scene={sceneId}>
        <SceneBackdrop scene={sceneId} />
        <div className="kc-stage-topline">
          <span className="kc-stage-badge">{sceneCopy.badge}</span>
          <span className="flex flex-wrap justify-end gap-1.5">
            <span data-testid="stage-current-scene" className="kc-stage-scene-chip">当前实际场景：{visualScene}</span>
            {/* TQ-009: copy says “走/飞 100 步”, so the stage shows the distance actually moved. */}
            <span data-testid="stage-walked-distance" className="kc-stage-scene-chip">{mainLabel}已{motionWord(motionVerb)} {characterPosition} 步</span>
            {/* UX-204: the friend's position is observable too, even when it stays put. */}
            {secondLabel ? (
              <span data-testid="stage-friend-distance" className="kc-stage-scene-chip">{secondLabel}已{motionWord(motionVerb)} {partnerPosition} 步</span>
            ) : null}
          </span>
        </div>

        <div className="kc-stage-actors">
          <button type="button" aria-label={clickLesson?'点击蝴蝶触发积木程序':mainLabel}
            disabled={executionState!=='armed'} onClick={()=>void clickCharacter()}
            className="kc-stage-actor kc-stage-actor-main"
            style={{ '--kc-walk': stageWalkProgress(characterPosition) } as CSSProperties}
            data-steps={characterPosition}
            data-action={actorActions.main}
            data-testid="stage-character-main"
          >
            <CharacterArt id={mainId} className="kc-stage-actor-art" />
            <span className="kc-stage-nametag">{mainLabel}</span>
            <span data-testid="stage-main-action" className="text-xs font-semibold text-slate-600">
              {actorActions.main === 'moving' ? '正在移动' : actorActions.main === 'speaking' ? '正在说话' : activeActor === 'main' ? '正在操作' : '等待指令'}
            </span>

            {characterMessage && (
              <span className="kc-stage-speech">
                {characterMessage}
              </span>
            )}
          </button>

          {secondLabel ? (
            <div className="kc-stage-actor kc-stage-actor-friend"
              data-steps={partnerPosition}
              data-action={actorActions.partner}
              data-testid="stage-character-friend"
            >
              <CharacterArt id={secondId} className="kc-stage-actor-art" />
              <span className="kc-stage-nametag">{secondLabel}</span>
              <span data-testid="stage-friend-action" className="text-xs font-semibold text-slate-600">
                {actorActions.partner === 'moving' ? '正在移动' : actorActions.partner === 'speaking' ? '正在说话' : activeActor === 'partner' ? '正在操作' : '等待指令'}
              </span>

              {partnerMessage && (
                <span className="kc-stage-speech">
                  {partnerMessage}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="kc-stage-panel space-y-3">
      {askPrediction ? (
        <div data-testid="garden-prediction" className="rounded-[8px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-950">先猜一猜：只按“启动点击程序”，没有点蝴蝶，它会自己飞起来吗？</p>
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
              {/* TQ-010: in the mistake step the guess was about the wrong “开始时” program, so it is not graded here. */}
              {mistake && mistake.wrongProgram[0]?.type === 'when_start'
                ? '你亲眼看到了：用“开始时”，蝴蝶自己就飞；换成“被点击时”，它会等你点。'
                : prediction==='needs-click'?'你预测对了：点击事件发生后，积木才开始执行。':'观察到了吗？只有点击蝴蝶后程序才执行，再想想“被点击时”的意义。'}
            </p>
          ) : null}
        </div>
      ) : null}
      {practice ? (
        <div data-testid="practice-task" data-goal-type={practice.goalType} data-mode={practice.mode} className="kc-practice-task">
          <p className="kc-practice-title">🎯 {practice.title}</p>
          <p data-testid="practice-setup" className="mt-1">{practice.setup}</p>
          {practiceQuestionVisible ? (
            <div className="mt-2">
              <p className="font-bold" id="practice-question-label" data-testid="practice-question">
                {practice.mode === 'predict' ? '先猜一猜：' : '比一比：'}{practice.question}
              </p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="practice-question-label">
                {practice.choices.map((choice) => (
                  <button key={choice.id} type="button" data-testid={`practice-answer-${choice.id}`}
                    aria-pressed={practiceAnswer === choice.id} disabled={practiceLocked}
                    className={`kc-practice-choice ${practiceAnswer === choice.id ? 'kc-practice-choice-on' : ''}`}
                    onClick={() => onPracticeAnswer?.(choice.id)}>{choice.label}</button>
                ))}
              </div>
              {practicePick ? (
                <p data-testid="practice-answer-reply" className="mt-2 font-semibold">
                  {practice.mode === 'predict' && executionState !== 'success' ? '猜好啦！现在让程序动起来，看看你猜得对不对。' : practicePick.reply}
                </p>
              ) : null}
            </div>
          ) : null}
          {practiceGuessNeeded ? (
            <p data-testid="practice-need-guess" className="mt-2 text-sm font-semibold">👆 先选一个你的猜测，运行按钮就会亮起来。</p>
          ) : null}
          {practiceDone ? <p data-testid="practice-done" className="mt-2 font-bold text-emerald-800">✅ {practice.done}</p> : null}
        </div>
      ) : null}
      {mistake ? (
        <div data-testid="mistake-task" data-observed={String(mistakeObserved)} className="kc-mistake-task">
          <p className="kc-mistake-title">🔍 {mistake.title}</p>
          {!mistakeObserved ? (
            <p data-testid="mistake-setup" className="mt-1">{mistake.setup}</p>
          ) : (
            <div data-testid="mistake-observed" className="mt-2">
              <p className="font-bold" id="mistake-question-label" data-testid="mistake-question">你看到了：{mistake.question}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="mistake-question-label">
                {mistake.choices.map((choice) => (
                  <button key={choice.id} type="button" data-testid={`mistake-answer-${choice.id}`}
                    aria-pressed={mistakeAnswer === choice.id}
                    className={`kc-mistake-choice ${mistakeAnswer === choice.id ? 'kc-mistake-choice-on' : ''}`}
                    onClick={() => onMistakeAnswer?.(choice.id)}>{choice.label}</button>
                ))}
              </div>
              {pickedChoice ? <p data-testid="mistake-answer-reply" className="mt-2 font-semibold">{pickedChoice.reply}</p> : null}
              {mistakeAnswered ? <p data-testid="mistake-fix" className="mt-2">🛠 {mistake.fix}</p> : null}
            </div>
          )}
          {mistakeObserved && mistakeAnswered && executionState === 'success' ? (
            <p data-testid="mistake-fixed" className="mt-2 font-bold text-emerald-800">✅ {mistake.done}</p>
          ) : null}
          {onReloadMistake ? (
            <button type="button" data-testid="mistake-reload" className="kc-action-surface kc-btn-outline kc-btn-sm mt-2"
              disabled={executionState === 'running'} onClick={onReloadMistake}><ResetIcon size={13} />再摆一次错误程序</button>
          ) : null}
        </div>
      ) : null}
        <div aria-live="polite">
            {executionState==='armed' ? (
              <div data-testid="garden-await-click" className="kc-feedback">
                程序已准备，但蝴蝶还没动。现在请亲自点击舞台上的蝴蝶！
              </div>
            ):null}
            {executionState === 'error' && mistake && designedRun ? (
              <div className="kc-feedback" data-failure-code={failureCode ?? undefined} data-testid="mistake-run-result">
                {mistakeAnswered ? '👍 你看懂啦！照上面 🛠 的办法修好程序，再运行一次。' : '🔍 这就是错误程序运行的样子。看看舞台，回答上面的问题吧！'}
              </div>
            ) : executionState === 'error' ? (
              <div className="kc-feedback kc-feedback-error" data-failure-code={failureCode ?? undefined} data-testid="stage-run-error">
                <p className="kc-feedback-title">🤔 哎呀，差一点点！</p>
                <p className="mt-1" data-testid="stage-run-reason">{kidReason}</p>
              </div>
            ) : null}

            {executionState === 'success' && (practice && !practiceDone ? (
              <div className="kc-feedback" data-testid="practice-need-answer">
                运行成功了！先回答上面的问题：{practice.question}
              </div>
            ) : mistake && !(mistakeObserved && mistakeAnswered) ? (
              <div className="kc-feedback" data-testid="mistake-need-observe">
                {mistakeObserved ? '运行成功了！先回答上面的问题：你看到了什么？' : '运行成功了！不过这一关要先看看错误程序会怎样。点“再摆一次错误程序”，运行看看。'}
              </div>
            ) : (
              <div className="kc-feedback kc-feedback-success">
                {successMessage ?? '🎉 太棒了！运行成功！点击“完成这一关”继续。'}
              </div>
            ))}
          {/* UX-204: running is not idle — the ready copy must not show mid-run. */}
          {executionState === 'running' ? (
            <div className="kc-feedback">运行中，看看角色怎么做。</div>
          ) : executionState !== 'error' && executionState !== 'success' && executionState !== 'armed' ? (
            <div className="kc-feedback">{clickLesson ? '准备就绪。先按「启动点击程序」，再点一下蝴蝶。' : '准备就绪。点击「运行」观察角色动作与对白。'}</div>
          ) : null}
        </div>
        {/* UX-204: the run log makes each executed block observable — a repeat
            shows as its own line instead of hiding inside the step total. */}
        {actionLog.length > 0 ? (
          <ol data-testid="stage-action-log" className="space-y-1 text-sm text-slate-700">
            {actionLog.map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        ) : null}
        <div className="kc-run-actions">
          <button
            type="button"
            className="kc-action-surface disabled:opacity-50"
            onClick={handleRun}
            disabled={executionState === 'running' || executionState === 'armed' || (askPrediction && prediction===null) || practiceGuessNeeded}
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
            <ResetIcon />
            重置
          </button>
        </div>
      </div>
    </section>
  )
}
