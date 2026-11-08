// 把学生的篮子脚本和关卡参数编译成真正的 Scratch 3 工程（project.json 对象）。
// 这里生成的是 Scratch VM 原生识别的 opcode：event_whenflagclicked、motion_changexby、
// control_repeat 等。执行完全交给真实 Scratch VM，本模块不模拟任何积木行为。

import { fruitFallRepeats, L02_PARAMS, type LevelParams } from './params'
import { runnableScripts, validateProgram, type Block, type Program } from './program'

/** 沙箱内置的原创 SVG 造型使用的资源 ID（沙箱只接受这三个）。 */
export const L02_ASSETS = {
  backdrop: '5a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
  basket: '6b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
  fruit: '7c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
} as const

export const BASKET_NAME = '篮子'
export const FRUIT_NAME = '水果'

type SbBlock = {
  opcode: string
  next: string | null
  parent: string | null
  inputs: Record<string, unknown>
  fields: Record<string, unknown>
  shadow: boolean
  topLevel: boolean
  x?: number
  y?: number
}

class BlockBuilder {
  readonly blocks: Record<string, SbBlock> = {}
  private n = 0
  constructor(private readonly prefix: string) {}

  private id(): string {
    this.n += 1
    return `${this.prefix}${this.n}`
  }

  hat(x: number, y: number): string {
    const id = this.id()
    this.blocks[id] = {
      opcode: 'event_whenflagclicked', next: null, parent: null, inputs: {}, fields: {},
      shadow: false, topLevel: true, x, y,
    }
    return id
  }

  /** 把一串积木挂在 parentId 后面（或作为 parentId 这个 C 型积木的 SUBSTACK），返回第一块的 id。 */
  chain(parentId: string, blocks: Block[], asSubstack: boolean): string | null {
    let prev: string | null = null
    let first: string | null = null
    for (const block of blocks) {
      const id = this.id()
      this.blocks[id] = this.make(block, prev ?? parentId)
      if (block.t === 'repeat') {
        const inner = this.chain(id, block.body, true)
        if (inner) this.blocks[id].inputs.SUBSTACK = [2, inner]
      }
      if (prev) this.blocks[prev].next = id
      else first = id
      prev = id
    }
    if (first && asSubstack === false) this.blocks[parentId].next = first
    return first
  }

  private make(block: Block, parent: string): SbBlock {
    if (block.t === 'move') {
      return {
        opcode: 'motion_changexby', next: null, parent,
        inputs: { DX: [1, [4, String(block.dx)]] }, fields: {}, shadow: false, topLevel: false,
      }
    }
    return {
      opcode: 'control_repeat', next: null, parent,
      inputs: { TIMES: [1, [6, String(block.times)]] }, fields: {}, shadow: false, topLevel: false,
    }
  }

  raw(id: string, block: SbBlock): void {
    this.blocks[id] = block
  }
}

function costume(name: string, assetId: string, cx: number, cy: number) {
  return { assetId, name, md5ext: `${assetId}.svg`, dataFormat: 'svg', rotationCenterX: cx, rotationCenterY: cy }
}

function baseTarget() {
  return {
    variables: {}, lists: {}, broadcasts: {}, comments: {}, currentCostume: 0, sounds: [], volume: 100, tempo: 60,
  }
}

/** 水果的预置脚本：绿旗 → 移到 (fruitX, 150) → 重复 N 次：y 增加 -速度。孩子可查看，不可编辑。 */
export function fruitScriptBlocks(level: LevelParams): Record<string, SbBlock> {
  const b = new BlockBuilder('fr')
  const hat = b.hat(0, 0)
  b.raw('frGoto', {
    opcode: 'motion_gotoxy', next: null, parent: hat,
    inputs: { X: [1, [4, String(level.fruitX)]], Y: [1, [4, String(L02_PARAMS.fruitStartY)]] },
    fields: {}, shadow: false, topLevel: false,
  })
  b.blocks[hat].next = 'frGoto'
  b.raw('frRepeat', {
    opcode: 'control_repeat', next: null, parent: 'frGoto',
    inputs: { TIMES: [1, [6, String(fruitFallRepeats(level))]], SUBSTACK: [2, 'frFall'] },
    fields: {}, shadow: false, topLevel: false,
  })
  b.blocks.frGoto.next = 'frRepeat'
  b.raw('frFall', {
    opcode: 'motion_changeyby', next: null, parent: 'frRepeat',
    inputs: { DY: [1, [4, String(-level.fallSpeed)]] }, fields: {}, shadow: false, topLevel: false,
  })
  return b.blocks
}

export type CompiledProject = ReturnType<typeof compileProject>

/** 程序不合法时抛错：不合法的程序绝不送进 VM。 */
export function compileProject(program: Program, level: LevelParams) {
  const problems = validateProgram(program)
  if (problems.length > 0) throw new Error(`程序不合法：${problems.join('；')}`)

  const basket = new BlockBuilder('bk')
  runnableScripts(program).forEach((script, i) => {
    const hat = basket.hat(0, i * 220)
    basket.chain(hat, script.body, false)
  })

  return {
    targets: [
      {
        isStage: true, name: 'Stage', ...baseTarget(), blocks: {}, layerOrder: 0,
        costumes: [costume('果园', L02_ASSETS.backdrop, 240, 180)],
      },
      {
        isStage: false, name: BASKET_NAME, ...baseTarget(), blocks: basket.blocks, layerOrder: 1,
        visible: true, x: L02_PARAMS.basketStartX, y: L02_PARAMS.basketY, size: 100, direction: 90,
        draggable: false, rotationStyle: 'all around',
        costumes: [costume('篮子', L02_ASSETS.basket, 40, 20)],
      },
      {
        isStage: false, name: FRUIT_NAME, ...baseTarget(), blocks: fruitScriptBlocks(level), layerOrder: 2,
        visible: true, x: level.fruitX, y: L02_PARAMS.fruitStartY, size: 100, direction: 90,
        draggable: false, rotationStyle: 'all around',
        costumes: [costume('苹果', L02_ASSETS.fruit, 20, 20)],
      },
    ],
    monitors: [],
    extensions: [],
    meta: { semver: '3.0.0', vm: '0.2.0', agent: 'KidsCoding G2-U3-L02' },
  }
}
