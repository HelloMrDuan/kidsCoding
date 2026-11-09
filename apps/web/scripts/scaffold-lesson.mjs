#!/usr/bin/env node
/**
 * KidsCoding 课程脚手架生成器（OPS-030，最小可用版）。
 *
 * 用法（在仓库根目录）：
 *   node apps/web/scripts/scaffold-lesson.mjs \
 *     --lessonId A1-U3-L04 --title "检索可信资料" --engine slot
 *
 * 生成内容（slot / summary 插槽课程，仿 A1-U3-L02 / A1-U3-L03 的已验证结构）：
 *   apps/web/src/features/<trackDir>/<slug>.ts               课程数据骨架
 *   apps/web/src/features/<trackDir>/<slug>-contract.ts       契约骨架
 *   apps/web/src/features/<trackDir>/<slug>-adapter.ts        适配器骨架
 *   apps/web/src/features/<trackDir>/<slug>-draft.ts          草稿骨架
 *   apps/web/src/features/<trackDir>/<slug>-slot.tsx          插槽骨架
 *   apps/web/src/features/<trackDir>/<slug>.test.ts            数据/契约测试骨架
 *   apps/web/src/features/<trackDir>/<slug>-draft.test.ts     草稿测试骨架
 *   apps/web/src/features/<trackDir>/<slug>-slot.test.tsx     插槽/onJudgment 测试骨架
 *
 * 不生成生产路由与 E2E（2026-11-09 首席裁定，OPS-030 整改）：
 * 演示骨架带 TODO 占位文案，绝不能进入生产路由；路由 page.tsx 与
 * E2E spec 由课程作者在正式建课时按 L02/L03 模式另建（路由目录、
 * E2E 前缀、CI Job 均在打印的接入手册里说明）。生成器只出 8 个文件，
 * 不写 src/app 下的任何文件，不写 tests/e2e 下的任何文件。
 *
 * 另打印 CI 接入片段与台账登记模板（不自动改 workflow 与台账，
 * 改 workflow 须独立任务、独立 PR）。
 *
 * 设计约束（duan 2026-11-08 裁定）：
 * - 只做最小功能：不重构共享工作区，不建大型管理平台。
 * - 可复用框架与课程独有逻辑分离：判定规则、数据字段、文案一律是
 *   课程作者填写的 TODO，脚手架绝不把具体课程的判定硬编码成通用规则。
 * - 生成的骨架不伪造通过：判定未实现时返回未判定（not-judged），
 *   不写“已掌握”，不写假成功。
 * - 草稿按课分键 kidscoding-draft:{lessonId}，损坏草稿 fail-closed。
 *
 * 校验：生成后运行
 *   node apps/web/scripts/check-lesson-scaffold.mjs --dir <生成目录>
 * 再跑 npx vitest run <slug> 确认骨架测试通过。
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// vitest 下 import.meta.url 可能不是 file: URL，做防御：失败时退回 cwd。
let HERE = process.cwd()
try {
  HERE = dirname(fileURLToPath(import.meta.url))
} catch {
  HERE = process.cwd()
}
const WEB_ROOT = resolve(HERE, '..')

export function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = value
      i += 1
    }
  }
  return out
}

export function lessonIdToSlug(lessonId) {
  return lessonId.toLowerCase().replace(/_/g, '-')
}

export function lessonIdToPrefix(lessonId) {
  // A1-U3-L04 -> A1 ; G2-U3-L02 -> G2
  return lessonId.split('-')[0]
}

export function lessonIdToUnit(lessonId) {
  // A1-U3-L04 -> A1-U3
  const parts = lessonId.split('-')
  return `${parts[0]}-${parts[1]}`
}

/**
 * 由 lessonId 推导课程文件所在目录与路由目录。
 * A1 系课程放 ai-python；G2 系放 lessons/g2-<unit>；其余放 lessons/<track>。
 * 路由目录为课节级（跟 L02/L03 正式课模式）：A1 用
 * ai-python-lab-<unit>-<lesson>（例：ai-python-lab-u3-l04）；G2 用
 * <track>-<unit>-<lesson>（例：g2-u3-l03）。仅供接入手册参考；
 * 生成器不建生产路由、不生成路由常量（2026-11-09 首席裁定）。
 */
export function derivePaths(lessonId, opts = {}) {
  const prefix = lessonIdToPrefix(lessonId)
  const unit = lessonIdToUnit(lessonId)
  const unitLower = unit.toLowerCase()
  const slug = lessonIdToSlug(lessonId)
  const lessonPart = lessonId.split('-')[2].toLowerCase()
  let featureDir
  let routeDir
  let e2ePrefix
  if (prefix === 'A1') {
    featureDir = 'src/features/ai-python'
    // 单元 A1-U3 -> u3，课节 L04 -> l04，拼成 ai-python-lab-u3-l04。
    const unitPart = unitLower.split('-')[1]
    routeDir = `src/app/learn/ai-python-lab-${unitPart}-${lessonPart}`
    e2ePrefix = 'ai-python'
  } else if (prefix === 'G2') {
    featureDir = `src/features/lessons/${unitLower}`
    routeDir = `src/app/learn/${unitLower}-${lessonPart}`
    e2ePrefix = unitLower
  } else {
    featureDir = `src/features/lessons/${unitLower}`
    routeDir = `src/app/learn/${unitLower}-${lessonPart}`
    e2ePrefix = unitLower
  }
  if (opts.featureDir) featureDir = opts.featureDir
  if (opts.routeDir) routeDir = opts.routeDir
  if (opts.e2ePrefix) e2ePrefix = opts.e2ePrefix
  return { featureDir, routeDir, e2ePrefix, slug, prefix, unit, unitLower }
}

function shortName(slug) {
  // a1-u3-l04 -> L04
  const parts = slug.split('-')
  return parts[parts.length - 1].toUpperCase()
}

function pascalSlug(slug) {
  return slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

// ---------------------------------------------------------------------------
// 模板：课程数据骨架
// ---------------------------------------------------------------------------
export function dataTemplate({ lessonId, title, slug }) {
  const S = shortName(slug)
  return `/**
 * ${lessonId} 课程数据骨架（脚手架 OPS-030 生成，课程作者填写 TODO）。
 *
 * 本文件只放本课独有的数据模型与校验入口，不放通用判定。
 * 判定规则、字段表、文案一律由课程作者按本课教研填写，脚手架不硬编码。
 * 校验未实现前，validateRecordText 返回“未实现”——不伪造通过。
 */

export const ${S}_LESSON_ID = '${lessonId}'
export const ${S}_TITLE = '${title}'

/** 本课数据字段表（TODO：按本课教研填写字段名、类型、必填与范围）。 */
export const ${S}_FIELDS = [
  // 例：{ name: 'name', label: '名称', type: 'string', required: true },
]

export type ${S}Record = Record<string, unknown>

export type ${S}Validation = {
  /** 是否通过全部检查。 */
  passed: boolean
  /** 未通过的检查名（空数组表示全过）。 */
  failed: string[]
  /** 字段级报错（字段名 -> 原因），供插槽展示。 */
  errors: Record<string, string>
}

/**
 * 校验一条记录（TODO：按本课字段表实现真实校验）。
 * 未实现前返回 failed: ['未实现']，不伪造通过。
 */
export function validateRecordText(text: string): ${S}Validation {
  // TODO(课程作者)：按 ${S}_FIELDS 实现真实校验（字段齐全、类型、范围）。
  void text
  return { passed: false, failed: ['未实现'], errors: {} }
}

/** 本课方法步骤（TODO：按本课教研填写，与契约 methodSteps 一致）。 */
export const LESSON_STEPS = [
  // TODO(课程作者)：填写本课方法步骤（至少 1 条）。
  '第一步：TODO。',
  '第二步：TODO。',
  '第三步：TODO。',
]

/** 本课三级提示（TODO：按本课教研填写，与契约 hints 一致）。 */
export const HINTS = [
  // TODO(课程作者)：填写三级提示（恰好 3 条，level 1/2/3 各一）。
  { level: 1 as const, title: '一级提示：方向', text: 'TODO。' },
  { level: 2 as const, title: '二级提示：方法', text: 'TODO。' },
  { level: 3 as const, title: '三级提示：对照', text: 'TODO。' },
]
`
}

// ---------------------------------------------------------------------------
// 模板：契约骨架
// ---------------------------------------------------------------------------
export function contractTemplate({ lessonId, title, slug, engine }) {
  const S = shortName(slug)
  // 注意：本模板不生成路由常量。生成器不建生产路由，路由常量无依据；
  // 正式建课时由课程作者按实际路径建立（2026-11-09 首席裁定）。
  return `/**
 * ${lessonId} 课程内容契约（Lesson Content Contract，脚手架 OPS-030 生成）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md。
 * 外壳只渲染契约内容，不编造课程内容；标题、目标、任务、提示、结果、
 * 总结六方全部来自本课契约。
 *
 * 诚实口径（TODO：按本课教研填写）：
 * - 本课不调用外部模型、不接网关（如确需外部能力，须另立架构任务）。
 * - scopeLabel 为教学定向：一次全过只表示本次合格，不等于完全掌握；
 *   页面任何位置不写表示完全掌握的字样。
 *
 * 引擎：通用引擎值 '${engine}'（#491 OPS-026 已并入主线 WorkspaceEngine）。
 * 不得填 'summary' 冒充，不得用 'json' 冒充。
 */

import type { LessonContract } from '../lessons/workspace/lesson-contract'
import { HINTS, LESSON_STEPS } from './${slug}'

export const ${S}_LESSON_ID = '${lessonId}'
export const ${S}_LESSON_TITLE = '${title}'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const ${S}_DRAFT_KEY = 'kidscoding-draft:${lessonId}'

export type ${S}Contract = {
  lessonId: string
  title: string
  goal5: [string, string, string, string, string]
  brief: string
  step: string
  hints: { level: 1 | 2 | 3; title: string; text: string }[]
  draftKey: string
  scopeLabel: '教学定向' | '开放创作'
  scopeGap: string
  methodSteps: string[]
}

export const ${S}_CONTRACT: ${S}Contract = {
  lessonId: ${S}_LESSON_ID,
  title: ${S}_LESSON_TITLE,
  goal5: [
    // TODO(课程作者)：首屏五要素——今天学什么 / 要解决什么问题 /
    // 学完能做什么 / 和上节课的联系 / 当前要完成哪一步。
    '今天学什么：TODO。',
    '要解决什么问题：TODO。',
    '学完能做什么：TODO。',
    '和上节课的联系：TODO。',
    '当前要完成哪一步：TODO。',
  ],
  brief: '目标：TODO。',
  step: 'TODO。',
  hints: HINTS,
  draftKey: ${S}_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    // TODO(课程作者)：写明本课评测边界（行为化多解法评测尚未建成；
    // 一次全过只表示本次合格，不等于完全掌握）。
    '行为化多解法评测尚未建成；一次全过只表示本次合格，不等于完全掌握。',
  methodSteps: LESSON_STEPS,
}

/**
 * 除 engine 外的全部工作区契约字段。翻译规则（外壳只渲染契约内容）：
 * - goal5 / brief / step / draftKey 直通；
 * - hints（结构化 { level, title, text }）→ 外壳 structuredHints 直通，
 *   同时压平为 [string, string, string] 满足外壳必填 hints 校验；
 * - judging 三规则由本课语义书写（规则文本，无演示数字目标）；
 * - methodSteps / scopeGap 进外壳抽屉（仅抽屉渲染，不进编辑区）；
 * - activities 为三步教学活动；
 * - hasStage: false：本课无舞台与角色列，外壳渲染宽摘要布局；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 */
export const ${S}_WORKSPACE_CONTRACT_FIELDS: Omit<LessonContract, 'engine'> = {
  lessonId: ${S}_CONTRACT.lessonId,
  title: ${S}_CONTRACT.title,
  goal5: ${S}_CONTRACT.goal5,
  brief: ${S}_CONTRACT.brief,
  step: ${S}_CONTRACT.step,
  hints: ${S}_CONTRACT.hints.map((hint) => \`\${hint.title}：\${hint.text}\`) as [
    string,
    string,
    string,
  ],
  judging: {
    // TODO(课程作者)：按本课语义书写三规则（规则文本，无演示数字目标）。
    stageRule: '检查结果：TODO。',
    taskRule: '任务判定：TODO。',
    knowledgeRule: '知识证据：TODO。',
    scopeLabel: ${S}_CONTRACT.scopeLabel,
  },
  draftKey: ${S}_CONTRACT.draftKey as \`kidscoding-draft:\${string}\`,
  structuredHints: ${S}_CONTRACT.hints,
  methodSteps: ${S}_CONTRACT.methodSteps,
  scopeGap: ${S}_CONTRACT.scopeGap,
  activities: [
    // TODO(课程作者)：三步教学活动（探索预测 / 独立解决 / 迁移创作）。
    { level: 1, title: 'TODO', text: 'TODO。' },
    { level: 2, title: 'TODO', text: 'TODO。' },
    { level: 3, title: 'TODO', text: 'TODO。' },
  ],
  fileCapabilities: {
    canNew: true,
    canSave: true,
    canExport: true,
    canImport: true,
    canReset: true,
  },
  hasStage: false,
}

/**
 * 完整工作区契约：FIELDS + 通用插槽引擎 '${engine}'，供路由传入统一
 * LessonWorkspace。不得填 'summary' 冒充，不得用 'json' 冒充。
 */
export const ${S}_WORKSPACE_CONTRACT: LessonContract = {
  ...${S}_WORKSPACE_CONTRACT_FIELDS,
  engine: '${engine}',
}
`
}

// ---------------------------------------------------------------------------
// 模板：适配器骨架
// ---------------------------------------------------------------------------
export function adapterTemplate({ lessonId, slug }) {
  const P = pascalSlug(slug)
  return `/**
 * ${lessonId} 适配器骨架（脚手架 OPS-030 生成）。
 *
 * 插槽课不挂载命令式适配器：mount / unmount 为 no-op；run 立即以
 * finished 事件结束，不产生判定（判定由插槽经 onJudgment 上报外壳）。
 * 判定显示在插槽内与外壳反馈卡：外壳只在插槽上报后展示，不自算。
 * 草稿校验走本课 validateRecordText；非法草稿 fail-closed。
 */

import type {
  EngineAdapter,
  EngineState,
  RunEvent,
} from '../lessons/workspace/workspace-adapters'
import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { validateRecordText } from './${slug}'
import { coerceDraft } from './${slug}-draft'

/**
 * 由校验结果构造判定（TODO：按本课检查项填写 passed / failed / 结论文案）。
 * 未实现前返回 passed: false，不伪造通过。
 * 形状与共享 JudgmentResult 一致：layers 三层（stage / task / knowledge）
 * + passed + conclusion + methodEvidence。
 */
export function build${P}Judgment(
  validation: ReturnType<typeof validateRecordText>,
): JudgmentResult {
  // TODO(课程作者)：按本课检查项填写三层判定（舞台 / 任务 / 知识）与结论文案。
  return {
    layers: [
      {
        id: 'stage',
        label: '检查结果',
        passed: validation.passed,
        detail: validation.passed ? '检查结果：全部通过。' : '检查结果：未全部通过。',
      },
      {
        id: 'task',
        label: '任务判定',
        passed: validation.passed,
        detail: validation.passed ? '任务判定：合格。' : '任务判定：未合格。',
      },
      {
        id: 'knowledge',
        label: '知识证据',
        passed: validation.passed,
        detail: '知识证据：TODO。',
      },
    ],
    passed: validation.passed,
    conclusion: validation.passed ? '结论：本次合格。' : '结论：未合格。',
    methodEvidence: 'TODO：方法证据。',
  }
}

export class ${P}Adapter implements EngineAdapter {
  private draftText = ''

  mount(): void {
    // Intentionally empty: slot courses never mount an imperative adapter.
  }

  unmount(): void {
    // Intentionally empty: nothing was mounted.
  }

  loadScript(script: unknown): void {
    const draft = coerceDraft(script)
    this.draftText = draft.text
  }

  getScript(): unknown {
    return { text: this.draftText }
  }

  validateDraft(script: unknown): boolean {
    try {
      const draft = coerceDraft(script)
      return validateRecordText(draft.text).failed.indexOf('未实现') === -1
    } catch {
      return false
    }
  }

  getJudgmentResult(): JudgmentResult | null {
    return build${P}Judgment(validateRecordText(this.draftText))
  }

  run(onEvent: (event: RunEvent) => void): void {
    // 插槽课没有播放过程：run 立即以 finished 事件结束，不产生判定。
    onEvent({ kind: 'finished', state: this.getState() })
  }

  stop(): void {
    // Intentionally empty: 同步检查无可取消的播放。
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }
}
`
}

// ---------------------------------------------------------------------------
// 模板：草稿骨架
// ---------------------------------------------------------------------------
export function draftTemplate({ lessonId, slug }) {
  const S = shortName(slug)
  return `/**
 * ${lessonId} 本机草稿骨架（脚手架 OPS-030 生成）。
 *
 * 只存学生的课堂编辑内容，不存判定结果：刷新后须重新检查才出结果。
 * 草稿键（P0 契约格式）：kidscoding-draft:${lessonId}，按课节分键。
 * 损坏草稿 fail-closed：解析失败或结构不对 → 默认空草稿，不崩溃，
 * 不报“已恢复”，不覆盖已存草稿。
 * 写入方为共享 LessonWorkspace（信封写同一键），本模块不再直接碰
 * localStorage。
 */

import { ${S}_DRAFT_KEY } from './${slug}-contract'

export { ${S}_DRAFT_KEY }

/** 单课草稿上限（与共享规范一致，不得擅自提高）。 */
export const MAX_DRAFT_BYTES = 64 * 1024

export type ${S}Draft = {
  /** 编辑区文本（TODO：按本课数据模型调整字段）。 */
  text: string
  /** 已揭示到的提示级数（0 = 未揭示）。 */
  hintLevel: number
}

export function emptyDraft(): ${S}Draft {
  return { text: '', hintLevel: 0 }
}

function isDraftShape(value: unknown): value is ${S}Draft {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record['text'] === 'string' &&
    typeof record['hintLevel'] === 'number'
  )
}

/**
 * 整形草稿：非法字段丢弃、超长截断，返回可用草稿；无法整形返回空草稿。
 * 绝不抛错（fail-closed 调用方）。
 */
export function coerceDraft(script: unknown): ${S}Draft {
  if (!isDraftShape(script)) return emptyDraft()
  const draft = script as ${S}Draft
  return {
    text: draft.text.slice(0, MAX_DRAFT_BYTES),
    hintLevel: Math.max(0, Math.min(3, Math.floor(draft.hintLevel))),
  }
}

/**
 * 解析存储的草稿 JSON：解析失败或结构不对返回空草稿（不抛错）。
 */
export function parseDraft(raw: string | null): ${S}Draft {
  if (raw === null) return emptyDraft()
  try {
    return coerceDraft(JSON.parse(raw))
  } catch {
    return emptyDraft()
  }
}
`
}

// ---------------------------------------------------------------------------
// 模板：插槽骨架
// ---------------------------------------------------------------------------
export function slotTemplate({ lessonId, slug }) {
  const P = pascalSlug(slug)
  return `/**
 * ${lessonId} 编辑器插槽骨架（脚手架 OPS-030 生成）。
 *
 * 插槽拥有编辑面与数据；判定由插槽算出后经 onJudgment 上报外壳，
 * 外壳反馈卡只展示上报的判定，不自算、不伪造。
 * 编辑后上报 null 使旧判定失效（外壳显示“旧判定已失效”）。
 */

import { useState } from 'react'

import type {
  EditorSlotProps,
  JudgmentResult,
} from '../lessons/workspace/workspace-slots'
import { build${P}Judgment } from './${slug}-adapter'
import { validateRecordText } from './${slug}'

export type ${P}SlotProps = EditorSlotProps & {
  /**
   * 判定上报通道（外壳 onJudgment，#490 OPS-025）。
   * 编辑后上报 null 使旧判定失效；校验后上报本次判定。
   * 外壳尚未接 onJudgment 时该回调恒为 undefined，插槽照常显示自有结果。
   */
  onJudgment?: (judgment: JudgmentResult | null) => void
}

export function ${P}EditorSlot({
  initial,
  onChange,
  editable,
  onJudgment,
}: ${P}SlotProps) {
  const [text, setText] = useState(() => {
    const draft = initial as { text?: unknown } | null
    return typeof draft?.text === 'string' ? draft.text : ''
  })
  const [result, setResult] = useState<ReturnType<
    typeof validateRecordText
  > | null>(null)

  function handleEdit(next: string) {
    setText(next)
    setResult(null)
    // 编辑后旧判定失效：上报 null，外壳清除已显示的判定。
    onJudgment?.(null)
    onChange?.({ text: next })
  }

  function handleCheck() {
    const validation = validateRecordText(text)
    setResult(validation)
    onJudgment?.(build${P}Judgment(validation))
  }

  return (
    <div data-testid="ws-${slug}-editor">
      <label htmlFor="ws-${slug}-input">编辑区（TODO：按本课数据模型替换为真实编辑器）</label>
      <textarea
        id="ws-${slug}-input"
        data-testid="ws-${slug}-input"
        value={text}
        disabled={!editable}
        onChange={(event) => handleEdit(event.target.value)}
      />
      <button
        type="button"
        data-testid="ws-${slug}-check"
        onClick={handleCheck}
      >
        检查
      </button>
      {result !== null && (
        <p data-testid="ws-${slug}-check-result">
          {result.passed ? '全部通过。' : \`还有 \${result.failed.length} 项未通过。\`}
        </p>
      )}
    </div>
  )
}
`
}

// ---------------------------------------------------------------------------
// 模板：测试骨架
// ---------------------------------------------------------------------------
export function dataTestTemplate({ lessonId, slug }) {
  const S = shortName(slug)
  return `/**
 * ${lessonId} 数据与契约测试骨架（脚手架 OPS-030 生成）。
 *
 * 只测骨架结构：契约通过 validateLessonContract、草稿键按课分键、
 * 引擎值合法。课程独有的判定规则由课程作者另补真实用例。
 */

import { describe, expect, it } from 'vitest'

import { validateLessonContract } from '../lessons/workspace/lesson-contract'
import { ${S}_CONTRACT, ${S}_DRAFT_KEY, ${S}_WORKSPACE_CONTRACT } from './${slug}-contract'

describe('${lessonId} contract (scaffold)', () => {
  it('contract validates against the shared LessonContract', () => {
    expect(validateLessonContract(${S}_WORKSPACE_CONTRACT)).toEqual([])
  })

  it('draft key is per-lesson (kidscoding-draft:{lessonId})', () => {
    expect(${S}_DRAFT_KEY).toBe('kidscoding-draft:${lessonId}')
    expect(${S}_CONTRACT.draftKey).toBe(${S}_DRAFT_KEY)
  })

  it('engine is the generic slot engine (never summary, never json)', () => {
    expect(${S}_WORKSPACE_CONTRACT.engine).toBe('slot')
  })

  it('goal5 has exactly five first-screen elements', () => {
    expect(${S}_CONTRACT.goal5).toHaveLength(5)
    for (const goal of ${S}_CONTRACT.goal5) {
      expect(typeof goal).toBe('string')
      expect(goal.length).toBeGreaterThan(0)
    }
  })
})
`
}

export function draftTestTemplate({ lessonId, slug }) {
  const S = shortName(slug)
  return `/**
 * ${lessonId} 草稿测试骨架（脚手架 OPS-030 生成）。
 *
 * 只测 fail-closed 骨架：损坏草稿回空草稿、不抛错；草稿键按课分键。
 * 课程独有的数据形状校验由课程作者另补真实用例。
 */

import { describe, expect, it } from 'vitest'

import { coerceDraft, emptyDraft, parseDraft, ${S}_DRAFT_KEY } from './${slug}-draft'

describe('${lessonId} draft (scaffold)', () => {
  it('empty draft is the safe default', () => {
    expect(emptyDraft()).toEqual({ text: '', hintLevel: 0 })
  })

  it('corrupt draft falls back to empty (fail-closed, never throws)', () => {
    expect(parseDraft(null)).toEqual(emptyDraft())
    expect(parseDraft('not json')).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ text: 42 }))).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ text: 'x', hintLevel: 'bad' }))).toEqual(emptyDraft())
  })

  it('coerceDraft clamps hintLevel and keeps valid text', () => {
    expect(coerceDraft({ text: 'hello', hintLevel: 9 })).toEqual({
      text: 'hello',
      hintLevel: 3,
    })
    expect(coerceDraft('garbage-string')).toEqual(emptyDraft())
  })

  it('draft key is per-lesson', () => {
    expect(${S}_DRAFT_KEY).toBe('kidscoding-draft:${lessonId}')
  })
})
`
}

export function slotTestTemplate({ lessonId, slug }) {
  const P = pascalSlug(slug)
  return `/**
 * ${lessonId} 插槽/onJudgment 测试骨架（脚手架 OPS-030 生成）。
 *
 * 只测上报通道骨架：校验后上报判定、编辑后上报 null 使旧判定失效、
 * 无 onJudgment 时插槽照常工作。课程独有的判定内容由作者另补真实用例。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { ${P}EditorSlot } from './${slug}-slot'

afterEach(() => {
  cleanup()
})

function renderSlot(onJudgment?: (judgment: JudgmentResult | null) => void) {
  render(
    <${P}EditorSlot
      initial={{ text: '' }}
      onChange={() => {}}
      editable
      onJudgment={onJudgment}
    />,
  )
}

describe('${lessonId} slot onJudgment (scaffold)', () => {
  it('reports a judgment on check (never fabricates a pass)', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ws-${slug}-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(typeof reported.passed).toBe('boolean')
  })

  it('reports null on edit so the shell invalidates the old judgment', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ws-${slug}-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByTestId('ws-${slug}-input'), {
      target: { value: 'edited' },
    })
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
  })

  it('works with no onJudgment prop: checks run and the slot verdict shows', () => {
    renderSlot()
    fireEvent.click(screen.getByTestId('ws-${slug}-check'))
    expect(screen.getByTestId('ws-${slug}-check-result')).toBeInTheDocument()
  })
})
`
}

// ---------------------------------------------------------------------------
// 生成器
// ---------------------------------------------------------------------------
export function buildFileList({ lessonId, title, engine, featureDir, routeDir }) {
  const slug = lessonIdToSlug(lessonId)
  const params = { lessonId, title, slug, engine, featureDir, routeDir }
  return [
    {
      path: join(featureDir, `${slug}.ts`),
      content: dataTemplate(params),
    },
    {
      path: join(featureDir, `${slug}-contract.ts`),
      content: contractTemplate(params),
    },
    {
      path: join(featureDir, `${slug}-adapter.ts`),
      content: adapterTemplate(params),
    },
    {
      path: join(featureDir, `${slug}-draft.ts`),
      content: draftTemplate(params),
    },
    {
      path: join(featureDir, `${slug}-slot.tsx`),
      content: slotTemplate(params),
    },
    {
      path: join(featureDir, `${slug}.test.ts`),
      content: dataTestTemplate(params),
    },
    {
      path: join(featureDir, `${slug}-draft.test.ts`),
      content: draftTestTemplate(params),
    },
    {
      path: join(featureDir, `${slug}-slot.test.tsx`),
      content: slotTestTemplate(params),
    },
  ]
}

export function ciSnippet({ lessonId, slug, e2ePrefix }) {
  return `--- 正式建课接入手册（路由 + E2E + CI，课程作者按 L02/L03 模式另建） ---
演示骨架不含生产路由与 E2E：路由 page.tsx 与 E2E spec 须在正式建课时
另建，不得把 TODO 骨架直接挂到生产路由上。
路由：新建 apps/web/src/app/learn/<路由目录>/[lessonId]/page.tsx，
薄接线（只把本课契约、适配器、插槽交给统一 LessonWorkspace），
路由目录按 L02/L03 模式取（例：ai-python-lab-u3-l02）；路由 URL 为
/learn/<路由目录>/${lessonId}。
E2E：新建 apps/web/tests/e2e/${e2ePrefix}-${slug}.spec.ts，三端 +
反馈卡 + 草稿恢复，断言按本课判定填写；URL 用 /learn/<路由目录>/${lessonId}。
CI 接入（手动加入 .github/workflows/curriculum-content.yml，改 workflow 须独立任务）：
1. on.pull_request.paths 增加：
      - 'apps/web/tests/e2e/${e2ePrefix}-${slug}.spec.ts'
      - 'apps/web/src/app/learn/**/${slug}/**'   # 按实际路由目录调整
2. curriculum-web 增加一步（课程单测）：
      - name: ${lessonId} unit tests
        run: npx vitest run src/features/ai-python/${slug}   # 按实际目录调整
3. 文件末尾新增并行 Job（真实 Chrome，timeout-minutes: 12）：
  ${lessonId.toLowerCase()}-browser-trial:
    runs-on: ubuntu-latest
    timeout-minutes: 12
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
          cache-dependency-path: apps/web/package-lock.json
      - run: npm ci
      - name: Install real Chrome for browser E2E
        run: npx playwright install chrome --with-deps
      - name: Run ${lessonId} spec with real Chrome
        run: npx playwright test tests/e2e/${e2ePrefix}-${slug}.spec.ts --project=desktop`
}

export function ledgerTemplate({ lessonId, title }) {
  return `--- 台账登记模板（手动加入 docs/roadmap/lesson-task-register.json 本课一行） ---
{
  "id": "${lessonId}",
  "title": "${title}",
  "status": "in_review",
  "catalogStatus": "outline_not_playable",
  "evidence": { "pr": "<本课 PR URL>" }
}
注：课节合并后仍保持 in_review / outline_not_playable；独立教研、儿童试学、
发布审核未做前不升 completed。`
}

export function generate({ lessonId, title, engine = 'slot', outDir = null, ...opts }) {
  if (!lessonId || !/^[A-Z0-9]+-U[0-9]+-L[0-9]+$/.test(lessonId)) {
    throw new Error(
      `--lessonId 须为课程编号格式，如 A1-U3-L04（收到：${lessonId}）`,
    )
  }
  if (!title) throw new Error('--title 不能为空')
  if (engine !== 'slot' && engine !== 'summary') {
    throw new Error(
      `--engine 只支持 slot / summary（blockly / scratch-vm 须另立扩展，收到：${engine}）`,
    )
  }
  const paths = derivePaths(lessonId, opts)
  const files = buildFileList({
    lessonId,
    title,
    engine,
    featureDir: paths.featureDir,
    routeDir: paths.routeDir,
  })
  const root = outDir ? resolve(outDir) : WEB_ROOT
  const written = []
  for (const file of files) {
    const dest = join(root, file.path)
    if (existsSync(dest)) {
      throw new Error(`目标已存在，拒绝覆盖：${dest}（先删除或换 --out）`)
    }
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, file.content, 'utf8')
    written.push(file.path)
  }
  return {
    lessonId,
    title,
    engine,
    slug: paths.slug,
    featureDir: paths.featureDir,
    routeDir: paths.routeDir,
    e2ePrefix: paths.e2ePrefix,
    files: written,
    ciSnippet: ciSnippet({ lessonId, slug: paths.slug, e2ePrefix: paths.e2ePrefix }),
    ledgerTemplate: ledgerTemplate({ lessonId, title }),
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    console.log(
      '用法：node apps/web/scripts/scaffold-lesson.mjs --lessonId A1-U3-L04 --title "检索可信资料" [--engine slot|summary] [--out <目录>]',
    )
    process.exit(0)
  }
  try {
    const result = generate({
      lessonId: args.lessonId,
      title: args.title,
      engine: args.engine || 'slot',
      outDir: args.out || null,
      featureDir: args.featureDir,
      routeDir: args.routeDir,
      e2ePrefix: args.e2ePrefix,
    })
    console.log(`已生成 ${result.files.length} 个文件（${result.lessonId}，引擎 ${result.engine}）：`)
    for (const f of result.files) console.log(`  ${f}`)
    console.log('')
    console.log(result.ciSnippet)
    console.log('')
    console.log(result.ledgerTemplate)
    console.log('')
    console.log(
      `下一步：填写各文件 TODO（字段表、判定、文案），然后运行\n` +
        `  node apps/web/scripts/check-lesson-scaffold.mjs --dir apps/web/${result.featureDir}\n` +
        `  npx vitest run ${result.slug}（在 apps/web 内）`,
    )
  } catch (error) {
    console.error(`脚手架生成失败：${error.message}`)
    process.exit(1)
  }
}

let isMain = false
try {
  isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
} catch {
  isMain = false
}
if (isMain) main()
