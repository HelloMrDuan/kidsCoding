'use client'

// 本课脚本编辑器：真实 Blockly 工作区（拖动、拼接、改参数、拖到垃圾桶删除），
// 积木对应 Scratch 的“当绿旗被点击”“将 timeLeft 设为”“重复执行直到〈timeLeft < 1〉”“重复执行……次”
// “等待……秒”“将 timeLeft 增加 -”（界面写“减少”）“广播 游戏结束”。
// 工作区是唯一事实来源：每次变化读出 Program 交给父组件；父组件换了脚本（切关、导入、恢复）才整体重载。
// 手机端的“点击添加 / 上移 / 下移 / 删除 / 数字输入”都是对同一个 Blockly 工作区的操作，不是另一套脚本。

import { useEffect, useImperativeHandle, useRef, type MutableRefObject, type Ref } from 'react'
import * as Blockly from 'blockly'
import { BLOCKLY_MEDIA_PATH } from '@/features/lessons/blockly/blockly-media'
import { L05_PARAMS } from '../params'
import { programFingerprint, type Block, type Program, type Script } from '../program'

export type BlockType = 'kcl5_flag' | 'kcl5_set' | 'kcl5_until' | 'kcl5_repeat' | 'kcl5_wait' | 'kcl5_dec' | 'kcl5_cast'

/** value 是该积木的数字（起始秒数 / 重复次数 / 等待秒数 / 减少量）；其余积木没有数字。 */
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
    { type: 'kcl5_flag', message0: '当绿旗被点击', nextStatement: ['chain'], colour: 45, tooltip: '点“运行作品”（绿旗）时，这一列脚本从这里开始运行' },
    {
      type: 'kcl5_set', message0: '将 timeLeft 设为 %1',
      args0: [{ type: 'field_number', name: 'VALUE', value: 10, min: L05_PARAMS.minStart, max: L05_PARAMS.maxStart, precision: 1 }],
      previousStatement: ['chain'], nextStatement: ['chain'], colour: 30,
      tooltip: '对应 Scratch 的“将变量设为”积木：倒计时从这个秒数开始',
    },
    {
      type: 'kcl5_until', message0: '重复执行直到〈timeLeft < 1〉',
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO', check: ['leaf'] }],
      // 连接类型只做最小的一件事：循环不能被放进任何循环里面（它的 previous 是 'chain'，循环体输入只接受 'leaf'）。
      // “设为 / 广播只能放在最外层”这类更细的结构限制，Blockly 的连接类型表达不了（连接类型不携带所在容器的上下文），
      // 由 program.ts 的 validateProgram 权威拒绝：运行按钮置灰并写明原因。这是有意的取舍，不是遗漏。
      previousStatement: ['chain'], nextStatement: ['chain'], colour: 35,
      tooltip: '对应 Scratch 的“重复执行直到……”控制积木：里面的积木一直重复，直到 timeLeft 小于 1 才停——结束由判断决定，不是由次数决定',
    },
    {
      type: 'kcl5_repeat', message0: '重复执行 %1 次',
      args0: [{ type: 'field_number', name: 'TIMES', value: 10, min: L05_PARAMS.minRepeatTimes, max: L05_PARAMS.maxRepeatTimes, precision: 1 }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO', check: ['leaf'] }],
      previousStatement: ['chain'], nextStatement: ['chain'], colour: 35,
      tooltip: '对应 Scratch 的“重复执行……次”控制积木：里面的积木重复固定的次数，不管 timeLeft 还剩多少',
    },
    {
      type: 'kcl5_wait', message0: '等待 %1 秒',
      args0: [{ type: 'field_number', name: 'SECS', value: 1, min: L05_PARAMS.minWait, max: L05_PARAMS.maxWait, precision: 1 }],
      previousStatement: ['chain', 'leaf'], nextStatement: ['chain', 'leaf'], colour: 35,
      tooltip: '对应 Scratch 的“等待……秒”积木：什么都不做，等这么久（课堂里时间走得快一些，秒数不变）',
    },
    {
      type: 'kcl5_dec', message0: '将 timeLeft 减少 %1',
      args0: [{ type: 'field_number', name: 'BY', value: 1, min: L05_PARAMS.minDecrease, max: L05_PARAMS.maxDecrease, precision: 1 }],
      previousStatement: ['chain', 'leaf'], nextStatement: ['chain', 'leaf'], colour: 30,
      tooltip: '对应 Scratch 的“将变量增加 -……”积木：把 timeLeft 减去这个数',
    },
    {
      type: 'kcl5_cast', message0: '广播 游戏结束', previousStatement: ['chain'], nextStatement: ['chain'], colour: 45,
      tooltip: '对应 Scratch 的“广播”积木：告诉大家游戏结束了。课程的水果脚本听到后就不会再加分——其实它一直在自己看 timeLeft',
    },
  ])
}

function readChain(first: Blockly.Block | null): Block[] {
  const out: Block[] = []
  for (let b = first; b; b = b.getNextBlock()) {
    if (b.type === 'kcl5_set') out.push({ t: 'setTime', value: Number(b.getFieldValue('VALUE')) })
    else if (b.type === 'kcl5_wait') out.push({ t: 'wait', secs: Number(b.getFieldValue('SECS')) })
    else if (b.type === 'kcl5_dec') out.push({ t: 'decrease', by: Number(b.getFieldValue('BY')) })
    else if (b.type === 'kcl5_cast') out.push({ t: 'broadcast' })
    else if (b.type === 'kcl5_until') out.push({ t: 'untilZero', body: readChain(b.getInputTargetBlock('DO')) as never })
    else if (b.type === 'kcl5_repeat') out.push({ t: 'repeat', times: Number(b.getFieldValue('TIMES')), body: readChain(b.getInputTargetBlock('DO')) as never })
  }
  return out
}

export function readProgram(ws: Blockly.Workspace): Program {
  const scripts: Script[] = []
  for (const top of ws.getTopBlocks(true)) {
    if (top.type === 'kcl5_flag') scripts.push({ hat: 'flag', body: readChain(top.getNextBlock()) })
    else scripts.push({ hat: null, body: readChain(top) })
  }
  return { scripts }
}

const TYPE_OF: Record<Block['t'], BlockType> = {
  setTime: 'kcl5_set', wait: 'kcl5_wait', decrease: 'kcl5_dec', broadcast: 'kcl5_cast', repeat: 'kcl5_repeat', untilZero: 'kcl5_until',
}

function buildChain(ws: Blockly.WorkspaceSvg, blocks: Block[], connect: (b: Blockly.BlockSvg) => void) {
  let prev: Blockly.BlockSvg | null = null
  for (const block of blocks) {
    const b = ws.newBlock(TYPE_OF[block.t])
    if (block.t === 'setTime') b.setFieldValue(String(block.value), 'VALUE')
    else if (block.t === 'wait') b.setFieldValue(String(block.secs), 'SECS')
    else if (block.t === 'decrease') b.setFieldValue(String(block.by), 'BY')
    else if (block.t === 'repeat') b.setFieldValue(String(block.times), 'TIMES')
    b.initSvg()
    b.render()
    if (prev) prev.nextConnection?.connect(b.previousConnection!)
    else connect(b)
    if (block.t === 'repeat' || block.t === 'untilZero') buildChain(ws, block.body as Block[], c => b.getInput('DO')?.connection?.connect(c.previousConnection!))
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
        const hat = ws.newBlock('kcl5_flag')
        hat.initSvg()
        hat.render()
        hat.moveBy(24, y)
        buildChain(ws, script.body, b => hat.nextConnection?.connect(b.previousConnection!))
      } else if (script.body.length > 0) {
        let first: Blockly.BlockSvg | null = null
        buildChain(ws, script.body, b => { first = b })
        ;(first as Blockly.BlockSvg | null)?.moveBy(24, y)
      }
      y += 150
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

/** 这块积木所在的循环（它在某个“重复直到 / 重复执行”的身体里）时返回那个循环，否则返回 null。 */
function enclosingContainer(b: Blockly.Block): Blockly.Block | null {
  let root: Blockly.Block = b
  while (siblingBefore(root)) root = siblingBefore(root)!
  const parent = root.getParent()
  return parent && (parent.type === 'kcl5_until' || parent.type === 'kcl5_repeat') ? parent : null
}

/** 只能放在最外层的积木（循环体里放不下它们）。 */
const CHAIN_ONLY: BlockType[] = ['kcl5_set', 'kcl5_until', 'kcl5_repeat', 'kcl5_cast']

const KNOWN: BlockType[] = ['kcl5_flag', 'kcl5_set', 'kcl5_until', 'kcl5_repeat', 'kcl5_wait', 'kcl5_dec', 'kcl5_cast']
const NUMBER_FIELD: Partial<Record<BlockType, string>> = { kcl5_set: 'VALUE', kcl5_repeat: 'TIMES', kcl5_wait: 'SECS', kcl5_dec: 'BY' }

function describe(b: Blockly.BlockSvg | null): Selection {
  if (!b) return null
  const type = b.type as BlockType
  if (!KNOWN.includes(type)) return null
  const before = siblingBefore(b)
  const field = NUMBER_FIELD[type]
  return {
    type,
    value: field ? Number(b.getFieldValue(field)) : null,
    canUp: type !== 'kcl5_flag' && !!before && before.type !== 'kcl5_flag',
    canDown: type !== 'kcl5_flag' && !!b.getNextBlock(),
  }
}

function moveUp(b: Blockly.BlockSvg) {
  const prev = siblingBefore(b)
  if (!prev || prev.type === 'kcl5_flag') return
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
          { kind: 'category', name: '事件', colour: '45', contents: [{ kind: 'block', type: 'kcl5_flag' }, { kind: 'block', type: 'kcl5_cast' }] },
          { kind: 'category', name: '控制', colour: '35', contents: [{ kind: 'block', type: 'kcl5_until' }, { kind: 'block', type: 'kcl5_repeat' }, { kind: 'block', type: 'kcl5_wait' }] },
          { kind: 'category', name: '变量', colour: '30', contents: [{ kind: 'block', type: 'kcl5_set' }, { kind: 'block', type: 'kcl5_dec' }] },
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

  return <div ref={node} data-testid="l5-blockly" style={{ width: '100%', height: '100%', minHeight: 260 }} />
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
      // 选中的是“重复直到”或“重复执行”（容器）：新块如果只能进循环体（等待 / 减少），就放进它里面（接在已有内容的末尾）；
      // 其余情况接在选中积木所在链条的末尾，或接到最后一个绿旗下面。
      const isContainer = sel && (sel.type === 'kcl5_until' || sel.type === 'kcl5_repeat')
      const fitsInside = isContainer && (type === 'kcl5_wait' || type === 'kcl5_dec')
      if (type === 'kcl5_flag') {
        const tops = ws.getTopBlocks(true)
        const last = tops[tops.length - 1]
        b.moveBy(24, last ? last.getRelativeToSurfaceXY().y + 130 : 24)
      } else if (sel && isContainer && fitsInside) {
        const input = sel.getInput('DO')?.connection
        const inner = sel.getInputTargetBlock('DO')
        if (inner) endOf(inner).nextConnection?.connect(b.previousConnection!)
        else input?.connect(b.previousConnection!)
      } else if (sel && sel.type !== 'kcl5_flag') {
        // 选中积木在循环身体里时，“只能放在最外层”的新积木接到循环后面（比如刚填好循环就加“广播”），
        // 而不是塞进循环里让校验拒绝；等待 / 减少这类叶子积木仍然接在选中积木后面（就在循环里）。
        const container = enclosingContainer(sel)
        const anchor = container && CHAIN_ONLY.includes(type) ? endOf(container) : endOf(sel)
        anchor.nextConnection?.connect(b.previousConnection!)
      } else {
        const hats = ws.getTopBlocks(true).filter(t => t.type === 'kcl5_flag')
        const target = sel?.type === 'kcl5_flag' ? sel : hats[hats.length - 1]
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
      const field = NUMBER_FIELD[sel.type as BlockType]
      if (field) sel.setFieldValue(String(value), field)
    },
    blockCount() {
      return wsRef.current?.getAllBlocks(false).length ?? 0
    },
  }), [wsRef, selectedId, notify])
}
