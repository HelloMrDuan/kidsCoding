/**
 * OPS-056：启蒙课 V3 的 Blockly 操作助手（手机 ↑↓ 排序 + 切关换程序，按课程 ID 参数化）。
 *
 * 与 OPS-041 forest-hello-blockly-ops 同一语义，只用 Blockly 公共静态 API，
 * 不改共享文件、不给 BlocklyWorkspace 加受控出口、不重建工作区：
 * - findLaunchWorkspace：Workspace.getAll() 中注入点落在插槽容器内、且不是 flyout 的 WorkspaceSvg。
 * - moveLaunchBlock：unplug（愈合）+ reconnect 在主程序链内重排一块；画布是唯一事实来源。
 * - rebuildLaunchProgram：切关时按程序数据重建画布积木（工作区实例不重建）。
 * - applyLaunchLine：保留 #554（OPS-047）applyGreetingLine 的有效功能——重建时把已选对白
 *   写回 say_line 块（同名字段 LINE、同名输入行 LINE_ROW），改为按 getSayLineChoices(lessonId)
 *   参数化；本课没有预设对白时不加下拉（交给共享组件按场景说话）。
 * - ✕ 删除复用 BlocklyWorkspace 自带删除，不另造删除路径。
 */
import * as Blockly from 'blockly'

import { getKidsBlockLabel, motionVerbForLesson, VERB_LABELLED_BLOCKS } from '../blockly/block-labels'
import { buildSnapshot, LINE_FIELD } from '../blockly/blockly-snapshot'
import type { ProgramBlock } from '../blockly/program-tree'
import { BLOCK_LABEL_FIELD } from '../blockly/register-kids-blocks'
import { getSayLineChoices } from '../blockly/step-judge-options'

export function findLaunchWorkspace(container: HTMLElement | null): Blockly.WorkspaceSvg | null {
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
export function mainLaunchStack(workspace: Blockly.Workspace): Blockly.Block[] {
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

export function launchSnapshot(workspace: Blockly.Workspace): ProgramBlock[] {
  return buildSnapshot(workspace)
}

/**
 * 在主程序链内把第 index 块上移（-1）或下移（+1）。
 * 第 0 块（开始事件）永不移动，也没有块能移到它上面；越界返回 false，不动画布。
 */
export function moveLaunchBlock(
  workspace: Blockly.WorkspaceSvg,
  index: number,
  direction: -1 | 1,
): boolean {
  const chain = mainLaunchStack(workspace)
  if (index <= 0 || index >= chain.length) return false
  const targetIndex = index + direction
  if (targetIndex <= 0 || targetIndex >= chain.length) return false
  const target = chain[index]
  const neighbour = chain[targetIndex]
  target.unplug(true)
  if (direction === 1) {
    const after = neighbour.getNextBlock()
    if (neighbour.nextConnection?.isConnected()) neighbour.nextConnection.disconnect()
    try {
      neighbour.nextConnection?.connect(target.previousConnection!)
      if (after?.previousConnection) target.nextConnection?.connect(after.previousConnection)
    } catch {
      return false
    }
  } else {
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

/**
 * 把程序里已选的对白写回 say 块（来自 #554 applyGreetingLine，按课参数化）。
 * - 本课无预设对白（getSayLineChoices 为空）：不加下拉，直接返回。
 * - 块上已有 LINE 字段：只设值。
 * - 否则按共享组件同一方式追加 LINE_ROW + FieldDropdown，再 setInputsInline(false)。
 * - 未知对白 id 回落到本课第一句预设。
 */
export function applyLaunchLine(
  lessonId: string,
  block: Blockly.Block,
  line: string | undefined,
): void {
  if (block.type !== 'say_line') return
  const choices = getSayLineChoices(lessonId)
  if (!choices || choices.length === 0) return
  const lineId = line && choices.some((choice) => choice.id === line) ? line : choices[0].id
  const existing = block.getField(LINE_FIELD)
  if (existing) {
    block.setFieldValue(lineId, LINE_FIELD)
    return
  }
  const dropdown = new Blockly.FieldDropdown(
    choices.map((choice) => [choice.text, choice.id] as [string, string]),
  )
  dropdown.setValue(lineId)
  block.appendDummyInput('LINE_ROW').appendField(dropdown, LINE_FIELD)
  block.setInputsInline(false)
}

/**
 * TQ-009：重建的移动 / 重复块按本课角色显示动作字（蝴蝶课“飞”，其余“走”），
 * 与 BlocklyWorkspace 挂载恢复、按钮添加时的 applyMotionLabel 同一规则。
 */
export function applyLaunchMotionLabel(lessonId: string, block: Blockly.Block): void {
  if (!VERB_LABELLED_BLOCKS.includes(block.type)) return
  const label = getKidsBlockLabel(block.type, motionVerbForLesson(lessonId))
  const field = block.getField(BLOCK_LABEL_FIELD)
  if (field && field.getValue() !== label) field.setValue(label)
}

/**
 * 按程序数据重建画布积木（切关、导入、恢复初始时调用）。只重建积木，不重建工作区：
 * 先清全部顶层栈，再按序新建、写回动作字与对白、连接；Svg 块才做 initSvg/render/moveTo。
 */
export function rebuildLaunchProgram(
  lessonId: string,
  workspace: Blockly.WorkspaceSvg,
  program: ProgramBlock[],
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
    applyLaunchMotionLabel(lessonId, block)
    applyLaunchLine(lessonId, block, typeof item.line === 'string' ? item.line : undefined)
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
