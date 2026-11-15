/**
 * OPS-038《我的舞蹈秀》恢复竞态回归测试。
 *
 * 修复前：useEffect 里 setProjectReady(true) 在 loadSavedProject +
 * loadProject 之前。恢复完成前点“检查我的作品”，handleBridgeCheck 会
 * getProject() 取到 GUI 默认作品并 saveProjectToStore 把默认作品写进
 * IndexedDB，静默覆盖用户已保存的作品；在 GUI 里编辑也会被 loadProject
 * 覆盖。修复后：恢复完成（或确认无已保存作品）前 projectReady 保持
 * false，检查/加载按钮保持禁用，恢复期间显示明确状态。
 */
import { act, render, screen, waitFor } from '@testing-library/react'
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

const { default: DanceShowPage } = await import(
  '@/features/lessons/dance-show/ui/dance-show-page'
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

describe('DanceShowPage restore race (OPS-038)', () => {
  it('keeps check/load-starter disabled until the restore flow finishes (no saved project)', async () => {
    const waitUntil = deferred<unknown>()
    const loadSaved = deferred<unknown>()
    mockWaitUntilNonEmpty.mockReturnValueOnce(waitUntil.promise)
    mockLoadSaved.mockReturnValueOnce(loadSaved.promise)

    render(<DanceShowPage />)
    const checkBtn = screen.getByTestId('dance-show-check-button')
    const starterBtn = screen.getByTestId('dance-show-load-starter')

    // GUI 尚未就绪：按钮禁用。
    expect(checkBtn).toBeDisabled()
    expect(starterBtn).toBeDisabled()

    // GUI 作品已非空，但恢复尚未完成（loadSavedProject 仍挂起）：
    // 修复前此处按钮已启用（静默覆盖窗口）；修复后必须仍禁用，并显示恢复状态。
    await act(async () => {
      waitUntil.resolve(undefined)
    })
    await waitFor(() => {
      expect(screen.getByText(/正在恢复上次保存的作品/)).toBeInTheDocument()
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
    expect(
      screen.queryByText(/正在恢复上次保存的作品/),
    ).not.toBeInTheDocument()
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

    render(<DanceShowPage />)
    const checkBtn = screen.getByTestId('dance-show-check-button')
    const starterBtn = screen.getByTestId('dance-show-load-starter')

    await act(async () => {
      waitUntil.resolve(undefined)
    })
    await waitFor(() => {
      expect(screen.getByText(/正在恢复上次保存的作品/)).toBeInTheDocument()
    })
    // 恢复进行中：按钮仍禁用（即使 GUI 已有默认作品）。
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
    // loadProject 进行中：仍未就绪。
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

    // 恢复完成并验证非空后才启用；恢复证据出现；恢复过程没有写 store
    //（只有用户点“检查”才会保存——恢复本身不覆盖）。
    await waitFor(() => {
      expect(checkBtn).toBeEnabled()
    })
    expect(starterBtn).toBeEnabled()
    expect(
      screen.queryByText(/正在恢复上次保存的作品/),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/已恢复上次保存的作品/)).toBeInTheDocument()
    expect(mockSaveToStore).not.toHaveBeenCalled()
  })
})
