'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {gradeMultiCases,pythonPracticeLessons,isCustomArgsDifferentFromCases,type MultiPythonLessonId} from './python-multi-grade'
import {pythonHintLayers} from './python-error-hints'
import {downloadPythonFile} from '@/features/progress/python-download'

const PREFIX='kids-python-local-practice-v1:'
type RunMsg={kind:'FRAME_READY'|'LOADED'|'RESULT';id?:number;error?:string|null;cases?:unknown;output?:string;custom?:unknown}
// 自选参数上限表：缺省每项 40 字；表里列出的（课节，参数序号）用表内上限。
// 新增课节需要放宽时只加表项，不加 lessonId 串条件。
const CUSTOM_ARG_DEFAULT_MAX_LEN=40
const CUSTOM_ARG_MAX_LEN: Partial<Record<MultiPythonLessonId, readonly number[]>> = {
  'P3-U1-L03': [200],
  'P3-U2-L02': [1000],
}
// 自选参数多行输入表：表里列出的（课节，参数序号）渲染为 textarea，其余为 input。
const CUSTOM_ARG_TEXTAREA: Partial<Record<MultiPythonLessonId, readonly number[]>> = {
  'P3-U1-L03': [0],
  'P3-U2-L02': [0],
}

export function PythonMultiLab({lessonId}:{lessonId:MultiPythonLessonId}) {
  const lesson=pythonPracticeLessons[lessonId]
  const [source,setSource]=useState<string>(lesson.startCode)
  const [ready,setReady]=useState(false)
  const [busy,setBusy]=useState(false)
  const [hydrated,setHydrated]=useState(false)
  const [savedAt,setSavedAt]=useState<string|null>(null)
  const [saveFailed,setSaveFailed]=useState(false)
  const [passed,setPassed]=useState(false)
  const [passedCount,setPassedCount]=useState(0)
  const [observed,setObserved]=useState<string[]>([])
  const [status,setStatus]=useState('修改代码后，点击真实 Python 多用例评测。首次运行需要加载引擎。')
  const [hintLayers,setHintLayers]=useState<[string,string,string]|null>(null)
  const [customArgs,setCustomArgs]=useState<string[]>(()=>lesson.argLabels.map(()=>''))
  const [customBusy,setCustomBusy]=useState(false)
  const [customResult,setCustomResult]=useState<string|null>(null)
  const [practiceB,setPracticeB]=useState(false)
  const frame=useRef<HTMLIFrameElement>(null)
  const id=useRef(0)
  const active=useRef(false)
  const timeout=useRef<ReturnType<typeof setTimeout>|null>(null)
  const customId=useRef(0)
  const customActive=useRef(false)
  const customTimeout=useRef<ReturnType<typeof setTimeout>|null>(null)
  const customArgsRef=useRef<string[]>([])

  useEffect(()=>{
    const timer=window.setTimeout(()=>{
    try {
      const raw=window.localStorage.getItem(PREFIX+lessonId)
      if(raw) {
        const draft=JSON.parse(raw) as {source?:string;passed?:boolean;practiceB?:boolean;savedAt?:string}
        if(typeof draft.source==='string'&&draft.source.length<=5000)setSource(draft.source)
        setPassed(draft.passed===true)
        setPracticeB(draft.practiceB===true)
        if(typeof draft.savedAt==='string')setSavedAt(draft.savedAt)
      }
    } catch { /* Local storage may be blocked; the editor still works. */ }
    setHydrated(true)
    },0)
    return ()=>clearTimeout(timer)
  },[lessonId])

  useEffect(()=>{
    if(!hydrated)return
    try {
      const time=new Date().toISOString()
      window.localStorage.setItem(PREFIX+lessonId,JSON.stringify({source,passed,practiceB,savedAt:time}))
      window.setTimeout(()=>setSavedAt(time),0)
      window.setTimeout(()=>setSaveFailed(false),0)
    } catch { window.setTimeout(()=>setSaveFailed(true),0) /* Browser privacy or storage limits may block saving. */ }
  },[lessonId,source,passed,practiceB,hydrated])

  useEffect(()=>{
    const probe=window.setInterval(()=>frame.current?.contentWindow?.postMessage({kind:'PING'},'*'),300)
    const listener=(event:MessageEvent<RunMsg>)=>{
      if(event.source!==frame.current?.contentWindow || event.origin!=='null' || !event.data)return
      if(event.data.kind==='FRAME_READY') {clearInterval(probe);setReady(true);return}
      if(customActive.current&&event.data.id===customId.current){
        if(event.data.kind==='RESULT'){
          if(customTimeout.current)clearTimeout(customTimeout.current)
          customActive.current=false;setCustomBusy(false)
          if(event.data.error){setCustomResult('引擎错误：'+event.data.error);setHintLayers(pythonHintLayers(event.data.error).layers);return}
          const value=typeof event.data.custom==='string'?event.data.custom:''
          setCustomResult(value)
          if(value.startsWith('ERROR:')){setHintLayers(pythonHintLayers(value).layers)}
          else if(isCustomArgsDifferentFromCases(lessonId,customArgsRef.current)){setPracticeB(true)}
        }
        return
      }
      if(!active.current||event.data.id!==id.current)return
      if(event.data.kind==='LOADED') {
        setStatus(`Python 已加载，正在对${lesson.cases.length}组不同参数逐一执行……`)
        if(timeout.current)clearTimeout(timeout.current)
        timeout.current=setTimeout(()=>{frame.current?.contentWindow?.postMessage({kind:'STOP',id:id.current},'*');active.current=false;setBusy(false);setStatus('程序运行超时，已停止。请检查是否存在无限循环。')},8000)
      }else if(event.data.kind==='RESULT'){
        if(timeout.current)clearTimeout(timeout.current)
        active.current=false;setBusy(false)
        const results=Array.isArray(event.data.cases)?event.data.cases:[]
        setObserved(results.filter((x):x is string=>typeof x==='string'))
        const verdict=gradeMultiCases(lesson.cases,results,event.data.error??null)
        setPassed(verdict.passed);setPassedCount(verdict.passedCount)
        setStatus(event.data.error?'程序报错：'+event.data.error:verdict.feedback)
        const firstCaseError=results.find((x):x is string=>typeof x==='string'&&x.startsWith('ERROR:'))
        if(event.data.error)setHintLayers(pythonHintLayers(event.data.error).layers)
        else if(firstCaseError)setHintLayers(pythonHintLayers(firstCaseError).layers)
        else if(!verdict.passed)setHintLayers(pythonHintLayers(null,true).layers)
        else setHintLayers(null)
      }
    }
    window.addEventListener('message',listener)
    return ()=>{clearInterval(probe);window.removeEventListener('message',listener);if(timeout.current)clearTimeout(timeout.current);if(customTimeout.current)clearTimeout(customTimeout.current);frame.current?.contentWindow?.postMessage({kind:'STOP',id:id.current},'*');active.current=false;customActive.current=false}
  },[lesson.cases,lessonId])

  function run(){
    if(busy||!ready||!frame.current?.contentWindow)return
    if(source.length>5000){setStatus('代码超过5000字符，无法运行。');return}
    id.current+=1
    active.current=true
    setBusy(true);setPassed(false);setPassedCount(0);setObserved([])
    setStatus('正在加载 Pyodide 并开始真实多用例运行……')
    timeout.current=setTimeout(()=>{frame.current?.contentWindow?.postMessage({kind:'STOP',id:id.current},'*');active.current=false;setBusy(false);setStatus('引擎加载超时，请检查网络。')},35000)
    frame.current.contentWindow.postMessage({kind:'RUN_TESTS',id:id.current,source,tests:lesson.cases.map(t=>({function:t.function,args:[...t.args]}))},'*')
  }
  function runCustom(){
    if(customBusy||!ready||!frame.current?.contentWindow)return
    if(source.length>5000){setCustomResult('代码超过5000字符，无法运行。');return}
    if(customArgs.some((a,index)=>a.length>(CUSTOM_ARG_MAX_LEN[lessonId]?.[index]??CUSTOM_ARG_DEFAULT_MAX_LEN))){setCustomResult('自选参数每项最多40字，通讯录 JSON 文本最多200字，天气 CSV 文本最多1000字。');return}
    customId.current+=1
    customActive.current=true
    customArgsRef.current=[...customArgs]
    setCustomBusy(true);setCustomResult(null)
    customTimeout.current=setTimeout(()=>{frame.current?.contentWindow?.postMessage({kind:'STOP',id:customId.current},'*');customActive.current=false;setCustomBusy(false);setCustomResult('引擎加载超时，请检查网络。')},35000)
    frame.current.contentWindow.postMessage({kind:'RUN_CUSTOM',id:customId.current,source,function:lesson.cases[0].function,args:[...customArgs]},'*')
  }
  return <main className="min-h-screen bg-[var(--kc-canvas)] px-4 py-7">
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-4"><Link className="font-bold text-[var(--kc-action)]" href={`/learn/catalog/${lessonId}`}>← 返回课程介绍</Link><Link className="font-bold text-[var(--kc-action)]" data-testid="python-portfolio-link" href="/learn/portfolio">查看本机作品夹 →</Link></div>
      <header className="kc-panel p-7">
        <p className="text-sm font-extrabold text-[#6b82ad]">Python 多题评测实验室 · 浏览器本地试验</p>
        <h1 className="mt-3 text-3xl font-black">{lesson.title}</h1>
        <p className="mt-3 leading-8 text-[var(--kc-text)]">{lesson.prompt}</p>
        <p className="mt-2 text-xs leading-6 text-[var(--kc-warning)]">真正执行 Python 函数并测试{lesson.cases.length}组不同参数。结果保存在当前浏览器，不是可信的正式考核成绩，也不代表课程已发布。</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="kc-panel p-6">
          <label className="font-black" htmlFor="python-multi-source">1 · 编写函数</label>
          <textarea id="python-multi-source" data-testid="python-multi-source" value={source} disabled={busy} onChange={event=>{setSource(event.target.value);setPassed(false)}}
            spellCheck={false} className="mt-4 min-h-64 w-full rounded-[var(--kc-radius-pane)] bg-[#1b2538] p-5 kc-code-font text-sm leading-7 text-[#b2c8e1] disabled:opacity-50" />
          <div className="mt-4 flex flex-wrap gap-3">
            <button data-testid="python-multi-run" disabled={!ready||busy||customBusy} type="button" onClick={run} className="kc-action-surface disabled:opacity-50">
              {busy?'运行中…':`▶ 运行${lesson.cases.length}组测试`}
            </button>
            <button type="button" onClick={()=>{setSource(lesson.startCode);setPassed(false);setObserved([]);setStatus('已重置编辑区。')}} className="rounded-[var(--kc-radius-button)] border border-[#d5deed] bg-white px-4 py-2.5 font-bold text-[#27405e] hover:bg-[#f3f7ff]">恢复初始代码</button>
            <button type="button" data-testid="python-multi-download" onClick={()=>downloadPythonFile(source,lessonId)} className="rounded-[var(--kc-radius-button)] border border-[#d5deed] bg-white px-4 py-2.5 font-bold text-[#27405e] hover:bg-[#f3f7ff]">下载 .py 文件</button>
          </div>
          <p data-testid="python-local-save" className="mt-3 text-xs text-[var(--kc-text-muted)]">浏览器草稿：{savedAt?'已在本机保存':saveFailed?'本机保存失败：请检查浏览器存储空间，代码仍在编辑区':'尚未保存'} · 刷新页面后可继续编辑</p>
        </section>
        <section className="kc-panel p-6">
          <h2 className="text-xl font-black">2 · 真实 Python 测试反馈</h2>
          <p role="status" data-testid="python-multi-feedback" className="mt-4 rounded-[var(--kc-radius-pane)] border border-[var(--kc-line)] bg-[var(--kc-canvas)] p-4 text-sm leading-7">{status}</p>
          <p className="mt-4 font-black">通过：<span data-testid="python-multi-count">{passedCount}/{lesson.cases.length}</span></p>
          <div className="mt-4 space-y-3">
            {lesson.cases.map((item,index)=>(
              <div key={index} className="rounded-xl border border-[var(--kc-line)] p-3 text-sm">
                <p className="font-bold">第 {index+1} 组：{item.function}({item.args.map(a=>JSON.stringify(a)).join(', ')})</p>
                <p className="mt-1 text-[var(--kc-text)]">目标：{item.expected}</p>
                <p data-testid={`python-case-${index}`} className="mt-1 text-[var(--kc-text)]">实际：{observed[index]??'等待执行'}</p>
              </div>
            ))}
          </div>
          {passed?<p data-testid="python-multi-passed" className="mt-5 rounded-[var(--kc-radius-pane)] border border-[var(--kc-line)] bg-[var(--kc-canvas)] p-4 font-black text-[var(--kc-success)]">⭐ 全部{lesson.cases.length}组真实测试通过！这只是本机练习记录。</p>:null}
          {lessonId === 'P0-U1-L06' && passed && observed[0] ? (
            <section data-testid="python-card-preview" aria-label="由真实 Python 结果生成的名片预览" className="mt-5 rounded-[var(--kc-radius-panel)] border border-[var(--kc-line)] bg-white p-5">
              <h3 className="font-black text-[var(--kc-text)]">作品预览 · 真实 Python 返回的示例名片</h3>
              <pre className="mt-3 whitespace-pre-wrap text-base leading-8 text-[var(--kc-text)]">{observed[0]}</pre>
              <p className="mt-2 text-xs text-[var(--kc-text-muted)]">展示的是虚构测试数据，不会上传真实个人信息。</p>
            </section>
          ) : null}
          <p className="mt-4 text-sm text-[var(--kc-text-muted)]">提示：{lesson.hint}</p>
          {hintLayers?<div data-testid="python-error-hints" className="mt-4 space-y-2 rounded-[var(--kc-radius-pane)] border border-[var(--kc-line)] bg-[var(--kc-canvas)] p-4 text-sm leading-7">
            <p className="font-black text-[var(--kc-warning)]">三层错因提示（按顺序看）</p>
            {hintLayers.map((line,index)=><p key={index} className="text-[var(--kc-text)]">{line}</p>)}
          </div>:null}
        </section>
      </div>
      <section className="kc-panel p-6">
        <h2 className="text-xl font-black">3 · 练习 B：自选输入实验</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--kc-text)]">换一组固定用例里没有的参数，让同一个函数真实跑一次，观察输出怎么变。这个练习只练观察，不评分、不产生正式成绩。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {lesson.argLabels.map((label,index)=>(
            <label key={index} className="text-sm font-bold text-[var(--kc-text)]">{label}
              {CUSTOM_ARG_TEXTAREA[lessonId]?.includes(index)?(
                <textarea data-testid={`python-custom-arg-${index}`} value={customArgs[index]??''} disabled={customBusy} onChange={event=>{const next=[...customArgs];next[index]=event.target.value;setCustomArgs(next)}}
                  rows={4} className="ml-2 rounded-xl border border-[var(--kc-line)] px-3 py-2 font-normal" />
              ):(
                <input data-testid={`python-custom-arg-${index}`} value={customArgs[index]??''} disabled={customBusy} onChange={event=>{const next=[...customArgs];next[index]=event.target.value;setCustomArgs(next)}}
                  className="ml-2 rounded-xl border border-[var(--kc-line)] px-3 py-2 font-normal" />
              )}
            </label>
          ))}
          <button data-testid="python-custom-run" disabled={!ready||customBusy||busy} type="button" onClick={runCustom} className="kc-action-surface disabled:opacity-50">
            {customBusy?'运行中…':'▶ 用自选参数运行'}
          </button>
        </div>
        {customResult!==null?<p data-testid="python-custom-result" className="mt-4 rounded-[var(--kc-radius-pane)] border border-[var(--kc-line)] bg-[var(--kc-canvas)] p-4 text-sm leading-7 whitespace-pre-wrap">{customResult}</p>:null}
        {practiceB?<p data-testid="python-custom-done" className="mt-3 rounded-[var(--kc-radius-pane)] border border-[var(--kc-line)] bg-[var(--kc-canvas)] p-4 font-black text-[var(--kc-success)]">⭐ 练习 B 已完成：你用固定用例以外的一组参数真实跑通过一次。</p>:null}
      </section>
      <iframe ref={frame} src="/python-lab-sandbox.html" sandbox="allow-scripts" title="隔离的多题Python评测执行器" className="hidden" aria-hidden="true" tabIndex={-1}/>
    </div>
  </main>
}
