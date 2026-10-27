'use client'

import {useEffect, useRef, useState} from 'react'
import * as Blockly from 'blockly'
import type {G2BlockSpec, G2Slot, G2TargetSpec} from '@/content/curriculum/g2-u1-scratch-lessons'
import {readG2Program, type G2Program, type G2Values} from './scratch-g2-program'

let installed = false
function installG2Blocks() {
  if (installed) return
  installed = true
  Blockly.defineBlocksWithJsonArray([
    {type: 'kc2_flag', message0: '当绿旗被点击', nextStatement: null, colour: 45, tooltip: '点绿旗时从这里开始'},
    {type: 'kc2_clicked', message0: '当角色被点击', nextStatement: null, colour: 45, tooltip: '在舞台上点这个精灵时开始'},
    {type: 'kc2_goto', message0: '移到 x: %1 y: %2', args0: [
      {type: 'field_number', name: 'X', value: 0, min: -240, max: 240, precision: 1},
      {type: 'field_number', name: 'Y', value: 0, min: -180, max: 180, precision: 1},
    ], previousStatement: null, nextStatement: null, colour: 215, tooltip: '对应 Scratch 的“移到 x y”运动积木'},
    {type: 'kc2_say', message0: '说 %1 2 秒', args0: [
      {type: 'field_input', name: 'MESSAGE', text: '你好！'},
    ], previousStatement: null, nextStatement: null, colour: 265, tooltip: '对应 Scratch 的“说……2 秒”外观积木'},
  ])
}

function setSlots(block: Blockly.Block, spec: G2BlockSpec, values: G2Values) {
  for (const slot of spec.slots) {
    const value = values[slot.key]
    if (value !== undefined) block.setFieldValue(String(value), slot.field)
  }
}

export function ScratchG2Blocks({target, initialValues, onProgramChange}: {
  target: G2TargetSpec
  initialValues: G2Values
  onProgramChange: (program: G2Program | null) => void
}) {
  const node = useRef<HTMLDivElement>(null)
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null)
  const notify = useRef(onProgramChange)
  const [program, setProgram] = useState<G2Program | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  useEffect(() => { notify.current = onProgramChange }, [onProgramChange])

  useEffect(() => {
    installG2Blocks()
    if (!node.current) return
    const toolboxTypes = new Set<string>()
    for (const script of target.scripts) {
      toolboxTypes.add(script.hat)
      for (const b of script.body) toolboxTypes.add(b.type)
    }
    for (const extra of target.extraToolbox ?? []) toolboxTypes.add(extra)
    const ws = Blockly.inject(node.current, {
      toolbox: {kind: 'flyoutToolbox', contents: [...toolboxTypes].map(type => ({kind: 'block', type}))},
      trashcan: true,
      move: {drag: true, wheel: true, scrollbars: true},
      zoom: {controls: true, wheel: true, startScale: 0.95, minScale: 0.7, maxScale: 1.5},
    })
    workspace.current = ws
    let offsetY = 30
    for (const script of target.scripts) {
      const hat = ws.newBlock(script.hat)
      hat.initSvg(); hat.render()
      hat.moveBy(32, offsetY)
      let previous: Blockly.Block = hat
      for (const spec of script.body) {
        const b = ws.newBlock(spec.type)
        b.initSvg(); b.render()
        setSlots(b, spec, initialValues)
        previous.nextConnection?.connect(b.previousConnection!)
        previous = b
      }
      offsetY += 110
    }
    const changed = () => {
      const next = readG2Program(ws, target)
      setProgram(next)
      const snapshot: Record<string, string> = {}
      for (const block of ws.getAllBlocks(false)) {
        if (block.type === 'kc2_goto') { snapshot.X = String(block.getFieldValue('X')); snapshot.Y = String(block.getFieldValue('Y')) }
        if (block.type === 'kc2_say') snapshot.MESSAGE = String(block.getFieldValue('MESSAGE'))
      }
      setFields(snapshot)
      notify.current(next)
    }
    ws.addChangeListener(changed)
    const resizer = new ResizeObserver(() => Blockly.svgResize(ws))
    resizer.observe(node.current)
    changed()
    requestAnimationFrame(() => Blockly.svgResize(ws))
    return () => {
      resizer.disconnect()
      ws.removeChangeListener(changed)
      ws.dispose()
      workspace.current = null
    }
    // The editor is remounted (keyed) for every target / project revision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(field: G2Slot['field'], value: string) {
    const ws = workspace.current
    if (!ws) return
    const type = field === 'MESSAGE' ? 'kc2_say' : 'kc2_goto'
    const block = ws.getAllBlocks(false).find(b => b.type === type)
    if (!block) return
    block.setFieldValue(field === 'MESSAGE' ? value : String(Number(value)), field)
  }
  function attachStageGoto() {
    const ws = workspace.current
    if (!ws) return
    const flag = ws.getTopBlocks(false).find(b => b.type === 'kc2_flag')
    if (!flag || flag.getNextBlock()) return
    const b = ws.newBlock('kc2_goto')
    b.initSvg(); b.render()
    b.setFieldValue('100', 'X'); b.setFieldValue('50', 'Y')
    flag.nextConnection?.connect(b.previousConnection!)
  }

  const isStage = target.kind === 'stage'
  const hasGoto = fields.X !== undefined
  const hasSay = fields.MESSAGE !== undefined
  return <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm" data-testid="g2-block-editor">
    <h2 className="text-xl font-black">{isStage ? '舞台的积木区' : `${target.label}的积木脚本`}</h2>
    <p className="mt-2 text-sm leading-7 text-slate-600">{isStage
      ? '这是舞台（背景）自己的积木区。试试把“移到 x y”拼到绿旗下面，应用后看看舞台会不会动。'
      : `这些积木只属于${target.label}。拖动、连接或删除积木；只有每个帽子积木下面都拼好原来的积木时才能应用。快捷输入框会同步修改积木里的数字和文字。`}</p>
    <div ref={node} data-testid="g2-blockly-mount" className="mt-4 h-[300px] w-full overflow-hidden rounded-2xl border border-slate-200"/>
    {isStage && !hasGoto && (
      <button data-testid="g2-stage-attach-goto" type="button" onClick={attachStageGoto}
        className="mt-4 rounded-full bg-indigo-100 px-5 py-2 text-sm font-bold text-indigo-900">把“移到 x y”拼到舞台的绿旗下面</button>
    )}
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {hasGoto && (<>
        <label className="text-sm font-bold text-slate-700">x（-240～240）
          <input data-testid="g2-edit-x" type="number" min={-240} max={240} step={1} value={fields.X}
            onChange={e => update('X', e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2"/>
        </label>
        <label className="text-sm font-bold text-slate-700">y（-180～180）
          <input data-testid="g2-edit-y" type="number" min={-180} max={180} step={1} value={fields.Y}
            onChange={e => update('Y', e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2"/>
        </label>
      </>)}
      {hasSay && (
        <label className="text-sm font-bold text-slate-700">说的话（1～20 个字）
          <input data-testid="g2-edit-say" type="text" maxLength={20} value={fields.MESSAGE}
            onChange={e => update('MESSAGE', e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2"/>
        </label>
      )}
    </div>
    <p data-testid="g2-editor-validity" className="mt-3 text-sm font-semibold text-indigo-700">
      {program === null
        ? '积木没有拼好：请把积木按原来的样子连在帽子积木下面（数字和文字也要在允许范围内）。'
        : program.kind === 'stage-empty'
          ? '舞台的绿旗下面还是空的。'
          : program.kind === 'stage-move'
            ? '舞台的绿旗下面拼了“移到 x y”，可以应用到 Scratch VM 看看结果。'
            : '积木连接正确，可以应用到真实 Scratch VM。'}
    </p>
    <p className="mt-1 text-xs text-slate-500">这是课程专用的 Blockly 积木编辑器，应用时会改写官方 Scratch VM 里同一块积木的数字或文字；不是完整的 Scratch 编辑器。</p>
  </section>
}
