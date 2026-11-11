'use client'

// 本课脚本编辑器：真实 Blockly 工作区（拖动、拼接、改参数、拖到垃圾桶删除），
// 积木对应 Scratch 的“当绿旗被点击”“重复执行”“如果〈碰到 篮子？〉那么”“将 得分 增加”“隐藏”。
// 工作区是唯一事实来源：每次变化读出 Program 交给父组件；父组件换了脚本（切关、导入、恢复）才整体重载。
// 手机端的“点击添加 / 上移 / 下移 / 删除 / 数字输入”都是对同一个 Blockly 工作区的操作，不是另一套脚本。

import { useEffect, useImperativeHandle, useRef, type MutableRefObject, type Ref } from 'react'
import * as Blockly from 'blockly'
import { BLOCKLY_MEDIA_PATH } from '@/features/lessons/blockly/blockly-media'
import { L04_PARAMS } from '../params'
import { programFingerprint, type Block, type Program, type Script } from '../program'

export type BlockType = 'kcl4_flag' | 'kcl4_repeat' | 'kcl4_iftouch' | 'kcl4_score' | 'kcl4_hide'

/** value 是重复次数或得分增量；其余积木没有数字。 */
export type Selection = { type: BlockType; value: number | null; canUp: boolean; canDown: boolean } | null

export type EditorHandle = {
  addBlock: (type: BlockType) => void
  moveSelected: (dir: 'up' | 'down') => void
  deleteSelected: () => void
  setSelectedNumber: (value: number) => void
  /** 脚本里当前的积木数（用于测试与提示）。 */
  blockCount: () => number
}

let installed = false
function installBlocks() {
  if (installed) return
  installed = true
  Blockly.defineBlocksWithJsonArray([
    { type: 'kcl4_flag', message0: '当绿旗被点击', nextStatement: ['repeat', 'stmt'], colour: 45, tooltip: '点“运行作品”（绿旗）时，这一列脚本从这里开始运行' },
    {
      type: 'kcl4_repeat', message0: '重复执行 %1 次',
      args0: [{ type: 'field_number', name: 'TIMES', value: 30, min: L04_PARAMS.minRepeatTimes, max: L04_PARAMS.maxRepeatTimes, precision: 1 }],
      // 连接类型只做最小的一件事：“重复”不能被放进任何积木里面（它的 previous 是 'repeat'，没有任何语句输入接受 'repeat'）。
      // “如果”里不能放“如果”这类更细的结构限制，Blockly 的连接类型表达不了（连接类型不携带所在容器的上下文），
      // 由 program.ts 的 validateProgram 权威拒绝：运行按钮置灰并写明原因。这是有意的取舍，不是遗漏。
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO', check: ['stmt'] }],
      previousStatement: ['repeat'], nextStatement: ['repeat', 'stmt'], colour: 35,
      tooltip: '对应 Scratch 的“重复执行……次”控制积木：里面的积木每转一圈就做一遍，球一直在落，所以要转够多圈才不会错过它',
    },
    {
      type: 'kcl4_iftouch', message0: '如果 碰到 篮子？ 那么',
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO', check: ['stmt'] }],
      previousStatement: ['stmt'], nextStatement: ['repeat', 'stmt'], colour: 35,
      tooltip: '对应 Scratch 的“如果……那么……”控制积木，条件是“碰到 篮子？”：只有碰到篮子的时候，里面的积木才会做',
    },
    {
      type: 'kcl4_score', message0: '将 得分 增加 %1',
      args0: [{ type: 'field_number', name: 'BY', value: 1, min: L04_PARAMS.minScoreStep, max: L04_PARAMS.maxScoreStep, precision: 1 }],
      previousStatement: ['stmt'], nextStatement: ['repeat', 'stmt'], colour: 330,
      tooltip: '对应 Scratch 的“将变量增加”积木：把舞台上的“得分”加上这个数',
    },
    {
      type: 'kcl4_hide', message0: '隐藏',
      previousStatement: ['stmt'], nextStatement: ['repeat', 'stmt'], colour: 270,
      tooltip: '对应 Scratch 的“隐藏”外观积木：让这个球消失。看不见的球碰不到任何东西',
    },
  ])
}

function readChain(first: Blockly.Block | null): Block[] {
  const out: Block[] = []
  for (let b = first; b; b = b.getNextBlock()) {
    if (b.type === 'kcl4_score') out.push({ t: 'score', by: Number(b.getFieldValue('BY')) })
    else if (b.type === 'kcl4_hide') out.push({ t: 'hide' })
    else if (b.type === 'kcl4_iftouch') out.push({ t: 'iftouch', body: readChain(b.getInputTargetBlock('DO')) as never })
    else if (b.type === 'kcl4_repeat') out.push({ t: 'repeat', times: Number(b.getFieldValue('TIMES')), body: readChain(b.getInputTargetBlock('DO')) as never })
  }
  return out
}

export function readProgram(ws: Blockly.Workspace): Program {
  const scripts: Script[] = []
  for (const top of ws.getTopBlocks(true)) {
    if (top.type === 'kcl4_flag') scripts.push({ hat: 'flag', body: readChain(top.getNextBlock()) })
    else scripts.push({ hat: null, body: readChain(top) })
  }
  return { scripts }
}

const TYPE_OF: Record<Block['t'], BlockType> = { score: 'kcl4_score', hide: 'kcl4_hide', iftouch: 'kcl4_iftouch', repeat: 'kcl4_repeat' }

function buildChain(ws: Blockly.WorkspaceSvg, blocks: Block[], connect: (b: Blockly.BlockSvg) => void) {
  let prev: Blockly.BlockSvg | null = null
  for (const block of blocks) {
    const b = ws.newBlock(TYPE_OF[block.t])
    if (block.t === 'score') b.setFieldValue(String(block.by), 'BY')
    else if (block.t === 'repeat') b.setFieldValue(String(block.times), 'TIMES')
    b.initSvg()
    b.render()
    if (prev) prev.nextConnection?.connect(b.previousConnection!)
    else connect(b)
    if (block.t === 'repeat' || block.t === 'iftouch') buildChain(ws, block.body as Block[], c => b.getInput('DO')?.connection?.connect(c.previousConnection!))
    prev = b
  }
}

function loadProgram(ws: Blockly.WorkspaceSvg, program: Program) {
  Blockly.Events.disable()
  try {
    ws.clear()
    let y = 24
    for (const script of program.scripts) {
      if (script.hat === 'flag') {
        const hat = ws.newBlock('kcl4_flag')
        hat.initSvg()
        hat.render()
        hat.moveBy(24, y)
        buildChain(ws, script.body, b => hat.nextConnection?.connect(b.previousConnection!))
      } else if (script.body.length > 0) {
        let first: Blockly.BlockSvg | null = null
        buildChain(ws, script.body, b => { first = b })
        ;(first as Blockly.BlockSvg | null)?.moveBy(24, y)
      }
      y += 130
    }
  } finally {
    Blockly.Events.enable()
  }
}

function endOf(block: Blockly.Block): Blockly.Block {
  let cur = block
  while (cur.getNextBlock()) cur = cur.getNextBlock()!
  return cur
}

/**
 * 选中的积木由编辑器自己按 ID 记录。Blockly 12 把“选中”绑定到键盘焦点，
 * 点击工具栏按钮后焦点离开工作区，Blockly.getSelected() 会变成 null，
 * 手机上的 ↑ ↓ ✕ 和数字框就全部失效。所以这里只在三种情况下改变选中：
 * 选中了另一块积木、点了工作区空白处、被选中的积木已经不存在。
 */
function blockById(ws: Blockly.WorkspaceSvg | null, id: string | null): Blockly.BlockSvg | null {
  if (!ws || !id) return null
  const b = ws.getBlockById(id)
  return b && b instanceof Blockly.BlockSvg && !b.disposed ? b : null
}

function siblingBefore(b: Blockly.Block): Blockly.Block | null {
  const prev = b.getPreviousBlock()
  return prev && b.previousConnection?.targetConnection === prev.nextConnection ? prev : null
}

const KNOWN: BlockType[] = ['kcl4_flag', 'kcl4_repeat', 'kcl4_iftouch', 'kcl4_score', 'kcl4_hide']

function describe(b: Blockly.BlockSvg | null): Selection {
  if (!b) return null
  const type = b.type as BlockType
  if (!KNOWN.includes(type)) return null
  const before = siblingBefore(b)
  return {
    type,
    value: type === 'kcl4_score' ? Number(b.getFieldValue('BY')) : type === 'kcl4_repeat' ? Number(b.getFieldValue('TIMES')) : null,
    canUp: type !== 'kcl4_flag' && !!before && before.type !== 'kcl4_flag',
    canDown: type !== 'kcl4_flag' && !!b.getNextBlock(),
  }
}

function moveUp(b: Blockly.BlockSvg) {
  const prev = siblingBefore(b)
  if (!prev || prev.type === 'kcl4_flag') return
  const parentConn = prev.previousConnection?.targetConnection ?? null
  const xy = prev.getRelativeToSurfaceXY()
  b.unplug(true)
  prev.unplug(false)
  if (parentConn) parentConn.connect(b.previousConnection!)
  else b.moveTo(xy)
  b.nextConnection?.connect(prev.previousConnection!)
}

export function ScriptEditor({ program, editable, onChange, onSelect, handleRef, resetKey }: {
  program: Program
  editable: boolean
  onChange: (program: Program) => void
  onSelect: (selection: Selection) => void
  handleRef?: Ref<EditorHandle>
  /** 切换关卡 / 导入 / 恢复初始时递增，强制整体重载脚本。 */
  resetKey: number
}) {
  const node = useRef<HTMLDivElement>(null)
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const emitted = useRef<string>('')
  const onChangeRef = useRef(onChange)
  const onSelectRef = useRef(onSelect)
  const programRef = useRef(program)
  const selectedId = useRef<string | null>(null)
  useEffect(() => { onChangeRef.current = onChange; onSelectRef.current = onSelect; programRef.current = program })

  useEffect(() => {
    installBlocks()
    if (!node.current) return
    const ws = Blockly.inject(node.current, {
      media: BLOCKLY_MEDIA_PATH,
      readOnly: !editable,
      toolbox: editable ? {
        kind: 'categoryToolbox',
        contents: [
          { kind: 'category', name: '事件', colour: '45', contents: [{ kind: 'block', type: 'kcl4_flag' }] },
          { kind: 'category', name: '控制', colour: '35', contents: [{ kind: 'block', type: 'kcl4_repeat' }, { kind: 'block', type: 'kcl4_iftouch' }] },
          { kind: 'category', name: '变量', colour: '330', contents: [{ kind: 'block', type: 'kcl4_score' }] },
          { kind: 'category', name: '外观', colour: '270', contents: [{ kind: 'block', type: 'kcl4_hide' }] },
        ],
      } : undefined,
      trashcan: editable,
      move: { drag: true, wheel: true, scrollbars: true },
      zoom: { controls: true, wheel: false, startScale: 0.9, minScale: 0.6, maxScale: 1.4 },
    })
    wsRef.current = ws
    loadProgram(ws, programRef.current)
    emitted.current = programFingerprint(readProgram(ws))

    selectedId.current = null
    onSelectRef.current(null)
    const listener = (event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.SELECTED) {
        const next = (event as Blockly.Events.Selected).newElementId
        if (next) selectedId.current = next // 取消选中（null）多半只是焦点离开，忽略
        onSelectRef.current(describe(blockById(ws, selectedId.current)))
        return
      }
      if (event.type === Blockly.Events.CLICK && (event as Blockly.Events.Click).targetType === 'workspace') {
        selectedId.current = null
        onSelectRef.current(null)
        return
      }
      if (event.isUiEvent) return
      const next = readProgram(ws)
      emitted.current = programFingerprint(next)
      onChangeRef.current(next)
      onSelectRef.current(describe(blockById(ws, selectedId.current)))
    }
    ws.addChangeListener(listener)
    const resizer = new ResizeObserver(() => Blockly.svgResize(ws))
    resizer.observe(node.current)
    requestAnimationFrame(() => Blockly.svgResize(ws))
    return () => {
      resizer.disconnect()
      ws.removeChangeListener(listener)
      ws.dispose()
      wsRef.current = null
    }
  }, [editable, resetKey])

  // 父组件换了脚本（例如导入）：只有和工作区当前内容不同才重载，自己发出的变化不会回灌。
  useEffect(() => {
    const ws = wsRef.current
    if (!ws) return
    if (programFingerprint(program) !== emitted.current) {
      loadProgram(ws, program)
      emitted.current = programFingerprint(readProgram(ws))
    }
  }, [program])

  useEffectHandle(handleRef, wsRef, selectedId, v => onSelectRef.current(v))

  return <div ref={node} data-testid="l4-blockly" style={{ width: '100%', height: '100%', minHeight: 260 }} />
}

function useEffectHandle(
  ref: Ref<EditorHandle> | undefined,
  wsRef: MutableRefObject<Blockly.WorkspaceSvg | null>,
  selectedId: MutableRefObject<string | null>,
  notify: (s: Selection) => void,
) {
  useImperativeHandle(ref, () => ({
    addBlock(type) {
      const ws = wsRef.current
      if (!ws) return
      const b = ws.newBlock(type)
      b.initSvg()
      b.render()
      const sel = blockById(ws, selectedId.current)
      // 选中的是“重复”或“如果”（容器）：新块放进它里面（接在已有内容的末尾）。
      // “重复”里不能再放“重复”，“如果”里不能再放“如果”或“重复”：这种放法不合法，改成接在容器后面。
      const isContainer = sel && (sel.type === 'kcl4_repeat' || sel.type === 'kcl4_iftouch')
      const fitsInside = isContainer && !(type === 'kcl4_repeat') && !(sel.type === 'kcl4_iftouch' && type === 'kcl4_iftouch')
      if (type === 'kcl4_flag') {
        const tops = ws.getTopBlocks(true)
        const last = tops[tops.length - 1]
        b.moveBy(24, last ? last.getRelativeToSurfaceXY().y + 110 : 24)
      } else if (sel && isContainer && fitsInside) {
        const input = sel.getInput('DO')?.connection
        const inner = sel.getInputTargetBlock('DO')
        if (inner) endOf(inner).nextConnection?.connect(b.previousConnection!)
        else input?.connect(b.previousConnection!)
      } else if (sel && sel.type !== 'kcl4_flag') {
        endOf(sel).nextConnection?.connect(b.previousConnection!)
      } else {
        const hats = ws.getTopBlocks(true).filter(t => t.type === 'kcl4_flag')
        const target = sel?.type === 'kcl4_flag' ? sel : hats[hats.length - 1]
        if (target) endOf(target).nextConnection?.connect(b.previousConnection!)
        else b.moveBy(24, 24 + ws.getTopBlocks(false).length * 70)
      }
      selectedId.current = b.id
      b.select()
      notify(describe(b))
    },
    moveSelected(dir) {
      const sel = blockById(wsRef.current, selectedId.current)
      if (!sel) return
      if (dir === 'up') moveUp(sel)
      else {
        const next = sel.getNextBlock()
        if (next && next instanceof Blockly.BlockSvg) moveUp(next)
      }
      notify(describe(sel))
    },
    deleteSelected() {
      const sel = blockById(wsRef.current, selectedId.current)
      if (!sel) return
      sel.dispose(true)
      selectedId.current = null
      notify(null)
    },
    setSelectedNumber(value) {
      const sel = blockById(wsRef.current, selectedId.current)
      if (!sel) return
      if (sel.type === 'kcl4_score') sel.setFieldValue(String(value), 'BY')
      else if (sel.type === 'kcl4_repeat') sel.setFieldValue(String(value), 'TIMES')
    },
    blockCount() {
      return wsRef.current?.getAllBlocks(false).length ?? 0
    },
  }), [wsRef, selectedId, notify])
}
