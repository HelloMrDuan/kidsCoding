'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

import { STORY_SAY_CHOICES, type StoryLesson } from '@/content/curriculum/g1-u1-story-lessons'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { GuidedLessonShell, type LessonLocalSaveState } from '@/features/lessons/guided-lesson-shell'
import { CharacterArt } from '@/features/lessons/playable-stage/character-art'

const BlocklyWorkspace = dynamic(
  () => import('@/features/lessons/blockly/blockly-workspace').then((m) => m.BlocklyWorkspace),
  { ssr: false },
)

/**
 * G1-U1-L01 课堂判定。原样复用第一阶段执行器
 * examples/blockly/g1/dialogue_executor.py 的判定语义，不得另发明一套：
 * - 首积木必须是开始事件；程序为空、超过 20 块、首块不是开始事件均为失败。
 * - 开场对白：狐狸说恰好“欢迎来到森林剧场”，且在任何移动之前。
 * - 打招呼后至少移动一次（执行器：打招呼后的任何移动都算；课堂沿用此口径）。
 * - 只有移动没有对白 = 失败；开场对白非狐狸 = 失败“对白给错人”。
 * - 移动后的追加对白（拓展提问）不破坏通过。
 *
 * 实现选择（与执行器一致，已在执行器注释中声明，绝不冒充详细稿值）：
 * - 一次移动 = 100（详细稿只要求“再移动”，不规定步数）。
 * - 最多 20 块。
 * - 课堂映射：Blockly 没有按积木选说话人的字段，switch_character 积木把当前
 *   说话人在狐狸与观众之间切换一次；say_line / move_right 作用于当前说话人。
 *   执行器里 switch_character 本身只记日志、说话人与移动人由积木字段决定，
 *   课堂用“当前说话人”模型渲染同一语义：规范程序（开始、狐狸开场、狐狸移动）
 *   在两种模型下结论完全一致。
 */
export const STORY_OPENING_TEXT = '欢迎来到森林剧场'
export const STORY_MOVE_STEP = 100
export const STORY_MAX_BLOCKS = 20

export type StoryFailure =
  | 'missing_start'
  | 'wrong_actor'
  | 'wrong_text'
  | 'say_after_move'
  | 'move_only'
  | 'missing_move'
  | 'too_many'
  | 'unknown_block'

export type StoryFrame = {
  kind: 'say' | 'move' | 'switch'
  actor: 'fox' | 'audience'
  text?: string
  foxPosition: number
  audiencePosition: number
}

export type StoryJudgeResult = {
  passed: boolean
  failure: StoryFailure | null
  message: string
  log: string[]
  foxPosition: number
  audiencePosition: number
  hasExtension: boolean
  frames: StoryFrame[]
}

type SayChoice = { readonly id: string; readonly text: string }

function resolveSayText(line: string | undefined, choices: readonly SayChoice[]): string {
  if (!line) return ''
  const byId = choices.find((choice) => choice.id === line)
  if (byId) return byId.text
  return line
}

function actorLabel(actor: 'fox' | 'audience'): string {
  return actor === 'fox' ? '狐狸' : '观众'
}

function fail(
  failure: StoryFailure,
  message: string,
  partial: Pick<StoryJudgeResult, 'log' | 'foxPosition' | 'audiencePosition' | 'hasExtension' | 'frames'>,
): StoryJudgeResult {
  return { passed: false, failure, message, ...partial }
}

/** 主程序：工作区第一叠积木；disconnected 标记的散块不计入运行。 */
export function mainStoryProgram(blocks: ProgramBlock[]): ProgramBlock[] {
  const main: ProgramBlock[] = []
  for (const block of blocks) {
    if (block.disconnected && main.length > 0) break
    main.push(block)
  }
  return main
}

export function judgeStoryProgram(
  blocks: ProgramBlock[],
  choices: readonly SayChoice[] = STORY_SAY_CHOICES,
): StoryJudgeResult {
  const empty: Pick<StoryJudgeResult, 'log' | 'foxPosition' | 'audiencePosition' | 'hasExtension' | 'frames'> = {
    log: [],
    foxPosition: 0,
    audiencePosition: 0,
    hasExtension: false,
    frames: [],
  }
  const main = mainStoryProgram(blocks)
  if (main.length === 0) return fail('missing_start', '程序为空：缺少开始事件', empty)
  if (main.length > STORY_MAX_BLOCKS) return fail('too_many', '程序过长：超过20个积木', empty)
  if (main[0].type !== 'when_start') return fail('missing_start', '缺少开始事件：第一个积木必须是开始事件', empty)

  let actor: 'fox' | 'audience' = 'fox'
  const positions = { fox: 0, audience: 0 }
  let greetingDone = false
  let movedAfterGreeting = false
  let movedAny = false
  let seenSay = false
  let hasExtension = false
  const log: string[] = []
  const frames: StoryFrame[] = []
  const snapshot = (): Pick<StoryJudgeResult, 'log' | 'foxPosition' | 'audiencePosition' | 'hasExtension' | 'frames'> => ({
    log: [...log],
    foxPosition: positions.fox,
    audiencePosition: positions.audience,
    hasExtension,
    frames: [...frames],
  })

  for (const block of main.slice(1)) {
    if (block.type === 'say_line') {
      seenSay = true
      const text = resolveSayText(block.line, choices)
      if (movedAny) hasExtension = true
      if (actor !== 'fox' && !greetingDone) {
        frames.push({ kind: 'say', actor, text, foxPosition: positions.fox, audiencePosition: positions.audience })
        return fail('wrong_actor', '对白给错人：开场对白必须属于狐狸', snapshot())
      }
      if (actor !== 'fox') {
        log.push(`${actorLabel(actor)}说：${text}`)
        frames.push({ kind: 'say', actor, text, foxPosition: positions.fox, audiencePosition: positions.audience })
        continue
      }
      if (!greetingDone && positions.fox !== 0) {
        frames.push({ kind: 'say', actor, text, foxPosition: positions.fox, audiencePosition: positions.audience })
        return fail('say_after_move', '先打招呼再移动：对白必须在移动之前', snapshot())
      }
      if (!greetingDone) {
        if (text !== STORY_OPENING_TEXT) {
          frames.push({ kind: 'say', actor, text, foxPosition: positions.fox, audiencePosition: positions.audience })
          return fail('wrong_text', '开场对白不是欢迎来到森林剧场', snapshot())
        }
        greetingDone = true
        log.push(`狐狸说：${text}`)
      } else {
        log.push(`狐狸说：${text}`)
      }
      frames.push({ kind: 'say', actor, text, foxPosition: positions.fox, audiencePosition: positions.audience })
    } else if (block.type === 'move_right') {
      positions[actor] += STORY_MOVE_STEP
      movedAny = true
      if (greetingDone) movedAfterGreeting = true
      log.push(`${actorLabel(actor)}移动到${positions[actor]}`)
      frames.push({ kind: 'move', actor, foxPosition: positions.fox, audiencePosition: positions.audience })
    } else if (block.type === 'switch_character') {
      actor = actor === 'fox' ? 'audience' : 'fox'
      log.push('切换角色')
      frames.push({ kind: 'switch', actor, foxPosition: positions.fox, audiencePosition: positions.audience })
    } else {
      return fail('unknown_block', `不支持的积木类型：${block.type}`, snapshot())
    }
  }

  if (!seenSay || !greetingDone) {
    return fail('move_only', '只有移动没有对白时不能算完成', snapshot())
  }
  if (!movedAfterGreeting) {
    return fail('missing_move', '点击开始后狐狸先打招呼再移动：缺少移动', snapshot())
  }
  return {
    passed: true,
    failure: null,
    message: '完成「给狐狸一个开场」：点击开始后狐狸先打招呼再移动。',
    log,
    foxPosition: positions.fox,
    audiencePosition: positions.audience,
    hasExtension,
    frames,
  }
}

export function storyDraftKey(lessonId: string): string {
  return `kids-story-lesson-v1:${lessonId}`
}

type StoryDraft = {
  stepIndex: number
  programs: Record<string, ProgramBlock[]>
  passed: string[]
  mistakes: string[]
  observed: string[]
  reflection?: number
  /** Review-stage completion: thinking stages never run, so “finished” is its own saved flag, not a run pass. */
  finished?: boolean
  savedAt: string | null
}

function parseStoryDraft(lesson: StoryLesson, raw: string | null): StoryDraft | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoryDraft>
    if (typeof parsed.stepIndex !== 'number' || typeof parsed.programs !== 'object' || !parsed.programs) return null
    const programs: Record<string, ProgramBlock[]> = {}
    for (const step of lesson.steps) {
      const program = (parsed.programs as Record<string, unknown>)[step.id]
      programs[step.id] = Array.isArray(program) ? (program as ProgramBlock[]) : (step.starterBlocks ?? [])
    }
    return {
      stepIndex: Math.min(Math.max(parsed.stepIndex, 0), lesson.steps.length - 1),
      programs,
      passed: Array.isArray(parsed.passed) ? parsed.passed.filter((id) => lesson.steps.some((s) => s.id === id)) : [],
      mistakes: Array.isArray(parsed.mistakes) ? (parsed.mistakes as string[]) : [],
      observed: Array.isArray(parsed.observed) ? parsed.observed.filter((id) => lesson.steps.some((s) => s.id === id)) : [],
      reflection: typeof parsed.reflection === 'number' ? parsed.reflection : undefined,
      finished: parsed.finished === true,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
    }
  } catch {
    return null
  }
}

/**
 * G1-U1-L01 完整课堂：V2 三区壳 + 真实 Blockly 工作区 + 狐狸舞台。
 * 狐狸形象复用 playable-stage/character-art 的已有狐狸美术，绝不用纯色圆块
 * 或文字块冒充卡通角色。保存只写本机 localStorage（新键，不复用 grid 的键），
 * 云端状态如实标 local-only，页面不写“已同步到云端”。
 */
export function StoryLab({ lesson }: { lesson: StoryLesson }) {
  const [draft, setDraft] = useState<StoryDraft>({
    stepIndex: 0,
    programs: Object.fromEntries(lesson.steps.map((s) => [s.id, s.starterBlocks ?? []])),
    passed: [],
    mistakes: [],
    observed: [],
    savedAt: null,
  })
  const [hydrated, setHydrated] = useState(false)
  const [resumedFrom, setResumedFrom] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<LessonLocalSaveState>('unsaved')
  const [result, setResult] = useState<StoryJudgeResult | null>(null)
  const [failures, setFailures] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [guess, setGuess] = useState<number | null>(null)
  const [playIndex, setPlayIndex] = useState(-1)

  const step = lesson.steps[Math.min(draft.stepIndex, lesson.steps.length - 1)]
  const blocks: ProgramBlock[] = draft.programs[step.id] ?? step.starterBlocks ?? []
  const passedHere = draft.passed.includes(step.id)
  const observedHere = !step.errorLab || draft.observed.includes(step.id)
  const playing = playIndex >= 0 && result !== null && playIndex < result.frames.length - 1
  const currentFrame = result && playIndex >= 0 ? result.frames[playIndex] : null
  const displayFoxPosition = currentFrame ? currentFrame.foxPosition : result ? result.foxPosition : 0
  const displayBubble = currentFrame?.kind === 'say' ? currentFrame.text ?? '' : result && playIndex >= 0 && result.frames.slice(0, playIndex + 1).reverse().find((f) => f.kind === 'say')?.text
  const displaySpeaker = currentFrame?.kind === 'say' ? currentFrame.actor : result && playIndex >= 0 ? result.frames.slice(0, playIndex + 1).reverse().find((f) => f.kind === 'say')?.actor : undefined

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = parseStoryDraft(lesson, window.localStorage.getItem(storyDraftKey(lesson.id)))
        if (saved) {
          setDraft(saved)
          if (saved.stepIndex > 0 || saved.passed.length) setResumedFrom(saved.stepIndex)
          setFinished(saved.finished === true)
          setSaveState('saved')
        }
      } catch { /* storage blocked: the lesson still works */ }
      setHydrated(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [lesson])

  useEffect(() => {
    if (!playing || !result) return
    const timer = window.setTimeout(() => setPlayIndex((i) => i + 1), 450)
    return () => window.clearTimeout(timer)
  }, [playing, playIndex, result])

  const persist = useCallback((next: StoryDraft) => {
    setDraft(next)
    try {
      window.localStorage.setItem(storyDraftKey(lesson.id), JSON.stringify({ ...next, savedAt: new Date().toISOString() }))
      setSaveState('saved')
    } catch {
      setSaveState('failed')
    }
  }, [lesson.id])

  const handleSnapshot = useCallback((next: ProgramBlock[]) => {
    if (!hydrated) return
    setDraft((prev) => {
      const key = lesson.steps[Math.min(prev.stepIndex, lesson.steps.length - 1)].id
      if (JSON.stringify(prev.programs[key] ?? null) === JSON.stringify(next)) return prev
      const updated = { ...prev, programs: { ...prev.programs, [key]: next } }
      try {
        window.localStorage.setItem(storyDraftKey(lesson.id), JSON.stringify({ ...updated, savedAt: new Date().toISOString() }))
        setSaveState('saved')
      } catch { setSaveState('failed') }
      return updated
    })
    setResult(null)
    setPlayIndex(-1)
    setNotice(null)
  }, [hydrated, lesson])

  function handleRun() {
    const verdict = judgeStoryProgram(blocks)
    setResult(verdict)
    setPlayIndex(verdict.frames.length > 0 ? 0 : -1)
    setNotice(null)
    if (verdict.passed) {
      if (step.errorLab && !observedHere) {
        setNotice('程序成功了！不过这是错误实验：先按原样运行一次，看看错在哪，再来修。')
        return
      }
      if (!passedHere) persist({ ...draft, passed: [...draft.passed, step.id] })
    } else {
      setFailures((n) => n + 1)
      const seen = step.errorLab && verdict.failure === 'move_only' && !observedHere
      const mistakes = draft.mistakes.includes(verdict.failure!) ? draft.mistakes : [...draft.mistakes, verdict.failure!]
      persist({
        ...draft,
        mistakes,
        ...(seen ? { observed: [...draft.observed, step.id] } : {}),
      })
    }
  }

  function handleReset() {
    setResult(null)
    setPlayIndex(-1)
    setNotice(null)
  }

  function restoreStarter() {
    setResult(null)
    setPlayIndex(-1)
    setNotice(null)
    persist({ ...draft, programs: { ...draft.programs, [step.id]: step.starterBlocks ?? [] } })
  }

  function goToStep(index: number) {
    setResult(null)
    setPlayIndex(-1)
    setGuess(null)
    setFailures(0)
    setNotice(null)
    persist({ ...draft, stepIndex: index, finished: false })
  }

  function handleComplete() {
    if (step.kind === 'guided' || step.kind === 'design' || step.kind === 'review') {
      if (draft.stepIndex < lesson.steps.length - 1) goToStep(draft.stepIndex + 1)
      else {
        persist({ ...draft, finished: true })
        setFinished(true)
      }
      return
    }
    if (step.errorLab && !observedHere) {
      setNotice('这是错误实验：先按原样运行一次，亲眼看看错在哪，再修好它。')
      return
    }
    if (!passedHere) {
      setNotice('先按“运行”，让狐狸真的先打招呼再移动，才能完成这一关。')
      return
    }
    if (draft.stepIndex < lesson.steps.length - 1) goToStep(draft.stepIndex + 1)
    else setFinished(true)
  }

  const hintLayer = failures === 0 ? -1 : Math.min(failures - 1, 2)
  const hintCopy = hintLayer >= 0 ? `（第 ${hintLayer + 1} 层）${step.hints[hintLayer]}` : undefined

  const feedback = useMemo(() => {
    if (notice) return { tone: 'warning' as const, text: notice }
    if (!result) return { tone: 'idle' as const, text: passedHere ? '这一关已经通过。可以再试一种不同的程序，或者点“完成这一关”。' : '想好了就按“运行”，看看狐狸会不会先打招呼再移动。' }
    if (playing) return { tone: 'idle' as const, text: '狐狸正在按积木一块一块演……' }
    if (result.passed) {
      const extensionNote = result.hasExtension ? '还多了一段移动后的提问对白，拓展也做到了！' : ''
      const guessNote = ''
      return { tone: 'success' as const, text: `🎉 ${guessNote}${result.message}${extensionNote}` }
    }
    if (step.errorLab && result.failure === 'move_only' && observedHere) {
      return { tone: 'error' as const, text: `预想：${step.errorLab.expected} 实际：${step.errorLab.actual} 现在把它修好吧。` }
    }
    return { tone: 'error' as const, text: result.message }
  }, [notice, result, playing, passedHere, step, observedHere])

  const guessPicked = guess === null ? null : step.predictChoices?.[guess]
  const guessNote = guessPicked
    ? guessPicked.when === 'pass'
      ? `你猜“${guessPicked.text}”。`
      : `你猜“${guessPicked.text}”。`
    : ''

  if (finished) {
    return (
      <section className="kc-lesson-shell p-6" data-testid="story-lesson-finished">
        <div className="kc-feedback kc-feedback-success">
          <p className="kc-feedback-title">🎉 {lesson.title}：{lesson.steps.length} 关全部真的跑通了！</p>
          <p className="mt-2 kc-text-muted">给家长：{lesson.parentQuestion}</p>
          <p className="mt-2 kc-text-muted">这是实验课，成绩只保存在本机，不是正式课程成绩。</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {lesson.steps.map((s, i) => (
            <button key={s.id} type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" data-testid={`story-replay-${s.id}`}
              onClick={() => { setFinished(false); goToStep(i) }}>再玩：{s.title}</button>
          ))}
          <Link className="kc-action-surface kc-btn-sm" href={`/learn/catalog/${lesson.id}`}>回到课程介绍</Link>
        </div>
      </section>
    )
  }

  return (
    <GuidedLessonShell
      completionPreview={`给狐狸一个开场：用积木亲手走完 ${lesson.steps.length} 关，包括一关修好只有移动的错误程序。`}
      codeSlot={
        hydrated ? (
          <BlocklyWorkspace
            key={step.id}
            allowedBlocks={step.allowedBlocks}
            blocks={blocks}
            enableProgramTools
            snapStartOnTop
            sayLineChoices={STORY_SAY_CHOICES}
            onSnapshotChange={handleSnapshot}
          />
        ) : null
      }
      feedback={undefined}
      hintCopy={hintCopy}
      instruction={step.instruction}
      isLocked={false}
      lessonGoal={lesson.objectives.join('；')}
      lessonTitle={lesson.title}
      localSaveState={saveState}
      cloudSyncState="local-only"
      onCompleteStep={handleComplete}
      onStartRemedial={() => {}}
      resumedFromStep={resumedFrom}
      stageSlot={
        <section className="flex flex-1 flex-col" data-testid="story-lab-stage">
          <div className="kc-stage-panel pb-0">
            <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950" data-testid="story-predict">
              <span className="flex-1">🤔 {step.predict}</span>
              {step.predictChoices ? (
                <div className="grid w-full gap-2 sm:grid-cols-2" data-testid="story-predict-choices">
                  {step.predictChoices.map((choice, i) => (
                    <button key={choice.text} type="button" className="kc-reflect-option" data-testid={`story-predict-choice-${i}`}
                      data-chosen={guess === i ? 'true' : 'false'} aria-pressed={guess === i} onClick={() => setGuess(i)}>{choice.text}</button>
                  ))}
                </div>
              ) : null}
              {guessPicked ? <p className="w-full text-xs font-normal">{guessNote}运行后对照一下，猜错也没关系。</p> : null}
            </div>
            {step.creative ? (
              <div className="mt-3 rounded-[8px] border border-sky-200 bg-sky-50 p-3 text-sm font-bold text-sky-950" data-testid="story-creative">
                <p>🎤 {step.creative.prompt}</p>
              </div>
            ) : null}
          </div>
          <div className="kc-stage-panel">
            <div className="relative overflow-hidden rounded-[12px] border border-[#e7edf5] bg-[#f3f6fb] p-4" data-testid="story-stage">
              <p className="text-xs font-bold text-[#6f7d92]">森林剧场 · 舞台</p>
              <div className="relative mt-2 h-[170px]">
                <div
                  className="absolute bottom-0 left-2 w-[110px] transition-transform duration-300"
                  style={{ transform: `translateX(${Math.min(displayFoxPosition, 220)}px)` }}
                  data-testid="story-fox"
                  data-fox-position={displayFoxPosition}
                  data-speaker={displaySpeaker ?? ''}
                >
                  <CharacterArt id="fox" className="h-[130px] w-[110px]" />
                  <p className="text-center text-xs font-bold">狐狸主持人</p>
                </div>
                {displayBubble ? (
                  <div className="absolute left-2 top-0 max-w-[70%] rounded-[12px] border border-[#e7edf5] bg-white px-3 py-2 text-sm font-bold shadow-sm" data-testid="story-bubble">
                    {displaySpeaker === 'audience' ? '观众说：' : '狐狸说：'}{displayBubble}
                  </div>
                ) : (
                  <div className="absolute left-2 top-0 rounded-[12px] border border-dashed border-[#e7edf5] bg-white/70 px-3 py-2 text-sm text-[#6f7d92]" data-testid="story-bubble-empty">
                    狐狸还没说话……
                  </div>
                )}
              </div>
              {result ? (
                <ol className="mt-2 space-y-1 text-xs text-[#18243a]" data-testid="story-run-log">
                  {result.log.map((line, i) => <li key={i}>{line}</li>)}
                </ol>
              ) : null}
            </div>
          </div>
          <div className="kc-stage-panel space-y-3 pt-0">
            <div aria-live="polite" data-testid="story-feedback" data-tone={feedback.tone}
              className={`kc-feedback ${feedback.tone === 'success' ? 'kc-feedback-success' : feedback.tone === 'error' ? 'kc-feedback-error' : feedback.tone === 'warning' ? 'kc-feedback-warning' : ''}`}>
              <span>{feedback.text}</span>
            </div>
            <div className="kc-run-actions flex-wrap">
              <button type="button" className="kc-action-surface disabled:opacity-50" data-testid="story-run" disabled={playing} onClick={handleRun}>
                {playing ? '演出中…' : '▶ 运行'}
              </button>
              <button type="button" className="kc-action-surface kc-btn-outline" data-testid="story-reset" disabled={playing} onClick={handleReset}>回到起点</button>
              {step.errorLab && !observedHere && JSON.stringify(blocks) !== JSON.stringify(step.starterBlocks ?? []) ? (
                <button type="button" className="kc-action-surface kc-btn-outline" data-testid="story-restore-starter" onClick={restoreStarter}>换回原来的错误程序</button>
              ) : null}
              {failures > 0 && hintLayer < 2 ? (
                <button type="button" className="kc-action-surface kc-btn-outline" data-testid="story-more-hint" onClick={() => setFailures((n) => n + 1)}>再给点提示</button>
              ) : null}
            </div>
            {step.kind === 'review' ? (
              <div data-testid="story-reflection">
                <p className="text-sm font-bold">💭 想一想：{lesson.reflection.question}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {lesson.reflection.options.map((option, i) => (
                    <button key={option.text} type="button" className="kc-reflect-option" data-testid={`story-reflection-option-${i}`}
                      data-chosen={draft.reflection === i ? 'true' : 'false'} data-correct={option.correct ? 'true' : 'false'}
                      onClick={() => persist({ ...draft, reflection: i })}>{option.text}</button>
                  ))}
                </div>
                {draft.reflection !== undefined ? (
                  <p className="mt-2 text-sm" data-testid="story-reflection-result" data-correct={lesson.reflection.options[draft.reflection].correct ? 'true' : 'false'}>
                    {lesson.reflection.why}
                  </p>
                ) : null}
                <p className="mt-3 text-sm kc-text-muted">给家长：{lesson.parentQuestion}</p>
              </div>
            ) : null}
          </div>
        </section>
      }
      stepCount={lesson.steps.length}
      stepIndex={draft.stepIndex}
      stepTitle={`第 ${draft.stepIndex + 1} 关：${step.title}`}
      voiceover={undefined}
    />
  )
}
