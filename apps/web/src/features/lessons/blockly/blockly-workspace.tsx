'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as Blockly from 'blockly'

import { getKidsBlockLabel, registerKidsBlocks } from './register-kids-blocks'
import { restoreBlockSequence } from './restore-block-sequence'

type BlockSnapshot = {
  type: string
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
  blocks,
  onSnapshotChange,
}: {
  allowedBlocks: string[]
  blocks: Array<{ type: string }>
  onSnapshotChange: (blocks: Array<{ type: string }>) => void
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
      positionOrConnectBlock(workspace, block)
    })

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
    <section className="space-y-4" data-testid="lesson-blockly-workspace">
      <div className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#fff9f2_0%,#ffffff_100%)] px-5 py-4 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#ff8b4e]">创作积木桌</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">把积木拼起来，让舞台里的故事发生</h3>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            先拼，再看
          </span>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          左边拖动积木，或者直接点下面的快捷按钮补上当前课需要的积木。现在先把故事拼出来，再慢慢理解为什么这样拼。
        </p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white px-3 py-3 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
        <div
          ref={mountRef}
          className="min-h-[420px] rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)]"
        />
      </div>

      <div className="rounded-[2rem] bg-slate-900 px-5 py-5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-200">本节可用积木</p>
            <h4 className="mt-1 text-lg font-black text-white">只保留这一步真正需要的积木</h4>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-bold tracking-[0.18em] text-slate-200">
            BLOCKS
          </span>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          这样能减少分心，让孩子先把当前动作做出来，再往下一步走。
        </p>

        <div className="mt-4 flex flex-wrap gap-3" data-testid="lesson-block-palette">
          {stableAllowedBlocks.map((type) => (
            <button
              key={type}
              className="rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-[#fff1da]"
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
