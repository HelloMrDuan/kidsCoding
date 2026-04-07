'use client'

import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { PreviewStage } from '@/features/lessons/blockly/preview-stage'

export function TemplateStoryBuilder({
  allowedBlocks,
  onSnapshotChange,
  templateName,
  blocks,
}: {
  allowedBlocks: string[]
  onSnapshotChange: (blocks: Array<{ type: string }>) => void
  templateName: string
  blocks: Array<{ type: string }>
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-violet-200 bg-[linear-gradient(180deg,#f8f2ff_0%,#ffffff_100%)] px-5 py-4 shadow-[0_16px_28px_rgba(124,92,255,0.1)]">
        <p className="text-sm font-semibold text-violet-800">当前模板：{templateName}</p>
      </div>
      <PreviewStage blocks={blocks} />
      <BlocklyWorkspace
        allowedBlocks={allowedBlocks}
        blocks={blocks}
        onSnapshotChange={onSnapshotChange}
      />
    </div>
  )
}
