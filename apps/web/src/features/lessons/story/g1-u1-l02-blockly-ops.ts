/**
 * G1-U1-L02 课程自有 Blockly 操作助手（Q4：手机 ↑↓ 排序 + 切关换程序）。
 *
 * 只用 Blockly 公共静态 API（Blockly.Workspace.getAll / 连接操作），不改
 * 共享文件、不给 BlocklyWorkspace 加受控出口、不重建工作区：
 * - findStoryWorkspace：用 Workspace.getAll() 找到挂载在插槽容器内的
 *   WorkspaceSvg（以 getInjectionDiv() 落在插槽 ref 容器内为准）。
 * - moveStoryBlock：用 unplug（愈合）+ reconnect 在主程序链内重排一块，
 *   Blockly 画布是唯一事实来源；快照经工作区事件自动更新，数据跟随快照。
 *   这不是“数据层排序 + 画布只读同步”（设计文档否决的路径③）。
 * - rebuildStoryProgram：切关时按新关的程序数据重建画布上的积木（先清
 *   顶层栈再按序新建连接），工作区实例本身不重建。
 * - setBlockLine：给一块 say_line 换台词（下拉框设值）；不存在行下拉框
 *   时按块补一个（与 BlocklyWorkspace 的 TQ-008 同款，不改共享文件）。
 * - 数字改参不适用：本课无数字参数（无移动步数、无 repeat 积木），
 *   故本模块不提供改参操作，不得为凑数造假参数。
 * - ✕ 删除复用 BlocklyWorkspace 自带删除（选中 + 删除按钮、拖到垃圾桶），
 *   不在本模块另造删除路径。
 */
import * as Blockly from 'blockly'

import { buildSnapshot } from '../blockly/blockly-workspace'
import type { ProgramBlock } from '../blockly/program-tree'

const LINE_FIELD = 'LINE'

export type SayLineChoice = { readonly id: string; readonly text: string }

/**
 * 在插槽容器内定位本课的 Blockly 工作区。headless Workspace 没有
 * getInjectionDiv（undefined），按定义不在候选内；工具箱 flyout 也有
 * 自己的 WorkspaceSvg 且 injectionDiv 同样落在容器内，必须用 isFlyout
 * 排除（浏览器探针实测：getAll() 返回主工作区 + 2 个 flyout 工作区，
 * 仅主工作区的 isFlyout 为 false）。
 */
export function findStoryWorkspace(container: HTMLElement | null): Blockly.WorkspaceSvg | null {
  if (!container) return null
  for (const workspace of Blockly.Workspace.getAll()) {
    if (!(workspace instanceof Blockly.WorkspaceSvg)) continue
    if (workspace.isFlyout) continue
    const injectionDiv = workspace.getInjectionDiv()
    if (injectionDiv && container.contains(injectionDiv)) return workspace
  }
  return null
}

/** 主程序链：第一叠积木，按 next 连接走到尾。 */
export function mainStoryStack(workspace: Blockly.Workspace): Blockly.Block[] {
  const top = workspace.getTopBlocks(true)[0]
  if (!top) return []
  const chain: Blockly.Block[] = []
  let current: Blockly.Block | null = top
  while (current) {
    chain.push(current)
    current = current.getNextBlock()
  }
  return chain
}

export function storySnapshot(workspace: Blockly.Workspace): ProgramBlock[] {
  return buildSnapshot(workspace)
}

/**
 * 在主程序链内把第 index 块上移（direction=-1）或下移（+1）。
 * - 第 0 块（开始事件）永不移动，也没有任何块能移到它上面。
 * - 越界 / 目标不存在时返回 false，不动画布。
 * - 成功时返回 true；快照由 BlocklyWorkspace 的 change 监听自动发出。
 */
export function moveStoryBlock(
  workspace: Blockly.WorkspaceSvg,
  index: number,
  direction: -1 | 1,
): boolean {
  const chain = mainStoryStack(workspace)
  if (index <= 0 || index >= chain.length) return false
  const targetIndex = index + direction
  if (targetIndex <= 0 || targetIndex >= chain.length) return false
  const target = chain[index]
  const neighbour = chain[targetIndex]
  // 先把 target 从链中断开并愈合缺口：链变为 [..., neighbour, after, ...]
  //（direction=+1 时 neighbour 紧跟 target 之后；direction=-1 时在前）。
  target.unplug(true)
  if (direction === 1) {
    // 把 target 接到 neighbour 之后。
    const after = neighbour.getNextBlock()
    if (neighbour.nextConnection?.isConnected()) neighbour.nextConnection.disconnect()
    try {
      neighbour.nextConnection?.connect(target.previousConnection!)
      if (after?.previousConnection) target.nextConnection?.connect(after.previousConnection)
    } catch {
      return false
    }
  } else {
    // 把 target 接到 neighbour 之前。
    const before = neighbour.getPreviousBlock()
    if (neighbour.previousConnection?.isConnected()) neighbour.previousConnection.disconnect()
    try {
      if (before?.nextConnection) {
        before.nextConnection.connect(target.previousConnection!)
      }
      target.nextConnection?.connect(neighbour.previousConnection!)
    } catch {
      return false
    }
  }
  return true
}

/** say_line 块自带的行下拉框：不存在时按块补一个（与 BlocklyWorkspace 的 TQ-008 同款，不改共享文件）。 */
function ensureStoryLineField(block: Blockly.Block, choices: readonly SayLineChoice[], lineId: string): void {
  if (block.type !== 'say_line' || block.getField(LINE_FIELD)) return
  const dropdown = new Blockly.FieldDropdown(choices.map((choice) => [choice.text, choice.id] as [string, string]))
  dropdown.setValue(choices.some((choice) => choice.id === lineId) ? lineId : choices[0].id)
  block.appendDummyInput('LINE_ROW').appendField(dropdown, LINE_FIELD)
  block.setInputsInline(false)
}

/**
 * 给一块 say_line 换台词：行下拉框不存在时先按块补一个再设值。
 * 非 say_line 块或台词 id 不在选项内时返回 false，不改画布。
 */
export function setBlockLine(
  block: Blockly.Block,
  lineId: string,
  choices: readonly SayLineChoice[],
): boolean {
  if (block.type !== 'say_line') return false
  if (!choices.some((choice) => choice.id === lineId)) return false
  ensureStoryLineField(block, choices, lineId)
  const field = block.getField(LINE_FIELD)
  if (!field) return false
  field.setValue(lineId)
  return true
}

/**
 * 按程序数据重建画布上的积木（切关时调用）。只重建积木，不重建工作区：
 * 先清全部顶层栈，再按序新建、连接、按块设行；Svg 块才做 initSvg/render/moveTo。
 */
export function rebuildStoryProgram(
  workspace: Blockly.WorkspaceSvg,
  program: ProgramBlock[],
  choices: readonly SayLineChoice[],
): void {
  for (const top of [...workspace.getTopBlocks(false)]) {
    top.dispose(false)
  }
  let previous: Blockly.Block | null = null
  for (const item of program) {
    let block: Blockly.Block
    try {
      block = workspace.newBlock(item.type)
    } catch {
      continue
    }
    if (item.type === 'say_line') {
      ensureStoryLineField(block, choices, item.line ?? choices[0].id)
      const field = block.getField(LINE_FIELD)
      if (field && item.line) field.setValue(item.line)
    }
    if (block instanceof Blockly.BlockSvg) {
      block.initSvg()
      block.render()
    }
    if (previous?.nextConnection && block.previousConnection) {
      try {
        previous.nextConnection.connect(block.previousConnection)
      } catch {
        // 连接失败即作散块留置，不丢块、不崩溃。
      }
    } else if (!previous && block instanceof Blockly.BlockSvg) {
      block.moveTo(new Blockly.utils.Coordinate(24, 16))
    }
    previous = block
  }
}
