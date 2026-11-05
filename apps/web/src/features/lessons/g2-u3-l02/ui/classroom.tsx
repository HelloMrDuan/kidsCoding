'use client'

// G2-U3-L02《接住掉落水果》课堂页（过渡承载页）。
//
// 共享 LessonWorkspace 已合并（#469），但它对 scratch-vm 引擎 + 编辑槽位的组合还有两个缺陷（见
// docs/curriculum/g2-u3-l02/SHARED-SHELL-DEFECTS.md），最终接线要等共享壳修复。因此本页仍由课程自己承载，
// 但所有课程内容和行为都已经放进壳要用的三层：
//   - LessonL02Adapter（EngineAdapter）：运行、停止、草稿、舞台字典、判定结果
//   - EditorSlot / StageSlot / RolesSlot：壳最终会渲染的三个槽位组件
//   - L02Session：它们共用的唯一课堂状态
// 本页只放壳之外的东西：顶栏、目标条、标签页、任务抽屉、文件菜单。不修改、不复制共享组件。

import { useEffect, useMemo, useRef, useState } from 'react'
import { L02_CONTRACT } from '../contract'
import { LessonL02Adapter } from '../lesson-adapter'
import { L02_PARAMS } from '../params'
import { toDraft } from '../state'
import { IMPORT_MAX_BYTES } from '../session'
import { parseStageState, positionsOf, startPositions } from '../stage-state'
import styles from './classroom.module.css'
import { FeedbackPanel } from './feedback-panel'
import { LevelNav } from './level-nav'
import { EngineStatus } from './stage-slot'
import { StageView } from './stage-view'
import { createL02Slots } from './slots'
import { TaskPanel } from './task-panel'
import { useLocalDraft } from './use-local-draft'
import { useSession } from './use-session'

type Tab = 'stage' | 'blocks' | 'script' | 'task'

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setPhone(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return phone
}

/** 运行 / 停止：走适配器 run()/stop()（和共享壳最终的调用路径一样）；前置条件不满足时适配器同步抛错，原因如实显示。 */
export function RunButton({ adapter, testId, extra = '' }: { adapter: LessonL02Adapter; testId: string; extra?: string }) {
  const { snap, view } = useSession(adapter.session)
  const onClick = () => {
    if (snap.running) {
      adapter.stop()
      return
    }
    try {
      adapter.run(() => { /* 帧与结果已经写进会话，界面从会话读取 */ })
    } catch (error) {
      adapter.session.reportBlocked(error instanceof Error ? error.message : String(error))
    }
  }
  return (
    <button
      type="button"
      className={`${styles.btn} ${snap.running ? styles.btnStop : styles.btnPrimary} ${extra}`}
      onClick={onClick}
      disabled={view.runDisabled}
      title={view.runDisabled ? view.runReason : undefined}
      data-testid={testId}
      data-running={snap.running}
    >
      {snap.running ? '停止' : '运行作品'}
    </button>
  )
}

export function Classroom() {
  const [adapter] = useState(() => new LessonL02Adapter())
  const { session } = adapter
  const { snap, view } = useSession(session)
  const [tab, setTab] = useState<Tab>('stage')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const isPhone = useIsPhone()
  const mountRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ---- 引擎（真实 Scratch VM 沙箱）----------------------------------------------
  useEffect(() => {
    if (mountRef.current) adapter.mount(mountRef.current)
    return () => adapter.unmount()
  }, [adapter])

  const { save, persist } = useLocalDraft(session, () => setTab('task'))

  const running = snap.running
  const slots = useMemo(() => createL02Slots(adapter, {
    renderToolbarExtra: () => <span className={styles.runInScript}><RunButton adapter={adapter} testId="l2-run-script" /></span>,
  }), [adapter])

  // ---- 文件菜单 ---------------------------------------------------------------
  const saveNow = () => { setMenuOpen(false); persist() }
  const exportWork = () => {
    setMenuOpen(false)
    const blob = new Blob([JSON.stringify({ lessonId: L02_CONTRACT.lessonId, script: toDraft(session.getSnapshot().state) }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'KidsCoding-接住掉落水果.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const importWork = async (file: File | undefined) => {
    if (!file) return
    setImportError(null)
    try {
      if (file.size > IMPORT_MAX_BYTES) throw new Error('文件太大')
      const parsed = JSON.parse(await file.text()) as { lessonId?: string; script?: unknown }
      session.importWork(parsed)
      persist()
    } catch (error) {
      setImportError(`导入失败：${error instanceof Error ? error.message : '文件不对'}`)
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  const resetLevel = () => { setMenuOpen(false); session.resetLevel() }

  // ---- 派生显示 ---------------------------------------------------------------
  const { levelId, content } = view
  const stageState = adapter.getStageState()
  const parsed = parseStageState(stageState)
  const positions = parsed ? positionsOf(parsed) : startPositions(levelId)
  const { EditorSlot, StageSlot, RolesSlot } = slots
  const role = snap.role

  const goalNow = (
    <>
      {L02_CONTRACT.goal5.slice(0, 4).map((g, i) => (
        <p key={i} className={`${styles.goalItem} ${i >= 2 ? styles.hideOnPhone : ''}`} data-testid={`l2-goal-${i + 1}`}>{g}</p>
      ))}
      <p className={`${styles.goalItem} ${styles.goalNow}`} data-testid="l2-goal-5">现在要做：{content.step}</p>
    </>
  )

  return (
    <div className={styles.root} data-testid="l2-root" data-level={levelId} data-ruling={L02_PARAMS.rulingStatus}>
      <header className={styles.topbar} data-testid="l2-topbar">
        <div>
          <h1 data-testid="l2-title">{L02_CONTRACT.title}</h1>
          <span className={styles.lessonId}>{L02_CONTRACT.lessonId} · {content.layerName}</span>
        </div>
        <LevelNav session={session} />
        <span className={styles.spacer} />
        <span className={styles.chip} data-testid="l2-save-chip" data-state={save.state}>{save.text}</span>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} data-testid="l2-task-button" aria-expanded={isPhone ? tab === 'task' : drawerOpen}
          onClick={() => (isPhone ? setTab('task') : setDrawerOpen(o => !o))}>任务</button>
        <div className={styles.menuWrap}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} data-testid="l2-file-menu-button" aria-expanded={menuOpen} aria-haspopup="menu"
            onClick={() => setMenuOpen(o => !o)}>文件</button>
          {menuOpen && (
            <div className={styles.menu} role="menu" data-testid="l2-file-menu">
              <button type="button" role="menuitem" className={styles.btn} data-testid="l2-file-save" onClick={saveNow}>保存作品</button>
              <button type="button" role="menuitem" className={styles.btn} data-testid="l2-file-export" onClick={exportWork}>导出作品</button>
              <button type="button" role="menuitem" className={styles.btn} data-testid="l2-file-import" onClick={() => { setMenuOpen(false); fileRef.current?.click() }}>导入作品</button>
              <button type="button" role="menuitem" className={styles.btn} data-testid="l2-file-reset" onClick={resetLevel} disabled={levelId === 'explore'}>重新开始本关</button>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden data-testid="l2-file-input" onChange={e => void importWork(e.target.files?.[0])} />
      </header>
      {importError && <p className={styles.error} data-testid="l2-import-error" role="alert">{importError}</p>}

      <section className={styles.goalbar} aria-label="本节目标" data-testid="l2-goalbar">{goalNow}</section>

      <div className={styles.tabs} role="tablist" aria-label="工作区" data-testid="l2-tabs">
        {([['stage', '舞台'], ['blocks', '积木'], ['script', '脚本'], ['task', '任务']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" className={styles.tab} aria-selected={tab === id} data-testid={`l2-tab-${id}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className={styles.grid} data-testid="l2-grid">
        <section className={`${styles.panel} ${styles.stagePanel} ${tab === 'stage' ? styles.active : ''}`} data-testid="l2-stage-panel" aria-label="舞台">
          <div className={styles.stageHead}>
            <RunButton adapter={adapter} testId="l2-run" extra={styles.runBtn} />
            <EngineStatus session={session} />
          </div>
          <StageSlot lessonId={L02_CONTRACT.lessonId} state={adapter.getState()} running={running} stageState={stageState} />
          {view.runDisabled && view.runReason && <p className={styles.stageNote} data-testid="l2-run-reason">{view.runReason}</p>}
        </section>

        <section className={`${styles.panel} ${styles.rolesPanel} ${tab === 'stage' ? styles.active : ''}`} data-testid="l2-roles-panel" aria-label="角色">
          <h2>角色</h2>
          <RolesSlot lessonId={L02_CONTRACT.lessonId} />
        </section>

        <section className={`${styles.panel} ${styles.blocksPanel} ${tab === 'blocks' ? styles.active : ''}`} data-testid="l2-blocks-panel" aria-label="积木">
          <h2>积木说明</h2>
          <ul>
            <li><strong>当绿旗被点击</strong>：点“运行作品”时，这一列脚本从这里开始。</li>
            <li><strong>将 x 坐标增加</strong>：正数往右，负数往左。</li>
            <li><strong>重复执行</strong>：把里面的积木做很多遍。</li>
          </ul>
          <p className={styles.muted}>到“脚本”里点“＋ 添加积木”，点一下就加进去。</p>
          <button type="button" className={styles.btn} data-testid="l2-goto-script" onClick={() => { setTab('script'); session.setPaletteOpen(true) }}>去脚本里添加</button>
        </section>

        <section className={`${styles.panel} ${styles.scriptPanel} ${tab === 'script' ? styles.active : ''}`} data-testid="l2-script-panel" aria-label="脚本">
          <h2>{role === 'basket' ? '篮子的脚本' : role === 'fruit' ? '水果的脚本（只读）' : '背景'}</h2>
          <div className={styles.miniStage}>
            <StageView positions={positions} assets={snap.engine.assets} testId="l2-mini-stage" label="小舞台" />
          </div>
          <EditorSlot lessonId={L02_CONTRACT.lessonId} initial={undefined} onChange={() => { /* 本页自己保存，见 useLocalDraft */ }} editable />
        </section>

        {isPhone && (
          <section className={`${styles.panel} ${styles.taskPanel} ${tab === 'task' ? styles.active : ''}`} data-testid="l2-task-panel" aria-label="任务">
            <TaskPanel session={session} />
          </section>
        )}

        <FeedbackPanel adapter={adapter} className={`${styles.panel} ${styles.feedbackPanel}`} />
      </div>

      {!isPhone && drawerOpen && (
        <aside className={styles.drawer} data-testid="l2-drawer" aria-label="任务抽屉">
          <button type="button" className={styles.btn} onClick={() => setDrawerOpen(false)} data-testid="l2-drawer-close">收起</button>
          <h2>本节目标</h2>
          <ol data-testid="l2-drawer-goals">{L02_CONTRACT.goal5.map(g => <li key={g}>{g}</li>)}</ol>
          <TaskPanel session={session} />
        </aside>
      )}

      <div ref={mountRef} aria-hidden="true" data-testid="l2-vm-mount" />
    </div>
  )
}
