'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as Blockly from 'blockly'

import { getKidsBlockLabel, getKidsBlockTheme, registerKidsBlocks } from './register-kids-blocks'
import { restoreBlockSequence } from './restore-block-sequence'

type BlockSnapshot = {
  type: string
  disconnected?: boolean
}

function collectSequence(block: Blockly.Block | null, result: BlockSnapshot[]) {
  let current = block

  while (current) {
    result.push({ type: current.type })
    current = current.getNextBlock()
  }
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
}: {
  allowedBlocks: string[]
  blocks: Array<{ type: string }>
  onSnapshotChange: (blocks: Array<{ type: string }>) => void
  enableProgramTools?: boolean
  /** Grid lessons: a start hat added by button snaps onto a headless stack. */
  snapStartOnTop?: boolean
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const latestBlocksRef = useRef(blocks)
  const allowedBlockKey = useMemo(() => allowedBlocks.join('|'), [allowedBlocks])
  const stableAllowedBlocks = useMemo(
    () => (allowedBlockKey ? allowedBlockKey.split('|') : []),
    [allowedBlockKey],
  )

  useEffect(() => {
    latestBlocksRef.current = blocks
  }, [blocks])

  useEffect(() => {
    registerKidsBlocks()

    if (!mountRef.current) {
      return
    }

    const workspace = Blockly.inject(mountRef.current, {
      renderer: 'zelos',
      theme: getKidsBlockTheme(),
      grid: { spacing: 18, length: 2, colour: '#dbe4f1', snap: false },
      toolbox: {
        kind: 'flyoutToolbox',
        contents: stableAllowedBlocks.map((type) => ({ kind: 'block', type })),
      },
      trashcan: false,
      move: {
        scrollbars: true,
        drag: true,
        wheel: true,
      },
      zoom: {
        controls: false,
        wheel: true,
        startScale: 0.9,
        minScale: 0.8,
        maxScale: 1.2,
      },
    })

    workspaceRef.current = workspace
    const restoredBlocks = restoreBlockSequence(
      latestBlocksRef.current,
      stableAllowedBlocks,
    )

    restoredBlocks.forEach((snapshot) => {
      const block = workspace.newBlock(snapshot.type)
      block.initSvg()
      block.render()
      if ((snapshot as BlockSnapshot).disconnected) block.moveBy(28, 230)
      else positionOrConnectBlock(workspace, block)
    })

    const handleResize = () => {
      Blockly.svgResize(workspace)
    }

    let previousSnapshot = JSON.stringify(latestBlocksRef.current)
    const handleChange = () => {
      const next = buildSnapshot(workspace)
      const key = JSON.stringify(next)
      // Focus, selection and viewport changes do not edit the program.
      if (key !== previousSnapshot) {
        previousSnapshot = key
        onSnapshotChange(next)
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
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      workspace.removeChangeListener(handleChange)
      workspace.dispose()
      workspaceRef.current = null
    }
  }, [allowedBlockKey, onSnapshotChange, stableAllowedBlocks])

  function addBlock(type: string) {
    const workspace = workspaceRef.current

    if (!workspace) {
      return
    }

    const currentBlocks = buildSnapshot(workspace)
    if (
      (type === 'when_start' || type === 'when_clicked') &&
      currentBlocks.some((block) => block.type === type)
    ) {
      onSnapshotChange(currentBlocks)
      return
    }

    const block = workspace.newBlock(type)
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

    onSnapshotChange(buildSnapshot(workspace))
  }

  function removeLastBlock() {
    const workspace = workspaceRef.current
    if (!workspace) return
    const tops = workspace.getTopBlocks(true)
    let tail = tops[tops.length - 1]
    if (!tail) return
    while (tail.getNextBlock()) tail = tail.getNextBlock() as Blockly.BlockSvg
    tail.dispose(false)
    onSnapshotChange(buildSnapshot(workspace))
  }

  return (
    <section className="flex flex-col gap-3" data-testid="lesson-blockly-workspace">
      <div className="overflow-hidden rounded-[10px] border border-[var(--kc-line)] bg-white">
        <div
          ref={mountRef}
          className="relative h-[420px] overflow-hidden bg-white"
        />
      </div>

      <div className="rounded-[8px] border border-[#e8eef8] bg-[#f3f6fc] p-3">
        <div className="flex items-center justify-between gap-3">
          <b className="text-[12px]">本节可用积木</b>
          <span className="kc-text-muted text-[11px]">不会拖也可以点按钮</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="lesson-block-palette">
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
              添加积木：{getKidsBlockLabel(type)}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
