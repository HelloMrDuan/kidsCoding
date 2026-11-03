'use client'

/**
 * LessonWorkspace — shared shell per docs/product/p0-kitten-workspace/DESIGN.md §2–§3
 * and WORKSPACE-API.md (p0-kitten-workspace-v1.0).
 *
 * Layout note (honest): the积木 categories column is Blockly's own category
 * toolbox (buildKidsToolboxCategories) rendered inside the script column — the
 * repo has no separate Kitten-style icon-strip column, and DESIGN.md §7 lists
 * the icon strip as a refinement item for chief decision, not something this
 * shell invents. Desktop shows stage + roles + script on one screen; tablet
 * puts the stage row on top with a show/hide switch; mobile switches four
 * tabs by visibility only (DOM kept, adapter never remounted, script never reset).
 *
 * The shell renders ONLY contract content. Demo contracts are labelled 演示.
 * Editing the program after a run invalidates the previous judgment.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { CharacterArt } from '@/features/lessons/playable-stage/character-art'

import {
  DEMO_HAT,
  DEMO_MOVE_LEFT,
  DEMO_MOVE_RIGHT,
  DEMO_REPEAT,
  type DemoBlock,
} from './blockly-adapter'
import type { LessonContract } from './lesson-contract'
import { validateLessonContract } from './lesson-contract'
import type { EngineAdapter, EngineState, RunEvent } from './workspace-adapters'
import { loadDraftFromLocal, saveDraftToLocal } from './workspace-draft'
import { buildJudgment, type ThreeLayerJudgment } from './workspace-judging'

export type LessonWorkspaceProps = {
  contract: LessonContract
  adapter: EngineAdapter
  initialScript?: unknown
  onLessonSwitch?: (lessonId: string) => void
  /**
   * TEST HOOK, demo route only: when true, 保存 reports failure without
   * writing, so the E2E save-failure case can prove fail-closed behavior.
   * Never part of the real save path.
   */
  testFailSave?: boolean
}

type TabId = 'stage' | 'blocks' | 'script' | 'task'
type SaveState = 'unsaved' | 'saved' | 'failed'

const DEMO_ROLES = [
  { id: 'fox', label: '小狐狸' },
  { id: 'rabbit', label: '小兔子' },
  { id: 'bird', label: '小鸟' },
]

const REPEAT_OPTIONS = [2, 3, 4, 5, 6, 8]

function blockLabel(block: DemoBlock): string {
  switch (block.type) {
    case DEMO_HAT:
      return '开始时'
    case DEMO_MOVE_RIGHT:
      return `向右走 ${block.steps ?? 0} 步`
    case DEMO_MOVE_LEFT:
      return `向左走 ${block.steps ?? 0} 步`
    case DEMO_REPEAT:
      return `重复 ${block.times ?? 2} 次（内含 ${(block.body ?? []).length} 块）`
    default:
      return block.type
  }
}

function scriptToJson(script: unknown): string {
  try {
    return JSON.stringify(script)
  } catch {
    return ''
  }
}

function isDemoScript(value: unknown): value is DemoBlock[] {
  return Array.isArray(value)
}

export function LessonWorkspace({
  contract,
  adapter,
  initialScript,
  onLessonSwitch,
  testFailSave,
}: LessonWorkspaceProps) {
  const contractErrors = useMemo(() => validateLessonContract(contract), [contract])
  const [activeTab, setActiveTab] = useState<TabId>('stage')
  const [stageVisible, setStageVisible] = useState(true)
  const [stageZoom, setStageZoom] = useState<'small' | 'medium' | 'large'>('medium')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [revealedHints, setRevealedHints] = useState(0)
  const [selectedRole, setSelectedRole] = useState('fox')
  const [engineState, setEngineState] = useState<EngineState>({ x: 0, score: 0, running: false, frames: 0 })
  const [judgment, setJudgment] = useState<ThreeLayerJudgment | null>(null)
  const [judgmentStale, setJudgmentStale] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('unsaved')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [scriptList, setScriptList] = useState<DemoBlock[]>([])
  const [scratchReady, setScratchReady] = useState(false)
  const [scratchError, setScratchError] = useState<string | null>(null)

  const blocklyMountRef = useRef<HTMLDivElement | null>(null)
  const scratchMountRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mountedAdapterRef = useRef<{ adapter: EngineAdapter; engine: string } | null>(null)
  const contractRef = useRef(contract)
  contractRef.current = contract
  const initialScriptRef = useRef(initialScript)
  initialScriptRef.current = initialScript
  const judgmentRef = useRef<ThreeLayerJudgment | null>(null)
  judgmentRef.current = judgment
  const lastScriptJsonRef = useRef('')
  const prevLessonRef = useRef<string | null>(null)
  const scratchAdapterRef = useRef<EngineAdapter | null>(null)

  const isBlockly = contract.engine === 'blockly'
  const isScratch = contract.engine === 'scratch-vm'
  const isSummary = contract.engine === 'summary'

  const refreshScriptList = useCallback(() => {
    if (!isBlockly) return
    try {
      const script = mountedAdapterRef.current?.adapter.getScript()
      if (isDemoScript(script)) setScriptList(script)
    } catch {
      // Keep the previous list; the adapter surfaces its own errors on run/save.
    }
  }, [isBlockly])

  const handleAdapterChange = useCallback(() => {
    const json = scriptToJson(mountedAdapterRef.current?.adapter.getScript())
    if (json && json !== lastScriptJsonRef.current) {
      lastScriptJsonRef.current = json
      refreshScriptList()
      if (judgmentRef.current) {
        setJudgment(null)
        setJudgmentStale(true)
      }
    }
  }, [refreshScriptList])

  const loadIntoAdapter = useCallback(
    (targetContract: LessonContract, targetInitial: unknown) => {
      const entry = mountedAdapterRef.current
      if (!entry) return
      const draft = loadDraftFromLocal(targetContract.lessonId)
      let loaded = false
      if (draft.data !== null && draft.reason === null) {
        try {
          entry.adapter.loadScript(draft.data)
          loaded = true
        } catch {
          loaded = false
        }
      }
      if (!loaded && targetInitial !== undefined && targetInitial !== null) {
        try {
          entry.adapter.loadScript(targetInitial)
          loaded = true
        } catch {
          loaded = false
        }
      }
      if (!loaded) {
        try {
          entry.adapter.loadScript([])
        } catch {
          // Leave the adapter empty; the shell shows the error on run/save.
        }
      }
      lastScriptJsonRef.current = scriptToJson(entry.adapter.getScript())
      refreshScriptList()
    },
    [refreshScriptList],
  )

  // Adapter lifecycle: mount once per engine kind. A new adapter instance of
  // the same engine (e.g. a fresh server render) reuses the mounted one, so
  // tab switches and lesson switches never remount the engine.
  useEffect(() => {
    const engine = contract.engine
    if (isSummary) return
    const prev = mountedAdapterRef.current
    if (prev && prev.engine !== engine) {
      try {
        saveDraftToLocal(contractRef.current.lessonId, prev.adapter.getScript())
      } catch {
        // Best effort on engine switch; the contract-change effect also saves.
      }
      prev.adapter.unmount()
      mountedAdapterRef.current = null
    }
    let entry = mountedAdapterRef.current
    if (!entry) {
      entry = { adapter, engine }
      mountedAdapterRef.current = entry
    }
    const active = entry.adapter
    const mountEl = engine === 'scratch-vm' ? scratchMountRef.current : blocklyMountRef.current
    if (mountEl) {
      try {
        active.mount(mountEl)
      } catch (error) {
        setRunError(error instanceof Error ? error.message : '引擎挂载失败')
      }
    }
    const changeListener = () => handleAdapterChange()
    const maybeListener = active as EngineAdapter & {
      addChangeListener?: (cb: () => void) => void
      removeChangeListener?: (cb: () => void) => void
    }
    maybeListener.addChangeListener?.(changeListener)
    loadIntoAdapter(contractRef.current, initialScriptRef.current)
    if (engine === 'scratch-vm') scratchAdapterRef.current = active
    return () => {
      maybeListener.removeChangeListener?.(changeListener)
      try {
        saveDraftToLocal(contractRef.current.lessonId, active.getScript())
      } catch {
        // Unmount save is best effort; explicit 保存 is the reliable path.
      }
      active.unmount()
      if (mountedAdapterRef.current?.adapter === active) mountedAdapterRef.current = null
      if (scratchAdapterRef.current === active) scratchAdapterRef.current = null
    }
    // Mount once per engine kind; contract changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.engine])

  // Lesson switch (client parent changes the contract prop): save current
  // draft under its own key first, then load the target lesson; all six
  // contract fields re-render from the new contract and feedback clears.
  useEffect(() => {
    if (prevLessonRef.current === null) {
      prevLessonRef.current = contract.lessonId
      return
    }
    if (prevLessonRef.current === contract.lessonId) return
    const prevId = prevLessonRef.current
    const entry = mountedAdapterRef.current
    if (entry) {
      try {
        saveDraftToLocal(prevId, entry.adapter.getScript())
      } catch {
        // Best effort; explicit 保存 remains available.
      }
    }
    prevLessonRef.current = contract.lessonId
    setJudgment(null)
    setJudgmentStale(false)
    setRunError(null)
    setRevealedHints(0)
    setSaveState('unsaved')
    setSaveMessage(null)
    setNotice(null)
    if (entry) loadIntoAdapter(contract, initialScript)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.lessonId])

  // When the script tab becomes visible, let the adapter re-measure (Blockly
  // injected while hidden starts at zero size; see handleVisible).
  useEffect(() => {
    if (activeTab !== 'script') return
    const candidate = mountedAdapterRef.current?.adapter as
      | (EngineAdapter & { handleVisible?: () => void })
      | undefined
    candidate?.handleVisible?.()
  }, [activeTab])

  // Scratch readiness polling: the sandbox handshake is async; the shell polls
  // the adapter's honest ready/error accessors and never assumes ready.
  useEffect(() => {
    if (!isScratch) return
    const tick = () => {
      const candidate = scratchAdapterRef.current as
        | (EngineAdapter & { isReady?: () => boolean; getLoadError?: () => string | null })
        | null
      if (!candidate) return
      if (candidate.isReady?.()) {
        setScratchReady(true)
        setScratchError(null)
      } else {
        const error = candidate.getLoadError?.() ?? null
        if (error) setScratchError(error)
      }
      try {
        setEngineState(candidate.getState())
      } catch {
        // Keep the last known state.
      }
    }
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [isScratch])

  const handleRunEvent = useCallback(
    (event: RunEvent) => {
      setEngineState(event.state)
      if (event.kind === 'finished') {
        const trace = (
          mountedAdapterRef.current?.adapter as EngineAdapter & {
            getLastTrace?: () => { didMove: boolean; usedRepeat: boolean; finalX: number } | null
          }
        ).getLastTrace?.()
        if (trace) {
          setJudgment(buildJudgment(contractRef.current, event.state, trace))
        }
        setJudgmentStale(false)
        refreshScriptList()
      }
      if (event.kind === 'stopped') {
        const asyncError = (
          mountedAdapterRef.current?.adapter as EngineAdapter & {
            getLastRunError?: () => string | null
          }
        ).getLastRunError?.()
        if (asyncError) {
          setRunError(asyncError)
          setJudgment({
            stage: { passed: false, line: `舞台结果：运行失败——${asyncError}` },
            task: { passed: false, line: '任务判定：未通过——运行未能完成' },
            knowledge: { passed: false, line: '知识证据：未通过——运行未能完成' },
            passed: false,
            conclusion: '结论：未合格——任务判定、知识证据未通过',
          })
        }
      }
    },
    [refreshScriptList],
  )

  const handleRunToggle = useCallback(() => {
    const entry = mountedAdapterRef.current
    if (!entry) return
    if (engineState.running) {
      try {
        entry.adapter.stop()
      } catch {
        // Stop is best effort; the state below reflects the local view.
      }
      setEngineState(entry.adapter.getState())
      return
    }
    setRunError(null)
    setJudgment(null)
    setJudgmentStale(false)
    try {
      entry.adapter.run(handleRunEvent)
    } catch (error) {
      const message = error instanceof Error ? error.message : '运行失败'
      setRunError(message)
      setJudgment({
        stage: { passed: false, line: `舞台结果：运行失败——${message}` },
        task: { passed: false, line: '任务判定：未通过——运行未能完成' },
        knowledge: { passed: false, line: '知识证据：未通过——运行未能完成' },
        passed: false,
        conclusion: '结论：未合格——任务判定、知识证据未通过',
      })
    }
    try {
      setEngineState(entry.adapter.getState())
    } catch {
      // Keep the previous state.
    }
  }, [engineState.running, handleRunEvent])

  const handleSave = useCallback(() => {
    if (testFailSave) {
      // TEST HOOK (demo route only): report failure without writing.
      setSaveState('failed')
      setSaveMessage('演示保存失败（测试钩子）：未能保存')
      return
    }
    const entry = mountedAdapterRef.current
    if (!entry) {
      setSaveState('failed')
      setSaveMessage('未能保存：引擎未挂载')
      return
    }
    const result = saveDraftToLocal(contract.lessonId, entry.adapter.getScript())
    if (result.ok) {
      setSaveState('saved')
      setSaveMessage('已保存到本机')
    } else {
      setSaveState('failed')
      setSaveMessage(result.reason)
    }
  }, [contract.lessonId, testFailSave])

  const applyScriptEdit = useCallback(
    (next: DemoBlock[]) => {
      const entry = mountedAdapterRef.current
      if (!entry) return
      try {
        entry.adapter.loadScript(next)
      } catch (error) {
        setNotice(error instanceof Error ? error.message : '脚本修改失败，原脚本未变')
        return
      }
      lastScriptJsonRef.current = scriptToJson(next)
      refreshScriptList()
      if (judgmentRef.current) {
        setJudgment(null)
        setJudgmentStale(true)
      }
    },
    [refreshScriptList],
  )

  const insertBlock = useCallback(
    (block: DemoBlock) => {
      const current = isDemoScript(mountedAdapterRef.current?.adapter.getScript())
        ? (mountedAdapterRef.current?.adapter.getScript() as DemoBlock[])
        : []
      applyScriptEdit([...current, block])
    },
    [applyScriptEdit],
  )

  const moveBlock = useCallback(
    (index: number, direction: -1 | 1) => {
      const current = scriptList
      const target = index + direction
      if (target < 0 || target >= current.length) return
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      applyScriptEdit(next)
    },
    [scriptList, applyScriptEdit],
  )

  const removeBlockAt = useCallback(
    (path: number[]) => {
      const removeAt = (list: DemoBlock[], path: number[]): DemoBlock[] => {
        if (path.length === 1) return list.filter((_, i) => i !== path[0])
        return list.map((block, i) =>
          i === path[0] && block.body ? { ...block, body: removeAt(block.body, path.slice(1)) } : block,
        )
      }
      applyScriptEdit(removeAt(scriptList, path))
    },
    [scriptList, applyScriptEdit],
  )

  const patchBlockAt = useCallback(
    (path: number[], patch: Partial<DemoBlock>) => {
      const patchAt = (list: DemoBlock[], path: number[]): DemoBlock[] =>
        list.map((block, i) => {
          if (i !== path[0]) return block
          if (path.length === 1) return { ...block, ...patch }
          return block.body ? { ...block, body: patchAt(block.body, path.slice(1)) } : block
        })
      applyScriptEdit(patchAt(scriptList, path))
    },
    [scriptList, applyScriptEdit],
  )

  const closeMenuAnd = useCallback((fn: () => void) => {
    setFileMenuOpen(false)
    fn()
  }, [])

  const handleNew = useCallback(() => {
    if (!isBlockly) {
      setNotice('Scratch 演示：新建需导入工程，空白工程不受支持')
      return
    }
    applyScriptEdit(
      isDemoScript(initialScript) ? (initialScript as DemoBlock[]) : [{ type: DEMO_HAT }],
    )
    setJudgment(null)
    setJudgmentStale(false)
    setSaveState('unsaved')
  }, [isBlockly, initialScript, applyScriptEdit])

  const handleResetInitial = useCallback(() => {
    if (!isBlockly) {
      setNotice('Scratch 演示：恢复初始需重新导入工程')
      return
    }
    applyScriptEdit(
      isDemoScript(initialScript) ? (initialScript as DemoBlock[]) : [{ type: DEMO_HAT }],
    )
    setJudgment(null)
    setJudgmentStale(false)
  }, [isBlockly, initialScript, applyScriptEdit])

  const handleExport = useCallback(() => {
    const entry = mountedAdapterRef.current
    if (!entry) return
    if (isBlockly) {
      const blob = new Blob([JSON.stringify(entry.adapter.getScript(), null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${contract.lessonId}-script.json`
      a.click()
      URL.revokeObjectURL(url)
      setNotice('已导出脚本 JSON')
      return
    }
    if (isScratch) {
      const exporter = entry.adapter as EngineAdapter & {
        exportProject?: () => Promise<ArrayBuffer>
      }
      if (!exporter.exportProject) {
        setNotice('Scratch 演示：当前适配器不支持导出')
        return
      }
      exporter
        .exportProject()
        .then((bytes) => {
          const blob = new Blob([bytes], { type: 'application/x-scratch-sb3' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${contract.lessonId}.sb3`
          a.click()
          URL.revokeObjectURL(url)
          setNotice('已导出 .sb3 工程')
        })
        .catch((error: unknown) => {
          setNotice(error instanceof Error ? error.message : '导出失败，原作品未变')
        })
    }
  }, [contract.lessonId, isBlockly, isScratch])

  const handleImportFile = useCallback(
    async (file: File) => {
      const entry = mountedAdapterRef.current
      if (!entry) return
      try {
        if (isBlockly) {
          const text = await file.text()
          const parsed: unknown = JSON.parse(text)
          if (!Array.isArray(parsed)) throw new Error('导入文件不是积木列表，原脚本未变')
          // loadScript validates before clearing, so failure leaves it unchanged.
          entry.adapter.loadScript(parsed)
          lastScriptJsonRef.current = scriptToJson(parsed)
          refreshScriptList()
          setJudgment(null)
          setJudgmentStale(false)
          setNotice('已导入脚本')
          return
        }
        if (isScratch) {
          const bytes = await file.arrayBuffer()
          const importer = entry.adapter as EngineAdapter & {
            importProject?: (archive: ArrayBuffer) => Promise<void>
          }
          if (importer.importProject) {
            await importer.importProject(bytes)
            setNotice('已导入 .sb3 工程')
          } else {
            entry.adapter.loadScript({ sb3: bytes })
            setNotice('已导入 .sb3 工程（沙箱校验结果见运行反馈）')
          }
          return
        }
      } catch (error) {
        // Import failure leaves the program unchanged by construction.
        setNotice(error instanceof Error ? error.message : '导入失败，原作品未变')
      }
    },
    [isBlockly, isScratch, refreshScriptList],
  )

  const stageWidth = stageZoom === 'small' ? 240 : stageZoom === 'large' ? 420 : 320
  const stageHeight = stageZoom === 'small' ? 180 : stageZoom === 'large' ? 320 : 240
  const target = contract.judging.target
  const stagePercent = (x: number) => {
    const clamped = Math.max(-50, Math.min(300, x))
    return ((clamped + 50) / 350) * 100
  }

  const taskContent = (
    <div data-testid="ws-task-content">
      <p>
        <strong>任务简报：</strong>
        {contract.brief}
      </p>
      <p>
        <strong>当前步骤：</strong>
        {contract.step}
      </p>
      <div>
        <strong>三级提示（按顺序揭示，不提前展示答案）：</strong>
        <ol>
          {contract.hints.map((hint, index) => (
            <li key={index}>
              {revealedHints > index ? (
                hint
              ) : (
                <button
                  type="button"
                  className="kc-action-surface kc-btn-outline kc-btn-sm"
                  disabled={revealedHints < index}
                  onClick={() => setRevealedHints(index + 1)}
                  data-testid={`ws-hint-reveal-${index + 1}`}
                >
                  {revealedHints < index ? `第 ${index + 1} 级提示（需先看第 ${index} 级）` : `看第 ${index + 1} 级提示`}
                </button>
              )}
            </li>
          ))}
        </ol>
        <p>完整参考实现只在事后节点出现，本演示不提供。</p>
      </div>
    </div>
  )

  const drawer = (
    <div data-testid="ws-block-drawer">
      <p>点积木插入脚本末尾（演示积木）：</p>
      <button
        type="button"
        className="kc-action-surface kc-btn-outline kc-btn-sm"
        onClick={() => insertBlock({ type: DEMO_MOVE_RIGHT, steps: 50 })}
        data-testid="ws-drawer-move-right"
      >
        向右走 50 步
      </button>{' '}
      <button
        type="button"
        className="kc-action-surface kc-btn-outline kc-btn-sm"
        onClick={() => insertBlock({ type: DEMO_MOVE_LEFT, steps: 50 })}
        data-testid="ws-drawer-move-left"
      >
        向左走 50 步
      </button>{' '}
      <button
        type="button"
        className="kc-action-surface kc-btn-outline kc-btn-sm"
        onClick={() =>
          insertBlock({
            type: DEMO_REPEAT,
            times: 3,
            body: [{ type: DEMO_MOVE_RIGHT, steps: 50 }],
          })
        }
        data-testid="ws-drawer-repeat"
      >
        重复 3 次（向右走 50 步）
      </button>
    </div>
  )

  const scriptListPanel = isBlockly ? (
    <div data-testid="ws-script-list">
      <h3>脚本列表（可排序、删除、改参，均经适配器读写）</h3>
      {scriptList.length === 0 && <p>脚本为空：请从积木抽屉添加，或在编辑器中拖入积木。</p>}
      <ol>
        {scriptList.map((block, index) => (
          <li key={index} data-testid={`ws-script-item-${index}`}>
            <span>{blockLabel(block)}</span>{' '}
            {(block.type === DEMO_MOVE_RIGHT || block.type === DEMO_MOVE_LEFT) && (
              <label>
                步数
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={block.steps ?? 0}
                  onChange={(event) =>
                    patchBlockAt([index], { steps: Number(event.target.value) || 0 })
                  }
                  data-testid={`ws-script-steps-${index}`}
                />
              </label>
            )}{' '}
            {block.type === DEMO_REPEAT && (
              <label>
                次数
                <select
                  value={block.times ?? 2}
                  onChange={(event) => patchBlockAt([index], { times: Number(event.target.value) })}
                  data-testid={`ws-script-times-${index}`}
                >
                  {REPEAT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}{' '}
            <button
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              disabled={index === 0}
              onClick={() => moveBlock(index, -1)}
              data-testid={`ws-script-up-${index}`}
            >
              ↑
            </button>{' '}
            <button
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              disabled={index === scriptList.length - 1}
              onClick={() => moveBlock(index, 1)}
              data-testid={`ws-script-down-${index}`}
            >
              ↓
            </button>{' '}
            <button
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              onClick={() => removeBlockAt([index])}
              data-testid={`ws-script-delete-${index}`}
            >
              ✕
            </button>
            {block.type === DEMO_REPEAT && (block.body ?? []).length > 0 && (
              <ol>
                {(block.body ?? []).map((child, childIndex) => (
                  <li key={childIndex}>
                    <span>{blockLabel(child)}</span>{' '}
                    {(child.type === DEMO_MOVE_RIGHT || child.type === DEMO_MOVE_LEFT) && (
                      <label>
                        步数
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          value={child.steps ?? 0}
                          onChange={(event) =>
                            patchBlockAt([index, childIndex], {
                              steps: Number(event.target.value) || 0,
                            })
                          }
                          data-testid={`ws-script-body-steps-${index}-${childIndex}`}
                        />
                      </label>
                    )}{' '}
                    <button
                      type="button"
                      className="kc-action-surface kc-btn-outline kc-btn-sm"
                      onClick={() => removeBlockAt([index, childIndex])}
                      data-testid={`ws-script-body-delete-${index}-${childIndex}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </div>
  ) : null

  const stagePanel = (
    <section className="ws-stage" data-panel="stage" data-testid="ws-stage-panel">
      <h2>作品舞台</h2>
      <div
        data-testid="ws-stage-box"
        style={{
          position: 'relative',
          height: stageHeight,
          background: '#f3f6fb',
          border: '1px solid #e7edf5',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {isScratch ? (
          <div ref={scratchMountRef} data-testid="ws-scratch-mount" style={{ width: '100%', height: '100%' }} />
        ) : (
          <>
            <div
              style={{ position: 'absolute', left: `${stagePercent(engineState.x)}%`, bottom: 12, transform: 'translateX(-50%)' }}
              data-testid="ws-stage-character"
            >
              <CharacterArt id="fox" />
            </div>
            {target && (
              <div
                style={{ position: 'absolute', left: `${stagePercent(target.fruitX)}%`, bottom: 12, transform: 'translateX(-50%)', fontSize: 28 }}
                data-testid="ws-stage-target"
                aria-label="水果目标"
              >
                🍎
              </div>
            )}
          </>
        )}
      </div>
      <p data-testid="ws-stage-state">
        篮子 x={engineState.x}，分数={engineState.score}，{engineState.running ? '运行中' : '未运行'}
        {isScratch && (scratchReady ? '，沙箱已就绪' : scratchError ? `，沙箱未就绪：${scratchError}` : '，沙箱握手中…')}
      </p>
      <div>
        <button
          type="button"
          className="kc-action-surface kc-btn-dark"
          onClick={handleRunToggle}
          data-testid="ws-run-toggle"
        >
          {engineState.running ? '停止' : '运行作品'}
        </button>{' '}
        <span>舞台缩放（只改列宽，不重建引擎）：</span>{' '}
        <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => setStageZoom('small')} data-testid="ws-zoom-small">
          缩小
        </button>{' '}
        <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => setStageZoom('medium')} data-testid="ws-zoom-medium">
          正常
        </button>{' '}
        <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => setStageZoom('large')} data-testid="ws-zoom-large">
          放大
        </button>
      </div>
    </section>
  )

  const rolesPanel = (
    <section className="ws-roles" data-panel="roles" data-testid="ws-roles-panel">
      <h2>角色</h2>
      <ul>
        {DEMO_ROLES.map((role) => (
          <li key={role.id}>
            <button
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              aria-pressed={selectedRole === role.id}
              onClick={() => setSelectedRole(role.id)}
              data-testid={`ws-role-${role.id}`}
            >
              {role.label}
              {selectedRole === role.id ? '（已选中）' : ''}
            </button>
          </li>
        ))}
      </ul>
      <p>演示仅支持点选角色；角色增删与造型编辑为引擎接入工作，未冒充已实现。</p>
    </section>
  )

  const scriptPanel = (
    <section className="ws-script" data-panel="script" data-testid="ws-script-panel">
      <h2>脚本工作区</h2>
      {isBlockly && (
        <>
          <div
            ref={blocklyMountRef}
            data-testid="ws-blockly-mount"
            style={{ height: 420, border: '1px solid #e7edf5', borderRadius: 14 }}
          />
          <p>分类工具箱在编辑器左侧（开始 / 移动 / 控制 / 更多），拖放、改参、垃圾桶删除均真实可用。</p>
          {drawer}
          {scriptListPanel}
          <div>
            <button
              type="button"
              className="kc-action-surface kc-btn-dark"
              onClick={handleRunToggle}
              data-testid="ws-run-script"
            >
              {engineState.running ? '停止' : '运行作品'}
            </button>
          </div>
        </>
      )}
      {isScratch && (
        <>
          <p>
            Scratch 沙箱挂载在舞台区；脚本为 .sb3 工程整包（编辑器不读取导入包的积木，
            这是现有沙箱的已知限制）。导入、导出走真实 VM 打包与校验。
          </p>
          <p data-testid="ws-scratch-note">
            {scratchReady ? '沙箱已就绪。' : scratchError ? `沙箱未就绪：${scratchError}` : '沙箱握手中…'}
          </p>
          <button
            type="button"
            className="kc-action-surface kc-btn-dark"
            onClick={handleRunToggle}
            data-testid="ws-run-script"
          >
            {engineState.running ? '停止' : '运行作品'}
          </button>
        </>
      )}
      {isSummary && <p>摘要编辑尚未接入（4 号接入中）。</p>}
    </section>
  )

  if (contractErrors.length > 0) {
    return (
      <div data-testid="ws-contract-error">
        <p>课程契约无效，工作区拒绝渲染（fail-closed）：</p>
        <ul>
          {contractErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (isSummary) {
    return (
      <div className="ws-root" data-testid="ws-root">
        <style>{`
          .ws-root { font-family: "PingFang SC","Microsoft YaHei",sans-serif; color: #18243a; }
        `}</style>
        <header className="kc-title-row">
          <div>
            <div className="kc-eyebrow">统一工作区 · 演示</div>
            <h1>{contract.title}</h1>
            <p className="kc-subtitle">{contract.step}</p>
          </div>
        </header>
        <section>
          <h2>首屏五要素</h2>
          <ol>
            {contract.goal5.map((goal, index) => (
              <li key={index}>{goal}</li>
            ))}
          </ol>
        </section>
        <section>
          <h2>摘要编辑区</h2>
          <p>摘要编辑尚未接入（4 号接入中）。</p>
          <p>本演示不提供虚假编辑器。</p>
        </section>
        <section>{taskContent}</section>
      </div>
    )
  }

  return (
    <div
      className="ws-root"
      data-testid="ws-root"
      style={{ '--ws-stage-w': `${stageWidth}px` } as CSSProperties}
    >
      <style>{`
        .ws-root { font-family: "PingFang SC","Microsoft YaHei",sans-serif; color: #18243a; }
        .ws-topbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
        .ws-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
        .ws-grid { display: block; }
        .ws-panel { display: none; margin-bottom: 12px; }
        .ws-panel.ws-active { display: block; }
        .ws-stage-hidden-note { display: none; }
        @media (min-width: 768px) {
          .ws-tabs { display: none; }
          .ws-grid { display: grid; grid-template-columns: var(--ws-stage-w, 320px) 150px minmax(0, 1fr); gap: 12px; align-items: start; }
          .ws-panel { display: block; }
          .ws-blocks-panel { display: none; }
        }
        @media (min-width: 1440px) {
          .ws-grid { grid-template-columns: var(--ws-stage-w, 320px) 150px minmax(0, 1fr); }
        }
      `}</style>

      <header className="ws-topbar" data-testid="ws-topbar">
        <h1 style={{ margin: 0, fontSize: 20 }}>{contract.title}</h1>
        {contract.demo && <span data-testid="ws-demo-badge">演示</span>}
        <span data-testid="ws-step-meta">{contract.step}</span>
        <span data-testid="ws-save-chip">
          {saveState === 'saved' ? '已保存到本机' : saveState === 'failed' ? '未能保存' : '未保存'}
        </span>
        {saveMessage && <span data-testid="ws-save-message">{saveMessage}</span>}
        <button
          type="button"
          className="kc-action-surface kc-btn-outline kc-btn-sm"
          onClick={() => setFileMenuOpen((v) => !v)}
          data-testid="ws-file-menu-button"
        >
          文件
        </button>
        <button
          type="button"
          className="kc-action-surface kc-btn-outline kc-btn-sm"
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setActiveTab('task')
            } else {
              setDrawerOpen((v) => !v)
            }
          }}
          data-testid="ws-task-button"
        >
          任务
        </button>
        {/* Stage show/hide lives in the topbar, NOT inside the stage panel:
            a switch hidden by its own action could never be clicked back. */}
        <button
          type="button"
          className="kc-action-surface kc-btn-outline kc-btn-sm"
          onClick={() => setStageVisible((v) => !v)}
          data-testid="ws-stage-toggle"
        >
          {stageVisible ? '隐藏舞台' : '显示舞台'}
        </button>
        {onLessonSwitch && (
          <button
            type="button"
            className="kc-action-surface kc-btn-outline kc-btn-sm"
            onClick={() => onLessonSwitch(contract.lessonId)}
            data-testid="ws-lesson-switch"
          >
            切换课程
          </button>
        )}
        {fileMenuOpen && (
          <div data-testid="ws-file-menu">
            <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => closeMenuAnd(handleNew)} data-testid="ws-file-new">
              新建
            </button>{' '}
            <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => closeMenuAnd(handleSave)} data-testid="ws-file-save">
              保存作品
            </button>{' '}
            <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => closeMenuAnd(handleExport)} data-testid="ws-file-export">
              导出
            </button>{' '}
            <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => { setFileMenuOpen(false); fileInputRef.current?.click() }} data-testid="ws-file-import">
              导入
            </button>{' '}
            <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => closeMenuAnd(handleResetInitial)} data-testid="ws-file-reset">
              恢复初始
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={isBlockly ? '.json,application/json' : '.sb3'}
          style={{ display: 'none' }}
          data-testid="ws-file-input"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void handleImportFile(file)
          }}
        />
      </header>

      <section>
        <h2>首屏五要素</h2>
        <ol data-testid="ws-goal5">
          {contract.goal5.map((goal, index) => (
            <li key={index}>{goal}</li>
          ))}
        </ol>
      </section>

      {drawerOpen && (
        <section data-testid="ws-task-drawer">
          <h2>任务抽屉</h2>
          {taskContent}
        </section>
      )}

      <nav className="ws-tabs" data-testid="ws-tabs">
        {(
          [
            ['stage', '舞台'],
            ['blocks', '积木'],
            ['script', '脚本'],
            ['task', '任务'],
          ] as Array<[TabId, string]>
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className="kc-action-surface kc-btn-outline kc-btn-sm"
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            data-testid={`ws-tab-${tab}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Mobile: only the active panel shows; desktop/tablet: grid shows all.
          The mount divs stay in the DOM either way — tab switches never
          remount the adapter. The ws-active class is applied on mobile only
          via the tab state; on >=768px CSS forces all panels visible. */}
      <div className="ws-grid" data-testid="ws-grid">
        {/* The stage panel always stays in the DOM: hiding it only sets
            display:none, so the Scratch iframe (and the Blockly mount in the
            script panel) is never destroyed by a visibility switch. */}
        <div
          className={`ws-panel ws-stage-wrap ${activeTab === 'stage' ? 'ws-active' : ''}`}
          style={stageVisible ? undefined : { display: 'none' }}
        >
          {stagePanel}
        </div>
        {!stageVisible && <p data-testid="ws-stage-hidden-note">舞台已隐藏（脚本不受影响）。</p>}
        <div className={`ws-panel ws-roles-wrap ${activeTab === 'stage' ? 'ws-active' : ''}`}>{rolesPanel}</div>
        <div className={`ws-panel ws-blocks-panel ${activeTab === 'blocks' ? 'ws-active' : ''}`}>
          <section data-testid="ws-blocks-panel">
            <h2>积木素材</h2>
            {drawer}
            <p>点积木插入脚本末尾；脚本区内也可直接操作。</p>
          </section>
        </div>
        <div className={`ws-panel ws-script-wrap ${activeTab === 'script' ? 'ws-active' : ''}`}>{scriptPanel}</div>
        <div className={`ws-panel ws-task-wrap ${activeTab === 'task' ? 'ws-active' : ''}`}>
          <section data-testid="ws-task-panel">
            <h2>任务</h2>
            {taskContent}
          </section>
        </div>
      </div>

      <section data-testid="ws-feedback">
        <h2>反馈</h2>
        {runError && <p data-testid="ws-run-error">{runError}</p>}
        {notice && <p data-testid="ws-notice">{notice}</p>}
        {judgmentStale && <p data-testid="ws-judgment-stale">旧判定已失效，修改后请重新运行</p>}
        {judgment ? (
          <>
            <p data-testid="ws-feedback-stage">{judgment.stage.line}</p>
            <p data-testid="ws-feedback-task">{judgment.task.line}</p>
            <p data-testid="ws-feedback-knowledge">{judgment.knowledge.line}</p>
            <p data-testid="ws-feedback-conclusion">{judgment.conclusion}</p>
          </>
        ) : (
          !judgmentStale && <p>尚未运行：运行后这里会显示舞台结果、任务判定、知识证据三行。</p>
        )}
      </section>
    </div>
  )
}
