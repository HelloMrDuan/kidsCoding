'use client'

import {useEffect, useRef, useState} from 'react'
import * as Blockly from 'blockly'
import type {G2BlockSpec, G2Slot, G2TargetSpec} from '@/content/curriculum/g2-u1-scratch-lessons'
import {readG2Program, type G2Program, type G2Values} from './scratch-g2-program'

// Costume names of the target being edited. The editor is remounted for every
// target, so the dropdown always lists the selected target's own costumes.
let costumeOptions: string[] = ['造型1']
let installed = false
function installG2Blocks() {
  if (installed) return
  installed = true
  Blockly.Blocks.kc2_switch_costume = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField('换成')
        .appendField(new Blockly.FieldDropdown(() => costumeOptions.map(name => [name, name] as [string, string])), 'COSTUME')
        .appendField('造型')
      this.setPreviousStatement(true)
      this.setNextStatement(true)
      this.setColour(265)
      this.setTooltip('对应 Scratch 的“换成……造型”外观积木')
    },
  }
  Blockly.defineBlocksWithJsonArray([
    {type: 'kc2_repeat', message0: '重复执行 %1 次', args0: [
      {type: 'field_number', name: 'TIMES', value: 1, min: 1, max: 10, precision: 1},
    ], message1: '%1', args1: [{type: 'input_statement', name: 'DO'}],
    previousStatement: null, nextStatement: null, colour: 35, tooltip: '对应 Scratch 的“重复执行……次”控制积木'},
    {type: 'kc2_next_costume', message0: '下一个造型', previousStatement: null, nextStatement: null, colour: 265, tooltip: '对应 Scratch 的“下一个造型”外观积木'},
    {type: 'kc2_wait', message0: '等待 %1 秒', args0: [
      {type: 'field_number', name: 'DURATION', value: 0.5, min: 0.2, max: 1.0, precision: 0.1},
    ], previousStatement: null, nextStatement: null, colour: 35, tooltip: '对应 Scratch 的“等待……秒”控制积木'},
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

function buildSequence(ws: Blockly.WorkspaceSvg, specs: G2BlockSpec[], values: G2Values, attach: (b: Blockly.Block) => void) {
  let previous: Blockly.Block | null = null
  for (const spec of specs) {
    const b = ws.newBlock(spec.type)
    b.initSvg(); b.render()
    setSlots(b, spec, values)
    if (previous) previous.nextConnection?.connect(b.previousConnection!)
    else attach(b)
    if (spec.children) {
      const doInput = b.getInput('DO')
      buildSequence(ws, spec.children, values, child => doInput?.connection?.connect(child.previousConnection!))
    }
    previous = b
  }
}

const FIELD_TYPES: Record<string, string> = {X: 'kc2_goto', Y: 'kc2_goto', MESSAGE: 'kc2_say', COSTUME: 'kc2_switch_costume', TIMES: 'kc2_repeat', DURATION: 'kc2_wait'}

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
    costumeOptions = target.costumes?.length ? target.costumes : ['造型1']
    if (!node.current) return
    const toolboxTypes = new Set<string>()
    const collect = (specs: G2BlockSpec[]) => { for (const b of specs) { toolboxTypes.add(b.type); if (b.children) collect(b.children) } }
    for (const script of target.scripts) {
      toolboxTypes.add(script.hat)
      collect(script.body)
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
      buildSequence(ws, script.body, initialValues, b => hat.nextConnection?.connect(b.previousConnection!))
      offsetY += script.body.some(b => b.children) ? 170 : 110
    }
    const changed = () => {
      const next = readG2Program(ws, target)
      setProgram(next)
      const snapshot: Record<string, string> = {}
      for (const block of ws.getAllBlocks(false)) {
        for (const [field, type] of Object.entries(FIELD_TYPES)) {
          if (block.type === type && snapshot[field] === undefined) snapshot[field] = String(block.getFieldValue(field))
        }
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
    const block = ws.getAllBlocks(false).find(b => b.type === FIELD_TYPES[field])
    if (!block) return
    block.setFieldValue(field === 'MESSAGE' || field === 'COSTUME' ? value : String(Number(value)), field)
  }
  const extra = target.extraToolbox?.[0]
  function attachStageExtra() {
    const ws = workspace.current
    if (!ws || !extra) return
    const flag = ws.getTopBlocks(false).find(b => b.type === 'kc2_flag')
    if (!flag || flag.getNextBlock()) return
    const b = ws.newBlock(extra)
    b.initSvg(); b.render()
    if (extra === 'kc2_goto') { b.setFieldValue('100', 'X'); b.setFieldValue('50', 'Y') }
    if (extra === 'kc2_switch_costume') b.setFieldValue(costumeOptions[costumeOptions.length - 1], 'COSTUME')
    flag.nextConnection?.connect(b.previousConnection!)
  }

  const isStage = target.kind === 'stage'
  const hasGoto = fields.X !== undefined
  const hasSay = fields.MESSAGE !== undefined
  const extraLabel = extra === 'kc2_switch_costume' ? `换成（${costumeOptions[costumeOptions.length - 1]}）造型` : '移到 x y'
  return <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm" data-testid="g2-block-editor">
    <h2 className="text-xl font-black">{isStage ? '舞台的积木区' : `${target.label}的积木脚本`}</h2>
    <p className="mt-2 text-sm leading-7 text-slate-600">{isStage
      ? `这是舞台（背景）自己的积木区。试试把“${extraLabel}”拼到绿旗下面，应用后看看 Scratch VM 里发生了什么。`
      : `这些积木只属于${target.label}。拖动、连接或删除积木；只有每个帽子积木下面都拼好原来的积木时才能应用。快捷输入框会同步修改积木里的数字、文字和造型。`}</p>
    <div ref={node} data-testid="g2-blockly-mount" className="mt-4 h-[300px] w-full overflow-hidden rounded-2xl border border-slate-200"/>
    {isStage && extra && program?.kind === 'stage-empty' && (
      <button data-testid="g2-stage-attach-extra" type="button" onClick={attachStageExtra}
        className="mt-4 rounded-full bg-indigo-100 px-5 py-2 text-sm font-bold text-indigo-900">把“{extraLabel}”拼到舞台的绿旗下面</button>
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
      {fields.COSTUME !== undefined && (
        <label className="text-sm font-bold text-slate-700">造型
          <select data-testid="g2-edit-costume" value={fields.COSTUME} onChange={e => update('COSTUME', e.target.value)}
            className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2">
            {costumeOptions.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      )}
      {fields.TIMES !== undefined && (
        <label className="text-sm font-bold text-slate-700">重复次数（1～10）
          <input data-testid="g2-edit-times" type="number" min={1} max={10} step={1} value={fields.TIMES}
            onChange={e => update('TIMES', e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2"/>
        </label>
      )}
      {fields.DURATION !== undefined && (
        <label className="text-sm font-bold text-slate-700">等待秒数（0.2～1.0）
          <input data-testid="g2-edit-wait" type="number" min={0.2} max={1} step={0.1} value={fields.DURATION}
            onChange={e => update('DURATION', e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2"/>
        </label>
      )}
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
          : program.kind === 'stage-move' || program.kind === 'stage-costume'
            ? `舞台的绿旗下面拼了“${program.kind === 'stage-move' ? '移到 x y' : `换成（${program.costume}）造型`}”，可以应用到 Scratch VM 看看结果。`
            : '积木连接正确，可以应用到真实 Scratch VM。'}
    </p>
    <p className="mt-1 text-xs text-slate-500">这是课程专用的 Blockly 积木编辑器，应用时会改写官方 Scratch VM 里同一块积木的数字或文字；不是完整的 Scratch 编辑器。</p>
  </section>
}
