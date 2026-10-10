'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { gradeFirstPythonLesson, PYTHON_TRIAL_EXPECTED_OUTPUT } from './python-lab-grade'

type SandboxEvent = { kind: 'FRAME_READY' | 'LOADED' | 'RESULT'; id?: number; output?: string; error?: string | null }

export function PythonTrialLab() {
  const [source, setSource] = useState('print("请把我改成正确的问候语")')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('修改程序后，点击运行。首次运行需要加载 Python 引擎。')
  const [output, setOutput] = useState('')
  const [passed, setPassed] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const requestId = useRef(0)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = useRef(false)

  useEffect(() => {
    const readyProbe = window.setInterval(() => {
      frame.current?.contentWindow?.postMessage({kind:'PING'}, '*')
    }, 300)
    const handler = (event: MessageEvent<SandboxEvent>) => {
      // A sandboxed iframe has an opaque origin and no access to app cookies or DOM.
      if (event.source !== frame.current?.contentWindow || event.origin !== 'null') return
      if (event.data?.kind === 'FRAME_READY') {
        clearInterval(readyProbe)
        setReady(true)
        return
      }
      if (!active.current || !event.data || event.data.id !== requestId.current) return
      if (event.data.kind === 'LOADED') {
        setStatus('Python 已加载，正在运行你的程序……')
        if (timeout.current) clearTimeout(timeout.current)
        timeout.current = setTimeout(() => {
          frame.current?.contentWindow?.postMessage({kind:'STOP',id:requestId.current}, '*')
          active.current = false
          setBusy(false)
          setStatus('运行超过6秒，已停止当前任务。请检查是否存在无限循环。')
        }, 6000)
      } else if (event.data.kind === 'RESULT') {
        if (timeout.current) clearTimeout(timeout.current)
        active.current = false
        setBusy(false)
        const error = event.data.error ?? null
        const actual = event.data.output ?? ''
        setOutput(error ? error : actual)
        const verdict = gradeFirstPythonLesson(actual, error)
        setPassed(verdict.passed)
        setStatus(verdict.feedback)
      }
    }
    window.addEventListener('message', handler)
    return () => {
      clearInterval(readyProbe)
      window.removeEventListener('message', handler)
      if (timeout.current) clearTimeout(timeout.current)
      frame.current?.contentWindow?.postMessage({kind:'STOP',id:requestId.current}, '*')
      active.current = false
    }
  }, [])

  function run() {
    if (!frame.current?.contentWindow || !ready || busy) return
    if (source.length > 5000) {
      setStatus('代码长度不得超过5000字符。')
      return
    }
    requestId.current += 1
    const id = requestId.current
    setBusy(true)
    setPassed(false)
    setOutput('')
    setStatus('正在加载真实 Python 引擎，请稍候……')
    active.current = true
    timeout.current = setTimeout(() => {
      frame.current?.contentWindow?.postMessage({kind:'STOP',id}, '*')
      active.current = false
      setBusy(false)
      setStatus('Python 引擎加载超时。请确认网络可以访问 jsDelivr，然后重试。')
    }, 35000)
    frame.current.contentWindow.postMessage({kind:'RUN',id,source}, '*')
  }

  function reset() {
    if (active.current) {
      frame.current?.contentWindow?.postMessage({kind:'STOP',id:requestId.current}, '*')
      active.current = false
    }
    if (timeout.current) clearTimeout(timeout.current)
    setBusy(false)
    setSource('print("请把我改成正确的问候语")')
    setPassed(false)
    setOutput('')
    setStatus('程序已重置。调整文字后再运行。')
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(150deg,#effbf5,#eef6ff_65%,#fff3dc)] px-4 py-7 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/learn/catalog/P0-U1-L01" className="text-sm font-bold text-emerald-800">← 返回课程介绍</Link>
        <header className="rounded-[2rem] bg-white p-6 shadow-sm md:p-9">
          <p className="text-sm font-extrabold text-emerald-700">🐍 Python 编程实验室 · 试运行关卡</p>
          <h1 className="mt-3 text-3xl font-black md:text-4xl">第1课 · 让计算机说你好</h1>
          <p className="mt-3 text-base leading-8 text-slate-600">任务：让 Python 程序只打印一行：<strong>{PYTHON_TRIAL_EXPECTED_OUTPUT}</strong>。自己修改代码，再点击运行。</p>
          <p className="mt-3 text-sm text-amber-800">当前是浏览器本地实验关卡：不提交作品、不保存正式学习进度，也不代表 Python 课程已全面开放。首次运行需要下载 Pyodide。</p>
        </header>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7">
            <label htmlFor="python-student-code" className="text-lg font-black">1 · 编写代码</label>
            <p className="mt-2 text-sm text-slate-600">提示：Python 用 <code>print(&quot;文字&quot;)</code> 向屏幕输出内容。</p>
            <textarea
              id="python-student-code"
              data-testid="python-source"
              spellCheck={false}
              disabled={busy}
              value={source}
              onChange={(event) => { setSource(event.target.value); setPassed(false); setStatus('代码已修改，点击运行看看结果。') }}
              className="mt-5 min-h-56 w-full resize-y rounded-2xl bg-slate-950 p-5 font-mono text-base leading-8 text-emerald-200 outline-offset-4 disabled:opacity-70"
              aria-label="Python 代码编辑区"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                data-testid="python-run"
                onClick={run}
                disabled={!ready || busy}
                className="rounded-full bg-emerald-700 px-7 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-50"
              >{busy ? '运行中…' : '▶ 运行 Python'}</button>
              <button type="button" onClick={reset} className="rounded-full bg-slate-100 px-6 py-3 font-bold text-slate-700">重置</button>
            </div>
          </section>
          <section className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7">
            <h2 className="text-lg font-black">2 · 查看运行结果</h2>
            <p data-testid="python-feedback" role="status" aria-live="polite" className={`mt-4 rounded-xl p-4 text-sm leading-7 ${passed ? 'bg-emerald-50 text-emerald-900' : 'bg-sky-50 text-slate-800'}`}>{status}</p>
            <p className="mt-6 text-sm font-bold">真实 Python 标准输出</p>
            <pre data-testid="python-output" className="mt-2 min-h-32 whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 font-mono text-sm leading-7 text-white">{output || '（等待运行）'}</pre>
            {passed ? <div data-testid="python-passed" className="mt-5 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-800">⭐ 已达成本地练习目标！试试改成自己的问候语，再观察输出会有什么变化。</div> : null}
          </section>
        </div>
        <p className="text-xs leading-6 text-slate-600">隔离说明：代码仅在无同源权限的 sandbox iframe 及其 Web Worker 里的 Pyodide 运行，不在 Next.js 服务器执行。通过判定只用于本地练习展示，不产生可信成绩记录。沙箱限制了应用数据访问，但不是通用的恶意代码安全执行平台。</p>
        <iframe
          ref={frame}
          title="隔离的 Python 执行沙箱"
          src="/python-lab-sandbox.html"
          sandbox="allow-scripts"
          className="hidden"
          onLoad={() => setReady(true)}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </main>
  )
}
