'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {ScratchMeteorBlocks} from './scratch-meteor-blocks'
import {allProgramsApplied, formatProgram, iconForCharacter, liveClonesByCharacter, type MeteorProgram} from './scratch-character-stats'
import {readScratchDraft,saveScratchDraft,removeScratchDraft,isScratchArchive,SCRATCH_DRAFT_LESSON_ID} from './scratch-local-draft'
import {encodeScratchDraft,parseScratchCloudResponse} from './scratch-cloud-draft'

type Sprite = { id: string; name: string; x: number; y: number; visible: boolean; original: boolean }
type CharacterInfo = { name: string; costume: string }
type VMMessage = { kind: 'FRAME_READY' | 'PROJECT_LOADED' | 'STARTED' | 'STOPPED' | 'SNAPSHOT' | 'CONFIGURED' | 'PROJECT_EXPORTED' | 'DRAFT_EXPORTED' | 'DRAFT_SAVE_FAILED' | 'ERROR'; id: number | null; available?: boolean; targets?: Sprite[]; error?: string; targetNames?: string[]; program?:MeteorProgram; programs?:Record<string,MeteorProgram>; characters?:CharacterInfo[]; character?:string; archive?:ArrayBuffer; imported?:boolean; source?:'sample'|'file'|'saved'|'cloud' }

export function ScratchVMTrial() {
  const frame = useRef<HTMLIFrameElement>(null)
  const id = useRef(0)
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  // Per-character state (UX-402): each character owns its own program.
  // drafts are the editor's unapplied values; programs are what the VM runs.
  const [characters, setCharacters] = useState<CharacterInfo[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, MeteorProgram | null>>({})
  const [programs, setPrograms] = useState<Record<string, MeteorProgram>>({})
  const [createdTotal, setCreatedTotal] = useState(0)
  const [exporting,setExporting] = useState(false)
  const [importing,setImporting] = useState(false)
  const [saving,setSaving] = useState(false)
  const [cloudBusy,setCloudBusy] = useState(false)
  const [cloudStatus,setCloudStatus] = useState('云端保存需要登录。仅在你手动点击时读写自己的账号，不保存正式成绩。')
  const [draftStatus,setDraftStatus] = useState('本机作品还未自动保存；修改积木后点击“应用”即可自动保存。')
  const [editorRevision,setEditorRevision] = useState(0)
  const [retrying,setRetrying] = useState(false)
  const [loadFailed,setLoadFailed] = useState(false)
  const retrySavedRef = useRef(false)
  const savedFailedRef = useRef(false)
  const vmAvailableRef = useRef(false)
  const [exportDetails,setExportDetails] = useState('尚未导出项目。')
  const seenClones = useRef<Set<string>>(new Set())
  const [status, setStatus] = useState('正在加载 Scratch VM，请稍候……')
  const [sprites, setSprites] = useState<Sprite[]>([])
  const [observedClones, setObservedClones] = useState(false)
  const [observedMovement, setObservedMovement] = useState(false)
  const [observedDeletion, setObservedDeletion] = useState(false)
  const knownCloneIds = useRef<Set<string>>(new Set())
  const knownCloneNames = useRef<Map<string,string>>(new Map())
  const vmRunning = useRef(false)
  const latestY = useRef<Map<string,number>>(new Map())
  const seenByName = useRef<Map<string, Set<string>>>(new Map())
  const movementByName = useRef<Set<string>>(new Set())
  const deletionByName = useRef<Set<string>>(new Set())
  const [characterStats, setCharacterStats] = useState<Record<string, {live: number; created: number; movement: boolean; deletion: boolean}>>({})

  const characterNames = characters.map(c => c.name)
  const selectedDraft = selectedCharacter ? drafts[selectedCharacter] ?? null : null
  const selectedApplied = selectedCharacter ? programs[selectedCharacter] ?? null : null
  const allApplied = allProgramsApplied(characterNames, programs, drafts)

  const resetRunObservations = useCallback(() => {
    vmRunning.current = false
    knownCloneIds.current.clear()
    knownCloneNames.current.clear()
    seenClones.current.clear()
    seenByName.current.clear()
    movementByName.current.clear()
    deletionByName.current.clear()
    latestY.current.clear()
    setCreatedTotal(0)
    setCharacterStats({})
    setObservedClones(false)
    setObservedMovement(false)
    setObservedDeletion(false)
  }, [])

  useEffect(() => {
    let destroyed=false
    let fetching=false
    let loadingSaved=false
    const loadOriginal = async () => {
      const response=await fetch('/scratch-samples/meteor-clones.sb3',{cache:'no-store'})
      if(!response.ok)throw new Error('没有找到示例 .sb3')
      const archive=await response.arrayBuffer()
      if(destroyed)return
      id.current+=1
      frame.current?.contentWindow?.postMessage({kind:'LOAD',id:id.current,archive,source:'sample'},'*',[archive])
    }
    const start = async () => {
      if(fetching||destroyed)return
      fetching=true
      try{
        let saved:ArrayBuffer|null=null
        try{saved=await readScratchDraft()}catch{ /* Browsers can deny local IndexedDB; sample still loads. */ }
        if(destroyed)return
        if(saved){
          loadingSaved=true
          setDraftStatus('正在从本机 IndexedDB 恢复以前保存的 Scratch .sb3……')
          id.current+=1
          frame.current?.contentWindow?.postMessage({kind:'LOAD',id:id.current,archive:saved,source:'saved'},'*',[saved])
        }else await loadOriginal()
      }catch(error){
        if(!destroyed){setLoadFailed(true);setStatus('项目加载失败：'+String(error))}
      }
    }
    const listener = (event: MessageEvent<VMMessage>) => {
      if(event.source!==frame.current?.contentWindow || event.origin!=='null' || !event.data)return
      const msg=event.data
      if(msg.kind==='FRAME_READY' && !loaded) {
        vmAvailableRef.current=!!msg.available
        if(msg.available)void start()
        else {setLoadFailed(true);setStatus('Scratch VM 下载失败，请检查 jsDelivr。')}
        return
      }
      if(msg.id!==id.current)return
      if(msg.kind==='PROJECT_LOADED') {
        setLoaded(true)
        setLoadFailed(false)
        setRetrying(false)
        retrySavedRef.current=false
        setImporting(false)
        loadingSaved=false
        const nextPrograms = msg.programs ?? {}
        const nextCharacters = msg.characters ?? []
        setPrograms(nextPrograms)
        setCharacters(nextCharacters)
        setDrafts(nextPrograms)
        setSelectedCharacter(nextCharacters[0]?.name ?? null)
        setEditorRevision(v=>v+1)
        resetRunObservations()
        setSprites([])
        setRunning(false)
        if(msg.source==='file'||msg.source==='cloud'){
          setSaving(true)
          frame.current?.contentWindow?.postMessage({kind:'SAVE_DRAFT',id:id.current},'*')
        }else if(msg.source==='saved'){
          setDraftStatus('已恢复本机保存的真实 Scratch .sb3 作品，可继续编辑。')
        }
        setStatus(msg.source==='cloud'?'已从当前登录账号恢复 Scratch 项目，可继续编辑。':msg.source==='saved'?'已从本机草稿恢复 Scratch 项目。':msg.imported?'Scratch VM 已重新导入作品，积木参数已恢复，可继续编辑运行。':'真实 Scratch VM 已加载项目，点击绿旗开始运行。')
      } else if(msg.kind==='SNAPSHOT') {
        const current=msg.targets??[]
        setSprites(current)
        const clones=current.filter(t=>!t.original&&t.visible)
        const liveCloneIds = new Set(current.filter(t=>!t.original).map(t=>t.id))
        const liveNames = new Map(current.filter(t=>!t.original).map(t=>[t.id, t.name] as const))
        if (vmRunning.current && [...knownCloneIds.current].some(id=>!liveCloneIds.has(id))) {
          setObservedDeletion(true)
          for (const id of knownCloneIds.current) {
            if (!liveCloneIds.has(id) && knownCloneNames.current.has(id)) deletionByName.current.add(knownCloneNames.current.get(id)!)
          }
        }
        knownCloneIds.current=liveCloneIds
        knownCloneNames.current=liveNames
        if(vmRunning.current) {
          for (const target of current.filter(t=>!t.original)) {
            seenClones.current.add(target.id)
            if (!seenByName.current.has(target.name)) seenByName.current.set(target.name, new Set())
            seenByName.current.get(target.name)!.add(target.id)
          }
          setCreatedTotal(seenClones.current.size)
        }
        if(clones.length)setObservedClones(true)
        for(const target of clones) {
          const key=target.id
          const prior=latestY.current.get(key)
          if(prior!==undefined&&target.y<prior-1){setObservedMovement(true);movementByName.current.add(target.name)}
          latestY.current.set(key,target.y)
        }
        const live = liveClonesByCharacter(current)
        const nextStats: Record<string, {live: number; created: number; movement: boolean; deletion: boolean}> = {}
        for (const name of [...seenByName.current.keys(), ...Object.keys(live)]) {
          nextStats[name] = {
            live: live[name] ?? 0,
            created: seenByName.current.get(name)?.size ?? 0,
            movement: movementByName.current.has(name),
            deletion: deletionByName.current.has(name),
          }
        }
        setCharacterStats(nextStats)
      } else if(msg.kind==='CONFIGURED') {
        if (msg.character && msg.program) {
          setPrograms(prev => ({...prev, [msg.character!]: msg.program!}))
        }
        setSaving(true)
        frame.current?.contentWindow?.postMessage({kind:'SAVE_DRAFT',id:id.current},'*')
        setStatus('参数已写入真实 Scratch VM，点击绿旗验证变化。')
      } else if(msg.kind==='DRAFT_EXPORTED') {
        if(!isScratchArchive(msg.archive)){
          setSaving(false)
          setDraftStatus('Scratch VM 返回的草稿无效，原本机草稿未改动。')
        }else{
          void saveScratchDraft(msg.archive).then(()=>{
            if(!destroyed)setDraftStatus('已在本机自动保存真实 Scratch .sb3，关闭或刷新页面后仍可恢复。')
          }).catch(error=>{
            if(!destroyed)setDraftStatus('本机自动保存失败：'+String(error))
          }).finally(()=>{if(!destroyed)setSaving(false)})
        }
      } else if(msg.kind==='DRAFT_SAVE_FAILED') {
        setSaving(false)
        setDraftStatus(msg.error??'Scratch VM 本机草稿打包失败。')
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
        const summary = msg.programs
          ? Object.entries(msg.programs).map(([name, p]) => `${name} ${formatProgram(p)}`).join('；')
          : '未知'
        setExportDetails('Scratch VM 已导出并在独立 VM 重新载入验证：'+summary)
        setStatus('作品已从真实 Scratch VM 导出为 .sb3，可以用兼容 Scratch 3 的编辑器打开。')
      } else if(msg.kind==='STARTED') {
        vmRunning.current=true
        setRunning(true)
        setStatus(msg.character
          ? `Scratch VM 正在单独执行${msg.character}的绿旗程序。`
          : 'Scratch VM 正在执行绿旗、创建分身、改变 y 坐标和删除分身。')
      } else if(msg.kind==='STOPPED') {
        vmRunning.current=false
        knownCloneIds.current.clear()
        knownCloneNames.current.clear()
        setRunning(false)
        setStatus('已通过 Scratch VM stopAll 停止脚本。')
      } else if(msg.kind==='ERROR') {
        vmRunning.current=false
        knownCloneIds.current.clear()
        knownCloneNames.current.clear()
        setRunning(false)
        setExporting(false)
        setImporting(false)
        setSaving(false)
        setLoadFailed(true)
        if(retrySavedRef.current){
          retrySavedRef.current=false
          savedFailedRef.current=true
          setDraftStatus('本机旧草稿不兼容，正在恢复课程示例；原文件未自动上传。')
          void (async()=>{
            try{
              const response=await fetch('/scratch-samples/meteor-clones.sb3',{cache:'no-store'})
              if(!response.ok)throw new Error('没有找到示例 .sb3')
              const archive=await response.arrayBuffer()
              id.current+=1
              frame.current?.contentWindow?.postMessage({kind:'LOAD',id:id.current,archive,source:'sample'},'*',[archive])
            }catch(error){setRetrying(false);setStatus('项目加载失败：'+String(error))}
          })()
        }else if(loadingSaved){
          loadingSaved=false
          setDraftStatus('本机旧草稿不兼容，正在恢复课程示例；原文件未自动上传。')
          void loadOriginal().catch(error=>setStatus('恢复课程示例失败：'+String(error)))
        }else{
          setRetrying(false)
          setStatus(msg.error??'Scratch VM 执行失败')
        }
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
  }, [resetRunObservations])

  const changeProgram = useCallback((value:MeteorProgram|null)=>{
    setDrafts(prev => selectedCharacter ? {...prev, [selectedCharacter]: value} : prev)
  },[selectedCharacter])
  async function saveToCloud() {
    if(cloudBusy||saving||running||exporting||importing||!allApplied)return
    setCloudBusy(true)
    setCloudStatus('正在把当前 Scratch .sb3 保存到登录账号……')
    try {
      const local=await readScratchDraft()
      const archiveBase64=local?encodeScratchDraft(local):null
      if(!archiveBase64)throw new Error('本机尚无有效项目，请先应用积木')
      const response=await fetch('/api/practice/scratch',{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({lessonId:SCRATCH_DRAFT_LESSON_ID,archiveBase64}),
      })
      if(response.status===401)throw new Error('请先登录账号，再保存云端作品')
      if(!response.ok)throw new Error('云端保存失败（HTTP '+response.status+'），本机作品仍然保留')
      setCloudStatus('作品已保存到当前登录账号；可在其他设备登录后点“恢复云端作品”。')
    }catch(error){setCloudStatus(String(error))}
    finally{setCloudBusy(false)}
  }
  async function restoreFromCloud() {
    if(cloudBusy||saving||running||exporting||importing||!frame.current?.contentWindow)return
    setCloudBusy(true)
    setCloudStatus('正在读取当前账号的 Scratch 云端作品……')
    try {
      const response=await fetch('/api/practice/scratch',{cache:'no-store'})
      if(response.status===401)throw new Error('请先登录账号再恢复云端作品')
      if(!response.ok)throw new Error('云端读取失败（HTTP '+response.status+'）')
      const payload:unknown=await response.json()
      if(!payload||typeof payload!=='object'||!('draft' in payload)||!payload.draft) {
        setCloudStatus('当前账号还没有保存 Scratch 云端作品。')
        return
      }
      const archive=parseScratchCloudResponse((payload as {draft:unknown}).draft)
      if(!archive)throw new Error('云端项目数据格式无效，原作品不变')
      setImporting(true)
      id.current+=1
      frame.current.contentWindow.postMessage({kind:'LOAD',id:id.current,archive,source:'cloud'},'*',[archive])
      setCloudStatus('已获取账号私有项目，正在交由真实 Scratch VM 校验……')
    }catch(error){setCloudStatus(String(error))}
    finally{setCloudBusy(false)}
  }
  async function retryLoad() {
    if(retrying||loaded||!frame.current?.contentWindow)return
    // A failed CDN script never appears by re-posting LOAD; only a fresh
    // iframe document re-fetches it, so that case reloads the page instead.
    // (Local drafts live in IndexedDB and survive the reload.)
    if(!vmAvailableRef.current){window.location.reload();return}
    setRetrying(true)
    setStatus('正在重试加载 Scratch VM，请稍候……')
    try{
      let saved:ArrayBuffer|null=null
      try{saved=await readScratchDraft()}catch{ /* Browsers can deny local IndexedDB; sample still loads. */ }
      if(saved && !savedFailedRef.current){
        retrySavedRef.current=true
        id.current+=1
        frame.current.contentWindow.postMessage({kind:'LOAD',id:id.current,archive:saved,source:'saved'},'*',[saved])
      }else{
        const response=await fetch('/scratch-samples/meteor-clones.sb3',{cache:'no-store'})
        if(!response.ok)throw new Error('没有找到示例 .sb3')
        const archive=await response.arrayBuffer()
        id.current+=1
        frame.current.contentWindow.postMessage({kind:'LOAD',id:id.current,archive,source:'sample'},'*',[archive])
      }
    }catch(error){
      setRetrying(false)
      setLoadFailed(true)
      setStatus('项目加载失败：'+String(error))
    }
  }
  async function resetOriginal() {
    if(running||exporting||importing||saving||cloudBusy)return
    setImporting(true)
    try {
      await removeScratchDraft()
      setDraftStatus('已清理这台设备保存的 Scratch 草稿。')
      const response=await fetch('/scratch-samples/meteor-clones.sb3',{cache:'no-store'})
      if(!response.ok)throw new Error('示例项目下载失败')
      const archive=await response.arrayBuffer()
      id.current+=1
      frame.current?.contentWindow?.postMessage({kind:'LOAD',id:id.current,archive,source:'sample'},'*',[archive])
    } catch(error) {
      setImporting(false)
      setStatus('恢复初始项目失败：'+String(error))
    }
  }
  async function importFile(file:File|null) {
    if(!file || importing || running || exporting || cloudBusy || !frame.current?.contentWindow) return
    if(!file.name.toLowerCase().endsWith('.sb3') || file.size<300 || file.size>5_000_000){
      setStatus('仅支持小于 5 MB 的本课程 .sb3 文件，原作品没有改变。')
      return
    }
    try{
      const archive=await file.arrayBuffer()
      const bytes=new Uint8Array(archive)
      if(bytes[0]!==0x50||bytes[1]!==0x4b){
        setStatus('导入失败：不是 Scratch ZIP 文件，原作品没有改变。')
        return
      }
      setImporting(true)
      setStatus('正在使用真实 Scratch VM 检查并载入作品……')
      id.current+=1
      frame.current.contentWindow.postMessage({kind:'LOAD',id:id.current,archive,imported:true,source:'file'},'*',[archive])
    }catch(error){
      setImporting(false)
      setStatus('读取文件失败：'+String(error))
    }
  }
  const clones=sprites.filter(t=>t.visible&&!t.original)
  const spritesInBounds=clones.filter(t=>Number.isFinite(t.x)&&Number.isFinite(t.y)).slice(0,100)
  return (
    <main className="min-h-screen bg-[linear-gradient(155deg,#eaf8ff,#f5f4ff_60%,#fff3dd)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link href="/learn/catalog/G3-U1-L02" className="font-bold text-indigo-800">← 返回 Scratch 课程介绍</Link>
        <header className="rounded-[2rem] bg-white p-7 shadow-sm">
          <p className="text-sm font-extrabold text-indigo-700">Scratch VM 实验室 · 官方运行引擎试用</p>
          <h1 className="mt-3 text-3xl font-black">流星分身雨</h1>
          <p className="mt-3 text-slate-600">点击角色切换编辑对象，拖动积木，改变生成数量、下落步长和生成间隔，写入真正的 Scratch VM 后观察各角色分身运行。</p>
          <p className="mt-3 text-sm text-amber-700">目前仅提供受限积木编辑，不是完整 Scratch 编辑器；可下载或重新导入 .sb3；应用积木后本机自动保存真正的 .sb3，云端保存需登录后主动点击，不保存正式成绩、不开放其他 Scratch 课程。</p>
          <ul data-testid="scratch-limitations" className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
            <li>每个角色只能改三个数字：生成数量（1～15 颗）、下落步长（5～25）、生成间隔（0.1～1.0 秒，步长 0.1 秒）。</li>
            <li>不能新增角色、造型、音效、新积木或变量；不能改分身下落到底部后删除的规则。</li>
            <li>“生成间隔随时间递减”需要变量与循环逻辑，完整 Scratch 编辑器才能做，本实验不支持；导出的 .sb3 可用兼容 Scratch 3 的编辑器继续改造。</li>
            <li>舞台只按 VM 坐标画简化图标，没有接 Scratch WebGL 渲染器；加载失败时点“重新加载”可重试，失败不会覆盖已保存的作品。</li>
          </ul>
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
                >{iconForCharacter(sprite.name)}</span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button data-testid="scratch-apply-blocks" type="button" disabled={!loaded||running||exporting||importing||saving||cloudBusy||!selectedDraft||!selectedCharacter}
                className="rounded-full bg-indigo-700 px-6 py-3 font-bold text-white disabled:opacity-40"
                onClick={()=>{if(selectedDraft&&selectedCharacter){frame.current?.contentWindow?.postMessage({kind:'CONFIGURE',id:id.current,character:selectedCharacter,program:selectedDraft},'*')}}}>应用积木到 VM</button>
              {!loaded&&loadFailed&&(
                <button data-testid="scratch-retry-load" type="button" disabled={retrying}
                  className="rounded-full bg-rose-600 px-6 py-3 font-bold text-white disabled:opacity-40"
                  onClick={()=>void retryLoad()}>{retrying?'重新加载中…':'↻ 重新加载'}</button>
              )}
              <button data-testid="scratch-green-flag" type="button" disabled={!loaded||!allApplied||running||exporting||importing||saving||cloudBusy}
                className="rounded-full bg-emerald-600 px-7 py-3 font-bold text-white disabled:opacity-40"
                onClick={()=>{resetRunObservations();frame.current?.contentWindow?.postMessage({kind:'RUN',id:id.current},'*')}}>
                ▶ 绿旗运行
              </button>
              <button data-testid="scratch-export-sb3" type="button" disabled={!loaded||!allApplied||running||exporting||importing||saving||cloudBusy}
                className="rounded-full bg-amber-100 px-6 py-3 font-bold text-amber-950 disabled:opacity-40"
                onClick={()=>{setExporting(true);setExportDetails('正在由真实 Scratch VM 打包，并重新载入检查……');frame.current?.contentWindow?.postMessage({kind:'EXPORT',id:id.current},'*')}}>
                {exporting?'导出中…':'↓ 保存为 .sb3'}
              </button>
              <label className="cursor-pointer rounded-full bg-sky-100 px-6 py-3 font-bold text-sky-900">
                ↑ 重新导入 .sb3
                <input data-testid="scratch-import-sb3" type="file" accept=".sb3" disabled={!loaded||running||exporting||importing||saving||cloudBusy}
                  className="sr-only" onChange={event=>{const file=event.target.files?.[0]??null;event.target.value='';void importFile(file)}}/>
              </label>
              <button data-testid="scratch-cloud-save" type="button"
                disabled={!loaded||!allApplied||saving||running||importing||exporting||cloudBusy}
                className="rounded-full bg-violet-700 px-6 py-3 font-bold text-white disabled:opacity-40"
                onClick={()=>void saveToCloud()}>保存到我的账号</button>
              <button data-testid="scratch-cloud-restore" type="button"
                disabled={!loaded||saving||running||importing||exporting||cloudBusy}
                className="rounded-full bg-violet-100 px-6 py-3 font-bold text-violet-900 disabled:opacity-40"
                onClick={()=>void restoreFromCloud()}>恢复云端作品</button>
              <button data-testid="scratch-reset-draft" type="button" disabled={!loaded||running||exporting||importing||saving||cloudBusy}
                className="rounded-full bg-slate-100 px-6 py-3 font-bold text-slate-800 disabled:opacity-40"
                onClick={()=>void resetOriginal()}>恢复课程初始程序</button>
              <button data-testid="scratch-stop" type="button" disabled={!loaded}
                className="rounded-full bg-rose-100 px-6 py-3 font-bold text-rose-800 disabled:opacity-40"
                onClick={()=>{vmRunning.current=false;knownCloneIds.current.clear();knownCloneNames.current.clear();frame.current?.contentWindow?.postMessage({kind:'STOP',id:id.current},'*')}}>■ 停止</button>
            </div>
          </section>
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Scratch VM 实时观察</h2>
            <p role="status" data-testid="scratch-vm-status" className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm leading-7">{status}</p>
            <p data-testid="scratch-export-status" className="mt-5 text-sm text-indigo-700">{exportDetails}</p>
            <p data-testid="scratch-local-save-status" className="mt-3 text-sm text-emerald-800">{draftStatus}</p>
            <p data-testid="scratch-cloud-status" className="mt-3 text-sm text-violet-800">{cloudStatus}</p>
            <p className="mt-5 text-sm">已应用 VM 积木：<strong data-testid="scratch-applied-program">{selectedApplied?formatProgram(selectedApplied):'等待应用'}</strong></p>
            <p className="mt-2 text-sm">本轮 VM 实际创建分身总数：<strong data-testid="scratch-created-total">{createdTotal}</strong></p>
            <p className="mt-5 text-sm">正在运行：<strong>{running?'是':'否'}</strong></p>
            <p className="mt-2 text-sm">实际可见分身：<strong data-testid="scratch-live-clones">{clones.length}</strong></p>
            <p className="mt-2 text-sm">VM 已创建分身：<strong data-testid="scratch-clone-observed">{observedClones?'是':'否'}</strong></p>
            <p className="mt-2 text-sm">VM 已执行向下运动：<strong data-testid="scratch-movement-observed">{observedMovement?'是':'否'}</strong></p>
            <p className="mt-2 text-sm">VM 已自然删除分身：<strong data-testid="scratch-deletion-observed">{observedDeletion?'是':'否'}</strong></p>
            {characters.map(c => {
              const stats = characterStats[c.name] ?? {live: 0, created: 0, movement: false, deletion: false}
              return (
                <p key={c.name} data-testid="scratch-character-stats" className="mt-2 text-sm">
                  {iconForCharacter(c.name)} {c.name}：可见分身 {stats.live} · 已创建 {stats.created} · 已运动 {stats.movement?'是':'否'} · 已删除 {stats.deletion?'是':'否'}
                </p>
              )
            })}
            <p className="mt-5 text-xs leading-6 text-slate-500">各角色的实时坐标来自 Scratch VM 对象状态，前台只按坐标绘制简化图标，尚未接入 Scratch WebGL 渲染器。项目未上传用户数据。</p>
          </section>
        </div>
        <section data-testid="scratch-character-list" className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">角色区</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">点击角色切换编辑对象；每个角色有自己独立的积木程序，改一个角色不会动另一个角色。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {characters.map(c => {
              const selected = c.name === selectedCharacter
              const program = programs[c.name]
              return (
                <article key={c.name} data-testid="scratch-character-card"
                  onClick={() => setSelectedCharacter(c.name)}
                  className={`cursor-pointer rounded-2xl border-2 p-4 ${selected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                  <p className="text-base font-black">
                    <span className="mr-2 text-2xl">{iconForCharacter(c.name)}</span>
                    {c.name}{selected && <span className="ml-2 rounded-full bg-indigo-700 px-2 py-0.5 text-xs font-bold text-white">当前角色</span>}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">造型：{c.costume}</p>
                  <p className="mt-1 text-sm text-slate-600">程序：{program ? formatProgram(program) : '未加载'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button data-testid="scratch-select-character" type="button"
                      className="rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-900"
                      onClick={(event) => {event.stopPropagation();setSelectedCharacter(c.name)}}>
                      {selected ? '正在编辑' : `编辑${c.name}`}
                    </button>
                    <button data-testid="scratch-run-character" type="button"
                      disabled={!loaded||!allApplied||running||exporting||importing||saving||cloudBusy}
                      className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-900 disabled:opacity-40"
                      onClick={(event) => {event.stopPropagation();resetRunObservations();frame.current?.contentWindow?.postMessage({kind:'RUN_CHARACTER',id:id.current,name:c.name},'*')}}>
                      ▶ 只运行{c.name}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
        {selectedCharacter && (
          <ScratchMeteorBlocks key={`${selectedCharacter}:${editorRevision}`} characterName={selectedCharacter} initialProgram={drafts[selectedCharacter] ?? undefined} onProgramChange={changeProgram}/>
        )}
        <iframe ref={frame} src="/scratch-vm-sandbox.html" sandbox="allow-scripts" title="Scratch VM 受限运行沙箱" className="hidden" aria-hidden="true" tabIndex={-1}/>
      </div>
    </main>
  )
}
