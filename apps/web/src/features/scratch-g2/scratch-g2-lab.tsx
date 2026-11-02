'use client'

import Link from 'next/link'
import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react'
import {
  emptyG2Observations, evaluateG2Lesson, observedPrediction,
  type G2Lesson, type G2Observations, type G2Point,
} from '@/content/curriculum/g2-u1-scratch-lessons'
import {beatSummary, filmSummary, flightSummary, syncSummary, L12_FILM_MIN_MS, L12_FILM_MAX_MS, L07_TOO_FAST_MS, L07_VISIBLE_MS} from '@/content/curriculum/g2-u2-scratch-lessons'
import {ScratchG2Blocks} from './scratch-g2-blocks'
import {changedValues, valuesForTarget, type G2Program, type G2Values} from './scratch-g2-program'
import {decodeSampleArchive, isG2Archive, readG2Draft, removeG2Draft, saveG2Draft} from './scratch-g2-draft'

type CostumeAsset = {name: string; uri: string; w: number; h: number; cx: number; cy: number}
type TargetAsset = {name: string; isStage: boolean; costumes: CostumeAsset[]; sounds: string[]; soundUris?: Record<string, string>}
type SpriteState = {id: string; name: string; x: number; y: number; visible: boolean; size: number; original: boolean; costume: string; direction?: number; rotationStyle?: string}
type MoveResult = {requested: G2Point; before: G2Point; after: G2Point; moved: boolean}
type CostumeResult = {requested: string; before: Array<{name: string; costume: string}>; after: Array<{name: string; costume: string}>; changed: boolean; stageCostumes: string[]}
type LabMessage = {
  kind: 'FRAME_READY' | 'PROJECT_LOADED' | 'STARTED' | 'STOPPED' | 'SNAPSHOT' | 'CONFIGURED' | 'CLICKED' | 'SAID' | 'MOVE_RESULT' | 'COSTUME_RESULT' | 'SOUND' | 'TURN' | 'BROADCAST' | 'FRAME' | 'BACKDROP_SWITCH' | 'STOP_BLOCK' |
    'PROJECT_EXPORTED' | 'DRAFT_EXPORTED' | 'DRAFT_SAVE_FAILED' | 'ERROR' | 'KEY_PRESSED'
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
  sound?: string
  degrees?: number
  message?: string
  /** Other sprites whose speech bubble was still showing when this sprite started talking. */
  overlap?: string[]
  /** Costume the sprite wore in the VM when its sound started. */
  costume?: string
  /** Sandbox clock (ms) when the VM ran "next costume". */
  t?: number
  /** Arrow key the VM really ran, and the boat x right after it (keyboard lessons). */
  key?: string
  x?: number
  activeThreads?: number
  /** The option Scratch's "stop" block really ran with ("all", "this script"). */
  option?: string
  archive?: ArrayBuffer
  error?: string
  phase?: 'load' | 'configure' | 'export'
}

/** Update the green-flag run in progress (the last cycle run). */
function updateLastCycle(prev: G2Observations, change: (run: G2Observations['cycleRuns'][number]) => G2Observations['cycleRuns'][number]): G2Observations {
  if (!prev.cycleRuns.length) return prev
  const last = prev.cycleRuns.length - 1
  return {...prev, cycleRuns: prev.cycleRuns.map((run, i) => (i === last ? change(run) : run))}
}

/** Update the green-flag run in progress (the last beat run). */
function updateLastBeat(prev: G2Observations, change: (run: G2Observations['beatRuns'][number]) => G2Observations['beatRuns'][number]): G2Observations {
  if (!prev.beatRuns.length) return prev
  const last = prev.beatRuns.length - 1
  return {...prev, beatRuns: prev.beatRuns.map((run, i) => (i === last ? change(run) : run))}
}

/** Update the green-flag film in progress (the last film run, unit project lessons). */
function updateLastFilm(prev: G2Observations, change: (run: G2Observations['filmRuns'][number]) => G2Observations['filmRuns'][number]): G2Observations {
  if (!prev.filmRuns.length) return prev
  const last = prev.filmRuns.length - 1
  return {...prev, filmRuns: prev.filmRuns.map((run, i) => (i === last ? change(run) : run))}
}

/** Frames each sprite stepped through in one green-flag run; the average gap needs at least two frames. */
function summarizeFrames(frames: Record<string, {count: number; first: number; last: number; end: string}>) {
  return Object.fromEntries(Object.entries(frames).map(([name, f]) => [name, {
    count: f.count, avgMs: f.count >= 2 ? (f.last - f.first) / (f.count - 1) : null, end: f.end,
  }]))
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
  // The green-flag run in progress: how many times the stage's own sounds played in it.
  type FrameTrack = {count: number; first: number; last: number; end: string}
  const flagRun = useRef<{stagePlays: number; speakers: string[]; overlaps: number; frames: Record<string, FrameTrack>; switches: number[]; stopRequested: boolean; beatT0: number | null; turns: Record<string, number>} | null>(null)
  const [lastFrames, setLastFrames] = useState<{frames: Record<string, {count: number; avgMs: number | null; end: string}>; finished: boolean} | null>(null)
  const [lastSpeech, setLastSpeech] = useState<{speakers: string[]; overlaps: number; finished: boolean} | null>(null)
  const soundUris = useRef<Record<string, Record<string, string>>>({})
  const [lastRunSounds, setLastRunSounds] = useState<{stagePlays: number; finished: boolean} | null>(null)
  // Degrees each sprite has really turned in the VM since it was last clicked (open click runs).
  const clickTurn = useRef<Map<string, number>>(new Map())
  const [lastTurns, setLastTurns] = useState<Record<string, {total: number; finished: boolean}>>({})
  // The broadcast run in progress: the message the VM sent and who spoke after it.
  const broadcastRun = useRef<{message: string; speakers: string[]; t0: number | null; saidAt: Record<string, number>} | null>(null)
  const [lastBroadcast, setLastBroadcast] = useState<{message: string; speakers: string[]; finished: boolean} | null>(null)
  // Film lessons: the ending's stop block ran and the VM has not yet been seen with no script running.
  const filmStopPending = useRef(false)
  const savedFailed = useRef(false)
  const loadedRef = useRef(false)
  useEffect(() => { loadedRef.current = loaded }, [loaded])

  const spriteTargets = lesson.targets.filter(t => t.kind === 'sprite')
  const stageHasSounds = lesson.targets.some(t => t.kind === 'stage' && !!t.sounds?.length)
  const selectedTarget = lesson.targets.find(t => t.name === selected) ?? lesson.targets[0]
  const selectedProgram = programs[selected] ?? null
  // Only the selected target can hold an unapplied draft: switching targets
  // discards it (the editor remounts with what the VM runs). A sprite editor
  // whose blocks are disconnected (null) also blocks running stale code.
  const selectedDraft = programs[selected]
  const stageErrorOnly = selectedTarget.kind === 'stage' && selectedTarget.scripts.every(script => script.body.length === 0)
  const allApplied = stageErrorOnly || selectedDraft === undefined ||
    (selectedDraft !== null && selectedDraft.kind === 'sprite' && Object.keys(changedValues(selectedDraft.values, params)).length === 0)
  const pendingForSelected = selectedProgram?.kind === 'sprite' ? changedValues(selectedProgram.values, params) : {}
  const busy = running || exporting || importing || saving
  // Live boat x from VM object state; only the U3 keyboard lesson's evaluation uses it (pre-move key log needs the final position to judge landings).
  const boatSpriteName = lesson.targets.find(t => t.kind === 'sprite')?.name
  const boatX = boatSpriteName ? sprites.find(s => s.name === boatSpriteName)?.x : undefined
  const tasks = evaluateG2Lesson(lesson.id, obs, boatX)
  const observed = observedPrediction(lesson.id, obs, boatX)

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
        flagRun.current = null
        setLastRunSounds(null)
        clickTurn.current.clear()
        setLastTurns({})
        broadcastRun.current = null
        filmStopPending.current = false
        setLastBroadcast(null)
        setLastSpeech(null)
        setLastFrames(null)
        soundUris.current = Object.fromEntries((msg.assets ?? []).map(a => [a.name, a.soundUris ?? {}]))
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
        if (clickTurn.current.size && msg.activeThreads === 0) {
          const done = Object.fromEntries(clickTurn.current)
          clickTurn.current.clear()
          setLastTurns(prev => {
            const next = {...prev}
            for (const [name, total] of Object.entries(done)) next[name] = {total, finished: true}
            return next
          })
          setObs(prev => {
            const nextTurns = {...prev.clickTurns}
            for (const [name, total] of Object.entries(done)) nextTurns[name] = [...(nextTurns[name] ?? []), total].slice(-20)
            return {...prev, clickTurns: nextTurns}
          })
        }
        if (filmStopPending.current && msg.activeThreads === 0) {
          filmStopPending.current = false
          setObs(prev => updateLastFilm(prev, r => ({...r, ended: true})))
        }
        if (broadcastRun.current && msg.activeThreads === 0) {
          const positions: Record<string, G2Point> = {}
          for (const t of current) if (t.original) positions[t.name] = {x: t.x, y: t.y}
          const {message: runMessage, speakers: runSpeakers, saidAt} = broadcastRun.current
          const run = {message: runMessage, speakers: runSpeakers, saidAt: {...saidAt}, backdrop: msg.backdrop ?? '', positions}
          broadcastRun.current = null
          setLastBroadcast({message: run.message, speakers: run.speakers, finished: true})
          setObs(prev => ({...prev, broadcastRuns: [...prev.broadcastRuns, run].slice(-20)}))
        }
        if (flagRun.current && msg.activeThreads === 0) {
          const runPositions: Record<string, G2Point> = {}
          for (const t of current) if (t.original) runPositions[t.name] = {x: t.x, y: t.y}
          const finished = {backdrop: msg.backdrop ?? '', stagePlays: flagRun.current.stagePlays, positions: runPositions}
          const speech = {speakers: [...flagRun.current.speakers], overlaps: flagRun.current.overlaps, positions: runPositions}
          const runDirections: Record<string, number> = {}
          for (const t of current) if (t.original && typeof t.direction === 'number') runDirections[t.name] = t.direction
          const frameRun = {frames: summarizeFrames(flagRun.current.frames), positions: runPositions, turns: {...flagRun.current.turns}, directions: runDirections}
          const stopped = flagRun.current.stopRequested
          flagRun.current = null
          setObs(prev => updateLastBeat(updateLastCycle(prev, r => ({...r, finished: true, stopped})), r => ({...r, finished: true})))
          setLastFrames({frames: frameRun.frames, finished: true})
          setLastRunSounds({stagePlays: finished.stagePlays, finished: true})
          setLastSpeech({speakers: speech.speakers, overlaps: speech.overlaps, finished: true})
          setObs(prev => ({...prev, flagRuns: [...prev.flagRuns, finished].slice(-20), speechRuns: [...prev.speechRuns, speech].slice(-20), frameRuns: [...prev.frameRuns, frameRun].slice(-20)}))
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
          clickTurn.current.set(msg.target, 0)
          setStageClickNote('')
          setStatus(`Scratch VM 正在执行${msg.target}自己的“当角色被点击”脚本。`)
        }
      } else if (msg.kind === 'SAID') {
        const target = msg.target ?? ''
        const text = msg.text ?? ''
        if (broadcastRun.current && target && !broadcastRun.current.speakers.includes(target)) {
          broadcastRun.current.speakers.push(target)
          // Sync lessons: when each receiver first spoke, in ms after the broadcast (sandbox clock).
          const t = Number(msg.t)
          if (broadcastRun.current.t0 !== null && Number.isFinite(t)) broadcastRun.current.saidAt[target] = Math.round(t - broadcastRun.current.t0)
          setLastBroadcast({message: broadcastRun.current.message, speakers: [...broadcastRun.current.speakers], finished: false})
        }
        if (lesson.showFilm && target === '小橘猫' && text) setObs(prev => updateLastFilm(prev, r => ({...r, lines: [...r.lines, text].slice(-10)})))
        if (flagRun.current && target) {
          const spokenOn = String(msg.backdrop ?? '')
          setObs(prev => updateLastCycle(prev, r => ({...r, speech: [...r.speech, {target, backdrop: spokenOn}].slice(-40)})))
          if (!flagRun.current.speakers.includes(target)) flagRun.current.speakers.push(target)
          if ((msg.overlap ?? []).length > 0) flagRun.current.overlaps += 1
          setLastSpeech({speakers: [...flagRun.current.speakers], overlaps: flagRun.current.overlaps, finished: false})
        }
        const clickedAt = recentClicks.current.get(target)
        const fromClick = clickedAt !== undefined && Date.now() - clickedAt < 3000
        setObs(prev => ({
          ...prev,
          lastSaid: {...prev.lastSaid, [target]: text},
          clickedSpeakers: fromClick && !prev.clickedSpeakers.includes(target) ? [...prev.clickedSpeakers, target] : prev.clickedSpeakers,
        }))
      } else if (msg.kind === 'SOUND') {
        const target = String(msg.target ?? '')
        const sound = String(msg.sound ?? '')
        const uri = soundUris.current[target]?.[sound]
        if (uri) { try { void new Audio(uri).play().catch(() => {}) } catch { /* audio is optional */ } }
        if (target === 'Stage') {
          if (flagRun.current) {
            flagRun.current.stagePlays += 1
            setLastRunSounds({stagePlays: flagRun.current.stagePlays, finished: false})
          }
        } else if (target && sound) {
          const costume = String(msg.costume ?? '')
          const st = Number(msg.t)
          if (lesson.showFilm && Number.isFinite(st)) setObs(prev => updateLastFilm(prev, r => ({...r, sounds: [...r.sounds, st].slice(-400)})))
          // Rhythm lessons: time every sound the VM starts during the green-flag run (sandbox clock, ms since the run's first sound).
          const t = Number(msg.t)
          if (flagRun.current && Number.isFinite(t)) {
            if (flagRun.current.beatT0 === null) flagRun.current.beatT0 = t
            const ms = Math.round(t - flagRun.current.beatT0)
            setObs(prev => updateLastBeat(prev, r => ({...r, hits: [...r.hits, {target, sound, ms}].slice(-120)})))
          }
          setObs(prev => ({
            ...prev,
            clickSounds: {...prev.clickSounds, [target]: [...(prev.clickSounds[target] ?? []), sound].slice(-20)},
            soundCostumes: [...prev.soundCostumes, {target, sound, costume}].slice(-20),
          }))
        }
      } else if (msg.kind === 'BACKDROP_SWITCH') {
        const t = Number(msg.t)
        if (flagRun.current && Number.isFinite(t)) {
          flagRun.current.switches.push(t)
          const times = [...flagRun.current.switches]
          setObs(prev => updateLastCycle(prev, r => ({...r, switches: times.length,
            avgMs: times.length >= 2 ? (times[times.length - 1] - times[0]) / (times.length - 1) : null})))
        }
      } else if (msg.kind === 'FRAME') {
        const target = String(msg.target ?? '')
        const t = Number(msg.t)
        if (lesson.showFilm && target && Number.isFinite(t)) setObs(prev => updateLastFilm(prev, r => ({...r, frames: [...r.frames, t].slice(-400)})))
        if (flagRun.current && target && Number.isFinite(t)) {
          const prev = flagRun.current.frames[target]
          flagRun.current.frames[target] = prev
            ? {count: prev.count + 1, first: prev.first, last: t, end: String(msg.costume ?? '')}
            : {count: 1, first: t, last: t, end: String(msg.costume ?? '')}
          setLastFrames({frames: summarizeFrames(flagRun.current.frames), finished: false})
        }
      } else if (msg.kind === 'STOP_BLOCK') {
        const option = String(msg.option ?? '')
        const t = Number(msg.t)
        if (lesson.showFilm && option && Number.isFinite(t)) {
          filmStopPending.current = true
          setObs(prev => updateLastFilm(prev, r => (r.stop ? r : {...r, stop: {option, t}})))
          setStatus(option === 'all'
            ? 'Scratch VM：小橘猫执行了“停止 全部脚本”，整个作品的脚本都停下了。'
            : 'Scratch VM：小橘猫执行了“停止 这个脚本”，只结束了它收到“结尾”的那一条脚本。')
        }
      } else if (msg.kind === 'BROADCAST') {
        const message = String(msg.message ?? '')
        const bt = Number(msg.t)
        if (lesson.showFilm && message && Number.isFinite(bt)) setObs(prev => updateLastFilm(prev, r => ({...r, broadcasts: [...r.broadcasts, {message, t: bt}].slice(-10)})))
        if (message && !broadcastRun.current) {
          const t = Number(msg.t)
          broadcastRun.current = {message, speakers: [], t0: Number.isFinite(t) ? t : null, saidAt: {}}
          setLastBroadcast({message, speakers: [], finished: false})
          setStatus(`Scratch VM：${msg.target === 'Stage' ? '舞台' : msg.target}广播了“${message}”，所有在听“${message}”的脚本一起开始。`)
        }
      } else if (msg.kind === 'TURN') {
        const target = String(msg.target ?? '')
        const degrees = Number(msg.degrees)
        // Green-flag runs: total degrees each sprite turned (flight-path lessons).
        if (target && Number.isFinite(degrees) && flagRun.current) flagRun.current.turns[target] = (flagRun.current.turns[target] ?? 0) + degrees
        if (target && Number.isFinite(degrees) && clickTurn.current.has(target)) {
          const total = (clickTurn.current.get(target) ?? 0) + degrees
          clickTurn.current.set(target, total)
          setLastTurns(prev => ({...prev, [target]: {total, finished: false}}))
        }
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
      } else if (msg.kind === 'KEY_PRESSED') {
        const key = String(msg.key ?? '')
        const x = Number(msg.x)
        if (key && Number.isFinite(x)) setObs(prev => ({...prev, keyPresses: [...prev.keyPresses, {key, x}].slice(-40)}))
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
        flagRun.current = {stagePlays: 0, speakers: [], overlaps: 0, frames: {}, switches: [], stopRequested: false, beatT0: null, turns: {}}
        setObs(prev => ({...prev, cycleRuns: [...prev.cycleRuns, {switches: 0, avgMs: null, speech: [], finished: false, stopped: false}].slice(-20),
          beatRuns: [...prev.beatRuns, {hits: [], finished: false}].slice(-20),
          filmRuns: lesson.showFilm ? [...prev.filmRuns, {broadcasts: [], frames: [], sounds: [], lines: [], stop: null, ended: false}].slice(-10) : prev.filmRuns}))
        filmStopPending.current = false
        setLastSpeech(null)
        setLastFrames(null)
        setLastRunSounds({stagePlays: 0, finished: false})
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
  }, [lesson.id, lesson.exportName, lesson.showFilm, loadArchive, loadSample, post])

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
    if (selectedProgram?.kind === 'stage-move') { post({kind: 'TRY_MOVE', id: id.current, target: 'Stage', x: selectedProgram.x, y: selectedProgram.y}); return }
    if (selectedProgram?.kind === 'stage-costume') { post({kind: 'TRY_COSTUME', id: id.current, target: 'Stage', costume: selectedProgram.costume}); return }
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
  // Draw the VM direction like Scratch does: "all around" rotates the costume
  // around its rotation centre, "left-right" only mirrors it when facing left.
  function spriteTransform(sprite: SpriteState, asset: CostumeAsset): CSSProperties | undefined {
    const direction = Number(sprite.direction)
    if (!Number.isFinite(direction) || direction === 90) return undefined
    const origin = `${asset.cx / asset.w * 100}% ${asset.cy / asset.h * 100}%`
    if (sprite.rotationStyle === 'left-right') return direction < 0 ? {transform: 'scaleX(-1)', transformOrigin: origin} : undefined
    if (sprite.rotationStyle === "don't rotate") return undefined
    return {transform: `rotate(${direction - 90}deg)`, transformOrigin: origin}
  }

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
                    <img src={asset.uri} alt={sprite.name} className="pointer-events-none block w-full select-none" draggable={false}
                      style={spriteTransform(sprite, asset)}/>
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
                disabled={!loaded || busy || (selectedProgram?.kind === 'stage-move' || selectedProgram?.kind === 'stage-costume' ? false : !Object.keys(pendingForSelected).length)}
                className="rounded-full bg-indigo-700 px-6 py-3 font-bold text-white disabled:opacity-40" onClick={apply}>应用积木到 VM</button>
              {!loaded && loadFailed && (
                <button data-testid="g2-retry-load" type="button" disabled={retrying}
                  className="rounded-full bg-rose-600 px-6 py-3 font-bold text-white disabled:opacity-40"
                  onClick={() => void retryLoad()}>{retrying ? '重新加载中…' : '↻ 重新加载'}</button>
              )}
              <button data-testid="g2-green-flag" type="button" disabled={!loaded || !allApplied || busy}
                className="rounded-full bg-emerald-600 px-7 py-3 font-bold text-white disabled:opacity-40"
                onClick={() => post({kind: 'RUN', id: id.current})}>▶ 绿旗运行</button>
              {lesson.showKeys && (
                <>
                  <button data-testid="g2-key-right" type="button" disabled={!loaded || busy}
                    className="rounded-full bg-teal-100 px-6 py-3 font-bold text-teal-900 disabled:opacity-40"
                    onClick={() => post({kind: 'KEY', id: id.current, key: 'right arrow'})}>→ 按右方向键</button>
                  <button data-testid="g2-key-left" type="button" disabled={!loaded || busy}
                    className="rounded-full bg-teal-100 px-6 py-3 font-bold text-teal-900 disabled:opacity-40"
                    onClick={() => post({kind: 'KEY', id: id.current, key: 'left arrow'})}>← 按左方向键</button>
                </>
              )}
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
                onClick={() => { if (flagRun.current) flagRun.current.stopRequested = true; post({kind: 'STOP', id: id.current}) }}>■ 停止</button>
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
            {(lesson.targets.some(t => t.sounds?.length)) && (
              <p data-testid="g2-sound-log" data-plays={lastRunSounds?.stagePlays ?? ''} data-finished={lastRunSounds?.finished ? 'true' : 'false'} className="mt-2 text-sm">
                {!stageHasSounds ? '' : lastRunSounds === null
                  ? '还没有点绿旗：舞台声音播放次数会显示在这里。'
                  : `${lastRunSounds.finished ? '上一次绿旗' : '本次绿旗进行中'}：Scratch VM 执行舞台“播放声音”${lastRunSounds.stagePlays} 次。`}
                {Object.entries(obs.clickSounds).map(([name, list]) => {
                  const withCostume = [...obs.soundCostumes].reverse().find(s => s.target === name)
                  const costumeNote = lesson.showSpeechOrder && withCostume?.costume ? `（开始播放时造型：${withCostume.costume}）` : ''
                  return ` ${name}刚才播放“${list[list.length - 1]}”${costumeNote}。`
                }).join('') || (stageHasSounds ? '' : '还没有播放声音：点角色后播放的声音会显示在这里。')}
              </p>
            )}
            {lesson.showSpeechOrder && (
              <p data-testid="g2-speech-log" data-speakers={lastSpeech?.speakers.join(',') ?? ''} data-overlaps={lastSpeech?.overlaps ?? ''}
                data-finished={lastSpeech?.finished ? 'true' : 'false'} className="mt-2 text-sm">
                {lastSpeech === null
                  ? '还没有点绿旗：谁先说、谁后说，有没有抢话，会显示在这里。'
                  : `${lastSpeech.finished ? '上一次绿旗' : '本次绿旗进行中'}：说话顺序 ${lastSpeech.speakers.join(' → ') || '还没人说话'}；${lastSpeech.overlaps > 0 ? `Scratch VM 里有 ${lastSpeech.overlaps} 次一个角色还在说、另一个就开口了（抢话）` : '没有抢话'}。`}
              </p>
            )}
            {lesson.showCycle && (() => {
              const run = obs.cycleRuns[obs.cycleRuns.length - 1]
              return (
                <p data-testid="g2-cycle-log" data-switches={run?.switches ?? ''} data-avg-ms={run?.avgMs === null || !run ? '' : Math.round(run.avgMs)}
                  data-finished={run?.finished ? 'true' : 'false'} data-stopped={run?.stopped ? 'true' : 'false'} className="mt-2 text-sm">
                  {!run
                    ? '还没有点绿旗：舞台换了几次背景、每段多少秒、谁在哪个背景下说话，会显示在这里。'
                    : `${run.finished ? (run.stopped ? '已按停止，Scratch VM 停下了全部脚本' : '这次运行已结束') : '运行中（永远循环不会自己停，看够了按停止）'}：舞台换背景 ${run.switches} 次${run.avgMs === null ? '' : `，平均每段 ${(run.avgMs / 1000).toFixed(1)} 秒`}。`}
                  {run?.speech.slice(-6).map((line, i) => (
                    <span key={i} data-testid="g2-cycle-speech" data-name={line.target} data-backdrop={line.backdrop} className="block">{`${line.target}在“${line.backdrop}”时开口。`}</span>
                  ))}
                </p>
              )
            })()}
            {lesson.showBeats && (() => {
              const run = obs.beatRuns[obs.beatRuns.length - 1]
              const b = beatSummary(run)
              const sec = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(2)} 秒`)
              return (
                <p data-testid="g2-beat-log" data-finished={run?.finished ? 'true' : 'false'} data-bars={run ? b.bars : ''} data-dongs={run ? b.dongs : ''}
                  data-bar-beats={b.beatsPerBar.join(',')} data-accents={b.accents.join(',')} data-inner-ms={b.innerMs === null ? '' : Math.round(b.innerMs)}
                  data-gap-ms={b.gapMs === null ? '' : Math.round(b.gapMs)} data-steady={b.steady ? 'true' : 'false'} className="mt-2 text-sm">
                  {!run
                    ? '还没有点绿旗：小鼓敲了几小节、每小节几拍、拍子之间隔多久，会显示在这里。'
                    : `${run.finished ? '上一次绿旗' : '本次绿旗进行中'}：Scratch VM 里小鼓“咚”响了 ${b.dongs} 下，重音 ${b.bars} 下（${b.bars} 小节）`
                      + `${b.beatsPerBar.length ? `，每小节拍数 ${b.beatsPerBar.join(' / ')}` : ''}；“咚”之间平均 ${sec(b.innerMs)}，重音之后平均 ${sec(b.gapMs)}`
                      + `${b.innerMs !== null && b.gapMs !== null ? (b.steady ? '（节奏稳）' : '（忽快忽慢）') : ''}。`}
                </p>
              )
            })()}
            {lesson.showFilm && (() => {
              const run = obs.filmRuns[obs.filmRuns.length - 1]
              const f = filmSummary(run)
              const sec = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} 秒`)
              const ending = !f.stop
                ? '结尾的停止积木还没有执行'
                : f.keptRunning
                  ? `结尾执行了“停止 ${f.stop === 'all' ? '全部脚本' : '这个脚本'}”，之后 VM 里还换了 ${f.tailFrames} 帧、响了 ${f.tailBeats} 下鼓（有循环没停）`
                  : f.stoppedAll
                    ? '结尾执行了“停止 全部脚本”，之后 VM 里没有任何脚本在运行'
                    : `结尾执行了“停止 ${f.stop === 'all' ? '全部脚本' : '这个脚本'}”，正在看之后还有没有循环在跑……`
              return (
                <p data-testid="g2-film-log" data-runs={obs.filmRuns.length} data-scenes={f.scenes.join(',')} data-total-ms={f.totalMs ?? ''}
                  data-frames={f.frames} data-beats={f.beats} data-on-beat={f.onBeat} data-synced={f.synced ? '1' : '0'}
                  data-stop={f.stop ?? ''} data-tail={f.tailFrames + f.tailBeats} data-ended={run?.ended ? '1' : '0'} className="mt-2 text-sm">
                  {!run
                    ? '还没有点绿旗：舞台的三条广播（开头/中段/结尾）各在第几秒发出、中段的舞步有没有踩在鼓点上、结尾后还有没有循环在跑，会显示在这里。'
                    : `上一次绿旗：Scratch VM 依次广播了 ${f.scenes.length ? f.scenes.map(m => `“${m}”`).join(' → ') : '（还没有）'}。`
                      + `开头那幕 ${sec(f.openMs)}，中段那幕 ${sec(f.middleMs)}，全片 ${sec(f.totalMs)}`
                      + `${f.totalMs === null ? '' : f.totalMs >= L12_FILM_MIN_MS && f.totalMs <= L12_FILM_MAX_MS ? '（在 30～60 秒内）' : '（不在 30～60 秒内）'}。`
                      + `中段小橘猫换了 ${f.frames} 帧、小鼓敲了 ${f.beats} 下，其中 ${f.onBeat} 帧和鼓声相差不超过 0.1 秒${f.synced ? '（音画同步）' : ''}。`
                      + `${ending}。`}
                </p>
              )
            })()}
            {lesson.showSync && (() => {
              const run = obs.broadcastRuns[obs.broadcastRuns.length - 1]
              const s = syncSummary(run)
              const sec = (ms: number) => `${(ms / 1000).toFixed(2)} 秒`
              return (
                <p data-testid="g2-sync-log" data-runs={obs.broadcastRuns.length} data-message={run?.message ?? ''} data-entered={s.entered.join(',')}
                  data-gap-ms={s.gapMs === null ? '' : s.gapMs} className="mt-2 text-sm">
                  {!run
                    ? '还没有点绿旗：舞台广播“开演”后，谁收到了、各自隔多久开口，会显示在这里。'
                    : `上一次绿旗：舞台广播了“${run.message}”。Scratch VM 里 `
                      + `${s.entered.length ? s.entered.map(name => `${name}在广播后 ${sec(run.saidAt?.[name] ?? 0)} 开口`).join('，') : '没有角色开口'}`
                      + `${s.missing.length ? `；${s.missing.join('、')}没有动（它没有在听“${run.message}”）` : ''}`
                      + `${s.gapMs === null ? '' : `；兔子比狐狸晚 ${sec(s.gapMs)}${s.together ? '（同时登场）' : ''}`}。`}
                </p>
              )
            })()}
            {lesson.showFlight && (() => {
              const f = flightSummary(obs.frameRuns[obs.frameRuns.length - 1])
              return (
                <p data-testid="g2-flight-log" data-runs={obs.frameRuns.length} data-turn={f ? f.turn : ''} data-laps={f ? f.laps : ''}
                  data-end-x={f?.end ? Math.round(f.end.x) : ''} data-end-y={f?.end ? Math.round(f.end.y) : ''} data-distance={f?.distance === null || !f ? '' : Math.round(f.distance)}
                  data-direction={f?.direction ?? ''} data-closed={f?.closed ? 'true' : 'false'} data-frames={f ? f.frames : ''} className="mt-2 text-sm">
                  {!f
                    ? '还没有点绿旗：蝴蝶一共转了多少度、飞了几圈、最后离起点多远，会显示在这里。'
                    : `上一次绿旗：Scratch VM 里蝴蝶一共右转 ${f.turn} 度${f.turn % 360 === 0 && f.turn > 0 ? `（正好 ${f.laps} 圈）` : `（${(f.turn / 360).toFixed(2)} 圈，不是整圈）`}，扇了 ${f.frames} 下翅膀；`
                      + `最后在 x ${f.end ? Math.round(f.end.x) : '—'} · y ${f.end ? Math.round(f.end.y) : '—'}，离起点 ${f.distance === null ? '—' : Math.round(f.distance)} 步，面向 ${f.direction ?? '—'} 度。${f.closed ? '回到起点了！' : '没有回到起点。'}`}
                </p>
              )
            })()}
            {lesson.showFrames && (
              <p data-testid="g2-frame-log" data-finished={lastFrames?.finished ? 'true' : 'false'} className="mt-2 text-sm">
                {lastFrames === null
                  ? '还没有点绿旗：每个角色换了几帧、平均每帧停多久，会显示在这里。'
                  : Object.keys(lastFrames.frames).length === 0
                    ? '本次绿旗还没有角色换造型。'
                    : Object.entries(lastFrames.frames).map(([name, f]) => (
                      <span key={name} data-testid="g2-frame-total" data-name={name} data-count={f.count} data-avg-ms={f.avgMs === null ? '' : Math.round(f.avgMs)} data-end={f.end}
                        data-finished={lastFrames.finished ? 'true' : 'false'} className="block">
                        {`${lastFrames.finished ? '上一次绿旗' : '进行中'}：${name}在 Scratch VM 里换了 ${f.count} 帧${f.avgMs === null ? '' : `，平均每帧 ${(f.avgMs / 1000).toFixed(2)} 秒（${f.avgMs < L07_TOO_FAST_MS ? '太快，看不清' : f.avgMs >= L07_VISIBLE_MS ? '看得清' : '有点快'}）`}，现在是“${f.end}”。`}
                      </span>
                    ))}
              </p>
            )}
            {lesson.targets.some(t => t.messages?.length) && (
              <p data-testid="g2-broadcast-log" data-message={lastBroadcast?.message ?? ''} data-speakers={lastBroadcast?.speakers.join(',') ?? ''}
                data-finished={lastBroadcast?.finished ? 'true' : 'false'} className="mt-2 text-sm">
                {lastBroadcast === null
                  ? '还没有广播：广播的消息和收到后说话的角色会显示在这里。'
                  : `${lastBroadcast.finished ? '上一次广播' : '广播进行中'}：Scratch VM 发出“${lastBroadcast.message}”；之后说话的角色：${lastBroadcast.speakers.join('、') || '没有'}。`}
              </p>
            )}
            {Object.keys(lastTurns).length > 0 && (
              <p data-testid="g2-turn-log" className="mt-2 text-sm">
                {Object.entries(lastTurns).map(([name, turn]) => (
                  <span key={name} data-testid="g2-turn-total" data-name={name} data-total={turn.total} data-finished={turn.finished ? 'true' : 'false'}>
                    {`${name}${turn.finished ? '上一次被点击' : '正在转'}：Scratch VM 一共右转 ${turn.total} 度。`}
                  </span>
                ))}
              </p>
            )}
            {lesson.showKeys && (() => {
              const last = obs.keyPresses[obs.keyPresses.length - 1]
              return (
                <p data-testid="g2-key-log" data-last-key={last?.key ?? ''} data-last-x={last ? Math.round(last.x) : ''} data-press-count={obs.keyPresses.length} className="mt-2 text-sm">
                  {last
                    ? `Scratch VM 刚才执行了“${last.key === 'right arrow' ? '右方向键' : '左方向键'}”按键脚本，小船现在 x ${Math.round(last.x)}。一共按了 ${obs.keyPresses.length} 次。`
                    : '还没有按键：先点绿旗，再按上面的方向键按钮，小船的 x 坐标会显示在这里。'}
                </p>
              )
            })()}
            {spriteTargets.map(t => {
              const s = spriteOf(t.name)
              return <p key={t.name} data-testid="g2-sprite-state" data-name={t.name} className="mt-2 text-sm">
                {t.label}：x {s ? Math.round(s.x) : '—'} · y {s ? Math.round(s.y) : '—'}{lesson.showDirection ? ` · 方向 ${s && Number.isFinite(Number(s.direction)) ? Math.round(Number(s.direction)) : '—'}` : ''}{t.costumes && t.costumes.length > 1 ? ` · 造型 ${s?.costume ?? '—'}` : ''}{obs.lastSaid[t.name] ? ` · 刚才说“${obs.lastSaid[t.name]}”` : ''}
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
