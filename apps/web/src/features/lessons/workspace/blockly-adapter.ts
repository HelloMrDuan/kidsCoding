/**
 * BlocklyAdapter — EngineAdapter over real Blockly (WORKSPACE-API.md §2).
 *
 * Reuse (verified against main 754f7f43, see ENGINE-AUDIT):
 * - `registerKidsBlocks()` / `getKidsBlockTheme()` / `buildKidsToolboxCategories()`
 *   from `features/lessons/blockly/register-kids-blocks.ts`.
 * - Snapshot shape follows `features/lessons/blockly/program-tree.ts` (repeat
 *   block carries `times` + `body`); the adapter reads/writes live Blockly blocks
 *   directly instead of importing the component's private helpers.
 *
 * DEMO STAGE RUNNER (honest label): run() executes the real Blockly program
 * tree — hat required, moves change x, repeats truly expand their bodies — and
 * plays the resulting frames on a timer so stop() can interrupt mid-playback.
 * This is a demo stage over the demo block set, NOT a general Scratch engine
 * and NOT the Scratch VM. It must never be described as either.
 *
 * DEMO BLOCK GAP (reported, not hidden): the shared kids block set has no
 * numeric-step move block (its moves are single unit moves in grid lessons) and
 * no if-blocks. The demo therefore defines two demo-only block types below
 * (`ws_move_right` / `ws_move_left` with a STEPS number field) inside this
 * file only. Formal lessons need chief-approved block additions; this file must
 * not be mistaken for a shared block-set change.
 */

import * as Blockly from 'blockly'

import { BLOCKLY_MEDIA_PATH } from '@/features/lessons/blockly/blockly-media'
import {
  buildKidsToolboxCategories,
  getKidsBlockTheme,
  registerKidsBlocks,
} from '@/features/lessons/blockly/register-kids-blocks'
import { REPEAT_TIMES_OPTIONS } from '@/features/lessons/blockly/program-tree'

import {
  emptySelectionState,
  updateBlockSelection,
  type SelectionState,
} from './block-selection'
import { buildJudgment } from './demo-judging'
import type {
  BlockCategory,
  BlockInventoryItem,
  EngineAdapter,
  EngineState,
  RunEvent,
} from './workspace-adapters'
import type { FileCapabilities, JudgmentResult, RunTrace } from './workspace-slots'
import { statesToRunFrames } from './workspace-slots'
import { toJudgmentResult } from './workspace-judging'

export const DEMO_HAT = 'when_start'
export const DEMO_REPEAT = 'repeat_times'
export const DEMO_MOVE_RIGHT = 'ws_move_right'
export const DEMO_MOVE_LEFT = 'ws_move_left'
export const DEMO_ALLOWED_BLOCKS = [DEMO_HAT, DEMO_MOVE_RIGHT, DEMO_MOVE_LEFT, DEMO_REPEAT] as const

/** Maximum expanded move actions per run. Over-cap runs fail, never truncate. */
export const DEMO_STEP_CAP = 80
/** Maximum repeat nesting depth the demo runner accepts (safety bound). */
export const DEMO_MAX_REPEAT_DEPTH = 8
/** Playback speed: one frame per tick. */
export const DEMO_FRAME_MS = 300

export type DemoBlock = {
  type: string
  disconnected?: boolean
  steps?: number
  times?: number
  body?: DemoBlock[]
}

export type DemoRunTrace = {
  didMove: boolean
  usedRepeat: boolean
  finalX: number
}

export type DemoExpandResult =
  | { ok: true; actions: Array<{ steps: number; direction: 1 | -1; fromRepeat: boolean }> }
  | { ok: false; reason: string; message: string }

export type DemoRunResult =
  | { ok: true; frames: EngineState[]; finalX: number; trace: DemoRunTrace }
  | { ok: false; reason: string; message: string }

const KNOWN_DEMO_TYPES = new Set<string>(DEMO_ALLOWED_BLOCKS)

/** Pure validation of a demo script. Throws an Error with a named reason. */
export function validateDemoBlocks(script: unknown): DemoBlock[] {
  if (!Array.isArray(script)) {
    throw new Error('脚本无效：脚本必须是一个积木列表')
  }
  let total = 0
  const check = (list: unknown, depth: number): DemoBlock[] => {
    if (!Array.isArray(list)) {
      throw new Error('脚本无效：积木列表格式错误')
    }
    return list.map((raw) => {
      const b = raw as Partial<DemoBlock> | null
      if (!b || typeof b.type !== 'string' || !KNOWN_DEMO_TYPES.has(b.type)) {
        throw new Error(`脚本无效：未知积木类型 ${b && typeof b.type === 'string' ? b.type : '（缺失）'}`)
      }
      total += 1
      if (total > 200) {
        throw new Error('脚本无效：积木总数超过 200')
      }
      const block: DemoBlock = { type: b.type }
      if (b.disconnected === true) block.disconnected = true
      if (b.type === DEMO_MOVE_RIGHT || b.type === DEMO_MOVE_LEFT) {
        if (typeof b.steps !== 'number' || !Number.isFinite(b.steps) || b.steps < 0) {
          throw new Error('脚本无效：移动积木的步数必须是有限非负数字')
        }
        block.steps = b.steps
      }
      if (b.type === DEMO_REPEAT) {
        if (
          typeof b.times !== 'number' ||
          !Number.isInteger(b.times) ||
          !(REPEAT_TIMES_OPTIONS as readonly number[]).includes(b.times)
        ) {
          throw new Error(`脚本无效：重复次数必须是 ${REPEAT_TIMES_OPTIONS.join('、')} 之一`)
        }
        if (depth + 1 > DEMO_MAX_REPEAT_DEPTH) {
          throw new Error('脚本无效：重复嵌套过深')
        }
        block.times = b.times
        block.body = check(b.body ?? [], depth + 1)
      }
      return block
    })
  }
  return check(script, 0)
}

/** Pure expansion: hat + moves + true repeat expansion. Never truncates. */
export function expandDemoProgram(blocks: DemoBlock[], cap: number = DEMO_STEP_CAP): DemoExpandResult {
  if (blocks.length === 0) {
    return { ok: false, reason: 'missing_start', message: '缺少开始积木：第一个积木必须是开始积木' }
  }
  if (blocks.some((b) => b.disconnected === true)) {
    return { ok: false, reason: 'disconnected', message: '存在未连接的积木：请把所有积木连到主程序上' }
  }
  if (blocks[0].type !== DEMO_HAT) {
    return { ok: false, reason: 'missing_start', message: '缺少开始积木：第一个积木必须是开始积木' }
  }
  const actions: Array<{ steps: number; direction: 1 | -1; fromRepeat: boolean }> = []
  const visit = (list: DemoBlock[], fromRepeat: boolean, depth: number): DemoExpandResult | null => {
    for (const block of list) {
      if (block.type === DEMO_MOVE_RIGHT || block.type === DEMO_MOVE_LEFT) {
        if (typeof block.steps !== 'number' || !Number.isFinite(block.steps) || block.steps < 0) {
          return { ok: false, reason: 'invalid_steps', message: '移动步数无效：步数必须是有限非负数字' }
        }
        actions.push({ steps: block.steps, direction: block.type === DEMO_MOVE_RIGHT ? 1 : -1, fromRepeat })
        if (actions.length > cap) {
          return { ok: false, reason: 'too_many_steps', message: `展开步数超过上限 ${cap}，请缩短程序后重新运行` }
        }
      } else if (block.type === DEMO_REPEAT) {
        if (typeof block.times !== 'number' || !Number.isInteger(block.times) || block.times < 0) {
          return { ok: false, reason: 'invalid_times', message: '重复次数无效：次数必须是有限非负整数' }
        }
        if (!block.body || block.body.length === 0) {
          return { ok: false, reason: 'empty_repeat', message: '重复积木里没有积木：请在重复里放入至少一块移动积木' }
        }
        if (depth + 1 > DEMO_MAX_REPEAT_DEPTH) {
          return { ok: false, reason: 'too_deep', message: '重复嵌套过深' }
        }
        for (let r = 0; r < block.times; r++) {
          const failed = visit(block.body, true, depth + 1)
          if (failed) return failed
        }
      } else if (block.type === DEMO_HAT) {
        // A hat anywhere after the first block is not part of the main program.
        return { ok: false, reason: 'misplaced_start', message: '开始积木只能出现在程序开头' }
      } else {
        return { ok: false, reason: 'unknown_block', message: `未知积木类型：${block.type}` }
      }
    }
    return null
  }
  const failed = visit(blocks.slice(1), false, 0)
  if (failed) return failed
  return { ok: true, actions }
}

/** Pure run: expand, then compute one frame per executed move. Score stays 0 during play. */
export function runDemoProgram(blocks: DemoBlock[], cap: number = DEMO_STEP_CAP): DemoRunResult {
  const expanded = expandDemoProgram(blocks, cap)
  if (!expanded.ok) return expanded
  let x = 0
  const frames: EngineState[] = []
  let didMove = false
  let usedRepeat = false
  for (const action of expanded.actions) {
    x += action.direction * action.steps
    if (action.steps > 0) {
      didMove = true
      if (action.fromRepeat) usedRepeat = true
    }
    frames.push({ x, score: 0, running: true, frames: frames.length + 1 })
  }
  return { ok: true, frames, finalX: x, trace: { didMove, usedRepeat, finalX: x } }
}

let demoBlocksDefined = false

function defineDemoMoveBlocks() {
  if (demoBlocksDefined) return
  Blockly.defineBlocksWithJsonArray([
    {
      type: DEMO_MOVE_RIGHT,
      message0: '向右走 %1 步',
      args0: [{ type: 'field_number', name: 'STEPS', value: 50, min: 0, max: 1000, precision: 1 }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      type: DEMO_MOVE_LEFT,
      message0: '向左走 %1 步',
      args0: [{ type: 'field_number', name: 'STEPS', value: 50, min: 0, max: 1000, precision: 1 }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
  ])
  demoBlocksDefined = true
}

function buildDemoToolbox(allowedBlocks: string[]) {
  const categories = buildKidsToolboxCategories(allowedBlocks)
  if (categories.length === 0) return { kind: 'flyoutToolbox' as const, contents: [] }
  return {
    kind: 'categoryToolbox' as const,
    contents: categories.map((category) => ({
      kind: 'category' as const,
      name: category.name,
      colour: category.colour,
      contents: category.types.map((type) =>
        type === DEMO_MOVE_RIGHT || type === DEMO_MOVE_LEFT
          ? { kind: 'block' as const, type, fields: { STEPS: 50 } }
          : { kind: 'block' as const, type },
      ),
    })),
  }
}

export type BlocklyAdapterOptions = {
  allowedBlocks?: string[]
  /** Demo stage target (spec prototype demo values by default). The shell passes the contract's target. */
  stageTarget?: { fruitX: number; threshold: number }
}

export class BlocklyAdapter implements EngineAdapter {
  private workspace: Blockly.WorkspaceSvg | null = null
  private allowedBlocks: string[]
  private stageTarget: { fruitX: number; threshold: number }
  private x = 0
  private score = 0
  private running = false
  private framesPlayed = 0
  private frames: EngineState[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private onEvent: ((e: RunEvent) => void) | null = null
  private lastTrace: DemoRunTrace | null = null
  private lastRunError: string | null = null
  /** Incremented on every run() call; identifies the generic run trace. */
  private runCount = 0
  private cachedScript: DemoBlock[] = []
  private changeListeners = new Set<() => void>()
  private blocklyChangeListener: ((e: Blockly.Events.Abstract) => void) | null = null
  /** R2-2: self-observed container resize (tablet rotation, panel collapse). */
  private resizeObserver: ResizeObserver | null = null
  private resizeRaf: number | null = null

  constructor(options: BlocklyAdapterOptions = {}) {
    this.allowedBlocks = options.allowedBlocks ?? [...DEMO_ALLOWED_BLOCKS]
    this.stageTarget = options.stageTarget ?? { fruitX: 200, threshold: 80 }
  }

  /** Engine-specific extension: subscribe to program edits (used for judgment invalidation). */
  addChangeListener(cb: () => void) {
    this.changeListeners.add(cb)
  }

  removeChangeListener(cb: () => void) {
    this.changeListeners.delete(cb)
  }

  /** Last computed run trace (didMove / usedRepeat / finalX), or null before any run. */
  getLastTrace(): DemoRunTrace | null {
    return this.lastTrace
  }

  /**
   * §9 observation API (round 3): the last run as a generic RunTrace.
   * Move frames carry signed dx (horizontal displacement of that step;
   * dy is always 0 for this demo player) and source 'blockly-demo'.
   * `inLoop` is not filled: frame snapshots cannot tell loop membership,
   * and the demo never guesses it. Null before any run. This observes a
   * run; it never judges one — judgment stays in getJudgmentResult.
   */
  getRunTrace(lessonId: string): RunTrace | null {
    if (this.runCount === 0) return null
    return {
      runId: this.runCount,
      lessonId,
      frames: statesToRunFrames(this.frames, 'blockly-demo'),
    }
  }

  /**
   * Engine-specific extension: re-measure the workspace after its container
   * becomes visible (mobile tab switch). Blockly injects into a zero-size
   * container when the script tab starts hidden; without this the canvas
   * stays blank until the next window resize.
   */
  handleVisible() {
    if (!this.workspace) return
    try {
      Blockly.svgResize(this.workspace)
    } catch {
      // A failed re-measure never breaks the program; the next interaction
      // or window resize re-measures.
    }
  }

  /** Last run failure message, or null when the last run attempt succeeded. */
  getLastRunError(): string | null {
    return this.lastRunError
  }

  /**
   * Shell-owned selection tracking (R1): the adapter keeps its own selected
   * block id, updated only by explicit Blockly selection events (see
   * block-selection.ts). The shell never trusts Blockly's focus-fragile
   * getSelected() directly, so toolbar clicks cannot silently drop the
   * selection that move/edit/delete act on.
   */
  private selectionState: SelectionState = emptySelectionState()

  private blockExists(id: string): boolean {
    try {
      return this.workspace?.getBlockById(id) != null
    } catch {
      return false
    }
  }

  getSelectedBlockId(): string | null {
    const id = this.selectionState.selectedId
    if (id && !this.blockExists(id)) {
      this.selectionState = updateBlockSelection(this.selectionState, { kind: 'blockGone' }, (x) => this.blockExists(x))
      return null
    }
    return id
  }

  selectBlockById(id: string) {
    try {
      const block = this.workspace?.getBlockById(id) as { select?: () => void } | null | undefined
      if (block && typeof block.select === 'function') block.select()
    } catch {
      // Selecting a missing block is a no-op; the tracked id stays as-is
      // until the next selection event corrects it.
    }
  }

  /** Adapter-owned draft validation (R4): the demo tree model must validate. */
  validateDraft(script: unknown): boolean {
    try {
      validateDemoBlocks(script)
      return true
    } catch {
      return false
    }
  }

  /** The demo blockly adapter supports every file operation. */
  getFileCapabilities(): FileCapabilities {
    return { canNew: true, canSave: true, canExport: true, canImport: true, canReset: true }
  }

  /**
   * Adapter-owned judgment: the demo three-layer rules live in
   * demo-judging.ts (demo fruit target + threshold + wording). The shell
   * only displays this result; null before any run means "no judgment
   * yet", never a fabricated pass/fail.
   */
  getJudgmentResult(): JudgmentResult | null {
    if (!this.lastTrace) return null
    return toJudgmentResult(buildJudgment(this.stageTarget, this.getState(), this.lastTrace))
  }

  /**
   * Icon rail categories, derived from the same toolbox builder as the
   * flyout, so rail and flyout can never disagree about categories.
   * Pure (no workspace needed): works before mount.
   */
  getBlockCategories(): BlockCategory[] {
    return buildKidsToolboxCategories(this.allowedBlocks).map((category) => ({
      id: category.name,
      label: category.name,
      color: category.colour,
    }))
  }

  /**
   * Drive the real Blockly toolbox selection from the shell's icon rail.
   * Uses IToolbox.setSelectedItem on the item whose category name matches
   * the id (the concrete ToolboxCategory exposes getName(); getId() is
   * the fallback). Clicking the active category deselects it, which
   * closes its flyout. Returns the newly selected id, or null.
   */
  selectCategory(id: string): string | null {
    const workspace = this.workspace
    if (!workspace) return null
    try {
      // Duck-typed on purpose: the IToolbox interface in this Blockly
      // version does not declare getToolboxItems, but the concrete
      // Toolbox (and its .d.ts) does; getSelectedItem/setSelectedItem
      // are on the interface.
      const toolbox = workspace.getToolbox() as unknown as {
        getToolboxItems?: () => Array<{ getName?: () => string; getId?: () => string }>
        getSelectedItem?: () => { getName?: () => string; getId?: () => string } | null
        setSelectedItem?: (item: unknown | null) => void
      } | null
      if (!toolbox) return null
      const items = toolbox.getToolboxItems?.() ?? []
      const item = items.find((candidate) => candidate.getName?.() === id || candidate.getId?.() === id)
      if (!item) return null
      const selected = toolbox.getSelectedItem?.() ?? null
      const selectedId = selected?.getName?.() ?? selected?.getId?.() ?? null
      if (selectedId === id) {
        toolbox.setSelectedItem?.(null)
        return null
      }
      toolbox.setSelectedItem?.(item)
      return id
    } catch {
      return null
    }
  }

  /**
   * Search inventory: one entry per allowed block, labelled from the
   * block's own display text. Pure (no workspace needed).
   */
  getBlockInventory(): BlockInventoryItem[] {
    const labels: Record<string, string> = {
      when_start: '开始时',
      ws_move_right: '向右走',
      ws_move_left: '向左走',
      repeat_times: '重复',
    }
    const categories = buildKidsToolboxCategories(this.allowedBlocks)
    const categoryOf = new Map<string, string>()
    for (const category of categories) {
      for (const type of category.types) categoryOf.set(type, category.name)
    }
    return this.allowedBlocks.map((type) => ({
      type,
      label: labels[type] ?? type,
      categoryId: categoryOf.get(type) ?? '更多',
    }))
  }

  /**
   * Insert one block through the real Blockly API (newBlock + initSvg +
   * render, then connect after the last block of the main chain). Returns
   * false when the type is not allowed or no workspace is mounted; never
   * pretends an insert happened.
   */
  insertBlock(type: string): boolean {
    const workspace = this.workspace
    if (!workspace) return false
    if (!this.allowedBlocks.includes(type)) return false
    try {
      const block = workspace.newBlock(type)
      block.initSvg()
      block.render()
      const tops = workspace.getTopBlocks(false)
      const main = tops.find((candidate) => candidate.type === DEMO_HAT) ?? tops[0] ?? null
      let last: Blockly.BlockSvg | null = main
      while (last?.getNextBlock()) last = last.getNextBlock()
      if (last && last.nextConnection && block.previousConnection) {
        last.nextConnection.connect(block.previousConnection)
        block.render()
      }
      return true
    } catch {
      return false
    }
  }

  /** Editor zoom through WorkspaceSvg scale (inject options: 0.4–2, start 0.9). */
  zoomIn() {
    const workspace = this.workspace
    if (!workspace) return
    try {
      workspace.setScale(Math.min(2, workspace.getScale() * 1.2))
    } catch {
      // A failed zoom never breaks the program.
    }
  }

  zoomOut() {
    const workspace = this.workspace
    if (!workspace) return
    try {
      workspace.setScale(Math.max(0.4, workspace.getScale() / 1.2))
    } catch {
      // A failed zoom never breaks the program.
    }
  }

  zoomReset() {
    const workspace = this.workspace
    if (!workspace) return
    try {
      workspace.setScale(0.9)
    } catch {
      // A failed zoom never breaks the program.
    }
  }

  mount(el: HTMLElement) {
    if (this.workspace) this.unmount()
    registerKidsBlocks()
    defineDemoMoveBlocks()
    const workspace = Blockly.inject(el, {
      renderer: 'zelos',
      theme: getKidsBlockTheme(),
      media: BLOCKLY_MEDIA_PATH,
      toolbox: buildDemoToolbox(this.allowedBlocks),
      trashcan: true,
      move: { drag: true, scrollbars: true, wheel: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.4, scaleSpeed: 1.1 },
    })
    this.workspace = workspace
    this.blocklyChangeListener = (event) => {
      // R1: route selection events into the shell-owned selection tracker
      // BEFORE notifying listeners. Duck-typed on purpose: the listener
      // receives Blockly's own event objects, and only 'selected' / 'click'
      // carry selection information.
      try {
        const e = event as unknown as {
          type?: string
          newElementId?: string | null
          targetType?: string
          blockId?: string | null
        }
        if (e && e.type === 'selected') {
          this.selectionState = updateBlockSelection(
            this.selectionState,
            { kind: 'selected', newElementId: e.newElementId ?? null },
            (id) => this.blockExists(id),
          )
        } else if (e && e.type === 'click') {
          const targetType =
            e.targetType === 'block' || e.targetType === 'workspace' || e.targetType === 'zoom_controls'
              ? e.targetType
              : undefined
          this.selectionState = updateBlockSelection(
            this.selectionState,
            { kind: 'click', targetType, blockId: e.blockId ?? null },
            (id) => this.blockExists(id),
          )
        }
      } catch {
        // Selection tracking never breaks editing; the program cache below
        // is the authoritative path.
      }
      // Refresh the cached script so getScript() reflects live drags even
      // between explicit reads; failures here never break the workspace.
      try {
        this.cachedScript = this.readWorkspace()
      } catch {
        // Keep the previous cache; the next read surfaces the problem.
      }
      for (const cb of this.changeListeners) cb()
    }
    workspace.addChangeListener(this.blocklyChangeListener)
    // R2-2: observe the mount element itself, so container resizes the
    // shell does not know about (tablet rotation, panel-collapse animation)
    // still re-measure Blockly. Guarded: jsdom has no ResizeObserver.
    if (typeof ResizeObserver !== 'undefined') {
      try {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.resizeRaf !== null) cancelAnimationFrame(this.resizeRaf)
          this.resizeRaf = requestAnimationFrame(() => {
            this.resizeRaf = null
            this.handleVisible()
          })
        })
        this.resizeObserver.observe(el)
      } catch {
        this.resizeObserver = null
      }
    }
    if (this.cachedScript.length > 0) {
      try {
        this.buildWorkspace(this.cachedScript)
      } catch {
        // A stale cache must not break mounting; the shell reloads explicitly.
      }
    }
  }

  unmount() {
    this.stopTimer()
    this.running = false
    this.onEvent = null
    if (this.resizeObserver) {
      try {
        this.resizeObserver.disconnect()
      } catch {
        // Disconnect failure is harmless on teardown.
      }
      this.resizeObserver = null
    }
    if (this.resizeRaf !== null) {
      cancelAnimationFrame(this.resizeRaf)
      this.resizeRaf = null
    }
    this.selectionState = emptySelectionState()
    if (this.workspace) {
      if (this.blocklyChangeListener) {
        this.workspace.removeChangeListener(this.blocklyChangeListener)
        this.blocklyChangeListener = null
      }
      this.workspace.dispose()
      this.workspace = null
    }
    this.changeListeners.clear()
  }

  loadScript(script: unknown) {
    // Validate BEFORE clearing so a bad import leaves the program unchanged.
    const validated = validateDemoBlocks(script)
    this.cachedScript = validated
    if (this.workspace) this.buildWorkspace(validated)
  }

  getScript(): DemoBlock[] {
    if (this.workspace) {
      try {
        return this.readWorkspace()
      } catch {
        return JSON.parse(JSON.stringify(this.cachedScript)) as DemoBlock[]
      }
    }
    return JSON.parse(JSON.stringify(this.cachedScript)) as DemoBlock[]
  }

  run(onEvent: (e: RunEvent) => void) {
    // Reset-before-run: stage + score + frames cleared first, so reruns give
    // the same result and the score never accumulates across runs.
    this.stopTimer()
    this.running = false
    this.x = 0
    this.score = 0
    this.framesPlayed = 0
    this.frames = []
    this.lastTrace = null
    this.lastRunError = null
    this.runCount += 1
    this.onEvent = onEvent
    const script = this.getScript()
    const result = runDemoProgram(script)
    if (!result.ok) {
      this.lastRunError = result.message
      throw new Error(result.message)
    }
    this.frames = result.frames
    this.lastTrace = result.trace
    if (result.frames.length === 0) {
      this.finishRun(result.finalX, result.trace)
      return
    }
    this.running = true
    let index = 0
    const tick = () => {
      if (!this.running) return
      const frame = this.frames[index]
      if (!frame) {
        this.finishRun(result.finalX, result.trace)
        return
      }
      this.x = frame.x
      this.framesPlayed = index + 1
      index += 1
      this.onEvent?.({ kind: 'frame', state: this.getState() })
      if (index >= this.frames.length) {
        this.finishRun(result.finalX, result.trace)
      } else {
        this.timer = setTimeout(tick, DEMO_FRAME_MS)
      }
    }
    this.timer = setTimeout(tick, DEMO_FRAME_MS)
  }

  stop() {
    if (!this.running) return
    this.stopTimer()
    this.running = false
    // Score stays 0 for an unfinished run (it is only awarded on finish);
    // the script and the current stage state are kept.
    this.onEvent?.({ kind: 'stopped', state: this.getState() })
  }

  getState(): EngineState {
    return { x: this.x, score: this.score, running: this.running, frames: this.framesPlayed }
  }

  private finishRun(finalX: number, trace: DemoRunTrace) {
    this.stopTimer()
    this.running = false
    this.x = finalX
    this.framesPlayed = this.frames.length
    const caught = Math.abs(finalX - this.stageTarget.fruitX) <= this.stageTarget.threshold
    this.score = caught ? 1 : 0
    this.lastTrace = { ...trace, finalX }
    this.onEvent?.({ kind: 'finished', state: this.getState() })
  }

  private stopTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private buildWorkspace(blocks: DemoBlock[]) {
    const workspace = this.workspace
    if (!workspace) return
    workspace.clear()
    if (blocks.length === 0) return
    // Main chain: blocks until the first disconnected marker; extra chains are
    // built as separate stacks so getScript() round-trips them (and the runner
    // then fails them honestly as disconnected).
    const chains: DemoBlock[][] = [[]]
    let total = 0
    for (const block of blocks) {
      if (block.disconnected === true && total > 0) {
        chains.push([])
      }
      chains[chains.length - 1].push(block)
      total += 1
    }
    let top = 0
    for (const chain of chains) {
      if (chain.length === 0) continue
      let previous: Blockly.BlockSvg | null = null
      for (const snapshot of chain) {
        const block = this.createBlock(workspace, snapshot)
        if (previous) {
          try {
            previous.nextConnection?.connect(block.previousConnection)
          } catch {
            // Leave the block unconnected; the runner reports it as disconnected.
          }
        } else {
          block.moveBy(24, 24 + top * 96)
        }
        previous = block
      }
      top += 1
    }
  }

  private createBlock(workspace: Blockly.WorkspaceSvg, snapshot: DemoBlock): Blockly.BlockSvg {
    const block = workspace.newBlock(snapshot.type)
    if (snapshot.type === DEMO_REPEAT) {
      block.setFieldValue(String(snapshot.times ?? 2), 'TIMES')
    }
    if (snapshot.type === DEMO_MOVE_RIGHT || snapshot.type === DEMO_MOVE_LEFT) {
      block.setFieldValue(String(snapshot.steps ?? 50), 'STEPS')
    }
    block.initSvg()
    block.render()
    if (snapshot.type === DEMO_REPEAT && snapshot.body) {
      let previous: Blockly.BlockSvg | null = null
      for (const child of snapshot.body) {
        const childBlock = this.createBlock(workspace, child)
        const target = previous
          ? previous.nextConnection
          : block.getInput('DO')?.connection
        try {
          if (target && childBlock.previousConnection) target.connect(childBlock.previousConnection)
        } catch {
          // Leave unconnected; the runner reports it honestly.
        }
        previous = childBlock
      }
    }
    return block
  }

  private readWorkspace(): DemoBlock[] {
    const workspace = this.workspace
    if (!workspace) return JSON.parse(JSON.stringify(this.cachedScript)) as DemoBlock[]
    const out: DemoBlock[] = []
    const tops = workspace.getTopBlocks(true)
    tops.forEach((topBlock, chainIndex) => {
      let current: Blockly.Block | null = topBlock
      let firstInChain = true
      while (current) {
        const item: DemoBlock = { type: current.type }
        if (chainIndex > 0 && firstInChain) item.disconnected = true
        if (current.type === DEMO_REPEAT) {
          item.times = Number(current.getFieldValue('TIMES')) || 2
          const body: DemoBlock[] = []
          let bodyBlock = current.getInputTargetBlock('DO')
          while (bodyBlock) {
            body.push(this.readBlockChain(bodyBlock))
            bodyBlock = bodyBlock.getNextBlock()
          }
          item.body = body
        }
        if (current.type === DEMO_MOVE_RIGHT || current.type === DEMO_MOVE_LEFT) {
          item.steps = Number(current.getFieldValue('STEPS'))
        }
        out.push(item)
        firstInChain = false
        current = current.getNextBlock()
      }
    })
    return out
  }

  private readBlockChain(block: Blockly.Block): DemoBlock {
    const item: DemoBlock = { type: block.type }
    if (block.type === DEMO_REPEAT) {
      item.times = Number(block.getFieldValue('TIMES')) || 2
      const body: DemoBlock[] = []
      let bodyBlock = block.getInputTargetBlock('DO')
      while (bodyBlock) {
        body.push(this.readBlockChain(bodyBlock))
        bodyBlock = bodyBlock.getNextBlock()
      }
      item.body = body
    }
    if (block.type === DEMO_MOVE_RIGHT || block.type === DEMO_MOVE_LEFT) {
      item.steps = Number(block.getFieldValue('STEPS'))
    }
    return item
  }
}
