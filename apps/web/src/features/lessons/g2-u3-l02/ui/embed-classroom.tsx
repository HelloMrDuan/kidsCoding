'use client'

// 槽位验证页：用“共享壳会用的方式”使用本课接口——
//   - EngineAdapter：mount / run(onEvent) / stop / getStageState / getJudgmentResult / validateDraft / getFileCapabilities
//   - 三个槽位组件，只传 EditorSlotProps / StageSlotProps / RolesSlotProps 规定的 props
//   - 草稿：共享 workspace-draft（saveDraft / loadDraft），一课一键 kidscoding-draft:G2-U3-L02
// 这是最终接线的“预演”，用来证明本课侧已经接口就绪；它不是 LessonWorkspace，也不绕过它的缺陷。

import { useEffect, useMemo, useRef, useState } from 'react'
import { loadDraft, saveDraft } from '../../workspace/workspace-draft'
import { LessonL02Adapter } from '../lesson-adapter'
import { L02_CONTRACT } from '../contract'
import styles from './classroom.module.css'
import { FeedbackPanel } from './feedback-panel'
import { createL02Slots } from './slots'
import { useSession } from './use-session'

type SaveChip = { state: 'idle' | 'saved' | 'failed'; text: string }

export function EmbedClassroom() {
  const [adapter] = useState(() => new LessonL02Adapter())
  const { session } = adapter
  const { snap, view } = useSession(session)
  const mountRef = useRef<HTMLDivElement>(null)
  const [initial, setInitial] = useState<{ loaded: boolean; data: unknown }>({ loaded: false, data: undefined })
  const [save, setSave] = useState<SaveChip>({ state: 'idle', text: '尚未保存' })
  const [engineRunning, setEngineRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { EditorSlot, StageSlot, RolesSlot } = useMemo(
    () => createL02Slots(adapter, { embedLevelNav: true, embedTaskPanel: true, embedEngineStatus: true }),
    [adapter],
  )

  useEffect(() => {
    if (mountRef.current) adapter.mount(mountRef.current)
    return () => adapter.unmount()
  }, [adapter])

  // 草稿恢复：和壳一样，先用适配器的 validateDraft 过滤，不合法的草稿不载入也不覆盖。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const r = loadDraft(window.localStorage, L02_CONTRACT.lessonId)
    if (r.data !== null && adapter.validateDraft(r.data)) {
      setInitial({ loaded: true, data: r.data })
      setSave({ state: 'saved', text: '已恢复草稿' })
    } else {
      setInitial({ loaded: true, data: undefined })
      if (r.data !== null) setSave({ state: 'failed', text: '未能恢复：草稿内容不合法，已拒绝恢复' })
      else if (r.reason) setSave({ state: 'failed', text: `未能恢复：${r.reason}` })
    }
  }, [adapter])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  const onChange = (data: unknown) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const r = saveDraft(window.localStorage, L02_CONTRACT.lessonId, data)
      setSave(r.ok ? { state: 'saved', text: '已保存' } : { state: 'failed', text: r.reason })
    }, 350)
  }

  const toggleRun = () => {
    if (engineRunning) {
      adapter.stop()
      return
    }
    setRunError(null)
    try {
      adapter.run(e => { if (e.kind !== 'frame') setEngineRunning(false) })
      setEngineRunning(true)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error))
    }
  }

  const stageState = adapter.getStageState()

  return (
    <div className={styles.root} data-testid="l2-embed-root" data-level={view.levelId}>
      <header className={styles.topbar}>
        <h1 data-testid="l2-title">{L02_CONTRACT.title}</h1>
        <span className={styles.lessonId}>{L02_CONTRACT.lessonId} · 槽位验证页（不是产品页面）</span>
        <span className={styles.spacer} />
        <span className={styles.chip} data-testid="l2-save-chip" data-state={save.state}>{save.text}</span>
      </header>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <section className={styles.panel} aria-label="舞台" data-testid="l2-stage-panel">
          <button type="button" className={`${styles.btn} ${engineRunning ? styles.btnStop : styles.btnPrimary} ${styles.runBtn}`}
            onClick={toggleRun} disabled={!engineRunning && view.runDisabled} data-testid="l2-run" data-running={engineRunning}>
            {engineRunning ? '停止' : '运行作品'}
          </button>
          {view.runDisabled && view.runReason && <p className={styles.stageNote} data-testid="l2-run-reason">{view.runReason}</p>}
          {runError && <p className={styles.error} data-testid="l2-embed-run-error">{runError}</p>}
          <StageSlot lessonId={L02_CONTRACT.lessonId} state={adapter.getState()} running={engineRunning} stageState={stageState} />
        </section>
        <section className={styles.panel} aria-label="角色" data-testid="l2-roles-panel">
          <h2>角色</h2>
          <RolesSlot lessonId={L02_CONTRACT.lessonId} />
        </section>
        <section className={styles.panel} aria-label="脚本" data-testid="l2-script-panel">
          {initial.loaded && (
            <EditorSlot lessonId={L02_CONTRACT.lessonId} initial={initial.data} onChange={onChange} editable />
          )}
        </section>
        <FeedbackPanel adapter={adapter} className={styles.panel} />
      </div>
      <p className={styles.muted} data-testid="l2-embed-engine-state">engine: x={adapter.getState().x} score={adapter.getState().score} frames={adapter.getState().frames ?? 0} running={String(snap.running)}</p>
      <div ref={mountRef} aria-hidden="true" data-testid="l2-vm-mount" />
    </div>
  )
}
