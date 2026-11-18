/**
 * lesson-01-forest-hello 课程自有 Blockly 操作助手（手机 ↑↓ 排序 + 切关换程序）。
 *
 * 只用 Blockly 公共静态 API（Blockly.Workspace.getAll / 连接操作），不改
 * 共享文件、不给 BlocklyWorkspace 加受控出口、不重建工作区：
 * - findForestWorkspace：用 Workspace.getAll() 找到挂载在插槽容器内的
 *   WorkspaceSvg（以 getInjectionDiv() 落在插槽 ref 容器内为准）。
 * - moveForestBlock：用 unplug（愈合）+ reconnect 在主程序链内重排一块，
 *   Blockly 画布是唯一事实来源；快照经工作区事件自动更新，数据跟随快照。
 *   这不是“数据层排序 + 画布只读同步”（设计文档否决的路径③）。
 * - rebuildForestProgram：切关时按新关的程序数据重建画布上的积木（先清
 *   顶层栈再按序新建连接），工作区实例本身不重建。
 * - 数字改参不适用：本课无数字参数（移动固定 100 步，无 repeat 积木），
 *   故本模块不提供改参操作，不得为凑数造假参数。
 * - ✕ 删除复用 BlocklyWorkspace 自带删除（选中 + 删除按钮、拖到垃圾桶），
 *   不在本模块另造删除路径。
 * - 本课无 say_line 积木，故无行下拉框逻辑（与 G1-U1-L01 的助手不同）。
 */
import * as Blockly from 'blockly'

import { buildSnapshot } from '../blockly/blockly-snapshot'
import type { ProgramBlock } from '../blockly/program-tree'

/**
 * 在插槽容器内定位本课的 Blockly 工作区。headless Workspace 没有
 * getInjectionDiv（undefined），按定义不在候选内；工具箱 flyout 也有
 * 自己的 WorkspaceSvg 且 injectionDiv 同样落在容器内，必须用 isFlyout
 * 排除（浏览器探针实测：getAll() 返回主工作区 + 2 个 flyout 工作区，
 * 仅主工作区的 isFlyout 为 false）。
 */
export function findForestWorkspace(container: HTMLElement | null): Blockly.WorkspaceSvg | null {
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
export function mainForestStack(workspace: Blockly.Workspace): Blockly.Block[] {
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

export function forestSnapshot(workspace: Blockly.Workspace): ProgramBlock[] {
  return buildSnapshot(workspace)
}

/**
 * 在主程序链内把第 index 块上移（direction=-1）或下移（+1）。
 * - 第 0 块（开始事件）永不移动，也没有任何块能移到它上面。
 * - 越界 / 目标不存在时返回 false，不动画布。
 * - 成功时返回 true；快照由 BlocklyWorkspace 的 change 监听自动发出。
 */
export function moveForestBlock(
  workspace: Blockly.WorkspaceSvg,
  index: number,
  direction: -1 | 1,
): boolean {
  const chain = mainForestStack(workspace)
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

/**
 * V3：经真实工具箱按分类名选中一个分类（外壳分类栏点击的落点）。
 * 与 BlocklyAdapter.selectCategory 同款鸭子类型调用：按分类名匹配
 * 工具箱项，再次选中已选分类即取消选中（flyout 关闭）。工作区没有
 * 工具箱或分类不存在时返回 null，绝不假装选中成功。
 */
export function selectForestCategory(
  workspace: Blockly.WorkspaceSvg,
  categoryId: string,
): string | null {
  try {
    const toolbox = workspace.getToolbox() as unknown as {
      getToolboxItems?: () => Array<{ getName?: () => string; getId?: () => string }>
      getSelectedItem?: () => { getName?: () => string; getId?: () => string } | null
      setSelectedItem?: (item: unknown | null) => void
    } | null
    if (!toolbox) return null
    const items = toolbox.getToolboxItems?.() ?? []
    const item = items.find(
      (candidate) => candidate.getName?.() === categoryId || candidate.getId?.() === categoryId,
    )
    if (!item) return null
    const selected = toolbox.getSelectedItem?.() ?? null
    const selectedId = selected?.getName?.() ?? selected?.getId?.() ?? null
    if (selectedId === categoryId) {
      toolbox.setSelectedItem?.(null)
      return null
    }
    toolbox.setSelectedItem?.(item)
    return categoryId
  } catch {
    return null
  }
}

/**
 * V3：向主程序链尾部插入一块真实积木（外壳素材清单的插入落点，与
 * BlocklyWorkspace 的按钮添加同语义的子集）：
 * - “开始时”帽子块全程序只许一块，已有则返回 false，不重复造帽子。
 * - 有主链且新块可拼接时接在链尾；否则作为散块放在画布左上区域。
 * 快照由 BlocklyWorkspace 的变更监听自动发出，本函数不直接写草稿。
 */
export function insertForestBlock(workspace: Blockly.WorkspaceSvg, type: string): boolean {
  const chain = mainForestStack(workspace)
  if (type === 'when_start' && chain.some((block) => block.type === 'when_start')) {
    return false
  }
  let block: Blockly.Block
  try {
    block = workspace.newBlock(type)
  } catch {
    return false
  }
  if (block instanceof Blockly.BlockSvg) {
    block.initSvg()
    block.render()
  }
  const tail = chain[chain.length - 1]
  if (tail?.nextConnection && block.previousConnection) {
    try {
      tail.nextConnection.connect(block.previousConnection)
      return true
    } catch {
      // 连接失败即作散块留置（下方定位），不丢块。
    }
  }
  if (block instanceof Blockly.BlockSvg) {
    block.moveTo(new Blockly.utils.Coordinate(24, chain.length > 0 ? 120 : 16))
  }
  return true
}

/**
 * 按程序数据重建画布上的积木（切关时调用）。只重建积木，不重建工作区：
 * 先清全部顶层栈，再按序新建、连接；Svg 块才做 initSvg/render/moveTo。
 */
export function rebuildForestProgram(
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
