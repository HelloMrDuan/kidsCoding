/**
 * OPS-042《接住掉落水果》全屏课堂页测试。
 *
 * 覆盖：
 * 1. 外壳唯一性：StudioShell 唯一外壳、顶栏有关卡开关与检查入口、
 *    关卡面板默认收起、文件菜单只露真实能力。
 * 2. 恢复：无保存作品时载入第一关初始作品；有保存作品时载入它
 *    并回到“已保存”（绑定恢复作品）。
 * 3. 检查全流程：桥接直读 → 保存 → 真实运行轨迹（此处替身）→
 *    judge.ts 三层判定在面板呈现；第一关含预测对照。
 * 4. 保存真实性：保存失败时顶栏显示“未能保存”，判定结果仍在。
 * 5. 切关：先保存当前关，再载入目标关的初始作品。
 *
 * 真实 VM 运行本身由 studio-core.test.ts 在真实 scratch-vm 上
 * 验证（五案），这里替身 runProjectTrace 只为驱动页面状态机，
 * 不冒充 VM 证据。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWaitUntilNonEmpty = vi.fn()
const mockLoadProject = vi.fn()
const mockGetProject = vi.fn()
const mockStart = vi.fn()
const mockDispose = vi.fn()
const mockLoadLastLevel = vi.fn()
const mockLoadLevelProject = vi.fn()
const mockSaveLevelProject = vi.fn()
const mockSaveLastLevel = vi.fn()
const mockRunTrace = vi.fn()

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

vi.mock('@/features/lessons/dance-show/evaluate-project', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/lessons/dance-show/evaluate-project')
  >('@/features/lessons/dance-show/evaluate-project')
  return {
    ...actual,
    parseSb3: vi.fn(async () => minimalProject()),
    parseSb3File: vi.fn(async () => minimalProject()),
  }
})

vi.mock('../project-store', () => ({
  loadLastLevel: mockLoadLastLevel,
  loadLevelProject: mockLoadLevelProject,
  saveLevelProject: mockSaveLevelProject,
  saveLastLevel: mockSaveLastLevel,
}))

vi.mock('../run-trace', () => ({
  runProjectTrace: mockRunTrace,
}))

process.env.NEXT_PUBLIC_SCRATCH_GUI_URL =
  'https://gui.example.com/bridge-host.html'

const { default: G2U3L02StudioPage } = await import(
  '@/features/lessons/g2-u3-l02/studio/ui/g2-u3-l02-studio-page'
)

function minimalProject() {
  return {
    targets: [
      { isStage: true, name: 'Stage', costumes: [], sounds: [], blocks: {} },
      { isStage: false, name: '篮子', costumes: [], sounds: [], blocks: {} },
      { isStage: false, name: '水果', costumes: [], sounds: [], blocks: {} },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function bridgeProject() {
  return {
    project: minimalProject(),
    projectJson: '{}',
    sb3: new ArrayBuffer(16),
    byteLength: 16,
  }
}

/** 第一关演示程序的真实轨迹形状：篮子到 40，循环内移动 2 次。 */
function exploreTrace() {
  return {
    levelId: 'explore',
    runId: 1,
    fingerprint: 'x',
    endedBy: 'landed' as const,
    framesRun: 30,
    start: { basketX: 0, fruitX: 100 },
    landing: { frame: 28, basketX: 40, fruitX: 100, fruitY: -140 },
    basketMoves: [
      { frame: 1, dx: 20, inLoop: true },
      { frame: 2, dx: 20, inLoop: true },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockWaitUntilNonEmpty.mockResolvedValue(undefined)
  mockLoadProject.mockResolvedValue([])
  mockGetProject.mockResolvedValue(bridgeProject())
  mockLoadLastLevel.mockResolvedValue(null)
  mockLoadLevelProject.mockResolvedValue(null)
  mockSaveLevelProject.mockImplementation(
    async (_level: string, bytes: ArrayBuffer) => ({
      bytes,
      savedAt: new Date('2026-11-17T10:30:00').getTime(),
    }),
  )
  mockSaveLastLevel.mockResolvedValue(undefined)
  mockRunTrace.mockResolvedValue(exploreTrace())
})

describe('G2U3L02StudioPage (OPS-042)', () => {
  it('渲染在 StudioShell 里：顶栏关卡/检查入口、面板默认收起、文件菜单只露真实能力', async () => {
    mockWaitUntilNonEmpty.mockReturnValue(new Promise(() => {}))
    render(<G2U3L02StudioPage />)

    expect(screen.getByTestId('studio-shell')).toBeInTheDocument()
    expect(screen.getByTestId('studio-title')).toHaveTextContent(
      '接住掉落水果',
    )
    expect(screen.getByTestId('l02-levels-toggle')).toBeInTheDocument()
    const check = screen.getByTestId('l02-check-button')
    expect(check).toBeInTheDocument()
    expect(check).toBeDisabled()
    expect(screen.queryByTestId('l02-guide')).not.toBeInTheDocument()
    expect(screen.getByTestId('l02-gui-iframe')).toHaveAttribute(
      'src',
      'https://gui.example.com/bridge-host.html',
    )
    fireEvent.click(screen.getByTestId('studio-file-menu-button'))
    expect(screen.getByTestId('studio-file-save')).toBeInTheDocument()
    expect(screen.getByTestId('studio-file-import')).toBeInTheDocument()
    expect(screen.getByTestId('studio-file-reset')).toBeInTheDocument()
    expect(screen.queryByTestId('studio-file-new')).not.toBeInTheDocument()
    expect(screen.queryByTestId('studio-file-export')).not.toBeInTheDocument()
  })

  it('无保存作品时载入第一关初始作品并启用检查', async () => {
    render(<G2U3L02StudioPage />)
    await waitFor(() =>
      expect(screen.getByTestId('l02-check-button')).not.toBeDisabled(),
    )
    expect(mockLoadProject).toHaveBeenCalledTimes(1)
    const arg = mockLoadProject.mock.calls[0][0]
    expect(arg.format).toBe('sb3')
    expect(arg.data).toBeInstanceOf(ArrayBuffer)
    expect(arg.data.byteLength).toBeGreaterThan(1000)
  })

  it('有保存作品时恢复它并回到已保存', async () => {
    const bytes = new ArrayBuffer(2048)
    mockLoadLastLevel.mockResolvedValue('solve')
    mockLoadLevelProject.mockResolvedValue({
      bytes,
      savedAt: new Date('2026-11-17T09:00:00').getTime(),
    })
    render(<G2U3L02StudioPage />)
    await waitFor(() =>
      expect(screen.getByTestId('l02-check-button')).not.toBeDisabled(),
    )
    const arg = mockLoadProject.mock.calls[0][0]
    expect(arg.data).toBe(bytes)
    expect(screen.getByTestId('studio-save-chip')).toHaveTextContent(
      '已保存到本机',
    )
    expect(screen.getByTestId('studio-save-message')).toHaveTextContent(
      '最后保存',
    )
  })

  it('检查全流程：三层判定呈现，第一关含预测对照', async () => {
    render(<G2U3L02StudioPage />)
    await waitFor(() =>
      expect(screen.getByTestId('l02-check-button')).not.toBeDisabled(),
    )
    fireEvent.click(screen.getByTestId('l02-levels-toggle'))
    fireEvent.change(screen.getByTestId('l02-prediction-x'), {
      target: { value: '40' },
    })
    fireEvent.click(screen.getByTestId('l02-prediction-接不住'))
    fireEvent.click(screen.getByTestId('l02-check-button'))

    await waitFor(() =>
      expect(screen.getByTestId('l02-result')).toBeInTheDocument(),
    )
    expect(mockGetProject).toHaveBeenCalled()
    expect(mockSaveLevelProject).toHaveBeenCalledWith(
      'explore',
      expect.any(ArrayBuffer),
    )
    expect(mockRunTrace).toHaveBeenCalled()
    expect(screen.getByTestId('l02-layer-stage')).toHaveTextContent('✗')
    expect(screen.getByTestId('l02-layer-task')).toHaveTextContent('✗')
    expect(screen.getByTestId('l02-layer-knowledge')).toHaveTextContent('✓')
    expect(screen.getByTestId('l02-prediction-compare')).toHaveTextContent(
      '篮子停在 x=40',
    )
    expect(screen.getByTestId('studio-save-chip')).toHaveTextContent(
      '已保存到本机',
    )
  })

  it('保存失败：顶栏显示未能保存，判定结果仍呈现', async () => {
    mockSaveLevelProject.mockRejectedValue(new Error('配额不足'))
    render(<G2U3L02StudioPage />)
    await waitFor(() =>
      expect(screen.getByTestId('l02-check-button')).not.toBeDisabled(),
    )
    fireEvent.click(screen.getByTestId('l02-levels-toggle'))
    fireEvent.click(screen.getByTestId('l02-check-button'))
    await waitFor(() =>
      expect(screen.getByTestId('l02-result')).toBeInTheDocument(),
    )
    expect(screen.getByTestId('studio-save-chip')).toHaveTextContent(
      '未能保存',
    )
    expect(screen.getByTestId('l02-notice')).toHaveTextContent(
      '没能保存到本机',
    )
  })

  it('切关：先保存当前关，再载入目标关初始作品', async () => {
    render(<G2U3L02StudioPage />)
    await waitFor(() =>
      expect(screen.getByTestId('l02-check-button')).not.toBeDisabled(),
    )
    fireEvent.click(screen.getByTestId('l02-levels-toggle'))
    fireEvent.click(screen.getByTestId('l02-level-switch-solve'))
    await waitFor(() =>
      expect(
        screen.getByTestId('l02-level-current-solve'),
      ).toBeInTheDocument(),
    )
    expect(mockSaveLevelProject).toHaveBeenCalledWith(
      'explore',
      expect.any(ArrayBuffer),
    )
    // 载入目标关作品在切关状态更新之后异步完成，等它真正发生再断言。
    await waitFor(() => expect(mockLoadProject).toHaveBeenCalledTimes(2))
    expect(mockSaveLastLevel).toHaveBeenCalledWith('solve')
  })
})
