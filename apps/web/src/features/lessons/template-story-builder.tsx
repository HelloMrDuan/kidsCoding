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
      <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50 px-4 py-3">
        <p className="text-sm font-semibold text-violet-800">
          当前模板：{templateName}
        </p>
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
