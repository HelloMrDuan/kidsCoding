'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import { KeyboardNavigation } from '@blockly/keyboard-navigation'

import { VERB_LABELLED_BLOCKS, type MotionVerb } from './block-labels'
import { BLOCK_LABEL_FIELD, buildKidsToolboxCategories, getKidsBlockLabel, getKidsBlockTheme, registerKidsBlocks } from './register-kids-blocks'
import { restoreBlockSequence } from './restore-block-sequence'
import type { SayLinePreset } from './say-line-presets'

type BlockSnapshot = {
  type: string
  disconnected?: boolean
  /** TQ-008: preset line id chosen on a say block (only when the lesson offers choices). */
  line?: string
}

const LINE_FIELD = 'LINE'
const BASE_SCALE = 0.9
/** Lowest scale the fit may shrink to: still readable for kids on a 375px phone. */
const MIN_FIT_SCALE = 0.6
const FIT_MARGIN = 12
/** Blockly's scrollbars sit inside the view; keep blocks clear of them. */
const SCROLLBAR_ALLOWANCE = 16

let keyboardNavigationRegistered = false

/**
 * UX-203: the keyboard-navigation plugin's styles and its deferring toolbox
 * must be registered once per page load, before Blockly.inject.
 * NOTE: @blockly/keyboard-navigation@3.0.5's own
 * KeyboardNavigation.registerNavigationDeferringToolbox() infinitely
 * recurses (it calls itself instead of the standalone registrar), so the
 * same one-class registration is done here directly with Blockly's public
 * registry API. The class body is identical to the plugin's
 * NavigationDeferringToolbox: a Toolbox whose keydown handling is a no-op
 * so the plugin owns keyboard navigation.
 */
class NavigationDeferringToolbox extends Blockly.Toolbox {
  protected override onKeyDown_(_e: KeyboardEvent) {
    // No-op, prevent keyboard handling by superclass in order to defer to
    // global keyboard navigation.
  }
}

function ensureKeyboardNavigationRegistered() {
  if (keyboardNavigationRegistered) return
  KeyboardNavigation.registerKeyboardNavigationStyles()
  Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX,
    Blockly.registry.DEFAULT,
    NavigationDeferringToolbox,
    true,
  )
  keyboardNavigationRegistered = true
}

/**
 * UX-203: category toolbox for the allowed blocks (verb labels preserved).
 * Falls back to an empty flyout when a lesson allows no blocks at all, so a
 * category toolbox is never injected with zero categories.
 */
function buildKidsToolbox(allowedBlocks: string[], motionVerb: MotionVerb) {
  const categories = buildKidsToolboxCategories(allowedBlocks)
  if (categories.length === 0) return { kind: 'flyoutToolbox' as const, contents: [] }
  return {
    kind: 'categoryToolbox' as const,
    contents: categories.map((category) => ({
      kind: 'category' as const,
      name: category.name,
      colour: category.colour,
      contents: category.types.map((type) =>
        VERB_LABELLED_BLOCKS.includes(type)
          ? { kind: 'block' as const, type, fields: { [BLOCK_LABEL_FIELD]: getKidsBlockLabel(type, motionVerb) } }
          : { kind: 'block' as const, type },
      ),
    })),
  }
}

/**
 * TQ-008: on narrow canvases (375/768) the flyout leaves little room, so a stack with the
 * say-line dropdown ran past the right edge. When the program does not fully show, shrink
 * (never below MIN_FIT_SCALE, never above BASE_SCALE) and scroll it back to the top-left so
 * the whole block, dropdown text included, stays visible. A program that already fits is
 * left exactly where it is.
 *
 * TQ-011: when the program itself is set (a step loads its program — prebuilt or carried
 * over — or a button adds/removes a block, e.g. after “清空积木重拼”), `fromTop` always
 * scrolls the stack back to the top-left with a small margin, so the first block
 * (“开始时”/“被点击时”) is never cut off at the top edge. Dragging keeps the child's view.
 */
/** Returns false only when the fit must wait (mid-drag or hidden pane). */
function fitBlocksToView(workspace: Blockly.WorkspaceSvg, fromTop = false): boolean {
  if (workspace.isDragging()) return false
  if (workspace.getTopBlocks(false).length === 0) return true
  const box = workspace.getBlocksBoundingBox()
  const contentWidth = box.right - box.left
  const contentHeight = box.bottom - box.top
  if (contentWidth <= 0 || contentHeight <= 0) return true
  const metrics = workspace.getMetricsManager()
  const pixelView = metrics.getViewMetrics(false)
  // Hidden pane (phone tabs): nothing to fit yet; try again when it is shown.
  if (pixelView.width <= 0 || pixelView.height <= 0) return false
  const view = metrics.getViewMetrics(true)
  const allowance = SCROLLBAR_ALLOWANCE / workspace.scale
  const fullyVisible =
    box.left >= view.left &&
    box.top >= view.top &&
    box.right <= view.left + view.width - allowance &&
    box.bottom <= view.top + view.height - allowance
  // The flyout zooms with the workspace, so the view narrows as the scale grows: solve the
  // width fit with the flyout's width at the target scale, not at the current one.
  const flyoutWidth = workspace.getFlyout()?.getWidth() ?? 0
  const fitScale = Math.min(
    BASE_SCALE,
    (pixelView.width + flyoutWidth - FIT_MARGIN * 2 - SCROLLBAR_ALLOWANCE) /
      (contentWidth + flyoutWidth / workspace.scale),
    (pixelView.height - FIT_MARGIN * 2 - SCROLLBAR_ALLOWANCE) / contentHeight,
  )
  const targetScale = Math.max(MIN_FIT_SCALE, fitScale)
  const canGrowBack = workspace.scale < BASE_SCALE - 0.01 && targetScale > workspace.scale + 0.01
  if (fullyVisible && !canGrowBack && !fromTop) return true
  if (Math.abs(workspace.scale - targetScale) > 0.01) workspace.setScale(targetScale)
  const scale = workspace.scale
  // Still too wide (clamped at MIN_FIT_SCALE, or the flyout grew with the new scale, which
  // narrows the view): trim the left margin (not below 0) so the right edge stays clear of
  // the scrollbar; the top keeps its margin. Re-read the view, since setScale changes it.
  const viewWidth = metrics.getViewMetrics(false).width
  const leftMargin = Math.min(
    FIT_MARGIN,
    Math.max(0, viewWidth - SCROLLBAR_ALLOWANCE - contentWidth * scale),
  )
  workspace.scroll(leftMargin - box.left * scale, FIT_MARGIN - box.top * scale)
  return true
}

/** TQ-009: show this lesson's wording (“走” or “飞”) on a move/repeat block. */
function applyMotionLabel(block: Blockly.Block, verb: MotionVerb) {
  if (!VERB_LABELLED_BLOCKS.includes(block.type)) return
  const label = getKidsBlockLabel(block.type, verb)
  const field = block.getField(BLOCK_LABEL_FIELD)
  if (field && field.getValue() !== label) field.setValue(label)
}

function collectSequence(block: Blockly.Block | null, result: BlockSnapshot[]) {
  let current = block

  while (current) {
    const line = current.getField(LINE_FIELD)?.getValue()
    result.push(typeof line === 'string' && line ? { type: current.type, line } : { type: current.type })
    current = current.getNextBlock()
  }
}

/**
 * TQ-008: in a lesson with preset dialogue, every say block on the workspace carries a
 * dropdown of the preset lines (no free text). Appending a field fires no Blockly event.
 */
function ensureLineField(block: Blockly.Block, choices: readonly SayLinePreset[], lineId: string) {
  if (block.type !== 'say_line' || block.getField(LINE_FIELD)) return
  const dropdown = new Blockly.FieldDropdown(choices.map((choice) => [choice.text, choice.id] as [string, string]))
  dropdown.setValue(choices.some((choice) => choice.id === lineId) ? lineId : choices[0].id)
  // Own row under “说一句话”, so the block stays narrow enough for the phone workspace.
  block.appendDummyInput('LINE_ROW').appendField(dropdown, LINE_FIELD)
  block.setInputsInline(false)
}

function buildSnapshot(workspace: Blockly.WorkspaceSvg) {
  const snapshot: BlockSnapshot[] = []

  workspace.getTopBlocks(true).forEach((block, index) => {
    const start = snapshot.length
    collectSequence(block, snapshot)
    if (index > 0) snapshot[start].disconnected = true
  })

  return snapshot
}

function positionOrConnectBlock(
  workspace: Blockly.WorkspaceSvg,
  block: Blockly.BlockSvg,
) {
  const existingTopBlocks = workspace
    .getTopBlocks(true)
    .filter((item) => item.id !== block.id)
  const anchor = existingTopBlocks[0]

  if (!anchor || !block.previousConnection) {
    block.moveBy(28, 28 + existingTopBlocks.length * 72)
    return
  }

  let tail: Blockly.Block = anchor
  while (tail.getNextBlock()) {
    tail = tail.getNextBlock() as Blockly.Block
  }

  try {
    tail.nextConnection?.connect(block.previousConnection)
  } catch {
    block.moveBy(28, 28 + existingTopBlocks.length * 72)
  }
}

export function BlocklyWorkspace({
  allowedBlocks,
  blocks,
  onSnapshotChange,
  enableProgramTools = false,
  snapStartOnTop = false,
  sayLineChoices,
  motionVerb = 'walk',
}: {
  allowedBlocks: string[]
  blocks: BlockSnapshot[]
  onSnapshotChange: (blocks: BlockSnapshot[]) => void
  enableProgramTools?: boolean
  /** Grid lessons: a start hat added by button snaps onto a headless stack. */
  snapStartOnTop?: boolean
  /** TQ-008: preset lines the say block may speak in this lesson (dropdown + buttons). */
  sayLineChoices?: readonly SayLinePreset[]
  /** TQ-009: the butterfly flies, so its move/repeat blocks say “飞”. */
  motionVerb?: MotionVerb
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const showFromTopRef = useRef<(() => void) | null>(null)
  const lastSelectedBlockIdRef = useRef<string | null>(null)
  const latestBlocksRef = useRef(blocks)
  const choicesKey = sayLineChoices?.map((choice) => `${choice.id}:${choice.text}`).join('|') ?? ''
  const choicesRef = useRef(sayLineChoices)
  const lastChosenLineRef = useRef<string | undefined>(sayLineChoices?.[0]?.id)
  const [pickedLine, setPickedLine] = useState<string | undefined>(undefined)
  const sayBlockLine = blocks.find((block) => block.type === 'say_line' && block.line)?.line
  const chosenLine = sayBlockLine ?? pickedLine ?? sayLineChoices?.[0]?.id
  const allowedBlockKey = useMemo(() => allowedBlocks.join('|'), [allowedBlocks])
  const stableAllowedBlocks = useMemo(
    () => (allowedBlockKey ? allowedBlockKey.split('|') : []),
    [allowedBlockKey],
  )

  useEffect(() => {
    latestBlocksRef.current = blocks
    choicesRef.current = sayLineChoices
    if (chosenLine) lastChosenLineRef.current = chosenLine
  }, [blocks, sayLineChoices, chosenLine])

  function snapshotOf(workspace: Blockly.WorkspaceSvg) {
    const choices = choicesRef.current
    if (choices && choices.length > 0) {
      workspace.getAllBlocks(false).forEach((block) => ensureLineField(block, choices, lastChosenLineRef.current ?? choices[0].id))
    }
    return buildSnapshot(workspace)
  }

  useEffect(() => {
    registerKidsBlocks()
    ensureKeyboardNavigationRegistered()

    if (!mountRef.current) {
      return
    }

    const workspace = Blockly.inject(mountRef.current, {
      renderer: 'zelos',
      theme: getKidsBlockTheme(),
      grid: { spacing: 18, length: 2, colour: '#dbe4f1', snap: false },
      toolbox: buildKidsToolbox(stableAllowedBlocks, motionVerb),
      trashcan: true,
      move: {
        scrollbars: true,
        drag: true,
        wheel: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: BASE_SCALE,
        minScale: MIN_FIT_SCALE,
        maxScale: 1.2,
      },
    })

    workspaceRef.current = workspace
    const keyboardNav = new KeyboardNavigation(workspace)
    const restoredBlocks = restoreBlockSequence(
      latestBlocksRef.current,
      stableAllowedBlocks,
    )

    restoredBlocks.forEach((snapshot) => {
      const block = workspace.newBlock(snapshot.type)
      applyMotionLabel(block, motionVerb)
      if (choicesRef.current && choicesRef.current.length > 0) {
        ensureLineField(block, choicesRef.current, snapshot.line ?? lastChosenLineRef.current ?? choicesRef.current[0].id)
      }
      block.initSvg()
      block.render()
      if ((snapshot as BlockSnapshot).disconnected) block.moveBy(28, 230)
      else positionOrConnectBlock(workspace, block)
    })

    let fitFrame = 0
    // The program loaded with the step is shown from the top until the child moves it.
    let pendingFromTop = true
    const scheduleFit = (fromTop = false) => {
      if (fromTop) pendingFromTop = true
      cancelAnimationFrame(fitFrame)
      fitFrame = requestAnimationFrame(() => {
        if (fitBlocksToView(workspace, pendingFromTop)) pendingFromTop = false
      })
    }
    showFromTopRef.current = () => scheduleFit(true)

    const handleResize = () => {
      Blockly.svgResize(workspace)
      scheduleFit()
    }

    let previousSnapshot = JSON.stringify(latestBlocksRef.current)
    const handleChange = (event?: Blockly.Events.Abstract) => {
      // UX-203: remember the last selected block id so the delete button
      // (whose own mousedown deselects first) can still remove it.
      if (event instanceof Blockly.Events.Selected && event.newElementId) {
        lastSelectedBlockIdRef.current = event.newElementId
      }
      const next = snapshotOf(workspace)
      const key = JSON.stringify(next)
      // Focus, selection and viewport changes do not edit the program.
      if (key !== previousSnapshot) {
        previousSnapshot = key
        onSnapshotChange(next)
        scheduleFit()
      } else if (event?.type === Blockly.Events.BLOCK_DRAG && !(event as Blockly.Events.BlockDrag).isStart) {
        scheduleFit()
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    resizeObserver.observe(mountRef.current)
    workspace.addChangeListener(handleChange)
    requestAnimationFrame(() => {
      handleResize()
    })
    window.addEventListener('resize', handleResize)
    handleChange()

    return () => {
      cancelAnimationFrame(fitFrame)
      showFromTopRef.current = null
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      workspace.removeChangeListener(handleChange)
      keyboardNav.dispose()
      workspace.dispose()
      workspaceRef.current = null
      lastSelectedBlockIdRef.current = null
    }
    // choicesKey re-injects when the lesson's preset lines change (snapshotOf only reads refs).
  }, [allowedBlockKey, onSnapshotChange, stableAllowedBlocks, choicesKey, motionVerb])

  function addBlock(type: string) {
    const workspace = workspaceRef.current

    if (!workspace) {
      return
    }

    const currentBlocks = snapshotOf(workspace)
    if (
      (type === 'when_start' || type === 'when_clicked') &&
      currentBlocks.some((block) => block.type === type)
    ) {
      onSnapshotChange(currentBlocks)
      return
    }

    const block = workspace.newBlock(type)
    applyMotionLabel(block, motionVerb)
    block.initSvg()
    block.render()
    // A start hat added by button snaps on top of a headless stack (e.g. a
    // starter program missing its start), so tapping alone can fix it.
    const headless = snapStartOnTop && !block.previousConnection && block.nextConnection
      ? workspace.getTopBlocks(true).find((item) => item.id !== block.id && item.previousConnection && !item.previousConnection.isConnected())
      : undefined
    if (headless?.previousConnection && block.nextConnection) {
      const { x, y } = headless.getRelativeToSurfaceXY()
      block.moveTo(new Blockly.utils.Coordinate(x, Math.max(0, y - 48)))
      try {
        block.nextConnection.connect(headless.previousConnection)
      } catch {
        positionOrConnectBlock(workspace, block)
      }
    } else {
      positionOrConnectBlock(workspace, block)
    }

    onSnapshotChange(snapshotOf(workspace))
    showFromTopRef.current?.()
  }

  function chooseLine(lineId: string) {
    lastChosenLineRef.current = lineId
    setPickedLine(lineId)
    const workspace = workspaceRef.current
    if (!workspace) return
    workspace.getAllBlocks(false).forEach((block) => block.getField(LINE_FIELD)?.setValue(lineId))
    onSnapshotChange(snapshotOf(workspace))
  }

  function removeLastBlock() {
    const workspace = workspaceRef.current
    if (!workspace) return
    const tops = workspace.getTopBlocks(true)
    let tail = tops[tops.length - 1]
    if (!tail) return
    while (tail.getNextBlock()) tail = tail.getNextBlock() as Blockly.BlockSvg
    tail.dispose(false)
    onSnapshotChange(snapshotOf(workspace))
    showFromTopRef.current?.()
  }

  /** UX-203: delete the block the child selected in the workspace (click or keyboard). */
  function deleteSelectedBlock() {
    const workspace = workspaceRef.current
    if (!workspace) return
    // Clicking this button deselects the block first (Blockly clears the
    // selection on outside mousedown), so getSelected() is already null by
    // click time. Fall back to the last block the change listener saw
    // selected; a stale id simply resolves to nothing.
    const selected = Blockly.getSelected()
    let target: Blockly.BlockSvg | null = null
    if (selected instanceof Blockly.BlockSvg && selected.workspace === workspace) target = selected
    if (!target && lastSelectedBlockIdRef.current) {
      const byId = workspace.getBlockById(lastSelectedBlockIdRef.current)
      if (byId instanceof Blockly.BlockSvg) target = byId
    }
    lastSelectedBlockIdRef.current = null
    if (!target) return
    target.dispose(true)
    onSnapshotChange(snapshotOf(workspace))
    showFromTopRef.current?.()
  }

  return (
    <section className="flex flex-col gap-3" data-testid="lesson-blockly-workspace">
      {/* isolate: Blockly's flyout (z-index 20) must not paint over the sticky top bar when scrolled. */}
      <div className="isolate overflow-hidden rounded-[10px] border border-[var(--kc-line)] bg-white">
        <div
          ref={mountRef}
          className="relative h-[420px] overflow-hidden bg-white"
        />
      </div>
      {/* UX-203: host for the keyboard-navigation "/" help popup (empty until opened). */}
      <div id="shortcuts" />

      <div className="rounded-[8px] border border-[#e8eef8] bg-[#f3f6fc] p-3">
        <div className="flex items-center justify-between gap-3">
          <b className="text-[12px]">本节可用积木</b>
          <span className="kc-text-muted text-[11px]">不会拖也可以点按钮</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="lesson-block-palette">
          {/* UX-203: delete is core workspace UX like the trashcan, so it is
              not gated with the practice-only 撤回 / 清空 tools. */}
          <button type="button" data-testid="lesson-delete-selected" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={deleteSelectedBlock}>删除选中积木</button>
          {enableProgramTools && <>
            <button type="button" data-testid="lesson-remove-last" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={removeLastBlock}>撤回最后一块</button>
            <button type="button" data-testid="lesson-clear-program" className="kc-action-surface kc-btn-outline kc-btn-sm"
              onClick={() => { workspaceRef.current?.clear(); onSnapshotChange([]) }}>清空积木重拼</button>
          </>}
          {stableAllowedBlocks.map((type) => (
            <button
              key={type}
              className="kc-block-chip"
              data-block={type}
              data-testid={`lesson-add-${type}`}
              onClick={() => addBlock(type)}
              type="button"
            >
              添加积木：{getKidsBlockLabel(type, motionVerb)}
            </button>
          ))}
        </div>
        {sayLineChoices && sayLineChoices.length > 0 && stableAllowedBlocks.includes('say_line') ? (
          <div className="mt-3" data-testid="lesson-say-line-choices">
            <b className="text-[12px]" id="lesson-say-line-choices-label">💬 选一句对白（“说一句话”会说这句）</b>
            <div aria-labelledby="lesson-say-line-choices-label" className="mt-2 flex flex-wrap gap-2" role="group">
              {sayLineChoices.map((choice) => (
                <button
                  aria-pressed={chosenLine === choice.id}
                  className={`kc-say-choice ${chosenLine === choice.id ? 'kc-say-choice-on' : ''}`}
                  data-testid={`lesson-say-line-${choice.id}`}
                  key={choice.id}
                  onClick={() => chooseLine(choice.id)}
                  type="button"
                >
                  {choice.text}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
