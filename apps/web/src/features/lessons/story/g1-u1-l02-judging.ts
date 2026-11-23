/**
 * G1-U1-L02 轮流说话判定（纯函数，与组件分离）。
 *
 * 复用第一阶段执行器 turn_taking_executor.py
 * （~/workspace/g1-u1-l02/turn_taking_executor.py）的判定语义，不得另发明一套：
 * - 首积木必须是开始事件；程序为空、超过 20 块、首块不是开始事件均为失败。
 * - 严格前缀：前两句必须恰好是必修序列（狐狸“你好” → 兔子“很高兴见到你”）。
 * - 两句同时说（say_together）造成重叠 = 失败。
 * - 顺序颠倒 = 失败；两句之后追加第三句台词（拓展）不破坏通过。
 *
 * 模型差异（与 #273 执行器不同，已记录在案）：
 * - 执行器里每块 say_line 自带 actor 字段（积木自己决定说话人）；
 *   switch_character 本身只记日志。
 * - Web 端共享 ProgramBlock 没有 actor 字段（见
 *   features/lessons/blockly/program-tree.ts），故课堂沿用 L01 的
 *   switch_character 当前说话人模型：初始说话人是狐狸，say_line 作用于
 *   当前说话人，switch_character 把当前说话人在狐狸与兔子之间切换一次。
 *   规范程序（开始、狐狸说“你好”、切换、兔子说“很高兴见到你”）在两种
 *   模型下结论完全一致；错误程序（顺序颠倒、缺一次切换）在两种模型下
 *   也都失败，失败码按本文件的 9 种码位报告。
 * - say_together：Web 端没有这个积木（Blockly 未注册该类型），判定函数
 *   内仍保留该分支（overlap 码位），供 errorLab 设计与第二阶段使用；
 *   本阶段不为它写 E2E 级覆盖。
 *
 * 期望对白不由本文件硬编码：judgeTurnTakingProgram(blocks, expected?)
 * 的期望序列由调用方注入（第二阶段由 contract 注入）；缺省时取课程
 * 数据文件 g1-u1-story-lessons.ts 的 L02_REQUIRED_LINES（教学数据，
 * 与 STORY_SAY_CHOICES 同一地位）。单测用自带夹具注入期望序列，
 * 证明判定逻辑跟随注入值、不写死标准答案。
 *
 * 判定口径（严格前缀，按此顺序裁决）：
 * 1. 输入畸形（非数组、积木缺 type、line 非字符串、期望序列非法）
 *    → invalid_program，永不抛错。
 * 2. 主程序为空 → missing_start；超过 20 块 → too_many；
 *    首块不是开始事件 → missing_start。
 * 3. 行走中遇到 say_together → overlap；遇到未知积木 → unknown_block。
 * 4. 走完后按说出的话裁决：没有对白 → missing_line；
 *    前两句恰好是必修序列的两两对调 → reversed_order；
 *    否则逐句比对前缀：第 i 句说话人不对 → wrong_actor，
 *    说话人对但文本不对 → wrong_text，前缀对但缺后句 → missing_line。
 * 5. 前缀全对即通过；第三句起只要是已选台词（非空文本）即
 *    hasExtension=true；第三句是 say_together 仍失败（见第 3 条）。
 *
 * 新增 buildTurnTakingJudgment：只做三层呈现，不改判定语义。映射定义：
 * - stage.passed = 两句气泡按序在舞台出现（帧序列中狐狸说期望第一句
 *   在前、兔子说期望第二句在后）；detail 恒写依次听到的话。
 * - task.passed = result.passed。
 * - knowledge.passed = 顺序 + 文本 + 分开说三者皆对（stage 通过，且
 *   失败码不在 {wrong_actor, wrong_text, reversed_order, overlap}）。
 * - conclusion passed = task && knowledge。
 * 已知与 L01 的偏差（与 L01 的 unknown_block 偏差同类，供首席复核）：
 * unknown_block 若发生在两句必修对白之后，knowledge 为通过（两句
 * 对白已被正确使用，失败在后面的未知积木）。
 */
import { L02_REQUIRED_LINES, L02_SAY_CHOICES } from '@/content/curriculum/g1-u1-story-lessons'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import type { JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

export const TURN_TAKING_MAX_BLOCKS = 20

export type TurnTakingActor = 'fox' | 'rabbit'

export type TurnTakingFailure =
  | 'missing_start'
  | 'missing_line'
  | 'wrong_actor'
  | 'wrong_text'
  | 'reversed_order'
  | 'overlap'
  | 'too_many'
  | 'unknown_block'
  | 'invalid_program'

export type TurnTakingLine = {
  actor: TurnTakingActor
  text: string
}

export type TurnTakingExpectedLine = {
  readonly actor: TurnTakingActor
  readonly text: string
}

export type TurnTakingFrame = {
  kind: 'say' | 'switch'
  actor: TurnTakingActor
  text?: string
  foxPosition: number
  rabbitPosition: number
}

export type TurnTakingJudgeResult = {
  passed: boolean
  failure: TurnTakingFailure | null
  message: string
  log: string[]
  hasExtension: boolean
  lines: TurnTakingLine[]
  frames: TurnTakingFrame[]
  expected: readonly TurnTakingExpectedLine[]
}

type SayChoice = { readonly id: string; readonly text: string }

function resolveSayText(line: string | undefined, choices: readonly SayChoice[]): string {
  if (!line) return ''
  const byId = choices.find((choice) => choice.id === line)
  if (byId) return byId.text
  return line
}

function actorLabel(actor: TurnTakingActor): string {
  return actor === 'fox' ? '狐狸' : '兔子'
}

function isValidBlock(value: unknown): value is ProgramBlock {
  if (!value || typeof value !== 'object') return false
  const block = value as Partial<ProgramBlock>
  if (typeof block.type !== 'string') return false
  if (block.line !== undefined && typeof block.line !== 'string') return false
  if (block.disconnected !== undefined && typeof block.disconnected !== 'boolean') return false
  if (block.times !== undefined && typeof block.times !== 'number') return false
  if (block.body !== undefined && !Array.isArray(block.body)) return false
  return true
}

function isValidExpected(value: unknown): value is readonly TurnTakingExpectedLine[] {
  if (!Array.isArray(value) || value.length === 0) return false
  return value.every(
    (line) =>
      line !== null &&
      typeof line === 'object' &&
      ((line as TurnTakingExpectedLine).actor === 'fox' || (line as TurnTakingExpectedLine).actor === 'rabbit') &&
      typeof (line as TurnTakingExpectedLine).text === 'string' &&
      (line as TurnTakingExpectedLine).text.length > 0,
  )
}

function fail(
  failure: TurnTakingFailure,
  message: string,
  partial: Pick<TurnTakingJudgeResult, 'log' | 'hasExtension' | 'lines' | 'frames' | 'expected'>,
): TurnTakingJudgeResult {
  return { passed: false, failure, message, ...partial }
}

/** 主程序：工作区第一叠积木；disconnected 标记的散块不计入运行。 */
export function mainTurnTakingProgram(blocks: unknown): ProgramBlock[] {
  if (!Array.isArray(blocks)) return []
  const main: ProgramBlock[] = []
  for (const block of blocks) {
    if (!isValidBlock(block)) continue
    if (block.disconnected && main.length > 0) break
    main.push(block)
  }
  return main
}

/**
 * 把程序归一化为说出的话：按当前说话人追踪，say_line 产生一句
 * {actor, text}，switch_character 切换当前说话人。
 * 只处理给定的数组本身（不截第一叠，调用方先取主程序）；未知积木与
 * say_together 不产生单句（say_together 由 judgeTurnTakingProgram
 * 直接判 overlap）；畸形项跳过，永不抛错。
 */
export function normalizeTurnTakingLines(
  blocks: unknown,
  choices: readonly SayChoice[] = L02_SAY_CHOICES,
): TurnTakingLine[] {
  if (!Array.isArray(blocks)) return []
  let actor: TurnTakingActor = 'fox'
  const lines: TurnTakingLine[] = []
  for (const block of blocks) {
    if (!isValidBlock(block)) continue
    if (block.type === 'switch_character') {
      actor = actor === 'fox' ? 'rabbit' : 'fox'
    } else if (block.type === 'say_line') {
      lines.push({ actor, text: resolveSayText(block.line, choices) })
    }
  }
  return lines
}

export function judgeTurnTakingProgram(
  blocks: unknown,
  expected: readonly TurnTakingExpectedLine[] = L02_REQUIRED_LINES,
  choices: readonly SayChoice[] = L02_SAY_CHOICES,
): TurnTakingJudgeResult {
  const invalidExpected: readonly TurnTakingExpectedLine[] = Array.isArray(expected) ? expected : []
  const empty: Pick<TurnTakingJudgeResult, 'log' | 'hasExtension' | 'lines' | 'frames' | 'expected'> = {
    log: [],
    hasExtension: false,
    lines: [],
    frames: [],
    expected: invalidExpected,
  }
  if (!Array.isArray(blocks) || !blocks.every(isValidBlock)) {
    return fail('invalid_program', '程序无效：积木数据损坏，请重新搭建', empty)
  }
  if (!isValidExpected(expected)) {
    return fail('invalid_program', '程序无效：期望对白不正确，请联系老师', empty)
  }
  const main = mainTurnTakingProgram(blocks)
  if (main.length === 0) return fail('missing_start', '程序为空：缺少开始事件', empty)
  if (main.length > TURN_TAKING_MAX_BLOCKS) return fail('too_many', '程序过长：超过20个积木', empty)
  if (main[0].type !== 'when_start') return fail('missing_start', '缺少开始事件：第一个积木必须是开始事件', empty)

  let actor: TurnTakingActor = 'fox'
  let hasExtension = false
  const log: string[] = []
  const lines: TurnTakingLine[] = []
  const frames: TurnTakingFrame[] = []
  const snapshot = (): Pick<TurnTakingJudgeResult, 'log' | 'hasExtension' | 'lines' | 'frames' | 'expected'> => ({
    log: [...log],
    hasExtension,
    lines: [...lines],
    frames: [...frames],
    expected,
  })

  for (const block of main.slice(1)) {
    if (block.type === 'say_line') {
      const text = resolveSayText(block.line, choices)
      lines.push({ actor, text })
      if (text) log.push(`${actorLabel(actor)}说：${text}`)
      frames.push({ kind: 'say', actor, text, foxPosition: 0, rabbitPosition: 0 })
    } else if (block.type === 'say_together') {
      const text = resolveSayText(block.line, choices)
      frames.push({ kind: 'say', actor, text, foxPosition: 0, rabbitPosition: 0 })
      return fail('overlap', '两位角色同时说话造成重叠：拆开两个角色的说话时机，逐句运行对照', snapshot())
    } else if (block.type === 'switch_character') {
      actor = actor === 'fox' ? 'rabbit' : 'fox'
      log.push('切换角色')
      frames.push({ kind: 'switch', actor, foxPosition: 0, rabbitPosition: 0 })
    } else {
      return fail('unknown_block', `不支持的积木类型：${block.type}`, snapshot())
    }
  }

  // 严格前缀裁决：前两句必须恰好是必修序列。
  if (lines.length === 0) {
    return fail(
      'missing_line',
      `缺少对白：${actorLabel(expected[0].actor)}还没有说“${expected[0].text}”`,
      snapshot(),
    )
  }
  if (
    lines.length >= 2 &&
    lines[0].actor === expected[1].actor &&
    lines[0].text === expected[1].text &&
    lines[1].actor === expected[0].actor &&
    lines[1].text === expected[0].text
  ) {
    return fail(
      'reversed_order',
      `顺序颠倒了：应该${actorLabel(expected[0].actor)}先说“${expected[0].text}”，${actorLabel(expected[1].actor)}再回应“${expected[1].text}”`,
      snapshot(),
    )
  }
  for (let i = 0; i < expected.length; i++) {
    if (i >= lines.length) {
      return fail(
        'missing_line',
        `缺少对白：${actorLabel(expected[i].actor)}还没有说“${expected[i].text}”`,
        snapshot(),
      )
    }
    if (lines[i].actor !== expected[i].actor) {
      return fail(
        'wrong_actor',
        `对白给错人：第${i + 1}句对白必须属于${actorLabel(expected[i].actor)}`,
        snapshot(),
      )
    }
    if (lines[i].text !== expected[i].text) {
      return fail('wrong_text', `对白说错了：第${i + 1}句应该是“${expected[i].text}”`, snapshot())
    }
  }
  hasExtension = lines.slice(expected.length).some((line) => line.text.length > 0)
  return {
    passed: true,
    failure: null,
    message: '完成「与兔子轮流说话」：两句对白按狐狸→兔子的顺序出现。',
    log,
    hasExtension,
    lines,
    frames,
    expected,
  }
}

/**
 * 从帧序列推导两句气泡是否按序在舞台出现：存在一帧“狐狸说期望第一句”，
 * 且其后存在一帧“兔子说期望第二句”。
 */
export function turnTakingStageDone(
  frames: TurnTakingFrame[],
  expected: readonly TurnTakingExpectedLine[],
): boolean {
  if (expected.length < 2) return false
  const firstIndex = frames.findIndex(
    (frame) => frame.kind === 'say' && frame.actor === expected[0].actor && frame.text === expected[0].text,
  )
  if (firstIndex < 0) return false
  return frames
    .slice(firstIndex + 1)
    .some((frame) => frame.kind === 'say' && frame.actor === expected[1].actor && frame.text === expected[1].text)
}

function knowledgeFailureText(
  failure: TurnTakingFailure | null,
  expected: readonly TurnTakingExpectedLine[],
): string {
  switch (failure) {
    case 'wrong_actor':
      return '对白给了别人：两句对白必须分属狐狸和兔子，中间要切换角色。'
    case 'wrong_text':
      return `对白说错了：${actorLabel(expected[0].actor)}要说“${expected[0].text}”，${actorLabel(expected[1].actor)}要回应“${expected[1].text}”。`
    case 'reversed_order':
      return '顺序颠倒了：必须狐狸先说，兔子再回应。'
    case 'overlap':
      return '两位角色同时说话造成重叠：要拆开两个角色的说话时机，逐句说。'
    default:
      return '两句对白没有按狐狸→兔子的顺序出现。'
  }
}

/** 由一次判定结果构建三层判定（只做分层呈现，不改判定语义）。 */
export function buildTurnTakingJudgment(result: TurnTakingJudgeResult): JudgmentResult {
  const stagePassed = turnTakingStageDone(result.frames, result.expected)
  const spoken =
    result.lines.length > 0
      ? result.lines.map((line) => `${actorLabel(line.actor)}说“${line.text}”`).join('，')
      : '舞台上还没有人说话'
  const stageDetail = stagePassed
    ? `舞台结果：${actorLabel(result.expected[0].actor)}先说“${result.expected[0].text}”，${actorLabel(result.expected[1].actor)}再说“${result.expected[1].text}”，两句按序出现。`
    : `舞台结果：${spoken}，没有按${actorLabel(result.expected[0].actor)}→${actorLabel(result.expected[1].actor)}的顺序出现两句对白。`
  const taskPassed = result.passed
  const taskDetail = taskPassed
    ? `任务判定：通过。${result.message}`
    : `任务判定：未通过。${result.message}`
  const knowledgePassed =
    stagePassed &&
    result.failure !== 'wrong_actor' &&
    result.failure !== 'wrong_text' &&
    result.failure !== 'reversed_order' &&
    result.failure !== 'overlap'
  const knowledgeDetail = knowledgePassed
    ? `知识证据：通过。顺序、文本、分开说三者皆对：${actorLabel(result.expected[0].actor)}先说“${result.expected[0].text}”，切换角色后${actorLabel(result.expected[1].actor)}再说“${result.expected[1].text}”。`
    : `知识证据：未通过。${knowledgeFailureText(result.failure, result.expected)}`
  const passed = taskPassed && knowledgePassed
  const firstLine = result.lines[0]
  const secondLine = result.lines[1]
  const methodEvidence = `方法证据：第一句：${firstLine ? `${actorLabel(firstLine.actor)}说“${firstLine.text}”` : '无'}；第二句：${secondLine ? `${actorLabel(secondLine.actor)}说“${secondLine.text}”` : '无'}；帧数：${result.frames.length}。`
  return {
    layers: [
      { id: 'stage', label: '舞台结果', passed: stagePassed, detail: stageDetail },
      { id: 'task', label: '任务判定', passed: taskPassed, detail: taskDetail },
      { id: 'knowledge', label: '知识证据', passed: knowledgePassed, detail: knowledgeDetail },
    ],
    passed,
    conclusion: passed
      ? `结论：已完成。${result.message}${result.hasExtension ? '还多了一句告别台词，拓展也做到了！' : ''}`
      : `结论：未合格。${result.message}`,
    methodEvidence,
  }
}
