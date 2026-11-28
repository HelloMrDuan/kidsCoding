import * as Blockly from 'blockly'
import { describe, expect, it } from 'vitest'

import { BLOCK_LABEL_FIELD, registerKidsBlocks } from '../blockly/register-kids-blocks'

import { rebuildLaunchProgram } from './launch-v3-blockly-ops'

/**
 * OPS-056 / TQ-009: switching 关 rebuilds the canvas through rebuildLaunchProgram (the
 * workspace is not re-injected), so the rebuilt move / repeat blocks must carry the same
 * “飞” / “走” wording as blocks restored on mount or tapped in.
 */
function labelsAfterRebuild(lessonId: string) {
  registerKidsBlocks()
  const ws = new Blockly.Workspace()
  // rebuildLaunchProgram only calls Svg-only APIs on BlockSvg instances; a headless
  // workspace exercises the same create / label / connect path.
  rebuildLaunchProgram(lessonId, ws as unknown as Blockly.WorkspaceSvg, [
    { type: 'when_clicked' },
    { type: 'move_right' },
    { type: 'repeat_twice' },
  ])
  const labels = ws
    .getAllBlocks(true)
    .map((block) => block.getField(BLOCK_LABEL_FIELD)?.getValue())
    .filter(Boolean)
  ws.dispose()
  return labels
}

describe('rebuildLaunchProgram motion wording (OPS-056 / TQ-009)', () => {
  it.each(['lesson-07-garden-click', 'lesson-08-garden-dialogue', 'lesson-09-garden-story'])(
    '%s: the butterfly’s rebuilt blocks say “飞”',
    (lessonId) => {
      expect(labelsAfterRebuild(lessonId)).toEqual(['向右飞 100 步', '重复：再飞 100 步'])
    },
  )

  it('a walking lesson keeps “走”', () => {
    expect(labelsAfterRebuild('lesson-03-forest-story')).toEqual(['向右走 100 步', '重复：再走 100 步'])
  })
})
