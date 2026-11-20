'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { validateData } from './project-store'

type Entry = { channel: 'stdout' | 'stderr'; text: string }
type Result = { kind: 'loading' | 'running' | 'done' | 'stopped' | 'idle' }
  | { kind: 'prompt'; prompt: string } | { kind: 'failed'; reason: string; line?: number }
type Run = { port?: MessagePort; timer?: number }
const names = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']

async function getResource(path: string) {
  const response = await fetch(path, { cache: 'force-cache' })
  if (!response.ok) throw new Error('无法读取 Python 引擎文件。请重试。')
  return response
}

async function runtimeFiles() {
  const workerScript = getResource('/python-create-runtime/worker.js').then((response) => response.text())
  const assets = Promise.all(names.map(async (name) => {
    const response = await getResource('/python-create-runtime/' + name)
    return [name, await response.arrayBuffer()] as const
  }))
  const [script, files] = await Promise.all([workerScript, assets])
  return { workerScript: script, assets: Object.fromEntries(files) }
}

export function usePythonRuntime() {
  const frame = useRef<HTMLIFrameElement>(null)
  const active = useRef<Run | null>(null)
  const files = useRef<ReturnType<typeof runtimeFiles> | null>(null)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<Result>({ kind: 'idle' })
  const [output, setOutput] = useState<Entry[]>([])

  const end = useCallback(() => {
    const run = active.current
    active.current = null
    if (!run) return
    window.clearTimeout(run.timer)
    run.port?.postMessage({ kind: 'stop' })
    run.port?.close()
  }, [])
  useEffect(() => end, [end])

  function deadline(run: Run, milliseconds: number, reason: string) {
    window.clearTimeout(run.timer)
    run.timer = window.setTimeout(() => {
      if (active.current !== run) return
      end()
      setState({ kind: 'failed', reason })
    }, milliseconds)
  }

  async function run(source: string) {
    end()
    setOutput([])
    const invocation: Run = {}
    const receiver = frame.current?.contentWindow
    if (!receiver || !ready) { setState({ kind: 'failed', reason: 'Python 沙箱尚未就绪，请稍后重试。' }); return }
    try { validateData({ language: 'python', source }) }
    catch (error) { setState({ kind: 'failed', reason: (error as Error).message }); return }
    active.current = invocation
    setState({ kind: 'loading' })
    deadline(invocation, 45000, 'Python 引擎加载超时。请重试。')
    try {
      files.current ??= runtimeFiles().catch((error: unknown) => { files.current = null; throw error })
      const { workerScript, assets } = await files.current
      if (active.current !== invocation) return
      const copies = Object.fromEntries(Object.entries(assets).map(([name, bytes]) => [name, bytes.slice(0)]))
      const { port1, port2 } = new MessageChannel()
      invocation.port = port1
      port1.onmessage = ({ data }) => {
        if (active.current !== invocation) return
        if (data.kind === 'output') {
          const entries: Entry[] = data.entries
          setOutput((previous) => {
            const last = previous.at(-1)
            if (last && entries[0]?.channel === last.channel) {
              return [...previous.slice(0, -1), { channel: last.channel, text: last.text + entries[0].text }, ...entries.slice(1)]
            }
            return [...previous, ...entries]
          })
        } else if (data.kind === 'prompt') {
          deadline(invocation, 120000, '等待输入超时，请重新运行。')
          setState({ kind: 'prompt', prompt: data.prompt })
        } else if (data.kind === 'running') {
          deadline(invocation, 8000, '程序运行超时，已停止。可以检查循环条件后重试。')
          setState({ kind: 'running' })
        } else if (data.kind === 'done' || data.kind === 'failed') {
          end()
          setState(data)
        }
      }
      // A sandboxed iframe has an opaque origin, so use its exact window and
      // a private transferred port. JavaScript and runtime bytes come from the app.
      receiver.postMessage({ kind: 'PYTHON_CREATE', source, workerScript, assets: copies }, '*', [port2, ...Object.values(copies)])
    } catch (error) {
      if (active.current !== invocation) return
      end()
      setState({ kind: 'failed', reason: error instanceof Error ? error.message : '无法启动 Python，请重试。' })
    }
  }

  const reset = useCallback(() => { end(); setOutput([]); setState({ kind: 'idle' }) }, [end])
  return {
    frame, state, output, ready, onLoad: () => setReady(true), run, reset,
    stop: () => { end(); setState({ kind: 'stopped' }) },
    clear: () => setOutput([]),
    input(value: string) {
      const current = active.current
      if (!current?.port || state.kind !== 'prompt') return
      current.port.postMessage({ kind: 'input', value })
      setOutput((entries) => [...entries, { channel: 'stdout', text: `${state.prompt} ${value}\n` }])
      deadline(current, 8000, '程序运行超时，已停止。可以检查循环条件后重试。')
      setState({ kind: 'running' })
    },
  }
}
