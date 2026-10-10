'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {ScratchMeteorBlocks,type MeteorProgram} from './scratch-meteor-blocks'

type Sprite = { id: string; name: string; x: number; y: number; visible: boolean; original: boolean }
type VMMessage = { kind: 'FRAME_READY' | 'PROJECT_LOADED' | 'STARTED' | 'STOPPED' | 'SNAPSHOT' | 'CONFIGURED' | 'PROJECT_EXPORTED' | 'ERROR'; id: number | null; available?: boolean; targets?: Sprite[]; error?: string; targetNames?: string[]; program?:MeteorProgram; archive?:ArrayBuffer }

export function ScratchVMTrial() {
  const frame = useRef<HTMLIFrameElement>(null)
  const id = useRef(0)
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  const [draft, setDraft] = useState<MeteorProgram|null>(null)
  const [applied, setApplied] = useState<MeteorProgram|null>(null)
  const [createdTotal, setCreatedTotal] = useState(0)
  const [exporting,setExporting] = useState(false)
  const [exportDetails,setExportDetails] = useState('尚未导出项目。')
  const seenClones = useRef<Set<string>>(new Set())
  const [status, setStatus] = useState('正在加载 Scratch VM，请稍候……')
  const [sprites, setSprites] = useState<Sprite[]>([])
  const [observedClones, setObservedClones] = useState(false)
  const [observedMovement, setObservedMovement] = useState(false)
  const [observedDeletion, setObservedDeletion] = useState(false)
  const knownCloneIds = useRef<Set<string>>(new Set())
  const vmRunning = useRef(false)
  const latestY = useRef<Map<string,number>>(new Map())

  useEffect(() => {
    let destroyed=false
    let fetching=false
    const start = async () => {
      if (fetching || destroyed) return
      fetching=true
      try {
        const response=await fetch('/scratch-samples/meteor-clones.sb3',{cache:'no-store'})
        if(!response.ok)throw new Error('没有找到示例.sb3项目')
        const archive=await response.arrayBuffer()
        if(destroyed)return
        id.current+=1
        frame.current?.contentWindow?.postMessage({kind:'LOAD',id:id.current,archive},'*',[archive])
      } catch(error) {
        if(!destroyed)setStatus('项目加载失败：'+String(error))
      }
    }
    const listener = (event: MessageEvent<VMMessage>) => {
      if(event.source!==frame.current?.contentWindow || event.origin!=='null' || !event.data)return
      const msg=event.data
      if(msg.kind==='FRAME_READY' && !loaded) {
        if(msg.available)void start()
        else setStatus('Scratch VM 下载失败，请检查 jsDelivr。')
        return
      }
      if(msg.id!==id.current)return
      if(msg.kind==='PROJECT_LOADED') {
        setLoaded(true)
        setApplied({spawnCount:10,fallStep:13})
        setStatus('真实 Scratch VM 已加载项目，点击绿旗开始运行。')
      } else if(msg.kind==='SNAPSHOT') {
        const current=msg.targets??[]
        setSprites(current)
        const clones=current.filter(t=>!t.original&&t.visible)
        const liveCloneIds = new Set(current.filter(t=>!t.original).map(t=>t.id))
        if (vmRunning.current && [...knownCloneIds.current].some(id=>!liveCloneIds.has(id))) {
          setObservedDeletion(true)
        }
        knownCloneIds.current=liveCloneIds
        if(vmRunning.current) {
          for (const target of current.filter(t=>!t.original)) seenClones.current.add(target.id)
          setCreatedTotal(seenClones.current.size)
        }
        if(clones.length)setObservedClones(true)
        for(const target of clones) {
          const key=target.id
          const prior=latestY.current.get(key)
          if(prior!==undefined&&target.y<prior-1)setObservedMovement(true)
          latestY.current.set(key,target.y)
        }
      } else if(msg.kind==='CONFIGURED') {
        setApplied(msg.program??null)
        setStatus('参数已写入真实 Scratch VM，点击绿旗验证变化。')
      } else if(msg.kind==='PROJECT_EXPORTED') {
        setExporting(false)
        const archive=msg.archive
        if (!(archive instanceof ArrayBuffer) || archive.byteLength<300 || archive.byteLength>5_000_000 ||
            new Uint8Array(archive)[0]!==0x50 || new Uint8Array(archive)[1]!==0x4b) {
          setStatus('Scratch VM 导出结果无效，没有下载文件。')
          return
        }
        const blob=new Blob([archive],{type:'application/x.scratch.sb3'})
        const url=URL.createObjectURL(blob)
        const anchor=document.createElement('a')
        anchor.href=url
        anchor.download='KidsCoding-流星分身雨.sb3'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(()=>URL.revokeObjectURL(url),5_000)
        setExportDetails('Scratch VM 已导出并在独立 VM 重新载入验证：'+msg.program?.spawnCount+'颗 / 每步'+msg.program?.fallStep)
        setStatus('作品已从真实 Scratch VM 导出为 .sb3，可以用兼容 Scratch 3 的编辑器打开。')
      } else if(msg.kind==='STARTED') {
        vmRunning.current=true
        setRunning(true)
        setStatus('Scratch VM 正在执行绿旗、创建分身、改变 y 坐标和删除分身。')
      } else if(msg.kind==='STOPPED') {
        vmRunning.current=false
        knownCloneIds.current.clear()
        setRunning(false)
        setStatus('已通过 Scratch VM stopAll 停止脚本。')
      } else if(msg.kind==='ERROR') {
        vmRunning.current=false
        knownCloneIds.current.clear()
        setRunning(false)
        setExporting(false)
        setStatus(msg.error??'Scratch VM 执行失败')
      }
    }
    window.addEventListener('message',listener)
    const timer=setInterval(()=>frame.current?.contentWindow?.postMessage({kind:'PING'},'*'),350)
    return ()=> {
      destroyed=true
      clearInterval(timer)
      window.removeEventListener('message',listener)
      frame.current?.contentWindow?.postMessage({kind:'STOP',id:id.current},'*')
    }
  }, [])

  const changeProgram = useCallback((value:MeteorProgram|null)=>setDraft(value),[])
  const clones=sprites.filter(t=>t.visible&&!t.original)
  const spritesInBounds=clones.filter(t=>Number.isFinite(t.x)&&Number.isFinite(t.y)).slice(0,100)
  return (
    <main className="min-h-screen bg-[linear-gradient(155deg,#eaf8ff,#f5f4ff_60%,#fff3dd)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link href="/learn/catalog/G3-U1-L02" className="font-bold text-indigo-800">← 返回 Scratch 课程介绍</Link>
        <header className="rounded-[2rem] bg-white p-7 shadow-sm">
          <p className="text-sm font-extrabold text-indigo-700">Scratch VM 实验室 · 官方运行引擎试用</p>
          <h1 className="mt-3 text-3xl font-black">流星分身雨</h1>
          <p className="mt-3 text-slate-600">拖动积木，改变生成数量和下落步长，写入真正的 Scratch VM 后观察流星分身运行。</p>
          <p className="mt-3 text-sm text-amber-700">目前仅提供受限积木编辑，不是完整 Scratch 编辑器；可将作品下载为 .sb3，但不上传云端、不保存正式成绩、不开放其他 Scratch 课程。</p>
        </header>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm">
            <div className="relative mx-auto aspect-[4/3] max-w-[480px] overflow-hidden rounded-2xl border-4 border-indigo-200 bg-[#132548]" data-testid="scratch-live-stage">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 480 360" role="img" aria-label="星空背景">
                <rect width="480" height="360" fill="#132548"/>
                <circle cx="40" cy="40" r="3" fill="#fff"/><circle cx="145" cy="92" r="3" fill="#fff"/><circle cx="346" cy="47" r="3" fill="#fff"/>
                <path d="M0 330L100 270L230 340L340 268L480 340V360H0" fill="#4e6da6"/>
              </svg>
              {spritesInBounds.map((sprite)=>(
                <span key={sprite.id} className="absolute text-3xl" data-testid="scratch-live-clone"
                  style={{left:`${(sprite.x+240)/480*100}%`,top:`${(180-sprite.y)/360*100}%`,transform:'translate(-50%,-50%)'}}
                >☄️</span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button data-testid="scratch-apply-blocks" type="button" disabled={!loaded||running||exporting||!draft}
                className="rounded-full bg-indigo-700 px-6 py-3 font-bold text-white disabled:opacity-40"
                onClick={()=>{if(draft){setApplied(null);frame.current?.contentWindow?.postMessage({kind:'CONFIGURE',id:id.current,program:draft},'*')}}}>应用积木到 VM</button>
              <button data-testid="scratch-green-flag" type="button" disabled={!loaded||!applied||!draft||running||exporting||applied.spawnCount!==draft.spawnCount||applied.fallStep!==draft.fallStep}
                className="rounded-full bg-emerald-600 px-7 py-3 font-bold text-white disabled:opacity-40"
                onClick={()=>{vmRunning.current=false;knownCloneIds.current.clear();seenClones.current.clear();setCreatedTotal(0);setObservedClones(false);setObservedMovement(false);setObservedDeletion(false);latestY.current.clear();frame.current?.contentWindow?.postMessage({kind:'RUN',id:id.current},'*')}}>
                ▶ 绿旗运行
              </button>
              <button data-testid="scratch-export-sb3" type="button" disabled={!loaded||!applied||!draft||running||exporting||applied.spawnCount!==draft.spawnCount||applied.fallStep!==draft.fallStep}
                className="rounded-full bg-amber-100 px-6 py-3 font-bold text-amber-950 disabled:opacity-40"
                onClick={()=>{setExporting(true);setExportDetails('正在由真实 Scratch VM 打包，并重新载入检查……');frame.current?.contentWindow?.postMessage({kind:'EXPORT',id:id.current},'*')}}>
                {exporting?'导出中…':'↓ 保存为 .sb3'}
              </button>
              <button data-testid="scratch-stop" type="button" disabled={!loaded}
                className="rounded-full bg-rose-100 px-6 py-3 font-bold text-rose-800 disabled:opacity-40"
                onClick={()=>{vmRunning.current=false;knownCloneIds.current.clear();frame.current?.contentWindow?.postMessage({kind:'STOP',id:id.current},'*')}}>■ 停止</button>
            </div>
          </section>
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Scratch VM 实时观察</h2>
            <p role="status" data-testid="scratch-vm-status" className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm leading-7">{status}</p>
            <p data-testid="scratch-export-status" className="mt-5 text-sm text-indigo-700">{exportDetails}</p>
            <p className="mt-5 text-sm">已应用 VM 积木：<strong data-testid="scratch-applied-program">{applied?`${applied.spawnCount}颗 / 每步${applied.fallStep}`:'等待应用'}</strong></p>
            <p className="mt-2 text-sm">本轮 VM 实际创建分身总数：<strong data-testid="scratch-created-total">{createdTotal}</strong></p>
            <p className="mt-5 text-sm">正在运行：<strong>{running?'是':'否'}</strong></p>
            <p className="mt-2 text-sm">实际可见流星分身：<strong data-testid="scratch-live-clones">{clones.length}</strong></p>
            <p className="mt-2 text-sm">VM 已创建分身：<strong data-testid="scratch-clone-observed">{observedClones?'是':'否'}</strong></p>
            <p className="mt-2 text-sm">VM 已执行向下运动：<strong data-testid="scratch-movement-observed">{observedMovement?'是':'否'}</strong></p>
            <p className="mt-2 text-sm">VM 已自然删除分身：<strong data-testid="scratch-deletion-observed">{observedDeletion?'是':'否'}</strong></p>
            <p className="mt-5 text-xs leading-6 text-slate-500">流星的实时坐标来自 Scratch VM 对象状态，前台只按坐标绘制简化图标，尚未接入 Scratch WebGL 渲染器。项目未上传用户数据。</p>
          </section>
        </div>
        <ScratchMeteorBlocks onProgramChange={changeProgram}/>
        <iframe ref={frame} src="/scratch-vm-sandbox.html" sandbox="allow-scripts" title="Scratch VM 受限运行沙箱" className="hidden" aria-hidden="true" tabIndex={-1}/>
      </div>
    </main>
  )
}
