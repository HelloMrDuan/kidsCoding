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

/**
 * 保存→关闭→重新打开的真实恢复证据（步骤 8 只认这个，不认“文件里有没有改”）。
 * 由页面在确实发生“保存后重新加载”时提供：库里有上次保存的作品
 * （savedAt），本会话通过桥接把它载入 GUI 并验证非空（loadedAt，
 * restored 为真）。projectHash 把证据绑定到恢复当时的作品内容上：
 * 恢复之后又改过的作品不能“搭便车”——步骤 8 还要求当前作品的哈希
 * 与证据一致（见 evaluateProject）。
 */
export interface RestoreEvidence {
  savedAt: number
  loadedAt: number
  restored: boolean
  projectHash: string
}

/**
 * 作品内容的规范哈希（cyrb53，确定性身份标识，非密码学哈希）：
 * 先把 project.json 按 key 排序规范化再哈希，VM 往返重排 key 顺序
 * 不影响结果；内容一变哈希就变。步骤 8 用它核对“重新打开的作品
 * 是不是当初保存的那一份修改”。
 */
export function projectHash(project: ScratchProject): string {
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize)
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(obj).sort()) out[k] = canonicalize(obj[k])
      return out
    }
    return value
  }
  const text = JSON.stringify(canonicalize(project))
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  )
}

/**
 * 桥接（或未来对端）能提供的真实运行观测值。原型 bridge.js 不发本字段，
 * 没有时评价如实标注“未观测到实际运行过程”，不伪造。
 */
export interface RunObservations {
  /** GUI 里绿旗被点过。 */
  greenFlagClicked?: boolean
  /** 造型确实切换过。 */
  costumeSwitched?: boolean
  /** 声音确实播放过（只证明触发，不证明人耳听到）。 */
  soundPlayed?: boolean
}

export interface EvaluationOptions {
  restoreEvidence?: RestoreEvidence
  runObservations?: RunObservations
  /** 当前被评价作品的 projectHash（与恢复证据的 projectHash 比对用）。 */
  projectHash?: string
}

/**
 * 评价口径说明（页面展示用）：自动评价核对的是项目结构与已观测的
 * 运行证据；没有运行观测值时明确标注局限，不宣称已验证每位孩子
 * 的实际运行结果。
 */
export function evaluationScopeNote(
  observations?: RunObservations,
): string {
  const observed: string[] = []
  if (observations?.greenFlagClicked) observed.push('绿旗被点击')
  if (observations?.costumeSwitched) observed.push('造型确实切换过')
  if (observations?.soundPlayed) observed.push('声音播放被触发')
  if (observed.length > 0) {
    return `本次评价基于项目结构与已观测的运行证据（${observed.join('、')}）。`
  }
  return '本次评价基于项目结构，未观测到实际运行过程（舞台是不是真的在变、音乐是不是真的响，要孩子自己看、自己听）。'
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

/**
 * 能开始一条脚本的帽子积木（绿旗、按键、广播、克隆、自定义积木定义等）。
 * 只有从帽子开始的脚本点绿旗才会跑；没有帽子的浮动积木不算脚本。
 */
function isHatOpcode(opcode: string): boolean {
  return (
    opcode.startsWith('event_') ||
    opcode === 'control_start_as_clone' ||
    opcode === 'procedures_definition'
  )
}

/**
 * 真实连在脚本里的积木 id 集合。
 * 判据：沿 parent 链向上能走到一块顶层帽子积木。浮动积木
 * （parent 为空且自身不是帽子）或挂在浮动积木下的积木都不算；
 * 只数 control_repeat 数量会把没连上的积木也算进去（P2 修复 1）。
 */
export function connectedBlockIds(target: ScratchTarget): Set<string> {
  const blocks = target.blocks ?? {}
  const connected = new Set<string>()
  for (const [id, block] of Object.entries(blocks)) {
    let cur: ScratchBlock | undefined = block
    let guard = 0
    let ok = false
    while (cur && guard < 10000) {
      guard += 1
      if (cur.topLevel) {
        ok = isHatOpcode(cur.opcode)
        break
      }
      const parent: string | null | undefined = cur.parent
      if (typeof parent !== 'string' || !parent || !blocks[parent]) break
      cur = blocks[parent]
    }
    if (ok) connected.add(id)
  }
  return connected
}

/** 只数真实连在脚本里的某类积木（未连接的不算）。 */
export function countConnectedOpcode(
  target: ScratchTarget,
  opcode: string,
): number {
  const connected = connectedBlockIds(target)
  return Object.entries(target.blocks ?? {}).filter(
    ([id, b]) => connected.has(id) && b.opcode === opcode,
  ).length
}

function countOpcodeInProject(project: ScratchProject, opcode: string): number {
  return project.targets.reduce((n, t) => n + countOpcode(t, opcode), 0)
}

/** 该目标的脚本数：只数顶层帽子积木（浮动积木堆不算一条脚本）。 */
function topLevelScriptCount(target: ScratchTarget): number {
  return allBlocks(target).filter(
    (b) => b.topLevel && isHatOpcode(b.opcode),
  ).length
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

/** control_wait 积木的全部等待秒数（只数真实连在脚本里的；浮动的不算）。 */
export function getWaitDurations(project: ScratchProject): number[] {
  const out: number[] = []
  for (const target of project.targets) {
    const connected = connectedBlockIds(target)
    for (const [id, block] of Object.entries(target.blocks ?? {})) {
      if (block.opcode !== 'control_wait') continue
      if (!connected.has(id)) continue
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
 *
 * 评价口径（P2 修复 4）：自动评价核对的是项目结构与已观测的运行证据，
 * 不能宣称已验证每位孩子的实际运行结果；无运行观测值时步骤 0 的
 * detail 末尾明确标注局限。允许多种合理的创作结果，不要求照抄标准答案。
 */
export function evaluateProject(
  project: ScratchProject,
  options: EvaluationOptions = {},
): StepCheckResult[] {
  const stage = getStage(project)
  const abby = getSprite(project, 'Abby')
  const abbyCostumes = abby?.costumes.map((c) => c.name) ?? []
  const stageBackdrops = stage?.costumes.map((c) => c.name) ?? []
  const abbySounds = abby?.sounds.map((s) => s.name) ?? []
  const abbyScripts = abby ? topLevelScriptCount(abby) : 0
  const waits = getWaitDurations(project)
  const currentBackdrop = getCurrentBackdropName(project)
  const observations = options.runObservations
  const scopeNote = evaluationScopeNote(observations)

  // 只数真实连在脚本里的积木：浮动（未连接）的积木不算通过（P2 修复 1）。
  const hasNextCostume =
    !!abby && countConnectedOpcode(abby, 'looks_nextcostume') > 0
  const repeatCount = abby ? countConnectedOpcode(abby, 'control_repeat') : 0
  const foreverCount = abby ? countConnectedOpcode(abby, 'control_forever') : 0
  const hasSetVolume =
    !!abby && countConnectedOpcode(abby, 'sound_setvolumeto') > 0
  const hasPlaySound =
    !!abby &&
    (countConnectedOpcode(abby, 'sound_playuntildone') > 0 ||
      countConnectedOpcode(abby, 'sound_play') > 0)
  const hasSwitchBackdrop =
    !!stage && countConnectedOpcode(stage, 'looks_switchbackdrop') > 0

  // 造型/背景用“至少”（P2 修复 3）：孩子主动增加素材不扣分。
  const baseOk =
    !!abby &&
    abbyCostumes.length >= 4 &&
    stageBackdrops.length >= 3 &&
    abbyScripts >= 2

  // 步骤 8 只认真实的保存→关闭→重新打开流程（P2 修复 2）：
  // 恢复证据为真、当前作品的哈希与证据一致（恢复后又改过的不算），
  // 且修改仍在。没有恢复证据时不通过，并写明原因。
  const restoreEvidence = options.restoreEvidence
  const hasRestored = restoreEvidence?.restored === true
  const hashMatches =
    hasRestored &&
    options.projectHash !== undefined &&
    restoreEvidence.projectHash === options.projectHash
  const modificationsKept =
    waits.some((v) => v !== 0.3) || repeatCount > 0 || abbyScripts >= 3
  const step8Pass = baseOk && hashMatches && modificationsKept
  const step8Detail = !hasRestored
    ? '还没有“保存后重新打开”的记录：这一步只认真实走完保存→关闭→重新打开的流程（不是只看文件里有没有改）。先保存作品，再关掉重新打开一次，然后重新检查。'
    : !hashMatches
      ? '这次检查的作品和上次重新打开的作品不一样（保存后又改过了）：这一步要的是改完保存、关掉、重新打开后修改还在。请先点“检查我的作品”保存当前作品，再关掉重新打开一次，然后重新检查。'
      : step8Pass
      ? `重新打开的作品是有效的，改的东西都在：等待 [${waits.join(', ')}] 秒，重复执行 ${repeatCount} 块，脚本 ${abbyScripts} 条（上次保存于 ${new Date(restoreEvidence.savedAt).toLocaleString('zh-CN')}，重新打开于 ${new Date(restoreEvidence.loadedAt).toLocaleString('zh-CN')}）。`
      : '重新打开的作品里没有保留你的修改，请确认上次保存成功后再打开。'

  return [
    {
      id: 'step-0-preview',
      pass: baseOk,
      detail: baseOk
        ? `Abby 在，造型 ${abbyCostumes.length} 个（至少 4 个：${abbyCostumes.join('、')}），背景 ${stageBackdrops.length} 个（至少 3 个），脚本 ${abbyScripts} 条。${scopeNote}`
        : `项目不完整：Abby=${!!abby}，造型 ${abbyCostumes.length} 个（至少 4 个），背景 ${stageBackdrops.length} 个（至少 3 个），脚本 ${abbyScripts} 条。${scopeNote}`,
    },
    {
      id: 'step-1-load',
      pass: baseOk,
      detail: baseOk
        ? `作品已打开：Abby、至少 4 个造型、至少 3 个背景、${abbyScripts} 条脚本都在。`
        : `作品未完整加载：Abby=${!!abby}，造型 ${abbyCostumes.length} 个（至少 4 个），背景 ${stageBackdrops.length} 个（至少 3 个），脚本 ${abbyScripts} 条。`,
    },
    {
      id: 'step-2-observe',
      pass: hasNextCostume,
      detail: hasNextCostume
        ? '找到连在脚本里的“下一个造型”积木：Abby 靠它换姿势跳舞。' +
          (observations?.costumeSwitched
            ? '已观测到造型确实切换过。'
            : '')
        : '没找到连在脚本里的“下一个造型”积木：Abby 还不会换姿势（只放在旁边、没连上的不算）。',
    },
    {
      id: 'step-3-loop',
      pass: repeatCount > 0,
      detail:
        repeatCount > 0
          ? `找到真实连在脚本里的“重复执行”积木 ${repeatCount} 块，转圈循环已加上。`
          : `还没找到真实连在脚本里的“重复执行”积木（当前 forever ${foreverCount} 块是原来的跳舞和音乐循环；只放在旁边、没连上的不算）。`,
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
          ? `Abby 现在有 ${abbyScripts} 条脚本（原来 2 条），你编的新脚本在里面；循环积木：重复执行 ${repeatCount} 块、永远执行 ${foreverCount} 块。`
          : `Abby 只有 ${abbyScripts} 条脚本（原来 2 条），还没编出自己的新脚本。`,
    },
    {
      id: 'step-8-save',
      pass: step8Pass,
      detail: step8Detail,
    },
  ]
}

/** 仅供测试与文档使用的计数导出。 */
export const __testHelpers = {
  countOpcode,
  countOpcodeInProject,
  topLevelScriptCount,
  countConnectedOpcode,
  connectedBlockIds,
}
