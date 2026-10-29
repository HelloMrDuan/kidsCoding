import * as Blockly from 'blockly'
import { describe, expect, it } from 'vitest'

import { buildSnapshot } from './blockly-workspace'
import { registerKidsBlocks } from './register-kids-blocks'

// SYS-107: the real Blockly block serialises its count and the blocks in its mouth.
describe('repeat_times block (SYS-107)', () => {
  it('is a C-shaped block whose body and count reach the program snapshot', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    const start = ws.newBlock('when_start')
    const loop = ws.newBlock('repeat_times')
    loop.setFieldValue('4', 'TIMES')
    start.nextConnection!.connect(loop.previousConnection!)
    const a = ws.newBlock('move_forward')
    const b = ws.newBlock('turn_right')
    loop.getInput('DO')!.connection!.connect(a.previousConnection!)
    a.nextConnection!.connect(b.previousConnection!)
    const after = ws.newBlock('move_forward')
    loop.nextConnection!.connect(after.previousConnection!)

    expect(buildSnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'repeat_times', times: 4, body: [{ type: 'move_forward' }, { type: 'turn_right' }] },
      { type: 'move_forward' },
    ])
    ws.dispose()
  })

  it('an empty repeat serialises with an empty body (the engine reports it)', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    const start = ws.newBlock('when_start')
    const loop = ws.newBlock('repeat_times')
    start.nextConnection!.connect(loop.previousConnection!)
    expect(buildSnapshot(ws)).toEqual([{ type: 'when_start' }, { type: 'repeat_times', times: 2, body: [] }])
    ws.dispose()
  })

  it('offers only the small counts a 5–7 year old picks from', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    const loop = ws.newBlock('repeat_times')
    const options = (loop.getField('TIMES') as Blockly.FieldDropdown).getOptions(false).map(o => o[1])
    expect(options).toEqual(['2', '3', '4', '5', '6', '8'])
    ws.dispose()
  })
})
