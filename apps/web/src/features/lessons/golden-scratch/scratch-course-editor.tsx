'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { BRIDGE_PROTOCOL, BRIDGE_VERSION, ScratchBridgeClient } from '@/features/lessons/dance-show/gui-bridge'
import { decodeSampleArchive } from '@/features/scratch-g2/scratch-g2-draft'
import { scratchGuiUrl } from '@/features/scratch-create/gui-origin'
import { readScratchImport } from '@/features/scratch-create/read-project'
import { downloadWork } from '@/features/create/workspace'
import { loadCourseProject, saveCourseProject } from './course-project-store'
import './scratch-course-editor.css'

export type ScratchGoldenActivity = {
  title: string
  goal: string
  hints: readonly string[]
  prediction?: { question: string; choices: readonly string[] }
}

export type ScratchGoldenCourse = {
  id: string
  title: string
  story: string
  sample: string
  completionTitle: string
  badge: string
  nextLessonId?: string
  activities: readonly ScratchGoldenActivity[]
}

export type CourseJudgment = { passed: boolean; detail: string; observed?: boolean }

export function ScratchCourseEditor({ course, owner, host, judge }: {
  course: ScratchGoldenCourse
  owner: string
  host?: string
  judge: (bytes: ArrayBuffer, stepIndex: number, observed: boolean) => Promise<CourseJudgment>
}) {
  const address = scratchGuiUrl(host)?.href
  const frame = useRef<HTMLIFrameElement>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const bridge = useRef<ScratchBridgeClient | null>(null)
  const initialArchive = useRef<ArrayBuffer | null>(null)
  const edited = useRef(0)
  const revision = useRef(0)
  const busyRef = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<number>()
  const [initialized, setInitialized] = useState(false)
  const [ready, setReady] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [observed, setObserved] = useState(false)
  const [finished, setFinished] = useState(false)
  const [guide, setGuide] = useState(false)
  const [hint, setHint] = useState(0)
  const [prediction, setPrediction] = useState('')
  const step = course.activities[stepIndex]

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const draft = await loadCourseProject(owner, course.id)
        const archive = draft?.archive ?? await fetch(course.sample).then(async response => {
          if (!response.ok) throw new Error('无法加载课程初始作品。')
          return course.sample.endsWith('.b64') ? decodeSampleArchive(await response.text()) : response.arrayBuffer()
        })
        if (!active) return
        if (!archive?.byteLength) throw new Error('课程初始作品文件无效。')
        initialArchive.current = archive
        if (draft) {
          revision.current = draft.revision
          setStepIndex(Math.max(0, Math.min(draft.stepIndex, course.activities.length - 1)))
          setObserved(draft.observed)
          setFinished(draft.finished)
          setGuide(draft.finished)
        }
        setInitialized(true)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : '本机草稿读取失败。')
      }
    })()
    return () => { active = false }
  }, [attempt, course, owner])

  useEffect(() => {
    const iframe = frame.current
    const archive = initialArchive.current
    if (!address || !iframe || !archive || !initialized || loaded !== attempt) return
    const origin = new URL(address).origin
    const client = new ScratchBridgeClient({ iframe, targetOrigin: origin, allowlist: [origin], requestTimeoutMs: 15_000 })
    bridge.current = client
    let active = true
    let acceptsEdits = false
    const projectChanged = (event: MessageEvent) => {
      if (!acceptsEdits || event.origin !== origin || event.source !== iframe.contentWindow ||
          event.data?.protocol !== BRIDGE_PROTOCOL || event.data.version !== BRIDGE_VERSION ||
          event.data.type !== 'project-changed' || event.data.requestId !== 'editor') return
      edited.current += 1
      setDirty(true)
      setResult('')
    }
    window.addEventListener('message', projectChanged)
    client.start()
    void client.loadProject({ format: 'sb3', data: archive }).then(targets => {
      if (!active) return
      if (!targets.length) throw new Error('Scratch 没有恢复作品舞台。')
      acceptsEdits = true
      setReady(true)
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Scratch 加载失败。') })
    return () => {
      active = false
      acceptsEdits = false
      window.removeEventListener('message', projectChanged)
      client.dispose()
      bridge.current = null
    }
  }, [address, attempt, initialized, loaded])

  useEffect(() => {
    if (!dirty) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty])

  async function act(operation: (client: ScratchBridgeClient) => Promise<void>) {
    if (!bridge.current || !ready || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try { await operation(bridge.current) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败，请重试。') }
    finally { busyRef.current = false; setBusy(false) }
  }

  async function save(bytes: ArrayBuffer, index: number, observation: boolean, complete: boolean, captured: number) {
    revision.current = await saveCourseProject(owner, course.id, {
      archive: bytes, stepIndex: index, observed: observation, finished: complete, revision: revision.current,
    })
    initialArchive.current = bytes
    setDirty(edited.current !== captured)
  }

  function check() {
    if (!finished && step.prediction && !prediction) {
      setGuide(true)
      setResult('先选择你的预测，再检查实际运行。')
      return
    }
    void act(async client => {
      const captured = edited.current
      const { sb3 } = await client.getProject()
      const bytes = await readScratchImport(new File([sb3], `${course.id}.sb3`))
      const outcome = await judge(bytes, stepIndex, observed)
      if (captured !== edited.current) throw new Error('检查期间发现积木又改了。请用新的作品再检查。')
      const nextObserved = observed || !!outcome.observed
      const nextStep = outcome.passed && stepIndex < course.activities.length - 1 ? stepIndex + 1 : stepIndex
      const allDone = finished || (outcome.passed && stepIndex === course.activities.length - 1)
      if (outcome.passed || nextObserved !== observed) {
        await save(bytes, nextStep, nextObserved, allDone, captured)
        setStepIndex(nextStep)
        setObserved(nextObserved)
        setFinished(allDone)
        if (outcome.passed) {
          setHint(0)
          setPrediction('')
        }
      }
      setResult(prediction ? `你的预测：${prediction}。实际运行：${outcome.detail}` : outcome.detail)
      setGuide(true)
    })
  }

  function importProject(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (!picked) return
    if (dirty && !window.confirm('导入会替换当前未保存的作品。继续吗？')) return
    void act(async client => {
      const bytes = await readScratchImport(picked)
      if (!(await client.loadProject({ format: 'sb3', data: bytes })).length) throw new Error('导入的作品缺少有效舞台。')
      setDirty(true)
      await save(bytes, 0, false, false, edited.current)
      setStepIndex(0)
      setObserved(false)
      setFinished(false)
      setHint(0)
      setPrediction('')
      setResult('作品已导入。请从第一个目标开始验证。')
    })
  }

  return (
    <main className="kc-scratch-course">
      <header className="kc-scratch-course-toolbar">
        <div><h1>{course.title}</h1><p>第 {stepIndex + 1} / {course.activities.length} 关 · {step.title} · {dirty ? '有改动未保存' : '本机作品'}</p></div>
        <div className="kc-scratch-course-actions">
          <Link href={`/learn/catalog/${course.id}`} className="kc-action-surface kc-btn-outline kc-btn-sm"
            onNavigate={event => { if (dirty && !window.confirm('作品还有改动未保存。要离开吗？')) event.preventDefault() }}>返回</Link>
          <button className="kc-action-surface kc-btn-outline kc-btn-sm" type="button" onClick={() => setGuide(v => !v)} aria-expanded={guide}>任务指引</button>
          <button className="kc-action-surface kc-btn-outline kc-btn-sm" type="button" disabled={!ready || busy} onClick={() => void act(async client => {
            const captured = edited.current
            await save((await client.getProject()).sb3, stepIndex, observed, finished, captured)
            setResult('作品已保存到本机。')
          })}>保存</button>
          <button className="kc-action-surface kc-btn-outline kc-btn-sm" type="button" disabled={!ready || busy} onClick={() => importInput.current?.click()}>导入 .sb3</button>
          <input type="file" ref={importInput} accept=".sb3" hidden onChange={importProject} />
          <button className="kc-action-surface kc-btn-outline kc-btn-sm" type="button" disabled={!ready || busy} onClick={() => void act(async client => {
            downloadWork((await client.getProject()).sb3, course.title, 'sb3')
          })}>导出 .sb3</button>
          <button className="kc-action-surface kc-btn-sm" type="button" disabled={!ready || busy} onClick={check}>{busy ? '正在处理…' : '检查任务'}</button>
        </div>
      </header>
      <p role={error ? 'alert' : 'status'} className="kc-scratch-course-status">
        {error || (!address ? 'Scratch 编辑服务尚未配置。' : !ready ? '正在加载 Scratch 编辑器…' : result || '在 Scratch 中用绿旗运行、用红色按钮停止，再检查任务。')}
        {error && !ready && <button type="button" onClick={() => { setError(''); setInitialized(false); setLoaded(undefined); setAttempt(n => n + 1) }}>重试</button>}
      </p>
      <div className="kc-scratch-course-editor">
        {initialized && address && <iframe ref={frame} key={attempt} src={address} title="Scratch 完整课程编辑器"
          sandbox="allow-scripts allow-same-origin allow-downloads" onLoad={() => setLoaded(attempt)} />}
        {guide && <aside className="kc-scratch-course-guide" aria-label="任务指引">
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => setGuide(false)}>收起指引</button>
          <p>{course.story}</p>
          <h2>{finished ? course.completionTitle : step.title}</h2>
          {finished ? <>
            <p>本机成就 · {course.badge}</p>
            {course.nextLessonId && <Link href={`/learn/catalog/${course.nextLessonId}`} className="kc-action-surface kc-btn-outline kc-btn-sm"
              onNavigate={event => { if (dirty && !window.confirm('作品还有改动未保存。要离开吗？')) event.preventDefault() }}>下一课</Link>}
          </> : <p>{step.goal}</p>}
          {!finished && step.prediction && <label className="kc-scratch-course-prediction">
            {step.prediction.question}
            <select value={prediction} onChange={event => setPrediction(event.target.value)}>
              <option value="">选择你的预测</option>
              {step.prediction.choices.map(choice => <option key={choice}>{choice}</option>)}
            </select>
          </label>}
          {!finished && <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" disabled={hint >= step.hints.length} onClick={() => setHint(n => n + 1)}>下一层提示</button>}
          {step.hints.slice(0, hint).map((line, index) => <p key={line}>提示 {index + 1} · {line}</p>)}
        </aside>}
      </div>
    </main>
  )
}
