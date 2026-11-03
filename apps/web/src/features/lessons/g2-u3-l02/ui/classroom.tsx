'use client'

// G2-U3-L02《接住掉落水果》课堂页。
//
// 说明（接入缺口，见 PR 说明）：共享 LessonWorkspace（PR #469，Draft）尚未合并，且它对 scratch-vm
// 引擎没有脚本编辑器插槽。因此本页是“课程自带的临时承载页”：只按 DESIGN.md 的信息架构摆放槽位内容
// （舞台列、角色列、脚本区、顶部课程栏、单一运行/停止、任务抽屉、统一反馈），槽位内容组件
// （StageView / ScriptEditor / 任务内容 / 反馈）与布局解耦，#469 合并并提供 scratch 编辑槽后可整体迁入。
// 本页不修改、不复制共享组件。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { alternativeSolutions, describeProgram } from '../reference'
import { L02_ACTIVITY_NOTE, L02_CONTENT, L02_CONTRACT, levelSituation } from '../contract'
import { isTraceCurrent, judgeRun, type RunJudgment, type RunTrace } from '../judge'
import { L02_LEVEL_ORDER, L02_LEVELS, L02_PARAMS, type LevelId } from '../params'
import { programFingerprint, validateProgram, type Program } from '../program'
import {
  editProgram, exploreDone, fromDraft, initialState, isLevelPassed, loadDraft, nextLevel, programFor,
  recordRun, saveDraft, toDraft, type LessonState,
} from '../state'
import { ScratchL02Adapter, type FrameInfo } from '../vm-adapter'
import styles from './classroom.module.css'
import { ScriptEditor, type EditorHandle, type Selection } from './script-editor'
import { StageView, type StagePositions } from './stage-view'

type Role = 'basket' | 'fruit' | 'backdrop'
type Tab = 'stage' | 'blocks' | 'script' | 'task'
type SaveStatus = { state: 'idle' | 'saved' | 'failed'; text: string }

const STAGE_FRAME_MS = 33

function startPositions(levelId: LevelId): StagePositions {
  const level = L02_LEVELS[levelId]
  return { basket: { x: L02_PARAMS.basketStartX, y: L02_PARAMS.basketY }, fruit: { x: level.fruitX, y: L02_PARAMS.fruitStartY } }
}

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

function RoleThumb({ src }: { src: string | undefined }) {
  // 素材是沙箱内置的 data: SVG，不经过 next/image 优化。
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" /> : null
}

function storage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function Classroom() {
  const [state, setState] = useState<LessonState>(initialState)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const [restored, setRestored] = useState<'pending' | 'fresh' | 'restored'>('pending')
  const [role, setRole] = useState<Role>('basket')
  const [tab, setTab] = useState<Tab>('stage')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [selection, setSelection] = useState<Selection>(null)
  const [positions, setPositions] = useState<StagePositions>(() => startPositions('explore'))
  const [running, setRunning] = useState(false)
  const [trace, setTrace] = useState<RunTrace | null>(null)
  const [runNotice, setRunNotice] = useState<string | null>(null)
  const [engine, setEngine] = useState<{ ready: boolean; error: string | null; assets: ReturnType<ScratchL02Adapter['getStatus']>['assets'] }>({ ready: false, error: null, assets: null })
  const [save, setSave] = useState<SaveStatus>({ state: 'idle', text: '尚未保存' })
  const [hints, setHints] = useState<Record<LevelId, number>>({ explore: 0, solve: 0, transferLeft: 0, transferFast: 0 })
  const [importError, setImportError] = useState<string | null>(null)
  const isPhone = useIsPhone()

  const adapterRef = useRef<ScratchL02Adapter | null>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorHandle>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const levelRef = useRef<LevelId>(state.levelId)
  /** 最近一次成功写入（或恢复出来）的草稿文本：内容没变就不重复保存，也不覆盖“已恢复”的提示。 */
  const lastSaved = useRef<string>(JSON.stringify(toDraft(initialState())))
  useEffect(() => { levelRef.current = state.levelId }, [state.levelId])

  const levelId = state.levelId
  const level = L02_LEVELS[levelId]
  const content = L02_CONTENT[levelId]
  const program = programFor(state, levelId)
  const fingerprint = programFingerprint(program)
  const problems = useMemo(() => validateProgram(program), [program])

  // ---- 引擎（真实 Scratch VM 沙箱）-------------------------------------------
  useEffect(() => {
    const adapter = new ScratchL02Adapter()
    adapterRef.current = adapter
    adapter.subscribe({
      ready: () => setEngine(adapter.getStatus()),
      frame: (f: FrameInfo) => setPositions({ basket: f.basket, fruit: f.fruit }),
    })
    if (mountRef.current) adapter.mount(mountRef.current)
    return () => {
      adapter.unmount()
      adapterRef.current = null
    }
  }, [])

  // ---- 草稿恢复（仅客户端）---------------------------------------------------
  useEffect(() => {
    const result = loadDraft(storage())
    if (result.state) {
      lastSaved.current = JSON.stringify(toDraft(result.state))
      setState(result.state)
      setPositions(startPositions(result.state.levelId))
      setRestored('restored')
      setSave({ state: 'saved', text: '已恢复上次保存的作品' })
    } else {
      setRestored('fresh')
      if (result.reason) setSave({ state: 'failed', text: `未能恢复：${result.reason}` })
      setTab('task') // 第一次进课堂（手机）先看到今天学什么
    }
  }, [])

  // ---- 自动保存（失败如实显示“未能保存”，不显示“已保存”）------------------------
  const persist = useCallback((s: LessonState) => {
    const r = saveDraft(storage(), s)
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    if (r.ok) lastSaved.current = JSON.stringify(toDraft(s))
    setSave(r.ok ? { state: 'saved', text: `已保存 ${time}` } : { state: 'failed', text: r.reason })
    return r
  }, [])
  const draftJson = JSON.stringify(toDraft(state))
  useEffect(() => {
    if (restored === 'pending') return
    if (draftJson === lastSaved.current) return
    const t = setTimeout(() => persist(stateRef.current), 350)
    return () => clearTimeout(t)
  }, [draftJson, restored, persist])

  // ---- 判定：只有与当前程序、当前关卡、当前运行序号都对得上的结果才有效 ------------------
  const runId = adapterRef.current?.currentRunId() ?? 0
  const current = isTraceCurrent(trace, { fingerprint, levelId, runId })
  const judgment: RunJudgment | null = trace && current ? judgeRun(trace, level) : null
  const passed = isLevelPassed(state, levelId)

  const stopRun = useCallback(() => {
    adapterRef.current?.stop()
  }, [])

  const clearResult = useCallback((lvl: LevelId) => {
    setTrace(null)
    setRunNotice(null)
    setPositions(startPositions(lvl))
  }, [])

  const run = useCallback(async () => {
    const adapter = adapterRef.current
    if (!adapter || running) return
    const lvl = levelRef.current
    const prog = programFor(stateRef.current, lvl)
    setRunNotice(null)
    setTrace(null)
    setRunning(true)
    setPositions(startPositions(lvl))
    if (!engine.ready) {
      setRunning(false)
      setRunNotice(engine.error ?? 'Scratch VM 还没准备好，请稍等几秒再试')
      return
    }
    try {
      const t = await adapter.runLevel(lvl, prog, STAGE_FRAME_MS)
      // 结果回来时，如果孩子已经换了关卡或改了脚本，这个结果就是过期的，直接丢弃。
      if (levelRef.current !== lvl || programFingerprint(programFor(stateRef.current, lvl)) !== t.fingerprint) {
        return
      }
      if (t.endedBy === 'stopped') setRunNotice('已停止。这次不判定，脚本保留。')
      setTrace(t)
      setState(s => recordRun(s, t))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('取代') && !message.includes('卸载')) setRunNotice(`运行没有完成：${message}`)
    } finally {
      setRunning(false)
    }
  }, [engine.ready, engine.error, running])

  const toggleRun = useCallback(() => {
    if (running) stopRun()
    else void run()
  }, [running, run, stopRun])

  // ---- 编辑 / 切换关卡 -------------------------------------------------------
  const onProgramChange = useCallback((next: Program) => {
    const lvl = levelRef.current
    if (lvl === 'explore') return
    if (programFingerprint(next) === programFingerprint(programFor(stateRef.current, lvl))) return
    adapterRef.current?.stop()
    setState(s => editProgram(s, lvl, next))
    clearResult(lvl) // 改了脚本：之前的运行结果立刻作废
  }, [clearResult])

  const switchLevel = useCallback((next: LevelId) => {
    if (next === levelRef.current) return
    adapterRef.current?.stop()
    setState(s => ({ ...s, levelId: next }))
    clearResult(next)
    setResetKey(k => k + 1)
    setSelection(null)
    setRole('basket')
  }, [clearResult])

  // ---- 文件菜单 -------------------------------------------------------------
  const saveNow = () => { setMenuOpen(false); persist(stateRef.current) }
  const exportWork = () => {
    setMenuOpen(false)
    const blob = new Blob([JSON.stringify({ lessonId: L02_CONTRACT.lessonId, script: toDraft(stateRef.current) }, null, 2)], { type: 'application/json' })
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
      if (file.size > 64 * 1024) throw new Error('文件太大')
      const parsed = JSON.parse(await file.text()) as { lessonId?: string; script?: unknown }
      if (parsed.lessonId !== L02_CONTRACT.lessonId) throw new Error('这不是“接住掉落水果”的作品')
      const next = fromDraft(parsed.script)
      if (!next) throw new Error('作品内容不合法')
      adapterRef.current?.stop()
      setState(next)
      clearResult(next.levelId)
      setResetKey(k => k + 1)
      persist(next)
    } catch (error) {
      setImportError(`导入失败：${error instanceof Error ? error.message : '文件不对'}`)
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  const resetLevel = () => {
    setMenuOpen(false)
    if (levelId === 'explore') return
    adapterRef.current?.stop()
    setState(s => editProgram(s, levelId, { scripts: [] }))
    clearResult(levelId)
    setResetKey(k => k + 1)
  }

  // ---- 派生显示 ---------------------------------------------------------------
  const alternatives = passed && levelId !== 'explore' ? alternativeSolutions(level) : []
  const predictionX = state.predictions.explore?.x ?? ''
  const predictionCaught = state.predictions.explore?.caught ?? ''
  const canRun = problems.length === 0
  const predictionReady = levelId !== 'explore' || (predictionX.trim() !== '' && predictionCaught !== '')
  const runDisabled = !running && (!canRun || !predictionReady)
  const runReason = !canRun ? problems[0] : !predictionReady ? '先在“任务”里写下你的预测，再运行' : ''
  const setPrediction = (patch: { x?: string; caught?: string }) =>
    setState(s => ({ ...s, predictions: { explore: { ...s.predictions.explore, ...patch } } }))

  const runLabel = running ? '停止' : '运行作品'
  const runButton = (testId: string, extra: string) => (
    <button
      type="button"
      className={`${styles.btn} ${running ? styles.btnStop : styles.btnPrimary} ${extra}`}
      onClick={toggleRun}
      disabled={runDisabled}
      title={runDisabled ? runReason : undefined}
      data-testid={testId}
      data-running={running}
    >
      {runLabel}
    </button>
  )

  const taskBody = (
    <div data-testid="l2-task-content">
      <h2>{content.title}</h2>
      <p>{content.task}</p>
      <p><strong>现在要做：</strong>{content.step}</p>

      {content.prediction && (
        <section aria-label="运行前的预测" data-testid="l2-prediction">
          <h3>{content.prediction.question}</h3>
          <div className={styles.field}>
            <label htmlFor="l2-pred-x">{content.prediction.numberLabel}</label>
            <input id="l2-pred-x" type="number" inputMode="numeric" value={predictionX} data-testid="l2-pred-x"
              onChange={e => { setPrediction({ x: e.target.value.slice(0, 6) }); clearResult(levelId) }} />
          </div>
          <div className={styles.field} role="radiogroup" aria-label={content.prediction.choiceLabel}>
            <span>{content.prediction.choiceLabel}</span>
            <div className={styles.choices}>
              {content.prediction.choices.map(choice => (
                <label key={choice}>
                  <input type="radio" name="l2-pred-caught" checked={predictionCaught === choice} data-testid={`l2-pred-caught-${choice === '能接住' ? 'yes' : 'no'}`}
                    onChange={() => { setPrediction({ caught: choice }); clearResult(levelId) }} />
                  {choice}
                </label>
              ))}
            </div>
          </div>
          {judgment?.status === 'judged' && levelId === 'explore' && (
            <p data-testid="l2-pred-compare" className={styles.hint}>
              你预测篮子停在 x={predictionX || '？'}，{predictionCaught || '？'}；
              真实结果是篮子停在 x={trace?.landing?.basketX}，{judgment.stage.passed ? '接住了' : '没接住'}。
            </p>
          )}
        </section>
      )}

      <section aria-label="三级提示">
        <h3>需要提示吗？（一步一步来）</h3>
        {content.hints.slice(0, hints[levelId]).map((h, i) => (
          <p key={i} className={styles.hint} data-testid={`l2-hint-${i + 1}`}><strong>提示 {i + 1}：</strong>{h}</p>
        ))}
        {hints[levelId] < 3 && (
          <button type="button" className={styles.btn} data-testid="l2-next-hint"
            onClick={() => setHints(h => ({ ...h, [levelId]: h[levelId] + 1 }))}>
            看提示 {hints[levelId] + 1}
          </button>
        )}
      </section>

      {passed && (
        <section aria-label="想一想" data-testid="l2-after">
          <h3>想一想</h3>
          <ul>{content.reflection.map(r => <li key={r}>{r}</li>)}</ul>
          {levelId !== 'explore' && (
            <>
              <h3>你的做法</h3>
              <pre className={styles.pre} data-testid="l2-own-solution">{describeProgram(program)}</pre>
              {alternatives.length > 0 && (
                <>
                  <h3>别的做法也可以</h3>
                  <ul data-testid="l2-alternatives">
                    {alternatives.map(a => <li key={`${a.times}-${a.step}`}>重复 {a.times} 次，每次增加 {a.step}（一共 {a.total}）</li>)}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      )}
      <p className={styles.muted} data-testid="l2-scope-note">{L02_ACTIVITY_NOTE}</p>
    </div>
  )

  const goalNow = (
    <>
      {L02_CONTRACT.goal5.slice(0, 4).map((g, i) => (
        <p key={i} className={`${styles.goalItem} ${i >= 2 ? styles.hideOnPhone : ''}`} data-testid={`l2-goal-${i + 1}`}>{g}</p>
      ))}
      <p className={`${styles.goalItem} ${styles.goalNow}`} data-testid="l2-goal-5">现在要做：{content.step}</p>
    </>
  )

  const fruitScript = [
    { text: '当绿旗被点击', color: '#c9a300', indent: false },
    { text: `移到 x: ${level.fruitX} y: ${L02_PARAMS.fruitStartY}`, color: '#4a6cd4', indent: false },
    { text: '重复执行（直到落到篮子下面）', color: '#d98a1d', indent: false },
    { text: `将 y 坐标增加 ${-level.fallSpeed}`, color: '#4a6cd4', indent: true },
  ]

  const scriptPanelBody = role === 'fruit' ? (
    <div data-testid="l2-fruit-script">
      <p className={styles.muted}>水果的脚本是课程准备好的，只能看，不能改。看看它是怎么落下来的。</p>
      <ol className={styles.readonlyList}>
        {fruitScript.map(s => <li key={s.text} className={s.indent ? styles.indent : ''} style={{ background: s.color }}>{s.text}</li>)}
      </ol>
    </div>
  ) : role === 'backdrop' ? (
    <p data-testid="l2-backdrop-note">背景（果园）没有脚本。</p>
  ) : (
    <>
      {content.readOnly ? (
        <p className={styles.muted} data-testid="l2-readonly-note">第一关的程序已经搭好，只能看，不能改。先去“任务”里写下预测，再运行。</p>
      ) : (
        <>
          <div className={styles.toolbar} data-testid="l2-toolbar">
            <button type="button" className={styles.btn} aria-expanded={paletteOpen} data-testid="l2-add-block"
              onClick={() => setPaletteOpen(o => !o)}>添加积木</button>
            <button type="button" className={styles.btn} data-testid="l2-move-up" disabled={!selection?.canUp}
              onClick={() => editorRef.current?.moveSelected('up')} aria-label="上移选中的积木">上移</button>
            <button type="button" className={styles.btn} data-testid="l2-move-down" disabled={!selection?.canDown}
              onClick={() => editorRef.current?.moveSelected('down')} aria-label="下移选中的积木">下移</button>
            <button type="button" className={styles.btn} data-testid="l2-delete" disabled={!selection}
              onClick={() => editorRef.current?.deleteSelected()} aria-label="删除选中的积木">删除</button>
            <label>
              数字
              <input type="number" inputMode="numeric" data-testid="l2-number" disabled={selection?.value == null}
                value={selection?.value ?? ''} aria-label="选中积木的数字"
                onChange={e => { const v = e.target.value; if (v !== '' && v !== '-') editorRef.current?.setSelectedNumber(Number(v)) }} />
            </label>
            <span className={styles.runInScript}>{runButton('l2-run-script', '')}</span>
          </div>
          {paletteOpen && (
            <div className={styles.palette} data-testid="l2-palette" role="group" aria-label="素材抽屉：点一下就加到脚本里">
              <button type="button" className={`${styles.palBtn} ${styles.palEvent}`} data-testid="l2-add-flag" onClick={() => editorRef.current?.addBlock('kcl2_flag')}>当绿旗被点击</button>
              <button type="button" className={`${styles.palBtn} ${styles.palMove}`} data-testid="l2-add-move" onClick={() => editorRef.current?.addBlock('kcl2_move')}>将 x 坐标增加</button>
              <button type="button" className={`${styles.palBtn} ${styles.palRepeat}`} data-testid="l2-add-repeat" onClick={() => editorRef.current?.addBlock('kcl2_repeat')}>重复执行</button>
            </div>
          )}
        </>
      )}
      <div className={styles.scriptHost} data-testid="l2-script-host" data-program={fingerprint}>
        <ScriptEditor
          program={program}
          editable={!content.readOnly}
          resetKey={resetKey}
          onChange={onProgramChange}
          onSelect={setSelection}
          handleRef={editorRef}
        />
      </div>
      {!canRun && <p className={styles.error} data-testid="l2-problems">{problems.join('；')}</p>}
    </>
  )

  return (
    <div className={styles.root} data-testid="l2-root" data-level={levelId} data-ruling={L02_PARAMS.rulingStatus}>
      <header className={styles.topbar} data-testid="l2-topbar">
        <div>
          <h1 data-testid="l2-title">{L02_CONTRACT.title}</h1>
          <span className={styles.lessonId}>{L02_CONTRACT.lessonId} · {content.layerName}</span>
        </div>
        <nav className={styles.levels} aria-label="关卡">
          {L02_LEVEL_ORDER.map((id, i) => (
            <button key={id} type="button" className={styles.levelBtn} data-testid={`l2-level-${id}`}
              aria-current={id === levelId ? 'step' : undefined}
              data-done={id === 'explore' ? exploreDone(state) : isLevelPassed(state, id)}
              onClick={() => switchLevel(id)}>
              {i + 1}. {id === 'explore' ? '猜一猜' : id === 'solve' ? '自己搭' : id === 'transferLeft' ? '换到左边' : '掉得更快'}
            </button>
          ))}
        </nav>
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
            {runButton('l2-run', styles.runBtn)}
            <span className={styles.muted} data-testid="l2-engine-status">
              {engine.error ? `引擎未就绪：${engine.error}` : engine.ready ? 'Scratch VM 已就绪' : 'Scratch VM 准备中…'}
            </span>
          </div>
          <div className={styles.stageBox}>
            <StageView positions={positions} assets={engine.assets} testId="l2-stage" label="果园舞台：篮子在下方，水果从上方落下" />
          </div>
          <p className={styles.stageNote} data-testid="l2-situation">{levelSituation(level)}</p>
          {runDisabled && runReason && <p className={styles.stageNote} data-testid="l2-run-reason">{runReason}</p>}
        </section>

        <section className={`${styles.panel} ${styles.rolesPanel} ${tab === 'stage' ? styles.active : ''}`} data-testid="l2-roles-panel" aria-label="角色">
          <h2>角色</h2>
          <div className={styles.roles}>
            <button type="button" className={styles.roleBtn} aria-pressed={role === 'basket'} data-testid="l2-role-basket" onClick={() => setRole('basket')}>
              <RoleThumb src={engine.assets?.basket} />篮子
            </button>
            <button type="button" className={styles.roleBtn} aria-pressed={role === 'fruit'} data-testid="l2-role-fruit" onClick={() => setRole('fruit')}>
              <RoleThumb src={engine.assets?.fruit} />水果
            </button>
            <div className={styles.roleDivider} />
            <button type="button" className={styles.roleBtn} aria-pressed={role === 'backdrop'} data-testid="l2-role-backdrop" onClick={() => setRole('backdrop')}>
              背景
            </button>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.blocksPanel} ${tab === 'blocks' ? styles.active : ''}`} data-testid="l2-blocks-panel" aria-label="积木">
          <h2>积木说明</h2>
          <ul>
            <li><strong>当绿旗被点击</strong>：点“运行作品”时，这一列脚本从这里开始。</li>
            <li><strong>将 x 坐标增加</strong>：正数往右，负数往左。</li>
            <li><strong>重复执行</strong>：把里面的积木做很多遍。</li>
          </ul>
          <p className={styles.muted}>到“脚本”里点“＋ 添加积木”，点一下就加进去。</p>
          <button type="button" className={styles.btn} data-testid="l2-goto-script" onClick={() => { setTab('script'); setPaletteOpen(true) }}>去脚本里添加</button>
        </section>

        <section className={`${styles.panel} ${styles.scriptPanel} ${tab === 'script' ? styles.active : ''}`} data-testid="l2-script-panel" aria-label="脚本">
          <h2>{role === 'basket' ? '篮子的脚本' : role === 'fruit' ? '水果的脚本（只读）' : '背景'}</h2>
          <div className={styles.miniStage}>
            <StageView positions={positions} assets={engine.assets} testId="l2-mini-stage" label="小舞台" />
          </div>
          {scriptPanelBody}
        </section>

        {isPhone && (
          <section className={`${styles.panel} ${styles.taskPanel} ${tab === 'task' ? styles.active : ''}`} data-testid="l2-task-panel" aria-label="任务">
            {taskBody}
          </section>
        )}

        <section className={`${styles.panel} ${styles.feedbackPanel}`} data-testid="l2-feedback" aria-live="polite" aria-label="运行结果">
          <h2>运行结果</h2>
          {runNotice && <p className={styles.error} data-testid="l2-run-notice">{runNotice}</p>}
          {!trace || !judgment ? (
            <p className={styles.muted} data-testid="l2-feedback-empty">
              {running ? '正在运行…' : '还没有这一次的结果。点“运行作品”，三层结果会一起出现。改了脚本，旧结果会马上清掉。'}
            </p>
          ) : judgment.status === 'not-judged' ? (
            <p className={styles.muted} data-testid="l2-not-judged">{judgment.reason}</p>
          ) : (
            <div className={styles.feedback}>
              <div className={styles.layerRow} data-testid="l2-layer-stage" data-passed={judgment.stage.passed}>{judgment.stage.line}</div>
              <div className={styles.layerRow} data-testid="l2-layer-task" data-passed={judgment.task.passed}>{judgment.task.line}</div>
              <div className={styles.layerRow} data-testid="l2-layer-knowledge" data-passed={judgment.knowledge.passed}>{judgment.knowledge.line}</div>
              <div className={styles.conclusion} data-testid="l2-conclusion" data-passed={judgment.passed}>
                {levelId === 'explore' ? '这一关是观察：对一对你的预测和真实结果。' : judgment.conclusion}
              </div>
              {passed && nextLevel(levelId) && levelId !== 'explore' && (
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} data-testid="l2-next-level" onClick={() => switchLevel(nextLevel(levelId)!)}>下一关</button>
              )}
              {levelId === 'explore' && exploreDone(state) && (
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} data-testid="l2-next-level" onClick={() => switchLevel('solve')}>下一关</button>
              )}
            </div>
          )}
        </section>
      </div>

      {!isPhone && drawerOpen && (
        <aside className={styles.drawer} data-testid="l2-drawer" aria-label="任务抽屉">
          <button type="button" className={styles.btn} onClick={() => setDrawerOpen(false)} data-testid="l2-drawer-close">收起</button>
          <h2>本节目标</h2>
          <ol data-testid="l2-drawer-goals">{L02_CONTRACT.goal5.map(g => <li key={g}>{g}</li>)}</ol>
          {taskBody}
        </aside>
      )}

      <div ref={mountRef} aria-hidden="true" data-testid="l2-vm-mount" />
    </div>
  )
}
