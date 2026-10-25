'use client'

import {useEffect, useRef, useState} from 'react'
import * as Blockly from 'blockly'

export type MeteorProgram = {spawnCount: number; fallStep: number; interval: number}

export function isValidMeteorInterval(value: number): boolean {
  return Number.isFinite(value) && value>=0.1 && value<=1.0 && Math.abs(value*10-Math.round(value*10))<1e-9
}

function installMeteorBlocks() {
  if (Blockly.Blocks['kc_meteor_start']) return
  Blockly.defineBlocksWithJsonArray([
    {type:'kc_meteor_start',message0:'当绿旗被点击',nextStatement:null,colour:118,tooltip:'流星雨从这里开始'},
    {type:'kc_meteor_count',message0:'生成 %1 颗流星',args0:[{type:'field_number',name:'COUNT',value:10,min:1,max:15,precision:1}],previousStatement:null,nextStatement:null,colour:35,tooltip:'改变真正 Scratch 重复积木的次数'},
    {type:'kc_meteor_fall',message0:'每一步下降 %1',args0:[{type:'field_number',name:'STEP',value:13,min:5,max:25,precision:1}],previousStatement:null,nextStatement:null,colour:210,tooltip:'改变真正 Scratch 移动积木的 y 速度'},
    {type:'kc_meteor_interval',message0:'每 %1 秒生成一颗',args0:[{type:'field_number',name:'INTERVAL',value:0.3,min:0.1,max:1.0,precision:0.1}],previousStatement:null,nextStatement:null,colour:290,tooltip:'改变真正 Scratch 等待积木的生成间隔'},
  ])
}

// This is deliberately a *restricted Blockly authoring adapter*, not the official
// Scratch Blocks editor. Only an attached flag -> count -> fall -> interval stack is executable.
export function readMeteorProgram(workspace: Blockly.Workspace): MeteorProgram | null {
  const top=workspace.getTopBlocks(false)
  if (top.length!==1 || top[0].type!=='kc_meteor_start') return null
  const count=top[0].getNextBlock()
  const fall=count?.getNextBlock()
  const interval=fall?.getNextBlock()
  if (!count || count.type!=='kc_meteor_count' || !fall || fall.type!=='kc_meteor_fall' ||
      !interval || interval.type!=='kc_meteor_interval' || interval.getNextBlock()) return null
  const spawnCount=Number(count.getFieldValue('COUNT'))
  const fallStep=Number(fall.getFieldValue('STEP'))
  const intervalSeconds=Number(interval.getFieldValue('INTERVAL'))
  if (!Number.isInteger(spawnCount)||spawnCount<1||spawnCount>15||!Number.isInteger(fallStep)||fallStep<5||fallStep>25||
      !isValidMeteorInterval(intervalSeconds)) return null
  return {spawnCount,fallStep,interval:intervalSeconds}
}

export function ScratchMeteorBlocks({onProgramChange,initialProgram}:{onProgramChange:(program:MeteorProgram|null)=>void;initialProgram?:MeteorProgram}) {
  const node=useRef<HTMLDivElement>(null)
  const workspace=useRef<Blockly.WorkspaceSvg|null>(null)
  const notify=useRef(onProgramChange)
  const [program,setProgram]=useState<MeteorProgram|null>(null)
  useEffect(()=>{notify.current=onProgramChange},[onProgramChange])
  useEffect(()=>{
    installMeteorBlocks()
    if (!node.current) return
    const ws=Blockly.inject(node.current,{
      toolbox:{kind:'flyoutToolbox',contents:[
        {kind:'block',type:'kc_meteor_start'},
        {kind:'block',type:'kc_meteor_count'},
        {kind:'block',type:'kc_meteor_fall'},
        {kind:'block',type:'kc_meteor_interval'},
      ]},
      trashcan:true,
      move:{drag:true,wheel:true,scrollbars:true},
      zoom:{controls:true,wheel:true,startScale:0.95,minScale:0.7,maxScale:1.5},
    })
    workspace.current=ws
    const start=ws.newBlock('kc_meteor_start')
    const count=ws.newBlock('kc_meteor_count')
    const fall=ws.newBlock('kc_meteor_fall')
    const intervalBlock=ws.newBlock('kc_meteor_interval')
    for (const b of [start,count,fall,intervalBlock]) {b.initSvg();b.render()}
    if(initialProgram){count.setFieldValue(String(initialProgram.spawnCount),'COUNT');fall.setFieldValue(String(initialProgram.fallStep),'STEP');intervalBlock.setFieldValue(String(initialProgram.interval),'INTERVAL')}
    start.nextConnection?.connect(count.previousConnection!)
    count.nextConnection?.connect(fall.previousConnection!)
    fall.nextConnection?.connect(intervalBlock.previousConnection!)
    start.moveBy(32,36)
    const changed=()=>{
      const next=readMeteorProgram(ws)
      setProgram(next)
      notify.current(next)
    }
    ws.addChangeListener(changed)
    const resizer=new ResizeObserver(()=>Blockly.svgResize(ws))
    resizer.observe(node.current)
    changed()
    requestAnimationFrame(()=>Blockly.svgResize(ws))
    return ()=>{
      resizer.disconnect()
      ws.removeChangeListener(changed)
      ws.dispose()
      workspace.current=null
    }
  },[])

  function update(field:'COUNT'|'STEP'|'INTERVAL',value:number) {
    const block=workspace.current?.getAllBlocks(false).find(b=>b.type===(field==='COUNT'?'kc_meteor_count':field==='STEP'?'kc_meteor_fall':'kc_meteor_interval'))
    if (!block || !Number.isFinite(value)) return
    block.setFieldValue(String(value),field)
    const next=workspace.current?readMeteorProgram(workspace.current):null
    setProgram(next)
    notify.current(next)
  }

  return <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm" data-testid="scratch-block-editor">
    <h2 className="text-xl font-black">自己改一改流星程序</h2>
    <p className="mt-2 text-sm leading-7 text-slate-600">拖动、连接或删除下面的积木。只有“绿旗 → 生成数量 → 下落步长 → 生成间隔”完整连接时才能应用。快捷数字框会同步修改积木字段。</p>
    <div ref={node} data-testid="scratch-blockly-mount" className="mt-4 h-[340px] w-full overflow-hidden rounded-2xl border border-slate-200"/>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-bold text-slate-700">生成流星数（1～15）
        <input data-testid="scratch-edit-spawn-count" type="number" min={1} max={15} step={1}
          value={program?.spawnCount??10} onChange={e=>update('COUNT',Number(e.target.value))}
          className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2"/>
      </label>
      <label className="text-sm font-bold text-slate-700">每一步下降（5～25）
        <input data-testid="scratch-edit-fall-step" type="number" min={5} max={25} step={1}
          value={program?.fallStep??13} onChange={e=>update('STEP',Number(e.target.value))}
          className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2"/>
      </label>
      <label className="text-sm font-bold text-slate-700">生成间隔（0.1～1.0 秒）
        <input data-testid="scratch-edit-spawn-interval" type="number" min={0.1} max={1.0} step={0.1}
          value={program?.interval??0.3} onChange={e=>update('INTERVAL',Number(e.target.value))}
          className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2"/>
      </label>
    </div>
    <p data-testid="scratch-editor-validity" className="mt-3 text-sm font-semibold text-indigo-700">
      {program?'积木连接正确，可以应用到真实 Scratch VM。':'积木未正确连接，请把四块积木按顺序拼好。'}
    </p>
    <p className="mt-1 text-xs text-slate-500">这是课程专用 Blockly 积木编辑器，修改会写入官方 Scratch VM 中已有的数字积木；不是完整 Scratch 编辑器。只能改上面三个数字，不能新增角色、造型、音效、新积木或变量；“生成间隔随时间递减”需要变量与循环逻辑，完整 Scratch 编辑器才能做，本实验不支持。</p>
  </section>
}
