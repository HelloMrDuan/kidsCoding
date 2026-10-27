'use client'

import Link from 'next/link'
import {useCallback, useEffect, useRef, useState} from 'react'
import {
  emptyG2Observations, evaluateG2Lesson, observedPrediction,
  type G2Lesson, type G2Observations, type G2Point,
} from '@/content/curriculum/g2-u1-scratch-lessons'
import {ScratchG2Blocks} from './scratch-g2-blocks'
import {changedValues, valuesForTarget, type G2Program, type G2Values} from './scratch-g2-program'
import {decodeSampleArchive, isG2Archive, readG2Draft, removeG2Draft, saveG2Draft} from './scratch-g2-draft'

type CostumeAsset = {name: string; uri: string; w: number; h: number; cx: number; cy: number}
type TargetAsset = {name: string; isStage: boolean; costumes: CostumeAsset[]; sounds: string[]}
type SpriteState = {id: string; name: string; x: number; y: number; visible: boolean; size: number; original: boolean; costume: string}
type MoveResult = {requested: G2Point; before: G2Point; after: G2Point; moved: boolean}
type CostumeResult = {requested: string; before: Array<{name: string; costume: string}>; after: Array<{name: string; costume: string}>; changed: boolean; stageCostumes: string[]}
type LabMessage = {
  kind: 'FRAME_READY' | 'PROJECT_LOADED' | 'STARTED' | 'STOPPED' | 'SNAPSHOT' | 'CONFIGURED' | 'CLICKED' | 'SAID' | 'MOVE_RESULT' | 'COSTUME_RESULT' |
    'PROJECT_EXPORTED' | 'DRAFT_EXPORTED' | 'DRAFT_SAVE_FAILED' | 'ERROR'
  id: number | null
  available?: boolean
  params?: G2Values
  assets?: TargetAsset[]
  imported?: boolean
  source?: 'sample' | 'file' | 'saved'
  targets?: SpriteState[]
  backdrop?: string
  bubbles?: Record<string, {type: string; text: string}>
  target?: string
  isStage?: boolean
  text?: string
  requested?: G2Point | string
  before?: G2Point | CostumeResult['before']
  after?: G2Point | CostumeResult['after']
  moved?: boolean
  changed?: boolean
  stageCostumes?: string[]
  archive?: ArrayBuffer
  error?: string
  phase?: 'load' | 'configure' | 'export'
}

export function ScratchG2Lab({lesson}: {lesson: G2Lesson}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const id = useRef(0)
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [running, setRunning] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assets, setAssets] = useState<TargetAsset[]>([])
  const [params, setParams] = useState<G2Values>({})
  const [programs, setPrograms] = useState<Record<string, G2Program | null>>({})
  const [selected, setSelected] = useState<string>(lesson.targets.find(t => t.kind === 'sprite')?.name ?? 'Stage')
  const [editorRevision, setEditorRevision] = useState(0)
  const [sprites, setSprites] = useState<SpriteState[]>([])
  const [backdrop, setBackdrop] = useState('')
  const [bubbles, setBubbles] = useState<Record<string, {type: string; text: string}>>({})
  const [obs, setObs] = useState<G2Observations>(emptyG2Observations)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [moveResult, setMoveResult] = useState<MoveResult | null>(null)
  const [costumeResult, setCostumeResult] = useState<CostumeResult | null>(null)
  const [stageClickNote, setStageClickNote] = useState('')
  const [status, setStatus] = useState('正在加载 Scratch VM，请稍候……')
  const [draftStatus, setDraftStatus] = useState('本机作品还未保存；应用积木后会自动保存真实 .sb3。')
  const [exportDetails, setExportDetails] = useState('尚未导出项目。')
  const vmAvailable = useRef(false)
  const runSeen = useRef(false)
  const recentClicks = useRef<Map<string, number>>(new Map())
  // Costume changes counted per sprite since its last click (from VM snapshots).
  const lastCostume = useRef<Map<string, string>>(new Map())
  const clickChanges = useRef<Map<string, number>>(new Map())
  const clickFrom = useRef<Map<string, string>>(new Map())
  const savedFailed = useRef(false)
  const loadedRef = useRef(false)
  useEffect(() => { loadedRef.current = loaded }, [loaded])

  const spriteTargets = lesson.targets.filter(t => t.kind === 'sprite')
  const selectedTarget = lesson.targets.find(t => t.name === selected) ?? lesson.targets[0]
  const selectedProgram = programs[selected] ?? null
  // Only the selected target can hold an unapplied draft: switching targets
  // discards it (the editor remounts with what the VM runs). A sprite editor
  // whose blocks are disconnected (null) also blocks running stale code.
  const selectedDraft = programs[selected]
  const allApplied = selectedTarget.kind === 'stage' || selectedDraft === undefined ||
    (selectedDraft !== null && selectedDraft.kind === 'sprite' && Object.keys(changedValues(selectedDraft.values, params)).length === 0)
  const pendingForSelected = selectedProgram?.kind === 'sprite' ? changedValues(selectedProgram.values, params) : {}
  const busy = running || exporting || importing || saving
  const tasks = evaluateG2Lesson(lesson.id, obs)
  const observed = observedPrediction(lesson.id, obs)

  const post = useCallback((message: Record<string, unknown>, transfer?: Transferable[]) => {
    frame.current?.contentWindow?.postMessage(message, '*', transfer ?? [])
  }, [])
  const loadArchive = useCallback((archive: ArrayBuffer, source: 'sample' | 'file' | 'saved', imported = false) => {
    id.current += 1
    post({kind: 'LOAD', id: id.current, lessonId: lesson.id, archive, source, imported}, [archive])
  }, [lesson.id, post])
  const loadSample = useCallback(async () => {
    const response = await fetch(lesson.sample, {cache: 'no-store'})
    if (!response.ok) throw new Error('没有找到课程示例 .sb3')
    loadArchive(decodeSampleArchive(await response.text()), 'sample')
  }, [lesson.sample, loadArchive])

  useEffect(() => {
    let destroyed = false
    let started = false
    let loadingSaved = false
    const start = async () => {
      if (started || destroyed) return
      started = true
      try {
        let saved: ArrayBuffer | null = null
        try { saved = await readG2Draft(lesson.id) } catch { /* IndexedDB may be unavailable; the sample still loads. */ }
        if (destroyed) return
        if (saved) {
          loadingSaved = true
          setDraftStatus('正在从本机恢复以前保存的 Scratch .sb3……')
          loadArchive(saved, 'saved')
        } else await loadSample()
      } catch (error) {
        if (!destroyed) { setLoadFailed(true); setStatus('项目加载失败：' + String(error)) }
      }
    }
    const listener = (event: MessageEvent<LabMessage>) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== 'null' || !event.data) return
      const msg = event.data
      if (msg.kind === 'FRAME_READY') {
        vmAvailable.current = !!msg.available
        if (msg.available) void start()
        else if (!started) { setLoadFailed(true); setStatus('Scratch VM 下载失败，请检查网络后点“重新加载”。') }
        return
      }
      if (msg.id !== id.current) return
      if (msg.kind === 'PROJECT_LOADED') {
        loadingSaved = false
        setLoaded(true); setLoadFailed(false); setRetrying(false); setImporting(false)
        setAssets(msg.assets ?? [])
        setParams(msg.params ?? {})
        setPrograms({})
        setEditorRevision(v => v + 1)
        setObs(emptyG2Observations())
        setMoveResult(null)
        setCostumeResult(null)
        setRunning(false)
        runSeen.current = false
        recentClicks.current.clear()
        lastCostume.current.clear()
        clickChanges.current.clear()
        clickFrom.current.clear()
        if (msg.source === 'file') {
          setSaving(true)
          post({kind: 'SAVE_DRAFT', id: id.current})
        } else if (msg.source === 'saved') {
          setDraftStatus('已恢复本机保存的真实 Scratch .sb3 作品，可以继续编辑。')
        }
        setStatus(msg.source === 'saved' ? '已从本机草稿恢复 Scratch 项目。' : msg.imported
          ? 'Scratch VM 已重新导入作品，积木参数已恢复，可以继续编辑运行。'
          : '真实 Scratch VM 已加载项目。先在舞台上点一点精灵，再试试绿旗。')
      } else if (msg.kind === 'SNAPSHOT') {
        const current = msg.targets ?? []
        setSprites(current)
        setBackdrop(msg.backdrop ?? '')
        setBubbles(msg.bubbles ?? {})
        const changes: Record<string, number> = {}
        const transitions: Record<string, {from: string; to: string}> = {}
        for (const t of current) {
          if (!t.original) continue
          const before = lastCostume.current.get(t.name)
          if (before !== undefined && before !== t.costume && clickChanges.current.has(t.name)) {
            const count = (clickChanges.current.get(t.name) ?? 0) + 1
            clickChanges.current.set(t.name, count)
            changes[t.name] = count
            if (count === 1) transitions[t.name] = {from: clickFrom.current.get(t.name) ?? before, to: t.costume}
          }
          lastCostume.current.set(t.name, t.costume)
        }
        if (Object.keys(changes).length) {
          setObs(prev => {
            const nextChanges = {...prev.clickCostumeChanges}
            for (const [name, count] of Object.entries(changes)) nextChanges[name] = Math.max(nextChanges[name] ?? 0, count)
            const nextFirst = {...prev.firstClickTransition}
            for (const [name, t] of Object.entries(transitions)) if (!nextFirst[name]) nextFirst[name] = t
            return {...prev, clickCostumeChanges: nextChanges, firstClickTransition: nextFirst}
          })
        }
        if (runSeen.current) {
          const positions: Record<string, G2Point> = {}
          const costumes: Record<string, string> = {}
          for (const t of current) if (t.original) { positions[t.name] = {x: t.x, y: t.y}; costumes[t.name] = t.costume }
          setObs(prev => ({...prev, positionsAfterRun: positions, costumesAfterRun: costumes}))
        }
      } else if (msg.kind === 'CLICKED') {
        if (msg.isStage) {
          setStageClickNote('你点到的是舞台（背景）。舞台不是精灵，它没有“当角色被点击”的脚本，所以没有角色说话。')
        } else if (msg.target) {
          recentClicks.current.set(msg.target, Date.now())
          clickChanges.current.set(msg.target, 0)
          clickFrom.current.set(msg.target, lastCostume.current.get(msg.target) ?? '')
          setStageClickNote('')
          setStatus(`Scratch VM 正在执行${msg.target}自己的“当角色被点击”脚本。`)
        }
      } else if (msg.kind === 'SAID') {
        const target = msg.target ?? ''
        const text = msg.text ?? ''
        const clickedAt = recentClicks.current.get(target)
        const fromClick = clickedAt !== undefined && Date.now() - clickedAt < 3000
        setObs(prev => ({
          ...prev,
          lastSaid: {...prev.lastSaid, [target]: text},
          clickedSpeakers: fromClick && !prev.clickedSpeakers.includes(target) ? [...prev.clickedSpeakers, target] : prev.clickedSpeakers,
        }))
      } else if (msg.kind === 'COSTUME_RESULT') {
        if (typeof msg.requested === 'string' && Array.isArray(msg.before) && Array.isArray(msg.after)) {
          const result: CostumeResult = {requested: msg.requested, before: msg.before, after: msg.after, changed: !!msg.changed, stageCostumes: msg.stageCostumes ?? []}
          setCostumeResult(result)
          if (!result.changed) {
            setObs(prev => ({...prev, stageCostumeRejected: true}))
            setHintLevel(level => Math.max(level, 1))
            setStatus('没有任何对象换造型：Scratch VM 中舞台和精灵的造型前后相同。看看下面的提示。')
          }
        }
      } else if (msg.kind === 'MOVE_RESULT') {
        if (msg.requested && typeof msg.requested === 'object' && msg.before && !Array.isArray(msg.before) && msg.after && !Array.isArray(msg.after)) {
          const result = {requested: msg.requested, before: msg.before, after: msg.after, moved: !!msg.moved}
          setMoveResult(result)
          if (!result.moved) {
            setObs(prev => ({...prev, stageMoveRejected: true}))
            setHintLevel(level => Math.max(level, 1))
            setStatus('舞台没有移动：Scratch VM 报告舞台坐标前后相同。看看下面的提示。')
          }
        }
      } else if (msg.kind === 'CONFIGURED') {
        setParams(msg.params ?? {})
        setSaving(true)
        post({kind: 'SAVE_DRAFT', id: id.current})
        setStatus('积木已写入真实 Scratch VM。点绿旗或在舞台上点精灵来验证。')
      } else if (msg.kind === 'DRAFT_EXPORTED') {
        if (!isG2Archive(msg.archive)) {
          setSaving(false)
          setDraftStatus('Scratch VM 返回的草稿无效，本机原草稿没有改动。')
        } else {
          void saveG2Draft(lesson.id, msg.archive).then(() => {
            if (!destroyed) setDraftStatus('已在本机自动保存真实 Scratch .sb3，刷新或关闭页面后仍可恢复。')
          }).catch(error => {
            if (!destroyed) setDraftStatus('本机自动保存失败：' + String(error))
          }).finally(() => { if (!destroyed) setSaving(false) })
        }
      } else if (msg.kind === 'DRAFT_SAVE_FAILED') {
        setSaving(false)
        setDraftStatus(msg.error ?? 'Scratch VM 本机草稿打包失败。')
      } else if (msg.kind === 'PROJECT_EXPORTED') {
        setExporting(false)
        const archive = msg.archive
        if (!isG2Archive(archive)) { setStatus('Scratch VM 导出结果无效，没有下载文件。'); return }
        const url = URL.createObjectURL(new Blob([archive], {type: 'application/x.scratch.sb3'}))
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = lesson.exportName
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 5_000)
        const summary = Object.entries(msg.params ?? {}).map(([key, value]) => `${key.split('|')[0]} ${key.split('|')[2]}=${value}`).join('；')
        setExportDetails('Scratch VM 已导出，并在另一个独立 VM 中重新载入验证：' + summary)
        setStatus('作品已从真实 Scratch VM 导出为 .sb3，可以用兼容 Scratch 3 的编辑器打开。')
      } else if (msg.kind === 'STARTED') {
        runSeen.current = true
        clickChanges.current.clear()
        setRunning(true)
        setStatus('Scratch VM 正在执行每个精灵的“当绿旗被点击”脚本。')
        window.setTimeout(() => { if (!destroyed) setRunning(false) }, 600)
      } else if (msg.kind === 'STOPPED') {
        setRunning(false)
        setStatus('已通过 Scratch VM stopAll 停止所有脚本。')
      } else if (msg.kind === 'ERROR') {
        setExporting(false); setImporting(false); setSaving(false); setRunning(false)
        if (msg.phase === 'load' && loadingSaved && !savedFailed.current) {
          loadingSaved = false
          savedFailed.current = true
          setDraftStatus('本机旧草稿不符合本课，已改为加载课程示例；旧文件没有上传。')
          void loadSample().catch(error => setStatus('恢复课程示例失败：' + String(error)))
          return
        }
        if (msg.phase === 'load') { setRetrying(false); setLoadFailed(current => current || !loadedRef.current) }
        setStatus(msg.error ?? 'Scratch VM 执行失败')
      }
    }
    window.addEventListener('message', listener)
    const timer = setInterval(() => { if (!started) frame.current?.contentWindow?.postMessage({kind: 'PING'}, '*') }, 350)
    const iframe = frame.current
    return () => {
      destroyed = true
      clearInterval(timer)
      window.removeEventListener('message', listener)
      iframe?.contentWindow?.postMessage({kind: 'STOP', id: id.current}, '*')
    }
  }, [lesson.id, lesson.exportName, loadArchive, loadSample, post])

  function select(name: string) {
    if (name === selected) return
    setPrograms({})
    setSelected(name)
  }
  const changeProgram = useCallback((program: G2Program | null) => {
    setPrograms(prev => ({...prev, [selected]: program}))
  }, [selected])

  function apply() {
    if (!loaded || busy) return
    if (selectedTarget.kind === 'stage') {
      if (selectedProgram?.kind === 'stage-move') post({kind: 'TRY_MOVE', id: id.current, target: 'Stage', x: selectedProgram.x, y: selectedProgram.y})
      if (selectedProgram?.kind === 'stage-costume') post({kind: 'TRY_COSTUME', id: id.current, target: 'Stage', costume: selectedProgram.costume})
      return
    }
    if (selectedProgram?.kind !== 'sprite' || !Object.keys(pendingForSelected).length) return
    post({kind: 'CONFIGURE', id: id.current, target: selected, values: pendingForSelected})
  }
  async function retryLoad() {
    if (retrying || loaded) return
    if (!vmAvailable.current) { window.location.reload(); return }
    setRetrying(true)
    setStatus('正在重新加载 Scratch 项目……')
    try { await loadSample() } catch (error) { setRetrying(false); setLoadFailed(true); setStatus('项目加载失败：' + String(error)) }
  }
  async function resetOriginal() {
    if (busy) return
    setImporting(true)
    try {
      await removeG2Draft(lesson.id)
      setDraftStatus('已清理这台设备保存的本课草稿。')
      await loadSample()
    } catch (error) {
      setImporting(false)
      setStatus('恢复课程初始作品失败：' + String(error))
    }
  }
  async function importFile(file: File | null) {
    if (!file || busy || !loaded) return
    if (!file.name.toLowerCase().endsWith('.sb3') || file.size < 300 || file.size > 5_000_000) {
      setStatus('只支持小于 5 MB 的本课 .sb3 文件，原作品没有改变。')
      return
    }
    const archive = await file.arrayBuffer()
    const bytes = new Uint8Array(archive)
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) { setStatus('导入失败：不是 Scratch ZIP 文件，原作品没有改变。'); return }
    setImporting(true)
    setStatus('正在用真实 Scratch VM 检查并载入作品……')
    loadArchive(archive, 'file', true)
  }

  const stageAsset = assets.find(a => a.isStage)
  const backdropAsset = stageAsset?.costumes.find(c => c.name === backdrop) ?? stageAsset?.costumes[0]
  const spriteOf = (name: string) => sprites.find(s => s.original && s.name === name)

  return (
    <main className="min-h-screen bg-[linear-gradient(155deg,#eaf8ff,#f5f4ff_60%,#fff3dd)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link href={`/learn/catalog/${lesson.id}`} className="font-bold text-indigo-800">← 返回课程介绍</Link>
        <header className="rounded-[2rem] bg-white p-7 shadow-sm">
          <p className="text-sm font-extrabold text-indigo-700">Scratch VM 实验室 · {lesson.id} · 新概念：{lesson.concept}</p>
          <h1 className="mt-3 text-3xl font-black">{lesson.title}</h1>
          <p data-testid="g2-story" className="mt-3 text-slate-600">{lesson.story}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
            {lesson.conceptExplain.map(line => <li key={line}>{line}</li>)}
          </ul>
          <p className="mt-3 text-sm text-amber-700">实验课程，不是正式发布课程，不保存正式成绩。作品可下载为 .sb3、重新导入，应用积木后本机自动保存。</p>
          <ul data-testid="g2-limitations" className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
            {lesson.limitations.map(line => <li key={line}>{line}</li>)}
          </ul>
        </header>
        <section className="rounded-[2rem] bg-white p-6 shadow-sm" data-testid="g2-predict">
          <h2 className="text-xl font-black">先预测</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">{lesson.predict.question}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {lesson.predict.options.map(option => (
              <button key={option} data-testid="g2-predict-option" type="button" aria-pressed={prediction === option}
                onClick={() => setPrediction(option)}
                className={`rounded-full px-5 py-2 text-sm font-bold ${prediction === option ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-900'}`}>{option}</button>
            ))}
          </div>
          {prediction && (
            <p data-testid="g2-predict-result" className="mt-3 text-sm leading-7 text-slate-700">
              {observed === null
                ? `你预测：${prediction}。现在去舞台上点一点验证吧，猜错也没关系。`
                : `你预测：${prediction}；Scratch VM 实际：${observed}。${prediction === observed ? '猜对了！' : '和预测不一样，这正是要弄懂的地方。'}${lesson.predict.explain}`}
            </p>
          )}
        </section>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm">
            <div data-testid="g2-stage-backdrop" role="button" tabIndex={0} aria-label="舞台背景"
              onClick={event => { if (event.target === event.currentTarget && loaded) post({kind: 'CLICK', id: id.current, target: 'Stage'}) }}
              onKeyDown={event => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && loaded) post({kind: 'CLICK', id: id.current, target: 'Stage'}) }}
              className="relative mx-auto aspect-[4/3] max-w-[480px] overflow-hidden rounded-2xl border-4 border-indigo-200 bg-sky-100"
              style={backdropAsset ? {backgroundImage: `url("${backdropAsset.uri}")`, backgroundSize: '100% 100%'} : undefined}>
              {sprites.filter(s => s.original && s.visible).map(sprite => {
                const asset = assets.find(a => a.name === sprite.name)?.costumes.find(c => c.name === sprite.costume)
                if (!asset) return null
                const scale = (Number.isFinite(sprite.size) ? sprite.size : 100) / 100
                const bubble = bubbles[sprite.name]
                return (
                  <button key={sprite.id} type="button" data-testid="g2-stage-sprite" data-name={sprite.name} data-costume={sprite.costume} aria-label={`点${sprite.name}`}
                    disabled={!loaded}
                    onClick={() => post({kind: 'CLICK', id: id.current, target: sprite.name})}
                    className="absolute p-0"
                    style={{left: `${(sprite.x + 240 - asset.cx * scale) / 480 * 100}%`, top: `${(180 - sprite.y - asset.cy * scale) / 360 * 100}%`, width: `${asset.w * scale / 480 * 100}%`}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.uri} alt={sprite.name} className="pointer-events-none block w-full select-none" draggable={false}/>
                    {bubble && (
                      <span data-testid="g2-bubble" data-name={sprite.name}
                        className="absolute bottom-full left-1/2 mb-1 w-max max-w-[160px] -translate-x-1/2 rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 shadow-sm">{bubble.text}</span>
                    )}
                  </button>
                )
              })}
            </div>
            {stageClickNote && <p data-testid="g2-stage-note" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{stageClickNote}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button data-testid="g2-apply-blocks" type="button"
                disabled={!loaded || busy || (selectedTarget.kind === 'stage' ? selectedProgram?.kind !== 'stage-move' && selectedProgram?.kind !== 'stage-costume' : !Object.keys(pendingForSelected).length)}
                className="rounded-full bg-indigo-700 px-6 py-3 font-bold text-white disabled:opacity-40" onClick={apply}>应用积木到 VM</button>
              {!loaded && loadFailed && (
                <button data-testid="g2-retry-load" type="button" disabled={retrying}
                  className="rounded-full bg-rose-600 px-6 py-3 font-bold text-white disabled:opacity-40"
                  onClick={() => void retryLoad()}>{retrying ? '重新加载中…' : '↻ 重新加载'}</button>
              )}
              <button data-testid="g2-green-flag" type="button" disabled={!loaded || !allApplied || busy}
                className="rounded-full bg-emerald-600 px-7 py-3 font-bold text-white disabled:opacity-40"
                onClick={() => post({kind: 'RUN', id: id.current})}>▶ 绿旗运行</button>
              <button data-testid="g2-export-sb3" type="button" disabled={!loaded || !allApplied || busy}
                className="rounded-full bg-amber-100 px-6 py-3 font-bold text-amber-950 disabled:opacity-40"
                onClick={() => { setExporting(true); setExportDetails('正在由真实 Scratch VM 打包，并在独立 VM 中重新载入检查……'); post({kind: 'EXPORT', id: id.current}) }}>
                {exporting ? '导出中…' : '↓ 保存为 .sb3'}
              </button>
              <label className="cursor-pointer rounded-full bg-sky-100 px-6 py-3 font-bold text-sky-900">
                ↑ 重新导入 .sb3
                <input data-testid="g2-import-sb3" type="file" accept=".sb3" disabled={!loaded || busy} className="sr-only"
                  onChange={event => { const file = event.target.files?.[0] ?? null; event.target.value = ''; void importFile(file) }}/>
              </label>
              <button data-testid="g2-reset-draft" type="button" disabled={!loaded || busy}
                className="rounded-full bg-slate-100 px-6 py-3 font-bold text-slate-800 disabled:opacity-40"
                onClick={() => void resetOriginal()}>恢复课程初始作品</button>
              <button data-testid="g2-stop" type="button" disabled={!loaded}
                className="rounded-full bg-rose-100 px-6 py-3 font-bold text-rose-800 disabled:opacity-40"
                onClick={() => post({kind: 'STOP', id: id.current})}>■ 停止</button>
            </div>
          </section>
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Scratch VM 实时观察</h2>
            <p role="status" data-testid="g2-vm-status" className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm leading-7">{status}</p>
            {moveResult && (
              <p data-testid="g2-move-result" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-900">
                请求舞台移到 ({moveResult.requested.x}, {moveResult.requested.y})；VM 中舞台坐标：移动前 ({moveResult.before.x}, {moveResult.before.y}) → 移动后 ({moveResult.after.x}, {moveResult.after.y})。{moveResult.moved ? '舞台移动了。' : '舞台没有移动。'}
              </p>
            )}
 {costumeResult && (
              <p data-testid="g2-costume-result" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-900">
                请求舞台换成“{costumeResult.requested}”造型；舞台自己的背景只有：{costumeResult.stageCostumes.join('、') || '—'}。VM 中：{costumeResult.before.map((b, i) => `${b.name === 'Stage' ? '舞台' : b.name} ${b.costume} → ${costumeResult.after[i]?.costume ?? '—'}`).join('；')}。{costumeResult.changed ? '有对象换了造型。' : '没有任何对象换造型。'}
              </p>
            )}
            <p data-testid="g2-export-status" className="mt-5 text-sm text-indigo-700">{exportDetails}</p>
            <p data-testid="g2-local-save-status" className="mt-3 text-sm text-emerald-800">{draftStatus}</p>
            <p className="mt-5 text-sm">当前背景：<strong data-testid="g2-backdrop">{backdrop || '—'}</strong></p>
            {spriteTargets.map(t => {
              const s = spriteOf(t.name)
              return <p key={t.name} data-testid="g2-sprite-state" data-name={t.name} className="mt-2 text-sm">
                {t.label}：x {s ? Math.round(s.x) : '—'} · y {s ? Math.round(s.y) : '—'}{t.costumes && t.costumes.length > 1 ? ` · 造型 ${s?.costume ?? '—'}` : ''}{obs.lastSaid[t.name] ? ` · 刚才说“${obs.lastSaid[t.name]}”` : ''}
              </p>
            })}
            <p className="mt-5 text-xs leading-6 text-slate-500">位置、造型和说的话都来自 Scratch VM 的对象状态；画面用原创 SVG 按 VM 坐标绘制，未接入 Scratch WebGL 渲染器。项目不会上传。</p>
          </section>
        </div>
        <section className="rounded-[2rem] bg-white p-6 shadow-sm" data-testid="g2-tasks">
          <h2 className="text-xl font-black">本课任务</h2>
          <ol className="mt-3 space-y-3">
            {lesson.tasks.map(task => {
              const done = !!tasks?.[task.id]
              return <li key={task.id} data-testid={`g2-task-${task.id}`} data-done={done ? 'true' : 'false'}
                className={`rounded-2xl border-2 p-4 ${done ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                <p className="font-black">{done ? '✓ ' : ''}{task.title}<span className="ml-2 text-xs font-bold text-slate-500">练的是：{task.skill}</span></p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{task.goal}</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">{task.how}</p>
              </li>
            })}
          </ol>
        </section>
        <section className="rounded-[2rem] bg-white p-6 shadow-sm" data-testid="g2-hints">
          <h2 className="text-xl font-black">分层提示</h2>
          <p className="mt-2 text-sm text-slate-600">做“找错”任务卡住时，一层一层打开提示：先看现象，再想原因，最后才看怎么改。</p>
          <ol className="mt-3 space-y-2">
            {lesson.hints.slice(0, hintLevel).map((hint, index) => (
              <li key={hint} data-testid={`g2-hint-${index + 1}`} className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">第 {index + 1} 层：{hint}</li>
            ))}
          </ol>
          {hintLevel < 3 && (
            <button data-testid="g2-next-hint" type="button" onClick={() => setHintLevel(level => Math.min(3, level + 1))}
              className="mt-3 rounded-full bg-amber-100 px-5 py-2 text-sm font-bold text-amber-950">{hintLevel === 0 ? '需要提示' : '再给一层提示'}</button>
          )}
        </section>
        <section data-testid="g2-target-list" className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">角色区：舞台和精灵</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">点一个对象，下面就显示它自己的积木。舞台只有背景；每个精灵都有自己的位置和脚本。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {lesson.targets.map(t => {
              const isSelected = t.name === selected
              const s = spriteOf(t.name)
              return (
                <article key={t.name} data-testid="g2-target-card" data-name={t.name} onClick={() => select(t.name)}
                  className={`cursor-pointer rounded-2xl border-2 p-4 ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                  <p className="text-base font-black">{t.label}{isSelected && <span className="ml-2 rounded-full bg-indigo-700 px-2 py-0.5 text-xs font-bold text-white">当前选中</span>}</p>
                  <p className="mt-2 text-sm text-slate-600">{t.kind === 'stage' ? `背景：${backdrop || '—'} · 舞台没有 x/y 位置` : `精灵 · 位置 x ${s ? Math.round(s.x) : '—'}，y ${s ? Math.round(s.y) : '—'}`}</p>
                  <button data-testid="g2-select-target" data-name={t.name} type="button"
                    className="mt-3 rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-900"
                    onClick={event => { event.stopPropagation(); select(t.name) }}>{isSelected ? '正在查看' : `查看${t.label}的积木`}</button>
                </article>
              )
            })}
          </div>
        </section>
        {loaded && (
          <ScratchG2Blocks key={`${selected}:${editorRevision}`} target={selectedTarget}
            initialValues={valuesForTarget(params, selected)} onProgramChange={changeProgram}/>
        )}
        <section className="rounded-[2rem] bg-white p-6 shadow-sm" data-testid="g2-reflection">
          <h2 className="text-xl font-black">说一说（复盘）</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
            {lesson.reflection.map(q => <li key={q}>{q}</li>)}
          </ul>
          <p className="mt-3 text-xs text-slate-500">下一课：{lesson.nextLesson}。复盘只给孩子和家长讨论，不会上传或评分。</p>
        </section>
        <iframe ref={frame} src="/scratch-g2-sandbox.html" sandbox="allow-scripts" title="Scratch VM G2 受限运行沙箱" className="hidden" aria-hidden="true" tabIndex={-1}/>
      </div>
    </main>
  )
}
