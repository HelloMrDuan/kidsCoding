// 共享 LessonWorkspace 的两处缺陷的最小复现（真实壳 + 真实的本课适配器与槽位，只把 VM 端口换成假的）。
//
// D1（scratch-vm + editorSlot 时适配器不挂载、运行按钮空转）已由 OPS-022（#480）修复：下面两条 D1 用例是正常用例，直接通过。
// D2（blockly 引擎 + 命令式适配器时壳泄漏演示积木内容）按首席裁定不在 OPS-022 范围，本课也不走那条路线：
// 两条 D2 用例保留 it.fails，缺陷还在时通过；D2 将来被修复，它们会变红，提醒去掉标记。
// 对照用例证明测试装置本身没问题。这里不修改共享壳，不绕过缺陷。
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { L02_CONTRACT } from './contract'
import { LessonL02Adapter } from './lesson-adapter'
import type { Block, Program } from './program'
import { FakeVmPort } from './testing/fake-vm-port'
import { createL02Slots } from './ui/slots'
import type { LessonContract } from '../workspace/lesson-contract'
import { LessonWorkspace } from '../workspace/lesson-workspace'

const move = (dx: number): Block => ({ t: 'move', dx })
const repeat = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body })
const SOLVE: Program = { scripts: [{ hat: 'flag', body: [repeat(3, move(50))] }] }

function readyAdapter() {
  const port = new FakeVmPort()
  const adapter = new LessonL02Adapter({ port })
  adapter.session.switchLevel('solve')
  adapter.session.editProgram(SOLVE) // 可以运行：脚本合法、引擎已就绪
  expect(adapter.session.runBlockReason()).toBeNull()
  return { port, adapter }
}

const contractFor = (engine: LessonContract['engine']): LessonContract => ({ ...(L02_CONTRACT as unknown as LessonContract), engine })

beforeEach(() => {
  window.localStorage.clear()
  // 真实的 Blockly 编辑槽位在 jsdom 里需要 fetch（音效）和 ResizeObserver；测试里没有网络和布局，给最小的替身。
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ArrayBuffer(0))))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('D1（已由 OPS-022 修复）：scratch-vm 引擎 + editorSlot —— 壳挂载适配器、运行按钮调用 adapter.run', () => {
  it('对照：同一个适配器走 blockly 引擎且没有 editorSlot 时，壳会 mount 适配器，点运行会调用 run', () => {
    const { port, adapter } = readyAdapter()
    render(<LessonWorkspace contract={contractFor('blockly')} adapter={adapter} />)
    expect(port.mounts).toBe(1)
    const run = screen.queryAllByTestId('ws-run-script')[0] ?? screen.queryAllByTestId('ws-run-toggle')[0]
    expect(run).toBeTruthy()
    fireEvent.click(run)
    expect(port.runs).toHaveLength(1) // 对照：这条路径上壳确实调用了 adapter.run
  })

  it('应有行为：给了 editorSlot，壳仍然 mount 适配器（课程的真实 VM 沙箱要挂载）', () => {
    const { port, adapter } = readyAdapter()
    const { EditorSlot, StageSlot, RolesSlot } = createL02Slots(adapter, { embedLevelNav: true, embedTaskPanel: true })
    render(<LessonWorkspace contract={contractFor('scratch-vm')} adapter={adapter} editorSlot={EditorSlot} stageSlot={StageSlot} rolesSlot={RolesSlot} />)
    expect(port.mounts).toBe(1) // 现状：0（lesson-workspace.tsx 的 editorSlot 分支提前 return，没有 mount）
  })

  it('应有行为：点击壳的运行按钮，调用 adapter.run（课程的 VM 开始运行）', () => {
    const { port, adapter } = readyAdapter()
    const { EditorSlot, StageSlot, RolesSlot } = createL02Slots(adapter, { embedLevelNav: true, embedTaskPanel: true })
    render(<LessonWorkspace contract={contractFor('scratch-vm')} adapter={adapter} editorSlot={EditorSlot} stageSlot={StageSlot} rolesSlot={RolesSlot} />)
    const run = screen.queryAllByTestId('ws-run-toggle')[0]
    expect(run, '壳渲染了运行按钮').toBeTruthy()
    fireEvent.click(run)
    expect(port.runs).toHaveLength(1) // 现状：0（handleRunToggle 读取的 mountedAdapterRef 为空，直接 return）
  })
})

describe('D2（仍存在，保持预期失败）：blockly 引擎 + 课程自有脚本 —— 壳泄漏演示内容', () => {
  function renderBlocklyPath() {
    const { adapter } = readyAdapter()
    render(<LessonWorkspace contract={contractFor('blockly')} adapter={adapter} />)
    const toggle = screen.queryByTestId('ws-palette-toggle')
    if (toggle && toggle.textContent === '展开') fireEvent.click(toggle)
    return adapter
  }

  it.fails('应有行为：课程脚本不是演示脚本时，壳不显示演示积木芯片（如“向右走 50 步”）', () => {
    renderBlocklyPath()
    expect(document.body.textContent ?? '').not.toContain('向右走 50 步') // 现状：演示抽屉照常显示
  })

  it.fails('应有行为：课程脚本不是演示脚本时，壳不把它当“脚本为空”', () => {
    renderBlocklyPath()
    expect(document.body.textContent ?? '').not.toContain('脚本为空') // 现状：脚本列表面板写“脚本为空：请从积木抽屉添加…”
  })
})
