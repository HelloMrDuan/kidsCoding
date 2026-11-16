/**
 * 纯 Blockly 快照逻辑（SYS-107）：把工作区上的积木读成程序树（ProgramBlock[]）。
 *
 * 本模块是纯的：只用 Blockly 的数据 API（getTopBlocks / getNextBlock /
 * getField / getInputTargetBlock），不碰 DOM、navigator、window，不 import
 * 任何浏览器组件。`blockly` 只以 `import type` 引入（编译时擦除），
 * 因此服务端渲染（SSR 预渲染）也可安全 import 本模块。
 *
 * 背景（OPS-041 P0）：@blockly/keyboard-navigation 在模块顶层读
 * `navigator.platform`，Node 20（CI）下 SSR 预渲染会抛
 * `ReferenceError: navigator is not defined`；旧路由用 dynamic ssr:false
 * 挂载 BlocklyWorkspace 组件，但 forest-hello 的 ops 模块曾静态 import
 * `buildSnapshot` 自 blockly-workspace.tsx，把整个组件模块（含
 * keyboard-navigation）拉回服务端包。buildSnapshot 抽到本模块后，
 * SSR 路径不再经过 blockly-workspace.tsx；组件本身仍沿用旧路由的
 * dynamic ssr:false 挂载模式。
 */
import type * as Blockly from 'blockly'

import { DEFAULT_REPEAT_TIMES, REPEAT_BLOCK, type ProgramBlock } from './program-tree'

/** say_line 积木的台词字段名。 */
export const LINE_FIELD = 'LINE'
/** repeat 积木的次数值字段名。 */
export const REPEAT_TIMES_FIELD = 'TIMES'
/** repeat 积木的“身体”输入名。 */
export const REPEAT_BODY_INPUT = 'DO'

function collectSequence(block: Blockly.Block | null, result: ProgramBlock[]) {
  let current = block

  while (current) {
    const line = current.getField(LINE_FIELD)?.getValue()
    const item: ProgramBlock = typeof line === 'string' && line ? { type: current.type, line } : { type: current.type }
    if (current.type === REPEAT_BLOCK) {
      // SYS-107: the count and the blocks inside the repeat's mouth.
      item.times = Number(current.getFieldValue(REPEAT_TIMES_FIELD)) || DEFAULT_REPEAT_TIMES
      const body: ProgramBlock[] = []
      collectSequence(current.getInputTargetBlock(REPEAT_BODY_INPUT), body)
      item.body = body
    }
    result.push(item)
    current = current.getNextBlock()
  }
}

/** SYS-107: exported for the headless serialisation test. */
export function buildSnapshot(workspace: Blockly.Workspace) {
  const snapshot: ProgramBlock[] = []

  workspace.getTopBlocks(true).forEach((block, index) => {
    const start = snapshot.length
    collectSequence(block, snapshot)
    if (index > 0) snapshot[start].disconnected = true
  })

  return snapshot
}
