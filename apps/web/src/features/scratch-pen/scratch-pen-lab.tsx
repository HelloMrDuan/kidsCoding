'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { getG3PenLesson } from '@/content/curriculum/g3-pen-lessons'
import {
  PEN_STAGE_HEIGHT,
  PEN_STAGE_WIDTH,
  penSegmentsToSvgLines,
  summarizePenRun,
  type PenSegment,
} from './pen-segments'

type PenSprite = { name: string; x: number; y: number; direction: number; sizeVar: number | null }
type PenLabMessage = {
  kind: 'FRAME_READY' | 'PROJECT_LOADED' | 'SNAPSHOT' | 'STOPPED' | 'ERROR'
  id: number | null
  available?: boolean
  targets?: PenSprite[]
  segments?: PenSegment[]
  final?: { x: number; y: number; direction: number; sizeVar: number | null } | null
  timedOut?: boolean
  error?: string
}

const LESSON_ID = 'G3-U1-L01'

/**
 * G3-U1-L01 pen trial lab (PR #260 web-classroom access).
 * Runs the lesson's own main project in the real Scratch VM inside
 * scratch-pen-sandbox.html and draws the VM's own pen output on the stage.
 * This is an experimental trial entry (L3), never a published course:
 * there is no in-classroom pen-block editing yet; practices, debugging and
 * creation continue in a compatible Scratch editor via the downloaded .sb3.
 */
export function ScratchPenLab() {
  const lesson = getG3PenLesson(LESSON_ID)
  const frame = useRef<HTMLIFrameElement>(null)
  const id = useRef(0)
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [segments, setSegments] = useState<PenSegment[]>([])
  const [sprite, setSprite] = useState<PenSprite | null>(null)
  const [status, setStatus] = useState('正在加载 Scratch VM，请稍候……')
  const [summary, setSummary] = useState('尚未运行。')

  useEffect(() => {
    let destroyed = false
    let pingTimer: ReturnType<typeof setInterval> | null = null
    let ready = false

    const loadSample = async () => {
      if (!lesson || destroyed || !frame.current?.contentWindow) return
      try {
        const response = await fetch(lesson.sample, { cache: 'no-store' })
        if (!response.ok) throw new Error('没有找到本课 .sb3')
        const archive = await response.arrayBuffer()
        if (destroyed) return
        id.current += 1
        frame.current.contentWindow.postMessage({ kind: 'LOAD', id: id.current, archive, source: 'sample' }, '*', [archive])
      } catch (error) {
        if (!destroyed) {
          setLoadFailed(true)
          setStatus('项目加载失败：' + String(error))
        }
      }
    }

    const listener = (event: MessageEvent<PenLabMessage>) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== 'null' || !event.data) return
      const msg = event.data
      // Ignore stale messages from an earlier LOAD (same guard as the meteor trial).
      if (msg.kind !== 'FRAME_READY' && msg.id !== null && msg.id !== id.current) return
      if (msg.kind === 'FRAME_READY' && !ready) {
        ready = true
        if (pingTimer) clearInterval(pingTimer)
        if (msg.available) void loadSample()
        else {
          setLoadFailed(true)
          setStatus('Scratch VM 加载失败，请检查 jsDelivr。')
        }
      } else if (msg.kind === 'PROJECT_LOADED') {
        setLoaded(true)
        setLoadFailed(false)
        setSegments(msg.segments ?? [])
        setSprite(msg.targets?.[0] ?? null)
        setStatus('已加载本课主项目，点击绿旗开始运行。')
      } else if (msg.kind === 'SNAPSHOT') {
        setSegments(msg.segments ?? [])
        setSprite(msg.targets?.[0] ?? null)
      } else if (msg.kind === 'STOPPED') {
        setRunning(false)
        setSegments(msg.segments ?? [])
        setSprite(msg.targets?.[0] ?? null)
        setSummary(summarizePenRun(msg.segments ?? [], msg.final ?? null))
        setStatus(msg.timedOut ? '运行超时，已停止。' : '已停止。')
      } else if (msg.kind === 'ERROR') {
        setRunning(false)
        setStatus(msg.error ?? '项目运行失败。')
        if (!loaded) setLoadFailed(true)
      }
    }
    window.addEventListener('message', listener)
    pingTimer = setInterval(() => frame.current?.contentWindow?.postMessage({ kind: 'PING' }, '*'), 350)
    return () => {
      destroyed = true
      if (pingTimer) clearInterval(pingTimer)
      window.removeEventListener('message', listener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Protocol mirrors the meteor trial: only LOAD advances the message id;
  // START/STOP reuse the current LOAD id, which is what the sandbox
  // checks before acting. Incrementing here would make the sandbox ignore
  // the run/stop request.
  async function run() {
    if (!loaded || running || !frame.current?.contentWindow) return
    setRunning(true)
    setStatus('正在运行……')
    frame.current.contentWindow.postMessage({ kind: 'START', id: id.current }, '*')
  }

  function stop() {
    if (!running || !frame.current?.contentWindow) return
    frame.current.contentWindow.postMessage({ kind: 'STOP', id: id.current }, '*')
  }

  async function resetSample() {
    if (running || !lesson || !frame.current?.contentWindow) return
    setStatus('正在恢复初始项目……')
    try {
      const response = await fetch(lesson.sample, { cache: 'no-store' })
      if (!response.ok) throw new Error('示例项目下载失败')
      const archive = await response.arrayBuffer()
      id.current += 1
      frame.current.contentWindow.postMessage({ kind: 'LOAD', id: id.current, archive, source: 'sample' }, '*', [archive])
    } catch (error) {
      setStatus('恢复初始项目失败：' + String(error))
    }
  }

  async function download() {
    if (!lesson) return
    try {
      const response = await fetch(lesson.sample, { cache: 'no-store' })
      if (!response.ok) throw new Error('示例项目下载失败')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = lesson.exportName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 5_000)
      setStatus('已下载本课 .sb3，可用兼容 Scratch 3 的编辑器打开。')
    } catch (error) {
      setStatus('下载失败：' + String(error))
    }
  }

  const lines = penSegmentsToSvgLines(segments)
  const spriteLeft = sprite ? `${((sprite.x + PEN_STAGE_WIDTH / 2) / PEN_STAGE_WIDTH) * 100}%` : '50%'
  const spriteTop = sprite ? `${((PEN_STAGE_HEIGHT / 2 - sprite.y) / PEN_STAGE_HEIGHT) * 100}%` : '50%'

  return (
    <main className="min-h-screen bg-[linear-gradient(155deg,#eaf8ff,#f5f4ff_60%,#fff3dd)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link href="/learn/catalog/G3-U1-L01" className="font-bold text-indigo-800">← 返回 Scratch 课程介绍</Link>
        <header className="rounded-[2rem] bg-white p-7 shadow-sm">
          <p className="text-sm font-extrabold text-indigo-700">Scratch VM 实验室 · 官方运行引擎试用</p>
          <h1 className="mt-3 text-3xl font-black">{lesson?.title ?? '用自制积木画图'}</h1>
          <p className="mt-3 text-slate-600">在真实 Scratch VM 里运行本课主项目：画笔自制积木画出 6 颗尺寸递增的星。舞台上的线就是 VM 画笔的真实输出，不是截图。</p>
          <ul data-testid="pen-limitations" className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
            <li>这是实验入口，可以试玩，但还不是正式发布的课程，不保存正式成绩。</li>
            <li>课堂内暂不提供画笔积木编辑；练习 A、练习 B、找错与创作请下载 .sb3 到兼容 Scratch 编辑器完成。</li>
            <li>沙箱只运行本课主项目本身的结构，其他项目会被拒绝，不会覆盖已加载的项目。</li>
          </ul>
        </header>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm">
            <div className="relative mx-auto aspect-[4/3] max-w-[480px] overflow-hidden rounded-2xl border-4 border-indigo-200 bg-[#132548]" data-testid="pen-stage">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 480 360" role="img" aria-label="画笔舞台">
                <rect width="480" height="360" fill="#132548" />
                {lines.map((line, index) => (
                  <line key={index} data-testid="pen-line" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.stroke} strokeWidth={line.strokeWidth} strokeLinecap="round" />
                ))}
              </svg>
              {sprite && (
                <span className="absolute text-3xl" data-testid="pen-sprite" style={{ left: spriteLeft, top: spriteTop, transform: 'translate(-50%,-50%)' }}>✏️</span>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button data-testid="pen-run" type="button" disabled={!loaded || running || loadFailed} onClick={run} className="rounded-full bg-emerald-600 px-6 py-3 font-bold text-white disabled:opacity-40">▶ 绿旗运行</button>
              <button data-testid="pen-stop" type="button" disabled={!running} onClick={stop} className="rounded-full bg-rose-600 px-6 py-3 font-bold text-white disabled:opacity-40">■ 停止</button>
              <button data-testid="pen-download" type="button" onClick={download} className="rounded-full bg-indigo-700 px-6 py-3 font-bold text-white">下载本课 .sb3</button>
              <button data-testid="pen-reset" type="button" disabled={running || !loaded} onClick={resetSample} className="rounded-full bg-slate-200 px-6 py-3 font-bold text-slate-800 disabled:opacity-40">恢复初始项目</button>
              {loadFailed && (
                <button data-testid="pen-reload" type="button" onClick={() => window.location.reload()} className="rounded-full bg-amber-500 px-6 py-3 font-bold text-white">重新加载</button>
              )}
            </div>
            <p data-testid="pen-status" className="mt-4 text-sm leading-6 text-slate-700">{status}</p>
            <p data-testid="pen-summary" className="mt-1 text-sm leading-6 text-slate-700">{summary}</p>
          </section>
          <section className="rounded-[2rem] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">这次运行会画什么</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">主项目定义了带 size 参数的“画星形”自制积木，绿旗后循环调用 6 次、每次尺寸递增。跑完后舞台上应有 6 颗从左到右依次增大的蓝色五角星，角色终点 x=160。</p>
            <h2 className="mt-6 text-xl font-black">怎么继续学</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">下载 .sb3 后，在兼容 Scratch 3 的编辑器里打开：改 size 序列做练习 A、加颜色参数做练习 B、找“步数写死”的错；做完的作品可以保存、导出和重新导入。</p>
          </section>
        </div>
        <iframe ref={frame} src="/scratch-pen-sandbox.html" sandbox="allow-scripts" title="Scratch VM 画笔运行沙箱" className="hidden" aria-hidden="true" tabIndex={-1} />
      </div>
    </main>
  )
}
