/**
 * G1-U1-L01 课堂判定（纯函数，与组件分离）。
 *
 * 从 features/lessons/story/story-lab.tsx 一字不动移出：
 * judgeStoryProgram / mainStoryProgram / 常量 / 类型 / resolveSayText。
 * 原样复用第一阶段执行器 examples/blockly/g1/dialogue_executor.py 的
 * 判定语义，不得另发明一套：
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
 *
 * 新增 buildStoryJudgment：只做三层呈现，不改判定语义。映射定义（首席
 * 裁定 Q2，按此执行）：
 * - stage.passed = foxPosition > 0（舞台真实发生了移动）；detail 恒写狐狸
 *   位置与气泡状态。
 * - task.passed = result.passed。
 * - knowledge.passed = 开场对白被正确使用（greetingDone 且失败码不在
 *   {wrong_actor, wrong_text, say_after_move}）。
 * - conclusion passed = task && knowledge（与 result.passed 一致）。
 * 已知与设计文档 §4.5 表格的偏差（供首席复核）：move_only 的 stage 为通
 * 过（狐狸确实移动到 100，但没说话）；say_after_move 的 stage 为通过
 * （狐狸先移动到 100 再说话）；unknown_block 若发生在开场对白之后，
 * knowledge 为通过（开场对白已被正确使用，失败在后面的未知积木）。
 */
import { STORY_SAY_CHOICES } from '@/content/curriculum/g1-u1-story-lessons'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import type { JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

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

/**
 * 从帧序列推导开场对白是否被正确使用：存在一帧“狐狸在位置 0 说出开场句”。
 * judgeStoryProgram 不导出 greetingDone，故在此从帧反推（与判定循环的三个
 * 开场检查一一对应：错人时说话人不是狐狸、错文本时文本不是开场句、先移动
 * 后说时狐狸位置不为 0）。
 */
export function greetingDoneFromFrames(frames: StoryFrame[]): boolean {
  return frames.some(
    (frame) =>
      frame.kind === 'say' &&
      frame.actor === 'fox' &&
      frame.text === STORY_OPENING_TEXT &&
      frame.foxPosition === 0,
  )
}

const KNOWLEDGE_FAILURE_TEXT: Record<string, string> = {
  wrong_actor: '开场对白给了别人，必须属于狐狸。',
  wrong_text: '开场对白不是“欢迎来到森林剧场”。',
  say_after_move: '狐狸先移动后说话，对白必须在移动之前。',
}

/** 由一次判定结果构建三层判定（只做分层呈现，不改判定语义）。 */
export function buildStoryJudgment(result: StoryJudgeResult): JudgmentResult {
  const greetingDone = greetingDoneFromFrames(result.frames)
  const stagePassed = result.foxPosition > 0
  const lastSay = [...result.frames].reverse().find((frame) => frame.kind === 'say')
  const stageDetail = lastSay?.text
    ? `舞台结果：狐狸位置 ${result.foxPosition}，气泡“${lastSay.text}”。`
    : `舞台结果：狐狸位置 ${result.foxPosition}，气泡空着，狐狸还没说话。`
  const taskPassed = result.passed
  const taskDetail = taskPassed
    ? `任务判定：通过。${result.message}`
    : `任务判定：未通过。${result.message}`
  const knowledgePassed =
    greetingDone &&
    result.failure !== 'wrong_actor' &&
    result.failure !== 'wrong_text' &&
    result.failure !== 'say_after_move'
  const knowledgeDetail = knowledgePassed
    ? `知识证据：通过。开场对白“${STORY_OPENING_TEXT}”属于狐狸，在开始事件后、移动前说出。`
    : `知识证据：未通过。${KNOWLEDGE_FAILURE_TEXT[result.failure ?? ''] ?? '狐狸没有说出开场对白。'}`
  const passed = taskPassed && knowledgePassed
  const methodEvidence = `方法证据：开场对白：${greetingDone ? STORY_OPENING_TEXT : '无'}；移动后狐狸位置：${result.foxPosition}；帧数：${result.frames.length}。`
  return {
    layers: [
      { id: 'stage', label: '舞台结果', passed: stagePassed, detail: stageDetail },
      { id: 'task', label: '任务判定', passed: taskPassed, detail: taskDetail },
      { id: 'knowledge', label: '知识证据', passed: knowledgePassed, detail: knowledgeDetail },
    ],
    passed,
    conclusion: passed
      ? `结论：已完成。${result.message}${result.hasExtension ? '还多了一段移动后的提问对白，拓展也做到了！' : ''}`
      : `结论：未合格。${result.message}`,
    methodEvidence,
  }
}
