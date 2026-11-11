// 把学生的球脚本 + 课程预置的部分（篮子、两个球、下落脚本）编译成真正的 Scratch 3 工程（project.json 对象）。
// 生成的是 Scratch VM 原生识别的 opcode：event_whenflagclicked、control_repeat、control_if、
// sensing_touchingobject（带 sensing_touchingobjectmenu）、data_changevariableby、looks_hide、motion_changeyby。
// 执行完全交给真实 Scratch VM（带真实渲染器），本模块不模拟任何积木行为，也不预先算出碰撞。
//
// 孩子的脚本会被**复制**到两个球上（红球会落在篮子上，蓝球落在地上）：每个球各有一份独立的积木 ID，
// 共用 Stage 上的变量“得分”。这是一个明确的教学简化（见 TEACHING-PLAN 第七节）。

import { fallFrames, L04_PARAMS, type LevelParams } from './params'
import { runnableScripts, validateProgram, type Block, type Program } from './program'

/** 沙箱内置的原创 SVG 造型使用的资源 ID（沙箱只接受这四个）。 */
export const L04_ASSETS = {
  backdrop: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f801',
  basket: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f80912',
  hitBall: 'f6a7b8c9d0e1f2a3b4c5d6e7f8091a23',
  groundBall: 'a7b8c9d0e1f2a3b4c5d6e7f8091a2b34',
} as const

export const BASKET_NAME = '篮子'
export const HIT_BALL_NAME = '红球'
export const GROUND_BALL_NAME = '蓝球'
export const SCORE_VARIABLE_NAME = '得分'
export const SCORE_VARIABLE_ID = 'kcl4_score'

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

  private add(id: string, block: SbBlock): string {
    this.blocks[id] = block
    return id
  }

  hat(x: number, y: number): string {
    return this.add(this.id(), {
      opcode: 'event_whenflagclicked', next: null, parent: null, inputs: {}, fields: {},
      shadow: false, topLevel: true, x, y,
    })
  }

  /** 把一串积木挂在 parentId 后面（或作为 parentId 这个 C 型积木的 SUBSTACK），返回第一块的 id。 */
  chain(parentId: string, blocks: Block[], asSubstack: boolean): string | null {
    let prev: string | null = null
    let first: string | null = null
    for (const block of blocks) {
      const id = this.id()
      this.make(id, block, prev ?? parentId)
      if (block.t === 'repeat' || block.t === 'iftouch') {
        const inner = this.chain(id, block.body as Block[], true)
        if (inner) this.blocks[id].inputs.SUBSTACK = [2, inner]
      }
      if (prev) this.blocks[prev].next = id
      else first = id
      prev = id
    }
    if (first && asSubstack === false) this.blocks[parentId].next = first
    return first
  }

  private make(id: string, block: Block, parent: string): void {
    const common = { next: null, parent, shadow: false, topLevel: false } as const
    if (block.t === 'score') {
      this.add(id, {
        ...common, opcode: 'data_changevariableby',
        inputs: { VALUE: [1, [4, String(block.by)]] },
        fields: { VARIABLE: [SCORE_VARIABLE_NAME, SCORE_VARIABLE_ID] },
      })
    } else if (block.t === 'hide') {
      this.add(id, { ...common, opcode: 'looks_hide', inputs: {}, fields: {} })
    } else if (block.t === 'iftouch') {
      // 如果〈碰到 篮子？〉：control_if 的 CONDITION 是 sensing_touchingobject，它的菜单是一个 shadow 块。
      const cond = this.id()
      const menu = this.id()
      this.add(cond, {
        opcode: 'sensing_touchingobject', next: null, parent: id,
        inputs: { TOUCHINGOBJECTMENU: [1, menu] }, fields: {}, shadow: false, topLevel: false,
      })
      this.add(menu, {
        opcode: 'sensing_touchingobjectmenu', next: null, parent: cond,
        inputs: {}, fields: { TOUCHINGOBJECTMENU: [BASKET_NAME, null] }, shadow: true, topLevel: false,
      })
      this.add(id, { ...common, opcode: 'control_if', inputs: { CONDITION: [2, cond] }, fields: {} })
    } else {
      this.add(id, {
        ...common, opcode: 'control_repeat',
        inputs: { TIMES: [1, [6, String(block.times)]] }, fields: {},
      })
    }
  }
}

/** 课程预置的下落脚本：当绿旗被点击 → 重复 frames 次 { 将 y 增加 -speed }。孩子看得到、改不了。 */
function fallScript(prefix: string, level: LevelParams): Record<string, SbBlock> {
  const h = `${prefix}h`
  const r = `${prefix}r`
  const m = `${prefix}m`
  return {
    [h]: { opcode: 'event_whenflagclicked', next: r, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 0 },
    [r]: {
      opcode: 'control_repeat', next: null, parent: h,
      inputs: { TIMES: [1, [6, String(fallFrames(level))]], SUBSTACK: [2, m] }, fields: {}, shadow: false, topLevel: false,
    },
    [m]: {
      opcode: 'motion_changeyby', next: null, parent: r,
      inputs: { DY: [1, [4, String(-level.ballSpeed)]] }, fields: {}, shadow: false, topLevel: false,
    },
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

function ballTarget(
  name: string, prefix: string, x: number, assetId: string, layerOrder: number, program: Program, level: LevelParams,
) {
  const builder = new BlockBuilder(`${prefix}s`)
  runnableScripts(program).forEach((script, i) => {
    const hat = builder.hat(0, 200 + i * 220)
    builder.chain(hat, script.body, false)
  })
  return {
    isStage: false, name, ...baseTarget(), blocks: { ...fallScript(prefix, level), ...builder.blocks }, layerOrder,
    visible: true, x, y: L04_PARAMS.ballStartY, size: 100, direction: 90, draggable: false, rotationStyle: 'all around',
    costumes: [costume(name, assetId, 20, 20)],
  }
}

export type CompiledProject = ReturnType<typeof compileProject>

/** 程序不合法时抛错：不合法的程序绝不送进 VM。 */
export function compileProject(program: Program, level: LevelParams) {
  const problems = validateProgram(program)
  if (problems.length > 0) throw new Error(`程序不合法：${problems.join('；')}`)

  return {
    targets: [
      {
        isStage: true, name: 'Stage', ...baseTarget(), variables: { [SCORE_VARIABLE_ID]: [SCORE_VARIABLE_NAME, 0] },
        blocks: {}, layerOrder: 0, costumes: [costume('背景', L04_ASSETS.backdrop, 240, 180)],
      },
      {
        isStage: false, name: BASKET_NAME, ...baseTarget(), blocks: {}, layerOrder: 1,
        visible: true, x: L04_PARAMS.basketX, y: L04_PARAMS.basketY, size: 100, direction: 90,
        draggable: false, rotationStyle: 'all around', costumes: [costume('篮子', L04_ASSETS.basket, 40, 20)],
      },
      ballTarget(HIT_BALL_NAME, 'hb', L04_PARAMS.hitBallX, L04_ASSETS.hitBall, 2, program, level),
      ballTarget(GROUND_BALL_NAME, 'gb', L04_PARAMS.groundBallX, L04_ASSETS.groundBall, 3, program, level),
    ],
    monitors: [],
    extensions: [],
    meta: { semver: '3.0.0', vm: '0.2.0', agent: 'KidsCoding G2-U3-L04' },
  }
}
