/**
 * OPS-038《我的舞蹈秀》课程评价引擎。
 *
 * 评价原则（负责人裁定）：不能只检查积木字符串，还要核对实际项目
 * （project.json 结构：角色、造型、背景、声音、脚本）与运行结果。
 *
 * 数据来源：孩子在官方 Scratch GUI 里改好作品后，用 GUI 自带的
 * “文件 → 保存到你的电脑”导出 .sb3；学习层在浏览器本地解析该文件
 * 的 project.json 并评价。解析只在本地进行，不上传、不落库。
 *
 * 评价不依赖积木在编辑器里的显示文本，而是读 project.json 的结构：
 * 目标（targets）、造型（costumes）、背景（backdrops）、声音（sounds）、
 * 积木（blocks 的 opcode 与连线、字段值）。
 */
import JSZip from 'jszip'

export interface ScratchBlock {
  opcode: string
  next?: string | null
  parent?: string | null
  inputs?: Record<string, unknown>
  fields?: Record<string, unknown>
  topLevel?: boolean
}

export interface ScratchTarget {
  isStage: boolean
  name: string
  costumes: { name: string }[]
  sounds: { name: string }[]
  blocks: Record<string, ScratchBlock>
  currentCostume?: number
  variables?: Record<string, unknown>
  lists?: Record<string, unknown>
  broadcasts?: Record<string, unknown>
}

export interface ScratchProject {
  targets: ScratchTarget[]
  meta?: { semver?: string; vm?: string; agent?: string }
}

export interface StepCheckResult {
  /** 与 dance-show-steps.ts 的步骤 id 对应。 */
  id: string
  pass: boolean
  detail: string
}

/** 从 .sb3 文件（ZIP）中读出 project.json 并解析。 */
export async function parseSb3(data: ArrayBuffer): Promise<ScratchProject> {
  const zip = await JSZip.loadAsync(data)
  const file = zip.file('project.json')
  if (!file) throw new Error('不是有效的 .sb3 文件：缺少 project.json')
  const text = await file.async('string')
  const project = JSON.parse(text) as ScratchProject
  if (!Array.isArray(project.targets)) {
    throw new Error('不是有效的 Scratch 项目：targets 不是数组')
  }
  return project
}

/** 从 File 对象读出 .sb3 并解析（学习层“检查我的作品”的入口）。 */
export async function parseSb3File(file: File): Promise<ScratchProject> {
  const buf = await file.arrayBuffer()
  return parseSb3(buf)
}

export function getStage(project: ScratchProject): ScratchTarget | undefined {
  return project.targets.find((t) => t.isStage)
}

export function getSprite(
  project: ScratchProject,
  name: string,
): ScratchTarget | undefined {
  return project.targets.find((t) => !t.isStage && t.name === name)
}

function allBlocks(target: ScratchTarget): ScratchBlock[] {
  return Object.values(target.blocks ?? {})
}

function countOpcode(target: ScratchTarget, opcode: string): number {
  return allBlocks(target).filter((b) => b.opcode === opcode).length
}

function countOpcodeInProject(project: ScratchProject, opcode: string): number {
  return project.targets.reduce((n, t) => n + countOpcode(t, opcode), 0)
}

/** 该目标的顶层脚本数（绿旗帽子等顶层积木的数量）。 */
function topLevelScriptCount(target: ScratchTarget): number {
  return allBlocks(target).filter((b) => b.topLevel).length
}

/**
 * 从积木输入里读一个数值（Scratch 3 的数字输入存在 inputs 里，
 * 形式如 DURATION: [1, [5, "0.3"]]；字段形式 fields.DURATION 仅作兼容）。
 * 输入是变量或积木时返回 null（静态无法确定）。
 */
function readNumericInput(
  block: ScratchBlock,
  name: string,
): number | null {
  const inputs = block.inputs as Record<string, unknown> | undefined
  const raw = inputs?.[name]
  if (Array.isArray(raw)) {
    // [1, [5, "0.3"]]（影子数字积木）或 [1, "0.3"]（直接值）
    const inner = raw[1]
    if (typeof inner === 'string') {
      const v = Number(inner)
      return Number.isFinite(v) ? v : null
    }
    if (Array.isArray(inner) && typeof inner[1] === 'string') {
      const v = Number(inner[1])
      return Number.isFinite(v) ? v : null
    }
    return null
  }
  const fields = block.fields as Record<string, unknown> | undefined
  const f = fields?.[name] as [string, string] | undefined
  if (Array.isArray(f) && typeof f[0] === 'string') {
    const v = Number(f[0])
    return Number.isFinite(v) ? v : null
  }
  return null
}

/** control_wait 积木的全部等待秒数（DURATION 存在 inputs 里）。 */
export function getWaitDurations(project: ScratchProject): number[] {
  const out: number[] = []
  for (const target of project.targets) {
    for (const block of allBlocks(target)) {
      if (block.opcode !== 'control_wait') continue
      const v = readNumericInput(block, 'DURATION')
      if (v !== null) out.push(v)
    }
  }
  return out
}

/**
 * 课程 starter .sb3（~/workspace/user/files/Scratch.sb3）保存时的当前背景。
 * 实测：stage.currentCostume = 2，即 "Bedroom 3"。步骤 6“换一个背景”
 * 的判断是“当前背景不是 starter 保存时的背景，或用了换背景积木”——
 * 不能只判“不是 backdrop1”，因为 starter 本身就不是 backdrop1。
 * 若 starter 文件更换，此常量须同步更新。
 */
const STARTER_BACKDROP = 'Bedroom 3'

/** 当前舞台背景的名字（按 currentCostume 下标）。 */
export function getCurrentBackdropName(project: ScratchProject): string | null {
  const stage = getStage(project)
  if (!stage) return null
  const idx = stage.currentCostume ?? 0
  return stage.costumes[idx]?.name ?? null
}

/**
 * 按步骤评价一个真实项目。每个检查都读 project.json 的结构，
 * 并在 detail 里写明实际读到的值（不是只报通过/不通过）。
 */
export function evaluateProject(project: ScratchProject): StepCheckResult[] {
  const stage = getStage(project)
  const abby = getSprite(project, 'Abby')
  const abbyCostumes = abby?.costumes.map((c) => c.name) ?? []
  const stageBackdrops = stage?.costumes.map((c) => c.name) ?? []
  const abbySounds = abby?.sounds.map((s) => s.name) ?? []
  const abbyScripts = abby ? topLevelScriptCount(abby) : 0
  const waits = getWaitDurations(project)
  const currentBackdrop = getCurrentBackdropName(project)

  const hasNextCostume =
    !!abby && countOpcode(abby, 'looks_nextcostume') > 0
  const repeatCount = abby ? countOpcode(abby, 'control_repeat') : 0
  const foreverCount = abby ? countOpcode(abby, 'control_forever') : 0
  const hasSetVolume =
    !!abby && countOpcode(abby, 'sound_setvolumeto') > 0
  const hasPlaySound =
    !!abby &&
    (countOpcode(abby, 'sound_playuntildone') > 0 ||
      countOpcode(abby, 'sound_play') > 0)
  const hasSwitchBackdrop =
    !!stage && countOpcode(stage, 'looks_switchbackdrop') > 0

  const baseOk =
    !!abby &&
    abbyCostumes.length === 4 &&
    stageBackdrops.length === 3 &&
    abbyScripts >= 2

  return [
    {
      id: 'step-0-preview',
      pass: baseOk,
      detail: baseOk
        ? `Abby 在，造型 ${abbyCostumes.length}/4（${abbyCostumes.join('、')}），背景 ${stageBackdrops.length}/3，脚本 ${abbyScripts} 条。`
        : `项目不完整：Abby=${!!abby}，造型 ${abbyCostumes.length}/4，背景 ${stageBackdrops.length}/3，脚本 ${abbyScripts} 条。`,
    },
    {
      id: 'step-1-load',
      pass: baseOk,
      detail: baseOk
        ? `作品已打开：Abby、4 个造型、3 个背景、${abbyScripts} 条脚本都在。`
        : `作品未完整加载：Abby=${!!abby}，造型 ${abbyCostumes.length}/4，背景 ${stageBackdrops.length}/3，脚本 ${abbyScripts} 条。`,
    },
    {
      id: 'step-2-observe',
      pass: hasNextCostume,
      detail: hasNextCostume
        ? '找到“下一个造型”积木：Abby 靠它换姿势跳舞。'
        : '没找到“下一个造型”积木：Abby 还不会换姿势。',
    },
    {
      id: 'step-3-loop',
      pass: repeatCount > 0,
      detail:
        repeatCount > 0
          ? `找到“重复执行”积木 ${repeatCount} 块，转圈循环已加上。`
          : `还没找到“重复执行”积木（当前 forever ${foreverCount} 块是原来的跳舞和音乐循环）。`,
    },
    {
      id: 'step-4-rhythm',
      pass: waits.length > 0 && waits.some((v) => v !== 0.3),
      detail:
        waits.length === 0
          ? '没找到“等待”积木。'
          : `等待时间是 [${waits.join(', ')}] 秒。` +
            (waits.some((v) => v !== 0.3)
              ? '已经不是原来的 0.3 秒，节奏被你改过了。'
              : '还是原来的 0.3 秒，试着改成 1 或者 0.1，再点绿旗听听快慢。'),
    },
    {
      id: 'step-5-music',
      pass: hasPlaySound && hasSetVolume,
      detail:
        hasPlaySound && hasSetVolume
          ? `音乐脚本在（播放声音），音量设置积木也加上了；Abby 的声音有：${abbySounds.join('、') || '无'}。`
          : `播放声音=${hasPlaySound}，音量设置=${hasSetVolume}；Abby 的声音有：${abbySounds.join('、') || '无'}。`,
    },
    {
      id: 'step-6-backdrop',
      pass: currentBackdrop !== null && currentBackdrop !== STARTER_BACKDROP || hasSwitchBackdrop,
      detail:
        currentBackdrop !== null && currentBackdrop !== STARTER_BACKDROP
          ? `当前背景是“${currentBackdrop}”，已经换过了（starter 保存时是“${STARTER_BACKDROP}”）。`
          : hasSwitchBackdrop
            ? '项目里有“换成背景”积木，背景会跟着脚本换。'
            : `当前背景还是“${currentBackdrop ?? '未知'}”（starter 保存时的背景），去背景标签里挑一个你喜欢的。`,
    },
    {
      id: 'step-7-challenge',
      pass: abbyScripts >= 3 && (repeatCount > 0 || foreverCount >= 3),
      detail:
        abbyScripts >= 3
          ? `Abby 现在有 ${abbyScripts} 条脚本（原来 2 条），你编的新脚本在里面；循环积木：重复执行 ${repeatCount} 块、重复执行 ${foreverCount} 块。`
          : `Abby 只有 ${abbyScripts} 条脚本（原来 2 条），还没编出自己的新脚本。`,
    },
    {
      id: 'step-8-save',
      pass:
        baseOk &&
        (waits.some((v) => v !== 0.3) ||
          repeatCount > 0 ||
          abbyScripts >= 3),
      detail:
        baseOk &&
        (waits.some((v) => v !== 0.3) ||
          repeatCount > 0 ||
          abbyScripts >= 3)
          ? `重新打开的作品是有效的，改的东西都在：等待 [${waits.join(', ')}] 秒，重复执行 ${repeatCount} 块，脚本 ${abbyScripts} 条。`
          : '重新打开的作品里没有保留你的修改，请确认上次保存成功后再打开。',
    },
  ]
}

/** 仅供测试与文档使用的计数导出。 */
export const __testHelpers = {
  countOpcode,
  countOpcodeInProject,
  topLevelScriptCount,
}
