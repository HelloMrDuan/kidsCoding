// 把学生的礼物脚本编译成真正的 Scratch 3 工程（project.json 对象）。
// 生成的是 Scratch VM 原生识别的 opcode：event_whenflagclicked、control_repeat、motion_setx，
// 以及嵌在 motion_setx 的 X 输入里的 operator_random。执行完全交给真实 Scratch VM，本模块不模拟任何积木行为。

import { L03_PARAMS, type LevelParams } from './params'
import { runnableScripts, validateProgram, type Block, type Program } from './program'

/** 沙箱内置的原创 SVG 造型使用的资源 ID（沙箱只接受这两个）。 */
export const L03_ASSETS = {
  backdrop: '8d3e4f5a6b7c8d9e0f1a2b3c4d5e6f70',
  gift: '9e4f5a6b7c8d9e0f1a2b3c4d5e6f7081',
} as const

export const GIFT_NAME = '礼物'

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
      this.blocks[id] = this.make(id, block, prev ?? parentId)
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

  private make(id: string, block: Block, parent: string): SbBlock {
    if (block.t === 'randomx') {
      // “将 x 设为（在 from 到 to 之间取随机数）”= motion_setx，X 输入里嵌一个真实的 operator_random 报告块。
      const rid = this.id()
      this.blocks[rid] = {
        opcode: 'operator_random', next: null, parent: id,
        inputs: { FROM: [1, [4, String(block.from)]], TO: [1, [4, String(block.to)]] },
        fields: {}, shadow: false, topLevel: false,
      }
      return {
        opcode: 'motion_setx', next: null, parent,
        inputs: { X: [3, rid, [4, '0']] }, fields: {}, shadow: false, topLevel: false,
      }
    }
    return {
      opcode: 'control_repeat', next: null, parent,
      inputs: { TIMES: [1, [6, String(block.times)]] }, fields: {}, shadow: false, topLevel: false,
    }
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

export type CompiledProject = ReturnType<typeof compileProject>

/** 程序不合法时抛错：不合法的程序绝不送进 VM。`level` 只用来标注，工程内容不依赖它。 */
export function compileProject(program: Program, _level?: LevelParams) {
  const problems = validateProgram(program)
  if (problems.length > 0) throw new Error(`程序不合法：${problems.join('；')}`)

  const gift = new BlockBuilder('gf')
  runnableScripts(program).forEach((script, i) => {
    const hat = gift.hat(0, i * 220)
    gift.chain(hat, script.body, false)
  })

  return {
    targets: [
      {
        isStage: true, name: 'Stage', ...baseTarget(), blocks: {}, layerOrder: 0,
        costumes: [costume('果园', L03_ASSETS.backdrop, 240, 180)],
      },
      {
        isStage: false, name: GIFT_NAME, ...baseTarget(), blocks: gift.blocks, layerOrder: 1,
        visible: true, x: 0, y: L03_PARAMS.giftY, size: 100, direction: 90,
        draggable: false, rotationStyle: 'all around',
        costumes: [costume('礼物', L03_ASSETS.gift, 20, 20)],
      },
    ],
    monitors: [],
    extensions: [],
    meta: { semver: '3.0.0', vm: '0.2.0', agent: 'KidsCoding G2-U3-L03' },
  }
}
