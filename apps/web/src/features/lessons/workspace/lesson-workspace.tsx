'use client'

/**
 * LessonWorkspace — shared shell per docs/product/p0-kitten-workspace/DESIGN.md §2–§3
 * and WORKSPACE-API.md (p0-kitten-workspace-v1.0).
 *
 * Layout: desktop shows stage + roles + icon rail + script on one screen
 * (the material zone is the Blockly flyout opened from the rail, so the
 * script column stays maximal); tablet is a dedicated single-column IDE
 * (compact stage, horizontal roles strip, rail + script row) so the first
 * screen shows stage and script together; mobile is a one-screen touch
 * workspace (compact stage preview, run row, script, in-script drawer —
 * no tab pages, so stage and script share the first screen). Panels stay
 * in the DOM and the adapter is never remounted by any visibility switch.
 * The shell renders ONLY contract content plus adapter-owned slot content.
 * Demo contracts are labelled 演示. The shell never invents a judgment: it
 * displays only what an adapter returns, and with no adapter judgment it
 * shows run state alone. Editing the program after a run invalidates the
 * previous judgment (and it never auto-recovers, even if the edit is
 * reverted).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import {
  DEMO_HAT,
  DEMO_MOVE_LEFT,
  DEMO_MOVE_RIGHT,
  DEMO_REPEAT,
  type DemoBlock,
} from './blockly-adapter'
import type { LessonContract } from './lesson-contract'
import { validateLessonContract } from './lesson-contract'
import type { EngineAdapter, EngineState, RunEvent, SlotRunAdapter } from './workspace-adapters'
import { loadDraftFromLocal, saveDraftToLocal } from './workspace-draft'
import {
  shouldAutosavePreservePrompt,
  type EditorSlotComponent,
  type JudgmentResult,
  type RolesSlotComponent,
  type StageSlotComponent,
} from './workspace-slots'

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
  /**
   * Three-engine slots (OPS-020, OPS-022 D1). When `editorSlot` is present,
   * the shell renders that React component as the editor; the slot owns
   * the editing surface and its data, while the shell still mounts the
   * imperative adapter for a real engine (scratch-vm/blockly) as the run
   * target — only summary courses mount no adapter. Adapters must never
   * call createRoot themselves. When `stageSlot` is present, it renders
   * the stage scene content inside the shell's stage box (the shell keeps
   * the card chrome: header, state line, run bar, zoom); a scratch-vm
   * course with a stage slot gets a plain adapter host div outside the
   * stage box (see ws-adapter-mount). When `rolesSlot` is present, it
   * renders the role column; the shell itself renders no characters and
   * no roles. When `contract.hasStage === false`, no stage or roles area
   * renders at all. All slots are optional; the demo route supplies
   * stageSlot + rolesSlot for its demo lessons.
   */
  editorSlot?: EditorSlotComponent
  stageSlot?: StageSlotComponent
  rolesSlot?: RolesSlotComponent
  /**
   * Independent run adapter (OPS-022, contract §2). A slot course whose
   * run target is not its imperative adapter passes one here instead
   * (e.g. a course-owned runner). Resolution: runAdapter ?? mounted
   * adapter; with neither, the shell renders no run button at all
   * (never a dead one).
   */
  runAdapter?: SlotRunAdapter
}

/** Autosave debounce (R4/C8 proposal value; #470's 350ms is reference only). */
export const AUTOSAVE_DEBOUNCE_MS = 1000

/**
 * Self-drawn icon-rail glyphs (simple geometric shapes, not copied from
 * any vendor icon set). Unknown categories fall back to a brand-colour dot
 * with the category's first character; the mapping below only covers
 * generic words (start / move / control / more).
 */
function RailIcon({ label, color }: { label: string; color: string }) {
  if (label.includes('开始') || label.includes('事件')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3v18" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M7 4h11l-3 4 3 4H7z" fill={color} />
      </svg>
    )
  }
  if (label.includes('移动')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9.5h10V5l8 7-8 7v-4.5H3z" fill={color} />
      </svg>
    )
  }
  if (label.includes('控制') || label.includes('重复')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M18 2v4H14M6 22v-4h4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  }
  if (label.includes('更多')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="5" cy="12" r="2.6" fill={color} />
        <circle cx="12" cy="12" r="2.6" fill={color} />
        <circle cx="19" cy="12" r="2.6" fill={color} />
      </svg>
    )
  }
  return (
    <span className="ws-rail-dot" style={{ background: color }}>
      {label.charAt(0)}
    </span>
  )
}

type SaveState = 'unsaved' | 'saved' | 'failed'

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
  editorSlot,
  stageSlot,
  rolesSlot,
  runAdapter,
}: LessonWorkspaceProps) {
  const contractErrors = useMemo(() => validateLessonContract(contract), [contract])
  const hasStage = contract.hasStage !== false
  // JSX needs capitalised aliases to render the slot component types.
  const StageSlotView = stageSlot ?? null
  const EditorSlotView = editorSlot ?? null
  const RolesSlotView = rolesSlot ?? null
  // File capabilities: adapter first, then contract, then demo default
  // (all shown). Absent capabilities mean "shown", never "fake button".
  const fileCaps = useMemo(
    () => adapter.getFileCapabilities?.() ?? contract.fileCapabilities ?? {},
    [adapter, contract.fileCapabilities],
  )
  const showFile = (key: 'canNew' | 'canSave' | 'canExport' | 'canImport' | 'canReset') =>
    fileCaps[key] !== false
  const [stageVisible, setStageVisible] = useState(true)
  // Roles strip: always visible on tablet/desktop (CSS forces it there);
  // on phones it starts collapsed and opens from the stage-head toggle,
  // so the first screen stays a programming screen, not a roles page.
  const [rolesOpen, setRolesOpen] = useState(true)
  const [stageZoom, setStageZoom] = useState<'small' | 'medium' | 'large'>('medium')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [goalExpanded, setGoalExpanded] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [revealedHints, setRevealedHints] = useState(0)
  // Icon rail selection, driven by the adapter (see iconRail below).
  const [railSelected, setRailSelected] = useState<string | null>(null)
  // Block search text; filters both the adapter inventory results and the
  // demo drawer chips. Empty = unfiltered.
  const [searchText, setSearchText] = useState('')
  const [engineState, setEngineState] = useState<EngineState>({ x: 0, score: 0, running: false, frames: 0 })
  const [judgment, setJudgment] = useState<JudgmentResult | null>(null)
  // Editor-slot courses (no imperative adapter): the slot's current data
  // lives in a ref so save/autosave never read stale state; `editorInitial`
  // is the value the slot mounts with (draft or initialScript), refreshed
  // only on mount / lesson switch / explicit reset (slot key remounts).
  const [editorInitial, setEditorInitial] = useState<unknown>(undefined)
  // The lesson the loaded editorInitial belongs to. The slot mounts only
  // when this matches the current lesson: without the guard, a slot could
  // mount with a stale (previous lesson's or empty) initial and never
  // re-read it, because React useState(initial) reads initial only on mount.
  const [editorInitialLesson, setEditorInitialLesson] = useState<string | null>(null)
  const [slotResetKey, setSlotResetKey] = useState(0)
  const [judgmentStale, setJudgmentStale] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('unsaved')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [scriptList, setScriptList] = useState<DemoBlock[]>([])
  const [scratchReady, setScratchReady] = useState(false)
  const [scratchError, setScratchError] = useState<string | null>(null)
  // OPS-022 D1: hasRunTarget reads mountedAdapterRef during render, but
  // refs don't trigger renders. The mount effect bumps this tick after
  // mounting, so a slot+adapter course re-renders and its run button
  // appears even when every loadEditorSlotData setter bails out (e.g. an
  // engine switch from summary to scratch-vm with unchanged slot data).
  const [adapterMountTick, setAdapterMountTick] = useState(0)

  const blocklyMountRef = useRef<HTMLDivElement | null>(null)
  const scratchMountRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mountedAdapterRef = useRef<{ adapter: EngineAdapter; engine: string } | null>(null)
  /** OPS-023: the lesson whose data/adapter the shell currently holds.
   * The mount cleanup saves under this lesson (never the incoming one),
   * and the lesson-switch effect uses it to tell whether the mount
   * effect already saved the old lesson on the same commit. */
  const mountedLessonRef = useRef<string | null>(null)
  const contractRef = useRef(contract)
  contractRef.current = contract
  const initialScriptRef = useRef(initialScript)
  initialScriptRef.current = initialScript
  const judgmentRef = useRef<JudgmentResult | null>(null)
  judgmentRef.current = judgment
  const lastScriptJsonRef = useRef('')
  const lastSavedJsonRef = useRef('')
  const prevLessonRef = useRef<string | null>(null)
  const scratchAdapterRef = useRef<EngineAdapter | null>(null)
  /** R3 run generation: every run start / stop / lesson switch bumps this;
   * event callbacks captured an older generation are dropped as stale. */
  const runGenRef = useRef(0)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorDataRef = useRef<unknown>(undefined)
  // OPS-022: run-target refs so the run callbacks stay identity-stable
  // while always seeing the current prop/state. runAdapterRef follows the
  // prop each render (same pattern as contractRef); engineStateRef lets
  // the toggle read the live running flag instead of a stale closure.
  const runAdapterRef = useRef(runAdapter)
  runAdapterRef.current = runAdapter
  const engineStateRef = useRef(engineState)
  engineStateRef.current = engineState
  /** The run target that produced the current run's events (R3 binding). */
  const runTargetRef = useRef<{
    run: (onEvent: (e: RunEvent) => void) => void
    stop: () => void
    getState: () => EngineState
    getJudgmentResult?: () => JudgmentResult | null
    getStageState?: () => Record<string, number | string | boolean>
    getLastRunError?: () => string | null
  } | null>(null)
  const saveMessageRef = useRef<string | null>(null)
  // Narrow-viewport defaults (effect, not initial state, so server and
  // client render identically): the material palette starts collapsed
  // below 1280px — on tablet and phone it opens on demand, so the script
  // area reaches the first screen; the roles strip collapses below 768px
  // only (tablet shows it unconditionally). Desktop keeps both open.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1280) setPaletteOpen(false)
      if (window.innerWidth < 768) setRolesOpen(false)
    }
  }, [])

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

  const setSaveMessageAndRef = useCallback((message: string | null) => {
    saveMessageRef.current = message
    setSaveMessage(message)
  }, [])

  /** Current student work, whichever surface owns it (slot data or adapter). */
  const getCurrentScript = useCallback(() => {
    if (editorSlot) return editorDataRef.current ?? null
    return mountedAdapterRef.current?.adapter.getScript()
  }, [editorSlot])

  /**
   * R4 autosave: debounced, deduplicated (no write when unchanged), never
   * before the initial restore (only edit handlers call this), and an
   * autosave success never overwrites a restore prompt (R4 rule) while an
   * autosave failure always reports honestly.
   */
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null
      const script = getCurrentScript()
      const json = scriptToJson(script)
      if (json === lastSavedJsonRef.current) return
      if (testFailSave) {
        setSaveState('failed')
        setSaveMessageAndRef('演示保存失败（测试钩子）：未能保存')
        return
      }
      const result = saveDraftToLocal(contractRef.current.lessonId, script)
      if (result.ok) {
        lastSavedJsonRef.current = json
        setSaveState('saved')
        if (!shouldAutosavePreservePrompt(saveMessageRef.current)) {
          setSaveMessageAndRef('已保存到本机')
        }
      } else {
        setSaveState('failed')
        setSaveMessageAndRef(result.reason)
      }
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [getCurrentScript, setSaveMessageAndRef, testFailSave])

  const handleAdapterChange = useCallback(() => {
    const json = scriptToJson(mountedAdapterRef.current?.adapter.getScript())
    if (json && json !== lastScriptJsonRef.current) {
      lastScriptJsonRef.current = json
      refreshScriptList()
      setSaveState('unsaved')
      if (judgmentRef.current) {
        setJudgment(null)
        setJudgmentStale(true)
      }
      scheduleAutosave()
    }
  }, [refreshScriptList, scheduleAutosave])

  /** Editor-slot counterpart of loadIntoAdapter (draft or initial, no adapter). */
  const loadEditorSlotData = useCallback(
    (targetContract: LessonContract, targetInitial: unknown) => {
      const draft = loadDraftFromLocal(targetContract.lessonId)
      let loaded: unknown = null
      let fromDraft = false
      if (draft.data !== null && draft.reason === null) {
        // OPS-022 chief review: validate the stored slot draft exactly like
        // the adapter path does (loadIntoAdapter). Summary courses have no
        // adapter concept, so they never validate against an adapter; an
        // adapter without validateDraft accepts the draft (?? true). A
        // throwing validator counts as invalid (fail-closed). An invalid
        // draft falls back to the initial script below, is never reported
        // as restored/saved, and is never overwritten or deleted here.
        let valid = true
        if (!isSummary) {
          try {
            valid = adapter.validateDraft?.(draft.data) ?? true
          } catch {
            valid = false
          }
        }
        if (valid) {
          loaded = draft.data
          fromDraft = true
        } else if (targetInitial !== undefined && targetInitial !== null) {
          loaded = targetInitial
        }
      } else if (targetInitial !== undefined && targetInitial !== null) {
        loaded = targetInitial
      }
      editorDataRef.current = loaded
      setEditorInitial(loaded)
      setEditorInitialLesson(targetContract.lessonId)
      const json = scriptToJson(loaded)
      lastSavedJsonRef.current = fromDraft ? json : ''
      if (fromDraft) {
        setSaveState('saved')
        setSaveMessageAndRef('已恢复草稿')
      } else {
        setSaveState('unsaved')
        setSaveMessageAndRef(null)
      }
    },
    [adapter, isSummary, setSaveMessageAndRef],
  )

  const loadIntoAdapter = useCallback(
    (targetContract: LessonContract, targetInitial: unknown) => {
      const entry = mountedAdapterRef.current
      if (!entry) return
      const draft = loadDraftFromLocal(targetContract.lessonId)
      let loaded = false
      let fromDraft = false
      if (draft.data !== null && draft.reason === null) {
        // Adapter-owned draft validation (R4): an invalid draft falls back
        // to the initial script and never overwrites a good draft.
        const valid = entry.adapter.validateDraft?.(draft.data) ?? true
        if (valid) {
          try {
            entry.adapter.loadScript(draft.data)
            loaded = true
            fromDraft = true
          } catch {
            loaded = false
          }
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
      lastSavedJsonRef.current = fromDraft ? lastScriptJsonRef.current : ''
      if (fromDraft) {
        setSaveState('saved')
        setSaveMessageAndRef('已恢复草稿')
      }
      refreshScriptList()
    },
    [refreshScriptList, setSaveMessageAndRef],
  )

  // Adapter lifecycle: mount once per engine kind. A new adapter instance of
  // the same engine (e.g. a fresh server render) reuses the mounted one, so
  // tab switches and lesson switches never remount the engine.
  useEffect(() => {
    const engine = contract.engine
    // OPS-022 D1: editorSlot no longer blocks the adapter mount. A slot
    // course with a real engine (scratch-vm/blockly) mounts its adapter
    // exactly like an imperative course: the slot owns the editing
    // surface and its data (loadEditorSlotData, never loadIntoAdapter),
    // while the mounted adapter is the run target. Only summary courses
    // still mount nothing (no run concept).
    const useSlotData = Boolean(editorSlot)
    if (useSlotData) {
      loadEditorSlotData(contractRef.current, initialScriptRef.current)
    }
    // OPS-023: from here on the shell holds this lesson's data/adapter.
    // The cleanup below reads this ref, so it always saves under the
    // outgoing lesson — never the incoming one (contractRef already
    // points at the new lesson by the time a cleanup runs).
    mountedLessonRef.current = contract.lessonId
    if (isSummary) {
      // Summary without a slot never edited anything: keep the old
      // no-cleanup behavior exactly (no null draft written on unmount).
      if (!useSlotData) return
      return () => {
        if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current)
        runGenRef.current += 1
        // F3: best-effort stop of the live run target before the slot data
        // is saved; a summary course with a runAdapter may still hold one.
        const liveTarget = runTargetRef.current
        runTargetRef.current = null
        if (liveTarget && engineStateRef.current.running) {
          try {
            liveTarget.stop()
          } catch {
            // Best effort; the run is abandoned either way.
          }
        }
        // F2 + OPS-023: the run is stopped, so the displayed state must
        // stop too. Otherwise the shell still shows "running" for a dead
        // run, and a later stop click would fall back to the current
        // target and stop a target that never ran.
        setEngineState((prev) => (prev.running ? { ...prev, running: false } : prev))
        try {
          saveDraftToLocal(
            mountedLessonRef.current ?? contractRef.current.lessonId,
            editorDataRef.current ?? null,
          )
        } catch {
          // Unmount save is best effort; explicit 保存 is the reliable path.
        }
      }
    }
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
    const mountEl = engine === 'scratch-vm' ? scratchMountRef.current : blocklyMountRef.current
    // OPS-022 D1 (fail-closed): a slot course with no adapter host (blockly
    // + slot: the script panel renders the slot, not a Blockly mount) gets
    // no mounted run target, so no run button renders for it. Adapter
    // courses keep the existing register-always behavior untouched.
    const canMount = !useSlotData || mountEl !== null
    let active: EngineAdapter | null = null
    let changeListener: (() => void) | null = null
    let maybeListener: (EngineAdapter & {
      addChangeListener?: (cb: () => void) => void
      removeChangeListener?: (cb: () => void) => void
    }) | null = null
    if (canMount) {
      let entry = mountedAdapterRef.current
      if (!entry) {
        entry = { adapter, engine }
        mountedAdapterRef.current = entry
      }
      active = entry.adapter
      if (mountEl) {
        try {
          active.mount(mountEl)
        } catch (error) {
          setRunError(error instanceof Error ? error.message : '引擎挂载失败')
        }
      }
      changeListener = () => handleAdapterChange()
      maybeListener = active as EngineAdapter & {
        addChangeListener?: (cb: () => void) => void
        removeChangeListener?: (cb: () => void) => void
      }
      maybeListener.addChangeListener?.(changeListener)
      // Slot courses never load into the adapter: the slot's onChange data
      // (editorDataRef) IS the course session, and loading adapter-side
      // data over it would overwrite that session. Adapter courses keep
      // the existing restore path untouched.
      if (!useSlotData) {
        loadIntoAdapter(contractRef.current, initialScriptRef.current)
      }
      if (engine === 'scratch-vm') scratchAdapterRef.current = active
      setAdapterMountTick((t) => t + 1)
    }
    return () => {
      if (maybeListener && changeListener) maybeListener.removeChangeListener?.(changeListener)
      if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current)
      runGenRef.current += 1
      // F3: best-effort stop of the live run target before the adapter is
      // unmounted. The generation bump above drops any event the stop
      // itself fires, and unmount() alone does not promise to end a run.
      const liveTarget = runTargetRef.current
      runTargetRef.current = null
      if (liveTarget && engineStateRef.current.running) {
        try {
          liveTarget.stop()
        } catch {
          // Best effort; the run is abandoned either way.
        }
      }
      // F2 + OPS-023: the run is stopped, so the displayed state must
      // stop too (same reason as the summary-slot cleanup above).
      setEngineState((prev) => (prev.running ? { ...prev, running: false } : prev))
      try {
        // Slot courses save the slot's data, never the adapter script:
        // the slot owns the session; the adapter is only the run target.
        // OPS-023: save under the lesson the outgoing adapter/data
        // belonged to (mountedLessonRef), never contractRef (which
        // already points at the incoming lesson when this cleanup runs).
        saveDraftToLocal(
          mountedLessonRef.current ?? contractRef.current.lessonId,
          useSlotData ? (editorDataRef.current ?? null) : (active?.getScript() ?? null),
        )
      } catch {
        // Unmount save is best effort; explicit 保存 is the reliable path.
      }
      if (active) {
        active.unmount()
        if (mountedAdapterRef.current?.adapter === active) mountedAdapterRef.current = null
        if (scratchAdapterRef.current === active) scratchAdapterRef.current = null
      }
    }
    // Mount once per engine kind AND adapter instance: a new adapter
    // prop (a different lesson's engine) must unmount the old one and
    // mount the new one — reusing the previous lesson's adapter would
    // run and judge the wrong lesson. The same instance is still reused
    // (no re-run), so shared adapters and tab switches are unaffected.
    // Contract changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.engine, adapter])

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
    // C8 hardening (round 3): cancel the pending debounced autosave before
    // the synchronous switch save below. Without this, the stale timer
    // fires later and writes the NEW lesson's untouched initial script
    // early (wrong lesson lifecycle, even though the key stays correct).
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    const entry = mountedAdapterRef.current
    // OPS-023: the mount effect (declared above) already saved the old
    // lesson when it swapped the adapter/engine — its cleanup runs first
    // on the same commit. Save here only when the mounted data still
    // belongs to the previous lesson (same engine, same adapter); saving
    // the swapped-in adapter's script under the old key would overwrite
    // the old lesson's draft with the new lesson's work.
    if (mountedLessonRef.current === prevId) {
      if (editorSlot) {
        try {
          saveDraftToLocal(prevId, editorDataRef.current ?? null)
        } catch {
          // Best effort; explicit 保存 remains available.
        }
      } else if (entry) {
        try {
          saveDraftToLocal(prevId, entry.adapter.getScript())
        } catch {
          // Best effort; explicit 保存 remains available.
        }
      }
    }
    prevLessonRef.current = contract.lessonId
    // A lesson switch invalidates every in-flight run event (R3).
    runGenRef.current += 1
    // F3 + OPS-023 (unified, single stop): best-effort stop of the old run
    // target on lesson switch. The generation bump above already drops any
    // synchronous 'stopped' event the stop itself fires, so it can never
    // display on the new lesson. The target is the run's own target
    // (runTargetRef), never whatever is mounted now; the ref is cleared
    // with it, so no stale target survives into the new lesson.
    const oldTarget = runTargetRef.current
    runTargetRef.current = null
    if (oldTarget && engineStateRef.current.running) {
      try {
        oldTarget.stop()
      } catch {
        // Best effort; the run is abandoned either way.
      }
    }
    // OPS-023: the new lesson starts with a fresh run state. The old
    // lesson's x/score/frames — and a stale scratch-ready flag — must
    // never render as the new lesson's stage state (the scratch poller
    // overwrites this with the current adapter's state on its next tick).
    setEngineState({ x: 0, score: 0, running: false, frames: 0 })
    setScratchReady(false)
    setScratchError(null)
    setJudgment(null)
    setJudgmentStale(false)
    setRunError(null)
    setRevealedHints(0)
    setSaveState('unsaved')
    setSaveMessageAndRef(null)
    setNotice(null)
    if (editorSlot) loadEditorSlotData(contract, initialScript)
    else if (entry) loadIntoAdapter(contract, initialScript)
    // OPS-023: from here on the shell holds the new lesson's data.
    mountedLessonRef.current = contract.lessonId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.lessonId])

  // Stage show/hide and zoom change the script column width (desktop) and
  // the stage box height; re-measure Blockly so the canvas never stays
  // clipped after a layout change.
  useEffect(() => {
    const candidate = mountedAdapterRef.current?.adapter as
      | (EngineAdapter & { handleVisible?: () => void })
      | undefined
    candidate?.handleVisible?.()
  }, [stageVisible, stageZoom])

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

  /**
   * OPS-022 run resolution (contract §2): runAdapter ?? mounted adapter.
   * Slot courses pass the slot's CURRENT data (editorDataRef, the same
   * value save/judgment use) into runProgram; adapter courses keep their
   * existing run() path untouched. Method references are wrapped so a
   * class adapter's `this` never breaks when the shell calls back later.
   */
  const resolveRunTarget = useCallback(() => {
    const slot = runAdapterRef.current
    if (slot) {
      return {
        run: (onEvent: (e: RunEvent) => void) =>
          slot.runProgram(editorDataRef.current ?? null, onEvent),
        stop: () => slot.stop(),
        getState: () => slot.getState(),
        getJudgmentResult: slot.getJudgmentResult
          ? () => slot.getJudgmentResult!()
          : undefined,
        getStageState: slot.getStageState ? () => slot.getStageState!() : undefined,
        getLastRunError: slot.getLastRunError ? () => slot.getLastRunError!() : undefined,
      }
    }
    const entry = mountedAdapterRef.current
    if (!entry) return null
    const a = entry.adapter
    return {
      run: (onEvent: (e: RunEvent) => void) => a.run(onEvent),
      stop: () => a.stop(),
      getState: () => a.getState(),
      getJudgmentResult: a.getJudgmentResult ? () => a.getJudgmentResult!() : undefined,
      getStageState: a.getStageState ? () => a.getStageState!() : undefined,
      getLastRunError: (
        a as EngineAdapter & { getLastRunError?: () => string | null }
      ).getLastRunError
        ? () => (a as EngineAdapter & { getLastRunError?: () => string | null }).getLastRunError!()
        : undefined,
    }
  }, [])

  const handleRunEvent = useCallback(
    (event: RunEvent) => {
      setEngineState(event.state)
      if (event.kind === 'finished') {
        // The shell displays ONLY a target-owned judgment. With no
        // target judgment, a finished run shows run state alone — the
        // shell never invents a pass/fail conclusion (no failJudgment).
        // The judgment is read from the run's own target (runTargetRef),
        // never from whatever adapter happens to be mounted now.
        const generic = runTargetRef.current?.getJudgmentResult?.()
        if (generic) {
          setJudgment(generic)
        }
        setJudgmentStale(false)
        refreshScriptList()
      }
      if (event.kind === 'stopped') {
        const asyncError = runTargetRef.current?.getLastRunError?.()
        if (asyncError) {
          // Run errors surface as errors only, never as a fabricated
          // "未合格" judgment: the previous judgment (if any) stays cleared
          // by the run start, and no new conclusion is invented.
          setRunError(asyncError)
        }
      }
    },
    [refreshScriptList],
  )

  /** OPS-022 start branch: shared by the shell buttons and shell.run. */
  const handleRunStart = useCallback(() => {
    const target = resolveRunTarget()
    if (!target) return
    if (engineStateRef.current.running) return
    runTargetRef.current = target
    setRunError(null)
    setJudgment(null)
    setJudgmentStale(false)
    // Capture this run's generation: only events from the current run reach
    // handleRunEvent; stale async results are dropped, never displayed.
    const gen = ++runGenRef.current
    try {
      target.run((event) => {
        if (gen !== runGenRef.current) return
        handleRunEvent(event)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '运行失败'
      // Sync run failure: error text only, no invented judgment.
      setRunError(message)
    }
    try {
      setEngineState(target.getState())
    } catch {
      // Keep the previous state.
    }
  }, [handleRunEvent, resolveRunTarget])

  /** OPS-022 stop branch: shared by the shell buttons and shell.stop. */
  const handleRunStop = useCallback(() => {
    if (!engineStateRef.current.running) return
    // F2: stop the target that actually started the run (runTargetRef),
    // never the current prop — the runAdapter may have changed mid-run,
    // and stopping the new target would leave the old run live. Fall back
    // to the current resolution only when no run was recorded (e.g. the
    // Scratch poller reported a running state the shell never started).
    const target = runTargetRef.current ?? resolveRunTarget()
    if (!target) return
    // R3: stop invalidates the run generation first, so a late 'finished'
    // from the stopped run can never display a stale pass afterwards.
    // Clearing the displayed judgment here is defence-in-depth on top of
    // the generation guard (the start branch already clears on run).
    runGenRef.current += 1
    runTargetRef.current = null
    try {
      target.stop()
    } catch {
      // Stop is best effort; the state below reflects the local view.
    }
    setJudgment(null)
    setJudgmentStale(false)
    try {
      setEngineState(target.getState())
    } catch {
      // Keep the previous state.
    }
  }, [resolveRunTarget])

  const handleRunToggle = useCallback(() => {
    if (engineStateRef.current.running) handleRunStop()
    else handleRunStart()
  }, [handleRunStart, handleRunStop])

  const handleSave = useCallback(() => {
    if (testFailSave) {
      // TEST HOOK (demo route only): report failure without writing.
      setSaveState('failed')
      setSaveMessageAndRef('演示保存失败（测试钩子）：未能保存')
      return
    }
    let script: unknown
    if (editorSlot) {
      script = editorDataRef.current ?? null
    } else {
      const entry = mountedAdapterRef.current
      if (!entry) {
        setSaveState('failed')
        setSaveMessageAndRef('未能保存：引擎未挂载')
        return
      }
      script = entry.adapter.getScript()
    }
    const result = saveDraftToLocal(contract.lessonId, script)
    if (result.ok) {
      lastSavedJsonRef.current = scriptToJson(script)
      setSaveState('saved')
      setSaveMessageAndRef('已保存到本机')
    } else {
      setSaveState('failed')
      setSaveMessageAndRef(result.reason)
    }
  }, [contract.lessonId, editorSlot, setSaveMessageAndRef, testFailSave])

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
      setSaveState('unsaved')
      if (judgmentRef.current) {
        setJudgment(null)
        setJudgmentStale(true)
      }
      scheduleAutosave()
    },
    [refreshScriptList, scheduleAutosave],
  )

  /** Editor-slot edit path: same invalidation + autosave as adapter edits. */
  const handleEditorSlotChange = useCallback(
    (data: unknown) => {
      editorDataRef.current = data
      setSaveState('unsaved')
      if (judgmentRef.current) {
        setJudgment(null)
        setJudgmentStale(true)
      }
      scheduleAutosave()
    },
    [scheduleAutosave],
  )

  /**
   * OPS-025 (#481) slot judgment report: the slot's own check reports its
   * judgment and the shell displays it verbatim in the feedback card.
   * The shell never recomputes a score here — this is display only.
   * Reporting null invalidates exactly like an edit: only when a judgment
   * is currently shown does the stale notice appear; reporting null with
   * nothing shown is a no-op (no stale notice, no invented result).
   */
  const handleSlotJudgment = useCallback((reported: JudgmentResult | null) => {
    if (reported) {
      setJudgment(reported)
      setJudgmentStale(false)
      return
    }
    if (judgmentRef.current) {
      setJudgment(null)
      setJudgmentStale(true)
    }
  }, [])

  const insertBlock = useCallback(
    (block: DemoBlock) => {
      const current = isDemoScript(mountedAdapterRef.current?.adapter.getScript())
        ? (mountedAdapterRef.current?.adapter.getScript() as DemoBlock[])
        : []
      applyScriptEdit([...current, block])
    },
    [applyScriptEdit],
  )

  /**
   * Search-result insert: through the adapter's real editor API
   * (insertBlock), never a fake list entry. Mirrors handleAdapterChange's
   * invalidation (judgment clears, autosave schedules) in case the
   * adapter's change event does not reach the shell.
   */
  const insertSearchBlock = useCallback(
    (type: string) => {
      const entry = mountedAdapterRef.current
      if (!entry) {
        setNotice('插入失败，原脚本未变')
        return
      }
      const ok = entry.adapter.insertBlock?.(type) ?? false
      if (!ok) {
        setNotice('插入失败，原脚本未变')
        return
      }
      refreshScriptList()
      setSaveState('unsaved')
      if (judgmentRef.current) {
        setJudgment(null)
        setJudgmentStale(true)
      }
      scheduleAutosave()
    },
    [refreshScriptList, scheduleAutosave],
  )

  const moveBlock = useCallback(
    (index: number, direction: -1 | 1) => {
      const current = scriptList
      // R1-2: the start hat never moves, and nothing moves above it — the
      // first block of a program is always the start event.
      if (current[index]?.type === DEMO_HAT) return
      const target = index + direction
      if (target < 0 || target >= current.length) return
      if (target === 0 && current[0]?.type === DEMO_HAT) return
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
    if (editorSlot) {
      const init = initialScriptRef.current
      editorDataRef.current = init
      setEditorInitial(init)
      setSlotResetKey((k) => k + 1)
      setJudgment(null)
      setJudgmentStale(false)
      setSaveState('unsaved')
      scheduleAutosave()
      return
    }
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
  }, [isBlockly, initialScript, applyScriptEdit, editorSlot, scheduleAutosave])

  const handleResetInitial = useCallback(() => {
    if (editorSlot) {
      const init = initialScriptRef.current
      editorDataRef.current = init
      setEditorInitial(init)
      setSlotResetKey((k) => k + 1)
      setJudgment(null)
      setJudgmentStale(false)
      setSaveState('unsaved')
      scheduleAutosave()
      return
    }
    if (!isBlockly) {
      setNotice('Scratch 演示：恢复初始需重新导入工程')
      return
    }
    applyScriptEdit(
      isDemoScript(initialScript) ? (initialScript as DemoBlock[]) : [{ type: DEMO_HAT }],
    )
    setJudgment(null)
    setJudgmentStale(false)
  }, [isBlockly, initialScript, applyScriptEdit, editorSlot, scheduleAutosave])

  const handleExport = useCallback(() => {
    if (editorSlot) {
      const blob = new Blob([JSON.stringify(editorDataRef.current ?? null, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${contract.lessonId}-data.json`
      a.click()
      URL.revokeObjectURL(url)
      setNotice('已导出作品数据')
      return
    }
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
  }, [contract.lessonId, editorSlot, isBlockly, isScratch])

  const handleImportFile = useCallback(
    async (file: File) => {
      const entry = mountedAdapterRef.current
      if (!entry && !editorSlot) return
      try {
        if (editorSlot) {
          const text = await file.text()
          const parsed: unknown = JSON.parse(text)
          editorDataRef.current = parsed
          setEditorInitial(parsed)
          setSlotResetKey((k) => k + 1)
          setJudgment(null)
          setJudgmentStale(false)
          setSaveState('unsaved')
          scheduleAutosave()
          setNotice('已导入作品数据')
          return
        }
        if (!entry) return
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
    [editorSlot, isBlockly, isScratch, refreshScriptList, scheduleAutosave],
  )

  const stageWidth = stageZoom === 'small' ? 220 : stageZoom === 'large' ? 380 : 280
  // Stage box height is NOT an inline style anymore: the ws-zoom-* class on
  // the root lets CSS pick a compact height per viewport (phone preview
  // ~150px, tablet ~210px, desktop 240px at medium zoom), so zoom stays a
  // real control on every viewport instead of being overridden.
  // Icon rail + search data, probed from the adapter each render (the
  // Blockly adapter answers from its static toolbox builder, so this
  // works before mount too). Absent = no rail, no search box, never fake.
  const railCategories = isBlockly ? (adapter.getBlockCategories?.() ?? []) : []
  const railOn = railCategories.length > 0
  const blockInventory = isBlockly ? (adapter.getBlockInventory?.() ?? []) : []
  const searchResults =
    searchText.trim() === ''
      ? []
      : blockInventory.filter((item) => item.label.includes(searchText.trim()))
  const hasEditorZoom = Boolean(adapter.zoomIn && adapter.zoomOut && adapter.zoomReset)

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
      {/* Course-info extension: drawer-only, never in the editing area. */}
      {contract.methodSteps && contract.methodSteps.length > 0 && (
        <div data-testid="ws-method-steps">
          <strong>方法步骤：</strong>
          <ol>
            {contract.methodSteps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {contract.scopeGap && (
        <p data-testid="ws-scope-gap">
          <strong>适用边界：</strong>
          {contract.scopeGap}
        </p>
      )}
      {contract.progress && (
        <p data-testid="ws-progress">
          <strong>课程进度：</strong>
          {contract.progress.label} {contract.progress.current}/{contract.progress.total}
        </p>
      )}
      {contract.activities && contract.activities.length > 0 && (
        <div data-testid="ws-activities">
          <strong>三层教学活动：</strong>
          <ol>
            {contract.activities.map((activity, index) => (
              <li key={index}>
                第{activity.level}层：{activity.title}——{activity.text}
              </li>
            ))}
          </ol>
        </div>
      )}
      <div>
        <strong>三级提示（按顺序揭示，不提前展示答案）：</strong>
        <ol>
          {contract.structuredHints && contract.structuredHints.length > 0
            ? contract.structuredHints.map((hint, index) => (
                <li key={index}>
                  {revealedHints > index ? (
                    <>
                      <strong>{hint.title}：</strong>
                      {hint.text}
                    </>
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
              ))
            : contract.hints.map((hint, index) => (
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

  // Demo drawer chips, filtered by the same search text as the adapter
  // inventory results (empty search = all chips). Filtering hides chips;
  // it never invents blocks.
  const drawerChips: Array<{ label: string; testid: string; insert: () => void; color: string }> = [
    {
      label: '向右走 50 步',
      testid: 'ws-drawer-move-right',
      insert: () => insertBlock({ type: DEMO_MOVE_RIGHT, steps: 50 }),
      color: '#4c97ff',
    },
    {
      label: '向左走 50 步',
      testid: 'ws-drawer-move-left',
      insert: () => insertBlock({ type: DEMO_MOVE_LEFT, steps: 50 }),
      color: '#4c97ff',
    },
    {
      label: '重复 3 次（向右走 50 步）',
      testid: 'ws-drawer-repeat',
      insert: () =>
        insertBlock({
          type: DEMO_REPEAT,
          times: 3,
          body: [{ type: DEMO_MOVE_RIGHT, steps: 50 }],
        }),
      color: '#0fbdbd',
    },
  ]
  const visibleDrawerChips =
    searchText.trim() === ''
      ? drawerChips
      : drawerChips.filter((chip) => chip.label.includes(searchText.trim()))

  const drawer = (
    <div data-testid="ws-block-drawer">
      <p>点积木插入脚本末尾（演示积木，颜色与分类一致）：</p>
      <div className="ws-palette-chips">
        {visibleDrawerChips.map((chip) => (
          <button
            key={chip.testid}
            type="button"
            className="ws-palette-chip"
            style={{ background: chip.color }}
            onClick={chip.insert}
            data-testid={chip.testid}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )

  /**
   * OPS-022: a run button renders only when a run target exists in steady
   * state. Targets are runAdapter (a prop, hence reactive) or the adapter
   * mounted by the mount effect — slot courses with a real engine mount
   * their adapter too (D1), so a mounted adapter is a target for them as
   * well; summary courses never mount and never run. The mounted-adapter
   * clause reads a ref, so the mount effect's adapterMountTick bump is
   * what re-renders this line after mounting. This keeps a slot course
   * without a run target from ever showing a dead button (fail-closed,
   * stricter than "any non-summary slot shows").
   */
  void adapterMountTick
  const hasRunTarget =
    Boolean(runAdapter) || mountedAdapterRef.current !== null || (!editorSlot && !isSummary)

  /** OPS-022 shell control surface for the slot's own toolbar (contract §3). */
  const shellControl = useMemo(
    () => ({
      run: handleRunToggle,
      stop: handleRunStop,
      save: handleSave,
      running: engineState.running,
      saveState,
      judgment,
    }),
    [handleRunToggle, handleRunStop, handleSave, engineState.running, saveState, judgment],
  )

  const scriptListPanel = isBlockly ? (
    <div className="ws-script-list-panel" data-testid="ws-script-list">
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
              上移
            </button>{' '}
            <button
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              disabled={index === scriptList.length - 1}
              onClick={() => moveBlock(index, 1)}
              data-testid={`ws-script-down-${index}`}
            >
              下移
            </button>{' '}
            <button
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              onClick={() => removeBlockAt([index])}
              data-testid={`ws-script-delete-${index}`}
            >
              删除
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
                      删除
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
      <div className="ws-stage-head">
        <h2>作品舞台</h2>
        {/* §9 round 3: the shell's own state display shows run state only.
            Positions, scores, and multi-object state belong to the slot
            component (the demo renders its own ws-demo-stage-state pill).
            The old paragraph below the box duplicated this pill and cost
            a full row on every viewport, so the pill carries the testid. */}
        <span data-testid="ws-stage-state" className="ws-stage-state-pill">{engineState.running ? '运行中' : '未运行'}{isScratch && (scratchReady ? '，沙箱已就绪' : scratchError ? `，沙箱未就绪：${scratchError}` : '，沙箱握手中…')}</span>
        {/* Phone roles entry: the roles strip starts collapsed on phones
            (see the mount effect) and opens here. Tablet/desktop show the
            strip unconditionally, so this button hides there via CSS. */}
        {RolesSlotView && (
          <button
            type="button"
            className="kc-action-surface kc-btn-outline kc-btn-sm ws-roles-toggle"
            onClick={() => setRolesOpen((v) => !v)}
            aria-pressed={rolesOpen}
            data-testid="ws-roles-toggle"
          >
            {rolesOpen ? '收起角色' : '展开角色'}
          </button>
        )}
      </div>
      <div className="ws-stage-box" data-testid="ws-stage-box">
        {StageSlotView ? (
          <StageSlotView
            lessonId={contract.lessonId}
            state={engineState}
            running={engineState.running}
            stageState={runAdapter?.getStageState?.() ?? adapter.getStageState?.()}
          />
        ) : isScratch ? (
          <div ref={scratchMountRef} data-testid="ws-scratch-mount" style={{ width: '100%', height: '100%' }} />
        ) : (
          <p>舞台尚未接入：本课程未提供舞台组件。</p>
        )}
      </div>
      {/* OPS-022 D1: when a stage slot renders the scene, the scratch
          adapter still needs a host element: the stage box holds the
          slot, so the mount point lives here, outside the box, as a
          plain empty div (mirroring the course's own l2-vm-mount, never
          display:none). Mutually exclusive with ws-scratch-mount above,
          which renders only when no stage slot exists — never a double
          host for one adapter. */}
      {StageSlotView && isScratch && adapter && (
        <div ref={scratchMountRef} aria-hidden="true" data-testid="ws-adapter-mount" />
      )}
      <div className="ws-runbar">
        {/* OPS-022: no run target, no run button — never a dead one. The
            zoom group stays: stage zoom is independent of running. */}
        {hasRunTarget && (
          <button
            type="button"
            className={`kc-action-surface kc-btn-dark ${engineState.running ? 'ws-stop-btn' : 'ws-run-btn'}`}
            onClick={handleRunToggle}
            data-testid="ws-run-toggle"
          >
            {engineState.running ? '停止' : '运行作品'}
          </button>
        )}
        <span className="ws-zoom-group">
          舞台缩放：
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => setStageZoom('small')} data-testid="ws-zoom-small">
            缩小
          </button>{' '}
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => setStageZoom('medium')} data-testid="ws-zoom-medium">
            正常
          </button>{' '}
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => setStageZoom('large')} data-testid="ws-zoom-large">
            放大
          </button>
        </span>
      </div>
    </section>
  )

  /**
   * Icon rail: one icon button per adapter category, rendered by the shell
   * (not by Blockly). Clicking drives the real Blockly toolbox selection
   * through adapter.selectCategory; the shell's own category column in
   * Blockly is hidden by scoped CSS while the rail is on, so the two
   * never coexist. Adapters without categories get no rail at all.
   */
  /**
   * Single material surface (round 4 fix 2): the icon rail and the
   * in-script palette drawer never stay open together. Opening the rail
   * closes the drawer (and clears search results); opening the drawer
   * deselects the rail category, which closes the Blockly flyout (the
   * adapter toggles: selecting the active category deselects it).
   * Search results are in-flow above the palette, never an overlay, so
   * they cannot cover the canvas; they close with either surface switch.
   */
  const handleRailSelect = useCallback(
    (categoryId: string) => {
      const next = adapter.selectCategory?.(categoryId) ?? null
      setRailSelected(next)
      setPaletteOpen(false)
      setSearchText('')
    },
    [adapter],
  )

  const handlePaletteToggle = useCallback(() => {
    const opening = !paletteOpen
    if (opening) {
      if (railSelected !== null) {
        try {
          adapter.selectCategory?.(railSelected)
        } catch {
          // A failed deselect never blocks the drawer; the flyout state
          // is re-checked by the E2E single-surface assertions.
        }
        setRailSelected(null)
      }
      setSearchText('')
    }
    setPaletteOpen(opening)
  }, [adapter, paletteOpen, railSelected])

  const iconRail = railOn ? (
    <nav className="ws-rail" data-testid="ws-icon-rail" aria-label="积木分类">
      {railCategories.map((category) => (
        <button
          key={category.id}
          type="button"
          className="ws-rail-btn"
          aria-pressed={railSelected === category.id}
          aria-label={category.label}
          title={category.label}
          onClick={() => handleRailSelect(category.id)}
          data-testid={`ws-rail-${category.id}`}
        >
          <RailIcon label={category.label} color={category.color} />
          <span>{category.label}</span>
        </button>
      ))}
    </nav>
  ) : null

  const scriptPanel = (
    <section className="ws-script" data-panel="script" data-testid="ws-script-panel">
      <h2>脚本工作区</h2>
      {/* Mobile sticky action row: in-flow sticky (never a fixed overlay),
          so run/stop/save stay reachable without scrolling the editor.
          OPS-022 (contract §3b): slot courses WITH a run target get the
          row too, so run sits in the same zone as the slot; slot courses
          without a target (e.g. summary) still get no row. */}
      {(!EditorSlotView || hasRunTarget) && (
        <div className="ws-sticky-actions">
          <button
            type="button"
            className={`kc-action-surface kc-btn-dark ${engineState.running ? 'ws-stop-btn' : 'ws-run-btn'}`}
            onClick={handleRunToggle}
            data-testid="ws-sticky-run"
          >
            {engineState.running ? '停止' : '运行作品'}
          </button>
          <span data-testid="ws-sticky-save">
            {saveState === 'saved' ? '已保存到本机' : saveState === 'failed' ? '未能保存' : '未保存'}
          </span>
        </div>
      )}
      {EditorSlotView ? (
        editorInitialLesson === contract.lessonId ? (
          <div className="ws-editor-slot" data-testid="ws-editor-slot">
            <EditorSlotView
              key={`${contract.lessonId}-${slotResetKey}`}
              lessonId={contract.lessonId}
              initial={editorInitial}
              onChange={handleEditorSlotChange}
              // OPS-025 (#481): slot-reported judgment channel. The slot
              // reports the judgment its own check produced; the shell
              // displays it verbatim and never recomputes a score.
              onJudgment={handleSlotJudgment}
              editable
              // OPS-022: shell is present only when a run target exists,
              // so a slot can never render a run button from a targetless
              // shell. Targetless slots (e.g. Summary) keep edit-only
              // behavior; their save still flows via autosave + file menu.
              shell={hasRunTarget ? shellControl : undefined}
            />
          </div>
        ) : (
          <p>正在加载作品…</p>
        )
      ) : (
        <>
          {isBlockly && (
        <>
          {/* Block search: only when the adapter exposes an inventory.
              Results insert through the adapter's real editor API; the
              same text also filters the demo drawer chips below. */}
          {blockInventory.length > 0 && (
            <div className="ws-search-row">
              <label htmlFor="ws-block-search">搜索积木</label>
              <input
                id="ws-block-search"
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="输入积木名称，如“向右”"
                data-testid="ws-block-search"
              />
            </div>
          )}
          {searchText.trim() !== '' && searchResults.length > 0 && (
            <div className="ws-search-results" data-testid="ws-search-results">
              {searchResults.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className="ws-search-result kc-action-surface kc-btn-outline kc-btn-sm"
                  onClick={() => insertSearchBlock(item.type)}
                  data-testid={`ws-search-result-${item.type}`}
                >
                  {item.label}（{item.categoryId}）
                </button>
              ))}
            </div>
          )}
          {searchText.trim() !== '' && searchResults.length === 0 && (
            <p data-testid="ws-search-empty">没有找到匹配的积木。</p>
          )}
          <div className="ws-palette">
            <div className="ws-palette-head">
              <h3>积木素材</h3>
              <button
                type="button"
                className="kc-action-surface kc-btn-outline kc-btn-sm"
                onClick={handlePaletteToggle}
                data-testid="ws-palette-toggle"
              >
                {paletteOpen ? '收起' : '展开'}
              </button>
            </div>
            {paletteOpen && drawer}
          </div>
          <div
            ref={blocklyMountRef}
            className="ws-blockly-mount"
            data-testid="ws-blockly-mount"
          />
          {hasEditorZoom && (
            <div className="ws-editor-zoom">
              编辑器缩放：
              <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => adapter.zoomOut?.()} data-testid="ws-editor-zoom-out">
                缩小
              </button>{' '}
              <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => adapter.zoomReset?.()} data-testid="ws-editor-zoom-reset">
                还原
              </button>{' '}
              <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => adapter.zoomIn?.()} data-testid="ws-editor-zoom-in">
                放大
              </button>
            </div>
          )}
          <p>分类由左侧图标列选择（点图标打开素材面板，素材面板即 Blockly 弹出面板），拖放、改参、垃圾桶删除均真实可用；下方脚本列表与画布同一程序。</p>
          {scriptListPanel}
          <div className="ws-runbar">
            <button
              type="button"
              className={`kc-action-surface kc-btn-dark ${engineState.running ? 'ws-stop-btn' : 'ws-run-btn'}`}
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
          <div className="ws-runbar">
            <button
              type="button"
              className={`kc-action-surface kc-btn-dark ${engineState.running ? 'ws-stop-btn' : 'ws-run-btn'}`}
              onClick={handleRunToggle}
              data-testid="ws-run-script"
            >
              {engineState.running ? '停止' : '运行作品'}
            </button>
          </div>
        </>
      )}
          {isSummary && <p>摘要编辑尚未接入（4 号接入中）。</p>}
        </>
      )}
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

  if (isSummary && !EditorSlotView) {
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
      className={`ws-root ws-zoom-${stageZoom}${railOn ? ' ws-rail-on' : ''}${!hasStage && EditorSlotView ? ' ws-summary-wide' : ''}${hasStage && !stageVisible ? ' ws-stage-hidden' : ''}`}
      data-testid="ws-root"
      style={{ '--ws-stage-w': `${stageWidth}px` } as CSSProperties}
    >
      <style>{`
        .ws-root { font-family: "PingFang SC","Microsoft YaHei",sans-serif; color: #18243a; box-sizing: border-box; }
        .ws-root * { box-sizing: border-box; }
        .ws-root h2 { font-size: 15px; margin: 0 0 8px; }
        .ws-root h3 { font-size: 14px; margin: 0 0 8px; }
        /* Top bar: one compact IDE bar (Kitten structure, KidsCoding V2 colours).
           Teaching text never lives here; it lives in the goal strip + drawer. */
        .ws-topbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; background: #152238; color: #fff; padding: 8px 12px; border-radius: 12px; margin-bottom: 12px; }
        .ws-topbar h1 { color: #fff; }
        .ws-topbar .kc-btn-outline { color: #fff; border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.08); }
        .ws-topbar [data-testid="ws-demo-badge"] { background: #ffab19; color: #18243a; font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 999px; }
        .ws-topbar [data-testid="ws-save-chip"] { background: rgba(255,255,255,0.12); padding: 2px 10px; border-radius: 999px; font-size: 13px; }
        .ws-topbar [data-testid="ws-save-message"] { font-size: 13px; opacity: 0.85; }
        .ws-topbar [data-testid="ws-file-menu"] { background: #fff; color: #18243a; border: 1px solid #e7edf5; border-radius: 10px; padding: 8px; }
        .ws-topbar [data-testid="ws-file-menu"] .kc-btn-outline { color: #18243a; border-color: #e7edf5; background: #fff; }
        /* Goal strip: current goal + step + progress only, one compact
           flex row (full five goals stay in the DOM and expand on tap). */
        .ws-goalstrip { background: #fff; border: 1px solid #e7edf5; border-radius: 12px; padding: 8px 12px; margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; }
        .ws-goalstrip-current { font-size: 14px; margin: 0; flex: 1 1 220px; }
        .ws-goalstrip-meta { color: #6f7d92; font-size: 13px; margin: 0; }
        .ws-goal5-list { margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: #3d4a5e; flex-basis: 100%; }
        .ws-goal5-list.ws-goal5-collapsed li { display: none; }
        .ws-grid { display: block; }
        .ws-panel { display: none; margin-bottom: 12px; }
        /* Round 3 one-screen phones: stage + script share the screen;
           roles only when opened, task only in the drawer. */
        .ws-stage-wrap, .ws-script-wrap { display: block; }
        .ws-roles-wrap.ws-roles-open { display: block; }
        .ws-panel > section { background: #fff; border: 1px solid #e7edf5; border-radius: 12px; padding: 12px; }
        /* Stage card: header row + scene box + run bar. */
        .ws-stage-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .ws-stage-head h2 { margin: 0; }
        .ws-stage-state-pill { font-size: 12px; background: #eef2f7; border-radius: 999px; padding: 2px 10px; white-space: nowrap; }
        /* The stage-hidden note is a direct grid child: without a span it
           lands in the 56px rail column on tablet and wraps per character. */
        [data-testid="ws-stage-hidden-note"] { grid-column: 1 / -1; margin: 0 0 12px; }
        .ws-stage-box { position: relative; overflow: hidden; border: 1px solid #e7edf5; border-radius: 12px; background: #f3f6fb; }
        /* Stage height by zoom class x viewport (round 3): no inline
           height anymore, so zoom stays a real control everywhere.
           Phone preview ~140px, tablet ~200px, desktop 240px (medium). */
        .ws-zoom-small .ws-stage-box { height: 120px; }
        .ws-zoom-medium .ws-stage-box { height: 140px; }
        .ws-zoom-large .ws-stage-box { height: 200px; }
        .ws-stage-box .kc-scene-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; }
        .ws-stage-box [data-testid="ws-stage-character"], .ws-stage-box [data-testid="ws-stage-target"] { z-index: 1; }
        /* CharacterArt carries only a viewBox; without an explicit size the
           svg collapses to 0x0 inside the shrink-to-fit stage marker, which
           is why the demo stage showed a backdrop but no character. */
        .ws-stage-box [data-testid="ws-stage-character"] svg { width: 72px; height: 79px; display: block; }
        .ws-runbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
        .ws-run-btn { background: #2ea043 !important; color: #fff !important; border-color: #2ea043 !important; font-weight: 700; }
        .ws-stop-btn { background: #e5484d !important; color: #fff !important; border-color: #e5484d !important; font-weight: 700; }
        .ws-zoom-group { display: inline-flex; gap: 4px; align-items: center; color: #6f7d92; font-size: 13px; }
        /* Roles: real character thumbnails, selected ring, never text buttons. */
        .ws-role-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .ws-role-card { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border: 2px solid #e7edf5; border-radius: 12px; background: #fff; cursor: pointer; }
        .ws-role-card svg { width: 56px; height: 62px; }
        .ws-role-card[aria-pressed="true"] { border-color: #2463eb; background: #eaf1fe; }
        .ws-role-card span { font-size: 13px; color: #18243a; }
        .ws-role-note { color: #6f7d92; font-size: 12px; margin: 8px 0 0; }
        /* Script column: palette panel, Blockly canvas, script list, feedback. */
        .ws-palette { border: 1px solid #e7edf5; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; background: #fbfcfe; }
        .ws-palette-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .ws-palette-head h3 { margin: 0; }
        .ws-palette-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .ws-palette-chip { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; color: #fff; font-weight: 700; padding: 8px 14px; cursor: pointer; min-height: 40px; }
        .ws-blockly-mount { height: 360px; border: 1px solid #e7edf5; border-radius: 12px; overflow: hidden; }
        .ws-blockly-mount .blocklyFlyoutBackground { fill: #fbfcfe; }
        .ws-script-list-panel { border: 1px solid #e7edf5; border-radius: 12px; padding: 10px 12px; margin-top: 12px; }
        .ws-script-list-panel ol { padding-left: 20px; }
        .ws-script-list-panel li { margin-bottom: 8px; }
        .ws-script-list-panel input[type="number"], .ws-script-list-panel select { min-height: 36px; border: 1px solid #e7edf5; border-radius: 8px; padding: 4px 8px; }
        .ws-feedback-card { background: #fff; border: 1px solid #e7edf5; border-radius: 12px; padding: 12px; margin-top: 12px; }
        .ws-feedback-card [data-testid="ws-feedback-conclusion"] { font-weight: 700; }
        /* Icon rail: shell-rendered narrow column, icon-first with a small
           label under each glyph. While the rail is on, Blockly's own
           category column is hidden by scoped CSS so the two never
           coexist; the flyout still opens from the rail (verified by E2E). */
        .ws-rail { display: flex; flex-direction: column; gap: 6px; }
        .ws-rail-btn { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 2px; border: 2px solid #e7edf5; border-radius: 12px; background: #fff; cursor: pointer; }
        .ws-rail-btn svg { width: 24px; height: 24px; display: block; }
        .ws-rail-btn span { font-size: 11px; color: #18243a; line-height: 1.2; }
        .ws-rail-btn[aria-pressed="true"] { border-color: #2463eb; background: #eaf1fe; }
        .ws-rail-dot { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; font-weight: 700; }
        .ws-rail-on .ws-blockly-mount .blocklyToolbox { display: none !important; }
        /* Block search + editor zoom controls (rendered only when the
           adapter exposes the capability). */
        .ws-search-row { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
        .ws-search-row label { font-size: 13px; color: #6f7d92; white-space: nowrap; }
        .ws-search-row input { flex: 1; min-width: 0; min-height: 40px; border: 1px solid #e7edf5; border-radius: 8px; padding: 6px 10px; }
        .ws-search-results { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        .ws-editor-zoom { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 10px 0; color: #6f7d92; font-size: 13px; }
        /* Summary wide layout: stageless slot courses get a real two-column
           layout (task text left, editor right, feedback below the editor)
           instead of the old narrow textbox. */
        .ws-editor-slot textarea { width: 100%; min-height: 280px; box-sizing: border-box; }
        /* OPS-022 (contract §3b, A1 space guarantee): the slot container
           itself must hold editing height — the old rule sized only the
           summary textarea, so a non-textarea slot (e.g. a course script
           editor) collapsed. Same heights as the Blockly mount: phone
           360px, tablet 480px, desktop 600px (media blocks below). */
        .ws-editor-slot { min-height: 360px; }
        @media (max-width: 767px) {
          .ws-palette-chip { min-height: 44px; }
          .ws-script-list-panel input[type="number"], .ws-script-list-panel select { min-height: 44px; }
          .ws-script-list-panel .kc-btn-outline { min-height: 44px; }
          /* Phone topbar: tighter; the step line lives in the goal strip
             already, so the topbar copy is redundant here. */
          .ws-topbar { padding: 4px 8px; }
          .ws-topbar h1 { font-size: 16px !important; }
          /* Phone first-screen budget (measured 857px svg top, need
             < 812 and genuinely above the bottom nav): tighten every
             block above the mount — goal strip fits meta + button on
             one row, panels lose 4px padding, sticky/search/palette
             gaps shrink. No content or control is removed. */
          .ws-goalstrip { padding: 4px 8px; gap: 4px 8px; }
          .ws-goalstrip-current { font-size: 13px; }
          .ws-goalstrip-meta { font-size: 12px; }
          .ws-goalstrip .kc-btn { padding: 4px 8px; }
          .ws-panel > section { padding: 6px; }
          .ws-runbar { margin-top: 4px; }
          .ws-search-row { margin-bottom: 4px; }
          .ws-palette { margin-bottom: 6px; }
          .ws-role-list { flex-direction: row; }
          .ws-role-card { min-width: 84px; }
          .ws-role-card svg { width: 44px; height: 48px; }
          .ws-rail-wrap { display: none !important; }
          /* Mobile sticky action row: in-flow sticky at the top of the
             script panel content — never a fixed overlay on the editor. */
          .ws-sticky-actions { position: sticky; top: 0; z-index: 5; background: #fff; padding: 2px 0; display: flex; gap: 8px; align-items: center; }
        }
        @media (max-width: 479px) {
          /* The step line duplicates the goal strip meta; hide the topbar
             copy on the narrowest phones to save a wrapped row. */
          .ws-topbar [data-testid="ws-step-meta"] { display: none; }
        }
        @media (min-width: 768px) {
          .ws-sticky-actions { display: none; }
          .ws-roles-toggle { display: none; }
          .ws-grid { display: grid; gap: 12px; align-items: start; }
          .ws-panel { display: block; }
          .ws-task-wrap { display: none; }
          .ws-script-wrap { grid-column: 1 / -1; }
          .ws-blockly-mount { height: 480px; }
          .ws-editor-slot { min-height: 480px; }
          /* Tablet zoom heights (round 3): compact stage, ~200px medium. */
          .ws-zoom-small .ws-stage-box { height: 160px; }
          .ws-zoom-medium .ws-stage-box { height: 200px; }
          .ws-zoom-large .ws-stage-box { height: 280px; }
          /* Tablet single-column IDE (round 3): stage row, horizontal
             roles strip, then rail + script row. Auto-placement puts the
             rail/script row after the strip with no pinned row numbers,
             so a rail course without roles still lays out correctly. */
          .ws-grid { grid-template-columns: minmax(0, 1fr); }
          .ws-grid.ws-has-rail { grid-template-columns: 56px minmax(0, 1fr); }
          .ws-grid.ws-has-rail .ws-stage-wrap { grid-column: 1 / -1; }
          .ws-grid.ws-has-rail .ws-roles-wrap { grid-column: 1 / -1; }
          .ws-grid.ws-has-rail .ws-script-wrap { grid-column: 2; }
          .ws-role-list { flex-direction: row; flex-wrap: wrap; }
          .ws-role-card { flex-direction: row; gap: 8px; padding: 4px 8px; width: auto; }
          .ws-role-card svg { width: 36px; height: 40px; }
          /* Tablet first-screen budget (measured 1074px svg top, need
             < 1024): goal strip loses 2px padding; the rest comes from
             the collapsed palette default, the removed state paragraph,
             and the 200px stage above. */
          .ws-goalstrip { padding: 6px 10px; }
          /* Summary wide: task text left, editor right, feedback below.
             Both placements pin row 1 explicitly: with only columns
             pinned, the grid auto-placement cursor (advanced past the
             first item) drops the second item into row 2. */
          .ws-summary-wide .ws-grid { grid-template-columns: 300px minmax(0, 1fr); }
          .ws-summary-wide .ws-task-wrap { display: block; grid-column: 1; grid-row: 1; }
          .ws-summary-wide .ws-script-wrap { grid-column: 2; grid-row: 1; }
          .ws-summary-wide .ws-editor-slot textarea { min-height: 360px; }
        }
        /* Round 4 fix 1: when the stage is hidden, the in-flow sticky
           run row shows on EVERY viewport (it is hidden >= 768px by
           default). It sits at the top of the script column, inside the
           first screen, so a folded stage never strands run/stop below
           the fold. Higher specificity than the >= 768px hide below. */
        @media (min-width: 768px) {
          .ws-stage-hidden .ws-sticky-actions { display: flex; }
        }
        /* Round 4 first-screen compaction (<= 1023px): section headings
           that duplicate an already-labelled area are hidden, and the
           goal strip keeps the current goal to one ellipsised line so
           the canvas top clears the mobile bottom nav. No button, input,
           or teaching control is removed: the full goals stay one tap
           away via the expand button, the step text stays in the task
           drawer, and every control keeps its testid. */
        @media (max-width: 1023px) {
          [data-testid="ws-script-panel"] > h2, [data-testid="ws-roles-panel"] > h2 { display: none; }
          .ws-goalstrip-current { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .ws-topbar { padding: 4px 6px; gap: 4px; }
          .ws-topbar h1 { font-size: 15px !important; }
          .ws-topbar .kc-btn-sm { padding: 4px 8px; }
          /* Gate 1 visible-height budget (<= 1023px): compress only
             non-core vertical space above the canvas. No control is
             removed, no threshold is lowered, and the stage keeps its
             approved heights (tablet 200px medium, phone 140px medium).
             Note: the older ws-goalstrip kc-btn rule below never
             matched — the expand button carries kc-btn-sm, not
             kc-btn — so the padding cut below uses the real class. */
          .ws-goal5-list.ws-goal5-collapsed { margin-top: 0; }
          .ws-goalstrip .kc-btn-sm { padding: 4px 8px; }
          .ws-topbar { margin-bottom: 8px; }
          .ws-goalstrip { padding: 4px 10px; margin-bottom: 8px; }
        }
        /* Gate 1 tablet-only budget (768–1023px): compress the rows
           above the canvas. The stage keeps medium 200px; every pixel
           below comes from panel/section spacing, not from the stage. */
        @media (min-width: 768px) and (max-width: 1023px) {
          .ws-panel > section { padding: 8px 12px; }
          .ws-panel { margin-bottom: 6px; }
          .ws-grid { gap: 8px; }
          .ws-role-note { margin-top: 4px; }
          .ws-search-row input { min-height: 36px; }
          .ws-search-row { margin-bottom: 4px; }
          .ws-palette { padding: 6px 12px; margin-bottom: 6px; }
          .ws-runbar { margin-top: 4px; }
        }
        @media (max-width: 767px) {
          /* Mobile goal strip: one row (ellipsised goal + expand button).
             The meta row (step + save state) is hidden here only: the
             save state also shows in the topbar chip and the sticky row,
             and the step text stays in the task drawer. */
          .ws-goalstrip { padding: 4px 8px; }
          .ws-goalstrip-current { flex: 0 1 auto; max-width: 60%; }
          .ws-goalstrip-meta { display: none; }
          .ws-search-row { margin-bottom: 2px; }
          .ws-search-row input { min-height: 36px; }
          .ws-palette { padding: 4px 8px; margin-bottom: 2px; }
          .ws-panel { margin-bottom: 4px; }
          .ws-panel > section { padding: 4px 6px; }
          .ws-runbar { margin-top: 2px; }
          /* Gate 1 phone budget (<= 767px): the stage-head toggle is
             the tallest head item; its padding cut keeps every control
             (run/stop stay full size). Palette trims are vertical only. */
          .ws-stage-head .kc-btn-sm { padding: 4px 8px; }
          .ws-topbar { gap: 2px; }
        }
        @media (min-width: 1280px) {
          /* Desktop: stage + roles + rail + script, only the present
             columns take space (no empty column gaps). */
          .ws-grid { grid-template-columns: var(--ws-stage-w, 280px) minmax(0, 1fr); }
          .ws-grid.ws-has-roles { grid-template-columns: var(--ws-stage-w, 280px) 120px minmax(0, 1fr); }
          .ws-grid.ws-has-rail { grid-template-columns: var(--ws-stage-w, 280px) 56px minmax(0, 1fr); }
          .ws-grid.ws-has-roles.ws-has-rail { grid-template-columns: var(--ws-stage-w, 280px) 120px 56px minmax(0, 1fr); }
          /* Desktop is a single row: undo the tablet row placements. */
          .ws-grid.ws-has-rail .ws-stage-wrap { grid-column: auto; grid-row: auto; }
          .ws-grid.ws-has-rail .ws-roles-wrap { grid-column: auto; }
          .ws-grid.ws-has-rail .ws-rail-wrap { grid-column: auto; grid-row: auto; }
          .ws-grid.ws-has-rail .ws-script-wrap { grid-column: auto; grid-row: auto; }
          .ws-script-wrap { grid-column: auto; }
          .ws-blockly-mount { height: 600px; }
          .ws-editor-slot { min-height: 600px; }
          /* Desktop zoom heights (unchanged values, now via classes). */
          .ws-zoom-small .ws-stage-box { height: 180px; }
          .ws-zoom-medium .ws-stage-box { height: 240px; }
          .ws-zoom-large .ws-stage-box { height: 320px; }
          /* Desktop roles return to a vertical column. */
          .ws-role-list { flex-direction: column; flex-wrap: nowrap; }
          .ws-role-card { flex-direction: column; gap: 2px; padding: 8px 4px; width: 100%; }
          .ws-role-card svg { width: 56px; height: 62px; }
          /* Summary wide on desktop: wider task column, taller editor. */
          .ws-summary-wide .ws-grid { grid-template-columns: 340px minmax(0, 1fr); }
          .ws-summary-wide .ws-editor-slot textarea { min-height: 420px; }
          /* Round 4 fix 1b (found by final measurement): with the stage
             hidden, the stage-wrap is display:none and leaves the grid,
             so the remaining items auto-place into the 280/120/56
             columns and the script column collapses to 56px wide. The
             hidden note spans the full first row; redefine the columns
             for the hidden stage so roles/rail keep their widths and
             the script takes the rest. Higher specificity (extra
             ancestor class) than the column rules above. */
          .ws-stage-hidden .ws-grid { grid-template-columns: minmax(0, 1fr); }
          .ws-stage-hidden .ws-grid.ws-has-roles { grid-template-columns: 120px minmax(0, 1fr); }
          .ws-stage-hidden .ws-grid.ws-has-rail { grid-template-columns: 56px minmax(0, 1fr); }
          .ws-stage-hidden .ws-grid.ws-has-roles.ws-has-rail { grid-template-columns: 120px 56px minmax(0, 1fr); }
        }
      `}</style>

      <header className="ws-topbar" data-testid="ws-topbar">
        <h1 style={{ margin: 0, fontSize: 18 }}>{contract.title}</h1>
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
        {/* Full teaching content lives in the drawer on every viewport now
            that the tab pages are gone; the task button is its entry. */}
        <button
          type="button"
          className="kc-action-surface kc-btn-outline kc-btn-sm"
          onClick={() => setDrawerOpen((v) => !v)}
          data-testid="ws-task-button"
        >
          任务
        </button>
        {/* Stage show/hide lives in the topbar, NOT inside the stage panel:
            a switch hidden by its own action could never be clicked back.
            Stage-less courses (hasStage === false) have no stage to toggle. */}
        {hasStage && (
          <button
            type="button"
            className="kc-action-surface kc-btn-outline kc-btn-sm"
            onClick={() => setStageVisible((v) => !v)}
            data-testid="ws-stage-toggle"
          >
            {stageVisible ? '隐藏舞台' : '显示舞台'}
          </button>
        )}
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
            {showFile('canNew') && (
              <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => closeMenuAnd(handleNew)} data-testid="ws-file-new">
                新建
              </button>
            )}{' '}
            {showFile('canSave') && (
              <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => closeMenuAnd(handleSave)} data-testid="ws-file-save">
                保存作品
              </button>
            )}{' '}
            {showFile('canExport') && (
              <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => closeMenuAnd(handleExport)} data-testid="ws-file-export">
                导出
              </button>
            )}{' '}
            {showFile('canImport') && (
              <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => { setFileMenuOpen(false); fileInputRef.current?.click() }} data-testid="ws-file-import">
                导入
              </button>
            )}{' '}
            {showFile('canReset') && (
              <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => closeMenuAnd(handleResetInitial)} data-testid="ws-file-reset">
                恢复初始
              </button>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={editorSlot || isBlockly ? '.json,application/json' : '.sb3'}
          style={{ display: 'none' }}
          data-testid="ws-file-input"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void handleImportFile(file)
          }}
        />
      </header>

      <section className="ws-goalstrip">
        <p className="ws-goalstrip-current" data-testid="ws-goal-current">
          <strong>当前目标：</strong>
          {contract.goal5[0]}
        </p>
        <p className="ws-goalstrip-meta">
          {contract.step} · {saveState === 'saved' ? '已保存到本机' : saveState === 'failed' ? '未能保存' : '未保存'}
        </p>
        <button
          type="button"
          className="kc-action-surface kc-btn-outline kc-btn-sm"
          onClick={() => setGoalExpanded((v) => !v)}
          data-testid="ws-goal-expand"
        >
          {goalExpanded ? '收起全部目标' : '展开全部 5 个目标'}
        </button>
        <ol
          data-testid="ws-goal5"
          className={goalExpanded ? 'ws-goal5-list' : 'ws-goal5-list ws-goal5-collapsed'}
        >
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

      {/* Round 3: no tab pages anymore. On phones the stage preview and
          the script share one screen (stage collapses via the topbar
          toggle, roles via the stage-head toggle, full teaching content
          via the task drawer); on tablet/desktop the grid lays panels
          out. The mount divs stay in the DOM either way — visibility
          switches never remount the adapter. */}
      <div
        className={`ws-grid${hasStage && RolesSlotView ? ' ws-has-roles' : ''}${railOn ? ' ws-has-rail' : ''}`}
        data-testid="ws-grid"
      >
        {/* The stage panel always stays in the DOM: hiding it only sets
            display:none, so the Scratch iframe (and the Blockly mount in the
            script panel) is never destroyed by a visibility switch. */}
        {hasStage && (
          <div
            className="ws-panel ws-stage-wrap"
            style={stageVisible ? undefined : { display: 'none' }}
          >
            {stagePanel}
          </div>
        )}
        {hasStage && !stageVisible && <p data-testid="ws-stage-hidden-note">舞台已隐藏（脚本不受影响）。</p>}
        {/* Roles are course content: only a rolesSlot renders them, never
            the shell. Roles belong to the stage area, so a stageless
            course (hasStage === false) renders no roles column either.
            On phones the strip starts collapsed (ws-roles-open absent);
            tablet/desktop force it visible via CSS. */}
        {hasStage && RolesSlotView && (
          <div className={`ws-panel ws-roles-wrap${rolesOpen ? ' ws-roles-open' : ''}`}>
            <section className="ws-roles" data-panel="roles" data-testid="ws-roles-panel">
              <h2>角色</h2>
              <RolesSlotView lessonId={contract.lessonId} />
            </section>
          </div>
        )}
        {/* Icon rail: shell-rendered category column. On phones it is
            hidden by CSS; the in-script palette drawer + search serve
            there. The old blocks tab panel is gone: its drawer chips live
            in the script panel's palette on every viewport. */}
        {railOn && (
          <div className="ws-panel ws-rail-wrap">{iconRail}</div>
        )}
        <div className="ws-panel ws-script-wrap">{scriptPanel}</div>
        <div className="ws-panel ws-task-wrap">
          <section data-testid="ws-task-panel">
            <h2>任务</h2>
            {taskContent}
          </section>
        </div>
      </div>

      <section className="ws-feedback-card" data-testid="ws-feedback">
        <h2>反馈</h2>
        {runError && <p data-testid="ws-run-error">{runError}</p>}
        {notice && <p data-testid="ws-notice">{notice}</p>}
        {judgmentStale && (
          <p data-testid="ws-judgment-stale">
            {hasRunTarget
              ? '旧判定已失效，修改后请重新运行'
              : '旧判定已失效，修改后请重新检查'}
          </p>
        )}
        {judgment ? (
          <>
            {judgment.layers.map((layer) => (
              <p key={layer.id} data-testid={`ws-feedback-${layer.id}`}>
                {layer.detail}
              </p>
            ))}
            <p data-testid="ws-feedback-conclusion">{judgment.conclusion}</p>
          </>
        ) : (
          !judgmentStale &&
          (EditorSlotView ? (
            // OPS-025 (#481): neutral placeholder. A slot lesson's
            // judgment lives with its own check; before the first check
            // there is simply no result yet — never "本演示不作判定",
            // which contradicts the slot's own pass once reported.
            <p>暂无检查结果：检查与判定由课程适配器提供，检查后结果会显示在这里。</p>
          ) : (
            <p>尚未运行：运行后这里显示运行状态与课程反馈。</p>
          ))
        )}
      </section>
    </div>
  )
}
