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
 * 4. 产品整改：检查入口在顶栏（不在主区浮动遮挡编辑器），顶栏不
 *    常驻课程目标、无帮助按钮。
 * 5. 保存状态真实性（P0）：保存成功才显示“已保存”+最后保存时间；
 *    IndexedDB 写入失败显示“未能保存”且检查结果仍在；作品已变化
 *    而新保存未完成时不许继续显示“已保存”；恢复成功回到“已保存”。
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

beforeEach(() => {
  vi.clearAllMocks()
})

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

describe('DanceShowStudioPage topbar + save honesty (OPS-040 产品整改)', () => {
  /** 让桥接就绪且无已保存作品（projectReady=true 的最短路径）。 */
  function readyWithoutSavedProject() {
    mockWaitUntilNonEmpty.mockResolvedValue(undefined)
    mockLoadSaved.mockResolvedValue(null)
  }

  function bridgeProject(name = 'Abby') {
    const project = minimalProject()
    project.targets[1].name = name
    return {
      project,
      projectJson: JSON.stringify(project),
      sb3: new ArrayBuffer(8),
      byteLength: 8,
    }
  }

  it('puts the check entry in the topbar, with no floating buttons over the editor and a minimal topbar', async () => {
    readyWithoutSavedProject()
    render(<DanceShowStudioPage />)

    const checkBtn = await screen.findByTestId('dance-show-check-button')
    // 检查按钮在外壳顶栏内，不在主区浮动。
    expect(screen.getByTestId('studio-topbar')).toContainElement(checkBtn)
    expect(
      screen.getByTestId('dance-show-studio-main'),
    ).not.toContainElement(checkBtn)
    // 旧的右下浮动“从文件检查”按钮已移除（文件通道走顶栏文件菜单的导入）。
    expect(
      screen.queryByTestId('dance-show-check-file-button'),
    ).not.toBeInTheDocument()
    // 顶栏精简：不常驻课程目标、无帮助按钮；步骤开关也在顶栏。
    expect(screen.queryByTestId('studio-goal-current')).not.toBeInTheDocument()
    expect(screen.queryByTestId('studio-help-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('studio-topbar')).toContainElement(
      screen.getByTestId('dance-show-steps-toggle'),
    )
    // 顶栏显示当前步骤位置。
    expect(screen.getByTestId('studio-progress')).toHaveTextContent('步骤 1/9')
  })

  it('shows 已保存 with the last-saved time only after the store write succeeds', async () => {
    readyWithoutSavedProject()
    mockGetProject.mockResolvedValue(bridgeProject())
    mockSaveToStore.mockResolvedValue(1_700_000_000_000)
    render(<DanceShowStudioPage />)

    const checkBtn = await screen.findByTestId('dance-show-check-button')
    await waitFor(() => expect(checkBtn).toBeEnabled())
    // 保存前芯片是“未保存”，不预先声称已保存。
    expect(screen.getByTestId('studio-save-chip')).toHaveTextContent('未保存')

    fireEvent.click(checkBtn)
    await waitFor(() => {
      expect(screen.getByTestId('studio-save-chip')).toHaveTextContent(
        '已保存到本机',
      )
    })
    expect(screen.getByTestId('studio-save-message')).toHaveTextContent(
      /最后保存/,
    )
    expect(mockSaveToStore).toHaveBeenCalledTimes(1)
  })

  it('shows 未能保存 (never 已保存) when the IndexedDB write fails, while check results stay visible', async () => {
    readyWithoutSavedProject()
    mockGetProject.mockResolvedValue(bridgeProject())
    mockSaveToStore.mockRejectedValue(new Error('IndexedDB 配额不足'))
    render(<DanceShowStudioPage />)

    const checkBtn = await screen.findByTestId('dance-show-check-button')
    await waitFor(() => expect(checkBtn).toBeEnabled())
    fireEvent.click(checkBtn)

    await waitFor(() => {
      expect(screen.getByTestId('studio-save-chip')).toHaveTextContent(
        '未能保存',
      )
    })
    expect(screen.getByTestId('studio-save-chip')).not.toHaveTextContent(
      '已保存',
    )
    // 检查结果照常呈现（检查成功 ≠ 已保存），且面板给出保存失败说明。
    expect(screen.getByText(/通过 \d\/9 步/)).toBeInTheDocument()
    expect(screen.getByTestId('dance-show-save-failed')).toHaveTextContent(
      /没能保存到本机浏览器/,
    )
  })

  it('drops the 已保存 claim while a changed project is still being saved', async () => {
    readyWithoutSavedProject()
    mockGetProject.mockResolvedValueOnce(bridgeProject('Abby'))
    mockSaveToStore.mockResolvedValueOnce(1_700_000_000_000)
    render(<DanceShowStudioPage />)

    const checkBtn = await screen.findByTestId('dance-show-check-button')
    await waitFor(() => expect(checkBtn).toBeEnabled())
    fireEvent.click(checkBtn)
    await waitFor(() => {
      expect(screen.getByTestId('studio-save-chip')).toHaveTextContent(
        '已保存到本机',
      )
    })

    // 作品已变化（哈希不同），第二次保存悬而未决：不许继续显示已保存。
    const pendingSave = deferred<number>()
    mockGetProject.mockResolvedValueOnce(bridgeProject('AbbyChanged'))
    mockSaveToStore.mockReturnValueOnce(pendingSave.promise)
    fireEvent.click(checkBtn)
    await waitFor(() => {
      expect(screen.getByTestId('studio-save-chip')).toHaveTextContent(
        '未保存',
      )
    })
    expect(screen.getByTestId('studio-save-message')).toHaveTextContent(
      /正在保存到本机/,
    )

    await act(async () => {
      pendingSave.resolve(1_700_000_100_000)
    })
    await waitFor(() => {
      expect(screen.getByTestId('studio-save-chip')).toHaveTextContent(
        '已保存到本机',
      )
    })
  })

  it('returns to 已保存 with the restored time after a verified restore', async () => {
    const savedSb3 = new ArrayBuffer(8)
    mockWaitUntilNonEmpty.mockResolvedValue(undefined)
    mockLoadSaved.mockResolvedValue({
      sb3: savedSb3,
      savedAt: 1_699_999_000_000,
      byteLength: 8,
      source: 'bridge',
    })
    mockLoadProject.mockResolvedValue(['Stage', 'Abby'])
    mockGetProject.mockResolvedValue(bridgeProject())
    render(<DanceShowStudioPage />)

    await waitFor(() => {
      expect(screen.getByTestId('studio-save-chip')).toHaveTextContent(
        '已保存到本机',
      )
    })
    expect(screen.getByTestId('studio-save-message')).toHaveTextContent(
      /最后保存/,
    )
    expect(mockSaveToStore).not.toHaveBeenCalled()
  })
})
