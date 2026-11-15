/**
 * OPS-040《我的舞蹈秀》全屏课堂页测试。
 *
 * 覆盖三类行为：
 * 1. 外壳唯一性：页面渲染在 StudioShell 里（studio-shell），自带指引
 *    抽屉与步骤面板默认都收起；文件菜单只露真实能力（保存/导入/
 *    恢复初始），新建/导出按能力隐藏，不渲染死按钮。
 * 2. #542 恢复竞态回归（与样板页同一语义）：恢复完成前检查/加载
 *    按钮保持禁用并显示恢复状态；恢复过程不写 IndexedDB。
 * 3. 浮层开关不卸载编辑器：步骤面板与外壳抽屉开关前后 iframe 是
 *    同一个 DOM 元素（不重载、不丢作品的前提）。
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const mockWaitUntilNonEmpty = vi.fn()
const mockLoadProject = vi.fn()
const mockGetProject = vi.fn()
const mockStart = vi.fn()
const mockDispose = vi.fn()
const mockLoadSaved = vi.fn()
const mockSaveToStore = vi.fn()

vi.mock('@/features/lessons/dance-show/gui-bridge', () => ({
  BRIDGE_MAX_PAYLOAD_BYTES: 5 * 1024 * 1024,
  ScratchBridgeClient: class MockBridgeClient {
    start = mockStart
    dispose = mockDispose
    waitUntilProjectNonEmpty = mockWaitUntilNonEmpty
    loadProject = mockLoadProject
    getProject = mockGetProject
  },
}))

vi.mock('@/features/lessons/dance-show/project-store', () => ({
  loadSavedProject: mockLoadSaved,
  saveProjectToStore: mockSaveToStore,
}))

// 页面在模块作用域读环境变量（GUI_URL / STARTER_URL），须在动态 import 前配好。
process.env.NEXT_PUBLIC_SCRATCH_GUI_URL =
  'https://gui.example.com/bridge-host.html'
process.env.NEXT_PUBLIC_DANCE_SHOW_STARTER_URL =
  'https://gui.example.com/dance-show-starter.sb3'

const { default: DanceShowStudioPage } = await import(
  '@/features/lessons/dance-show/ui/dance-show-studio-page'
)

/** 与评价引擎兼容的最小有效作品（Stage + Abby，无脚本）。 */
function minimalProject() {
  return {
    targets: [
      {
        isStage: true,
        name: 'Stage',
        costumes: [{ name: 'backdrop1' }],
        sounds: [],
        blocks: {},
        currentCostume: 0,
      },
      {
        isStage: false,
        name: 'Abby',
        costumes: [{ name: 'Abby-a' }],
        sounds: [],
        blocks: {},
      },
    ],
  }
}

describe('DanceShowStudioPage (OPS-040)', () => {
  it('renders inside StudioShell with drawers closed and only real file actions', async () => {
    mockWaitUntilNonEmpty.mockReturnValue(new Promise(() => {}))
    render(<DanceShowStudioPage />)

    // 唯一外壳是 StudioShell，标题来自课程契约。
    expect(screen.getByTestId('studio-shell')).toBeInTheDocument()
    expect(screen.getByTestId('studio-title')).toHaveTextContent('我的舞蹈秀')
    // 外壳指引抽屉默认收起；本页步骤面板默认收起。
    expect(screen.queryByTestId('studio-guide-drawer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dance-show-guide')).not.toBeInTheDocument()
    // 编辑器 iframe 指向配置的桥接宿主。
    const iframe = screen.getByTestId('dance-show-gui-iframe')
    expect(iframe).toHaveAttribute(
      'src',
      'https://gui.example.com/bridge-host.html',
    )
    // 文件菜单只露真实能力：保存作品 / 导入 / 恢复初始；新建、导出隐藏。
    fireEvent.click(screen.getByTestId('studio-file-menu-button'))
    expect(screen.getByTestId('studio-file-save')).toBeInTheDocument()
    expect(screen.getByTestId('studio-file-import')).toBeInTheDocument()
    expect(screen.getByTestId('studio-file-reset')).toBeInTheDocument()
    expect(screen.queryByTestId('studio-file-new')).not.toBeInTheDocument()
    expect(screen.queryByTestId('studio-file-export')).not.toBeInTheDocument()
  })

  it('keeps the same iframe element mounted while panels toggle', async () => {
    mockWaitUntilNonEmpty.mockReturnValue(new Promise(() => {}))
    render(<DanceShowStudioPage />)
    const iframe = screen.getByTestId('dance-show-gui-iframe')

    fireEvent.click(screen.getByTestId('dance-show-steps-toggle'))
    expect(screen.getByTestId('dance-show-guide')).toBeInTheDocument()
    expect(screen.getByTestId('dance-show-gui-iframe')).toBe(iframe)

    fireEvent.click(screen.getByTestId('dance-show-steps-close'))
    expect(screen.queryByTestId('dance-show-guide')).not.toBeInTheDocument()
    expect(screen.getByTestId('dance-show-gui-iframe')).toBe(iframe)

    fireEvent.click(screen.getByTestId('studio-guide-button'))
    expect(screen.getByTestId('studio-guide-drawer')).toBeInTheDocument()
    expect(screen.getByTestId('dance-show-gui-iframe')).toBe(iframe)
  })

  it('keeps check/load-starter disabled until the restore flow finishes (no saved project)', async () => {
    const waitUntil = deferred<unknown>()
    const loadSaved = deferred<unknown>()
    mockWaitUntilNonEmpty.mockReturnValueOnce(waitUntil.promise)
    mockLoadSaved.mockReturnValueOnce(loadSaved.promise)

    render(<DanceShowStudioPage />)
    const checkBtn = screen.getByTestId('dance-show-check-button')
    fireEvent.click(screen.getByTestId('dance-show-steps-toggle'))
    const starterBtn = screen.getByTestId('dance-show-load-starter')

    expect(checkBtn).toBeDisabled()
    expect(starterBtn).toBeDisabled()

    // GUI 作品已非空，但恢复尚未完成：按钮必须仍禁用，并显示恢复状态。
    await act(async () => {
      waitUntil.resolve(undefined)
    })
    await waitFor(() => {
      expect(screen.getAllByText(/正在恢复上次保存的作品/).length).toBeGreaterThan(0)
    })
    expect(checkBtn).toBeDisabled()
    expect(starterBtn).toBeDisabled()
    expect(mockLoadSaved).toHaveBeenCalled()

    // 确认无已保存作品后，恢复流程结束，按钮才启用。
    await act(async () => {
      loadSaved.resolve(null)
    })
    await waitFor(() => {
      expect(checkBtn).toBeEnabled()
    })
    expect(starterBtn).toBeEnabled()
  })

  it('restores a saved project before enabling the buttons, without touching the store', async () => {
    const waitUntil = deferred<unknown>()
    const loadSaved = deferred<unknown>()
    const loadProject = deferred<string[]>()
    const getProject = deferred<unknown>()
    mockWaitUntilNonEmpty.mockReturnValueOnce(waitUntil.promise)
    mockLoadSaved.mockReturnValueOnce(loadSaved.promise)
    mockLoadProject.mockReturnValueOnce(loadProject.promise)
    mockGetProject.mockReturnValueOnce(getProject.promise)

    const savedSb3 = new ArrayBuffer(8)
    const project = minimalProject()
    const projectJson = JSON.stringify(project)

    render(<DanceShowStudioPage />)
    const checkBtn = screen.getByTestId('dance-show-check-button')
    fireEvent.click(screen.getByTestId('dance-show-steps-toggle'))
    const starterBtn = screen.getByTestId('dance-show-load-starter')

    await act(async () => {
      waitUntil.resolve(undefined)
    })
    await waitFor(() => {
      expect(screen.getAllByText(/正在恢复上次保存的作品/).length).toBeGreaterThan(0)
    })
    expect(checkBtn).toBeDisabled()
    expect(starterBtn).toBeDisabled()

    await act(async () => {
      loadSaved.resolve({
        sb3: savedSb3,
        savedAt: 1000,
        byteLength: 8,
        source: 'bridge',
      })
    })
    expect(checkBtn).toBeDisabled()
    await act(async () => {
      loadProject.resolve(['Stage', 'Abby'])
    })
    await act(async () => {
      getProject.resolve({
        project,
        projectJson,
        sb3: savedSb3,
        byteLength: 8,
      })
    })

    // 恢复完成并验证非空后才启用；恢复证据出现在结果区；恢复不写 store。
    await waitFor(() => {
      expect(checkBtn).toBeEnabled()
    })
    expect(starterBtn).toBeEnabled()
    expect(screen.getByText(/已恢复上次保存的作品/)).toBeInTheDocument()
    expect(mockSaveToStore).not.toHaveBeenCalled()
  })
})
