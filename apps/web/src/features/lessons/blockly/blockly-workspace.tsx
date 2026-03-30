'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as Blockly from 'blockly'

import {
  getKidsBlockLabel,
  registerKidsBlocks,
} from './register-kids-blocks'

type BlockSnapshot = {
  type: string
}

function collectSequence(
  block: Blockly.Block | null,
  result: BlockSnapshot[],
) {
  let current = block

  while (current) {
    result.push({ type: current.type })
    current = current.getNextBlock()
  }
}

function buildSnapshot(workspace: Blockly.WorkspaceSvg) {
  const snapshot: BlockSnapshot[] = []

  workspace.getTopBlocks(true).forEach((block) => {
    collectSequence(block, snapshot)
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
  onSnapshotChange,
}: {
  allowedBlocks: string[]
  onSnapshotChange: (blocks: Array<{ type: string }>) => void
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const allowedBlockKey = useMemo(() => allowedBlocks.join('|'), [allowedBlocks])
  const stableAllowedBlocks = useMemo(
    () => (allowedBlockKey ? allowedBlockKey.split('|') : []),
    [allowedBlockKey],
  )

  useEffect(() => {
    registerKidsBlocks()

    if (!mountRef.current) {
      return
    }

    const workspace = Blockly.inject(mountRef.current, {
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

    const handleChange = () => {
      onSnapshotChange(buildSnapshot(workspace))
    }

    workspace.addChangeListener(handleChange)
    handleChange()

    return () => {
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
    if (type === 'when_start' && currentBlocks.some((block) => block.type === type)) {
      onSnapshotChange(currentBlocks)
      return
    }

    const block = workspace.newBlock(type)
    block.initSvg()
    block.render()
    positionOrConnectBlock(workspace, block)

    onSnapshotChange(buildSnapshot(workspace))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div
        ref={mountRef}
        className="min-h-[420px] rounded-[1.5rem] border border-slate-200 bg-white"
      />
      <div className="grid content-start gap-3">
        {stableAllowedBlocks.map((type) => (
          <button
            key={type}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm font-bold text-white"
            data-testid={`lesson-add-${type}`}
            onClick={() => addBlock(type)}
            type="button"
          >
            添加积木：{getKidsBlockLabel(type)}
          </button>
        ))}
      </div>
    </div>
  )
}
