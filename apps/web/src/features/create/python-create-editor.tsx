'use client'

import { redo, undo } from '@codemirror/commands'
import { openSearchPanel } from '@codemirror/search'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import styles from '../scratch-create/scratch-create.module.css'
import { workLibrary, type WorkSummary } from './project-store'
import { PythonCodeEditor } from './python-code-editor'
import { readPythonFile } from './python-file'
import { usePythonRuntime } from './use-python-runtime'
import { useWorkspaceSession } from './use-workspace-session'
import { downloadWork, Workspace } from './workspace'
import './python-create.css'

const labels = { idle: '等待运行', loading: '正在加载 Python…', running: '正在运行', prompt: '等待输入', done: '运行结束', stopped: '已停止', failed: '运行失败' }

export function PythonCreateEditor({ id, owner }: { id: string; owner: string }) {
  const [record, setRecord] = useState<WorkSummary | null>(null)
  const [source, setSource] = useState('')
  const [saved, setSaved] = useState('')
  const [initial, setInitial] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [font, setFont] = useState(16)
  const [answer, setAnswer] = useState('')
  const view = useRef<EditorView>(null)
  const file = useRef<HTMLInputElement>(null)
  const answerField = useRef<HTMLInputElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const pending = useRef(false)
  const dirty = source !== saved
  const blocked = useWorkspaceSession(owner, dirty)
  const runtime = usePythonRuntime()
  const { state, output, reset } = runtime
  const active = state.kind === 'loading' || state.kind === 'running' || state.kind === 'prompt'

  useEffect(() => {
    let alive = true
    void workLibrary(owner).open(id, 'python').then((work) => {
      if (!alive) return
      if (work?.language !== 'python') { setError('此作品未保存在当前作品库。'); return }
      setInitial(work.source)
      setSource(work.source)
      setSaved(work.source)
      setRecord(work)
    }).catch((err: Error) => { if (alive) setError(err.message) })
    return () => { alive = false }
  }, [owner, id, attempt])

  useEffect(() => { if (state.kind === 'prompt') answerField.current?.focus() }, [state.kind])
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight }, [output, state.kind])
  useEffect(() => { if (blocked) reset() }, [blocked, reset])

  async function perform(action: () => Promise<void>) {
    if (pending.current || blocked) return
    pending.current = true
    setError('')
    setBusy(true)
    try { await action() }
    catch (err) { setError(err instanceof Error ? err.message : '操作失败，请重试。') }
    finally { pending.current = false; setBusy(false) }
  }

  function save() {
    if (!record) return
    const snapshot = view.current?.state.doc.toString() ?? source
    void perform(async () => {
      try {
        const work = await workLibrary(owner).save(record.id, record.revision, { language: 'python', source: snapshot })
        setRecord(work)
        setSaved(snapshot)
        setSaveFailed(false)
      } catch (err) { setSaveFailed(true); throw err }
    })
  }

  function sendInput(event: FormEvent) {
    event.preventDefault()
    runtime.input(answer)
    setAnswer('')
  }

  function goToError(line: number) {
    const editor = view.current
    if (!editor || line > editor.state.doc.lines) return
    editor.dispatch({ selection: { anchor: editor.state.doc.line(line).from }, scrollIntoView: true })
    editor.focus()
  }

  const saveStatus = saveFailed ? '未能保存' : dirty ? '未保存' : '已保存到本机'
  return <Workspace title={blocked ? 'Python 创作' : record?.name ?? 'Python 代码创作'} status={record && !blocked ? saveStatus : undefined}
    actions={record && !blocked && <>
      <button type="button" className={styles.editorPrimary} disabled={busy} onClick={save}>保存</button>
      <button type="button" className={styles.editorSecondary} disabled={busy} onClick={() => file.current?.click()}>导入 .py</button>
      <button type="button" className={styles.editorSecondary} disabled={busy} onClick={() => downloadWork(view.current?.state.doc.toString() ?? source, record.name, 'py')}>导出 .py</button>
    </>}>
    {blocked && <p role="alert" className={styles.notice}>无法确认当前身份，作品已锁定。请恢复原账号或返回创作中心。</p>}
    <div className="kc-python-create" hidden={blocked} inert={blocked}>
      <div className={styles.notice} role={error ? 'alert' : undefined} data-error={error ? '' : undefined}>
        {error || (record ? '代码保存在此浏览器的作品库。换设备前请导出。' : '正在打开 Python 作品…')}
        {!record && error && <button className="kc-action-surface kc-btn-outline" onClick={() => { setError(''); setAttempt((n) => n + 1) }}>重试</button>}
      </div>
      {record && <div className="kc-python-grid">
        <section className="kc-python-panel" aria-labelledby="python-file-heading">
          <div className="kc-python-panel-bar">
            <h2 id="python-file-heading">main.py</h2>
            <div className="kc-python-tools" aria-label="代码编辑操作" role="group">
              <button onClick={() => { if (view.current) undo(view.current) }}>撤销</button>
              <button onClick={() => { if (view.current) redo(view.current) }}>重做</button>
              <button onClick={() => { if (view.current) openSearchPanel(view.current) }}>查找</button>
              <label>字号 <select aria-label="代码字号" value={font} onChange={(event) => setFont(Number(event.target.value))}>
                {[14, 16, 18, 20, 24].map((size) => <option key={size} value={size}>{size}</option>)}
              </select></label>
            </div>
          </div>
          <div className="kc-python-editor-box" style={{ '--python-font': `${font}px` } as CSSProperties}>
            <PythonCodeEditor initial={initial} editorRef={view} onChange={setSource} />
          </div>
        </section>
        <section className="kc-python-panel" aria-labelledby="python-console-heading">
          <div className="kc-python-panel-bar">
            <h2 id="python-console-heading">运行输出</h2><span role="status">{labels[state.kind]}</span>
          </div>
          <div className="kc-python-log" ref={log} tabIndex={0} aria-label="程序输出" data-testid="python-create-output">
            {output.length === 0 && state.kind === 'idle' && <span className="kc-python-empty">点击运行，查看程序输出。</span>}
            <pre>{output.map((entry, index) => <span key={index} data-channel={entry.channel}>{entry.text}</span>)}</pre>
            {state.kind === 'failed' && <div className="kc-python-exception" role="alert" data-testid="python-create-exception">
              {state.line && <button type="button" onClick={() => goToError(state.line!)}>查看第 {state.line} 行</button>}
              <pre>{state.reason}</pre>
            </div>}
          </div>
          {state.kind === 'prompt' && <form onSubmit={sendInput} className="kc-python-input">
            <label htmlFor="python-answer">{state.prompt || '程序正在等待你的输入'}</label>
            <div><input id="python-answer" ref={answerField} value={answer} maxLength={4000} onChange={(event) => setAnswer(event.target.value)} />
              <button className="kc-action-surface" type="submit">发送</button></div>
          </form>}
          <div className="kc-python-tools kc-python-run">
            <button className="kc-action-surface" disabled={!runtime.ready || active || blocked} onClick={() => { setAnswer(''); void runtime.run(view.current?.state.doc.toString() ?? source) }}>运行</button>
            <button className="kc-action-surface kc-btn-outline" disabled={!active} onClick={runtime.stop}>停止</button>
            <button className="kc-action-surface kc-btn-outline" disabled={output.length === 0} onClick={runtime.clear}>清空输出</button>
            <button className="kc-action-surface kc-btn-outline" onClick={reset}>重置环境</button>
          </div>
        </section>
      </div>}
      {record && <iframe hidden ref={runtime.frame} onLoad={runtime.onLoad} src="/python-create-sandbox.html" title="Python 浏览器执行沙箱" sandbox="allow-scripts" />}
      <input ref={file} hidden type="file" accept=".py" aria-label="导入 Python 文件" onChange={(event) => {
        const selected = event.target.files?.[0]
        event.target.value = ''
        if (selected) void perform(async () => {
          const { name, source } = await readPythonFile(selected)
          const work = await workLibrary(owner).create(name, { language: 'python', source })
          window.location.assign('/create/python/' + work.id)
        })
      }} />
    </div>
  </Workspace>
}
