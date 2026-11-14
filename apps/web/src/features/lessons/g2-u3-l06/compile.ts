// 把学生的水果脚本 + 课程预置的部分（篮子跟随指针、舞台倒计时）编译成真正的 Scratch 3 工程（project.json 对象）。
// 生成的是 Scratch VM 原生识别的 opcode：event_whenflagclicked、control_forever、control_repeat、control_repeat_until、
// control_if、control_wait、motion_setx / sety / changeyby、sensing_mousex、sensing_touchingobject、
// operator_random、operator_lt、data_setvariableto / changevariableby、looks_show / hide。
// 执行完全交给真实 Scratch VM（带真实渲染器），本模块不模拟任何积木行为，也不预先算出碰撞或随机数。

import { L06_PARAMS, type LevelParams } from './params'
import { runnableScripts, validateProgram, type Block, type Program } from './program'

/** 沙箱内置的原创 SVG 造型使用的资源 ID（沙箱只接受这三个）。 */
export const L06_ASSETS = {
  backdrop: 'a1b2c3d4e5f60718293a4b5c6d7e8f9a',
  basket: 'b2c3d4e5f6a718293a4b5c6d7e8f9a2b',
  fruit: 'c3d4e5f6a7b829304a5b6c7d8e9f0a2b',
} as const

export const BASKET_NAME = '篮子'
export const FRUIT_NAME = '水果'
export const SCORE_VARIABLE_NAME = '得分'
export const SCORE_VARIABLE_ID = 'kcl6_score'
export const TIME_VARIABLE_NAME = '时间'
export const TIME_VARIABLE_ID = 'kcl6_time'

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

  /** 把一串学生积木挂在 parentId 后面（或作为 C 型积木的 SUBSTACK），返回第一块的 id。 */
  chain(parentId: string, blocks: Block[], asSubstack: boolean): string | null {
    let prev: string | null = null
    let first: string | null = null
    for (const block of blocks) {
      const seq = this.makeSequence(block, prev ?? parentId)
      if (prev) this.blocks[prev].next = seq.first
      else first = seq.first
      prev = seq.last
    }
    if (first && asSubstack === false) this.blocks[parentId].next = first
    return first
  }

  /** 生成一块学生积木对应的 Scratch 积木序列（“出生”一块对应三块），返回首尾 id。 */
  private makeSequence(block: Block, parent: string): { first: string; last: string } {
    const common = { next: null, parent, shadow: false, topLevel: false } as const
    if (block.t === 'spawn') {
      // 出生：x 设为随机数（真实 operator_random）→ y 回到顶部 → 显示。
      const rand = this.id()
      const setx = this.id()
      const sety = this.id()
      const show = this.id()
      this.add(rand, {
        opcode: 'operator_random', next: null, parent: setx,
        inputs: { FROM: [1, [4, String(L06_PARAMS.randomMinX)]], TO: [1, [4, String(L06_PARAMS.randomMaxX)]] },
        fields: {}, shadow: false, topLevel: false,
      })
      this.add(setx, { ...common, opcode: 'motion_setx', next: sety, inputs: { X: [2, rand] }, fields: {} })
      this.add(sety, { ...common, parent: setx, opcode: 'motion_sety', next: show, inputs: { Y: [1, [4, String(L06_PARAMS.spawnY)]] }, fields: {} })
      this.add(show, { ...common, parent: sety, opcode: 'looks_show', inputs: {}, fields: {} })
      return { first: setx, last: show }
    }
    const id = this.id()
    if (block.t === 'fall') {
      this.add(id, {
        ...common, opcode: 'motion_changeyby',
        inputs: { DY: [1, [4, String(-this.fruitSpeed)]] }, fields: {},
      })
    } else if (block.t === 'score') {
      this.add(id, {
        ...common, opcode: 'data_changevariableby',
        inputs: { VALUE: [1, [4, String(block.by)]] },
        fields: { VARIABLE: [SCORE_VARIABLE_NAME, SCORE_VARIABLE_ID] },
      })
    } else if (block.t === 'hide') {
      this.add(id, { ...common, opcode: 'looks_hide', inputs: {}, fields: {} })
    } else if (block.t === 'iftouch') {
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
      const inner = this.chain(id, block.body as Block[], true)
      if (inner) this.blocks[id].inputs.SUBSTACK = [2, inner]
    } else if (block.t === 'repeat') {
      this.add(id, {
        ...common, opcode: 'control_repeat',
        inputs: { TIMES: [1, [6, String(block.times)]] }, fields: {},
      })
      const inner = this.chain(id, block.body as Block[], true)
      if (inner) this.blocks[id].inputs.SUBSTACK = [2, inner]
    } else {
      this.add(id, { ...common, opcode: 'control_forever', inputs: {}, fields: {} })
      const inner = this.chain(id, block.body as Block[], true)
      if (inner) this.blocks[id].inputs.SUBSTACK = [2, inner]
    }
    return { first: id, last: id }
  }

  constructor(private readonly prefix: string, private readonly fruitSpeed: number) {}
}

/** 课程预置的舞台倒计时脚本：绿旗 → 得分/时间复位 → 重复执行直到时间 < 1 { 等待 1 秒；时间增加 -1 }。 */
function stageBlocks(level: LevelParams): Record<string, SbBlock> {
  const b: Record<string, SbBlock> = {}
  const put = (id: string, block: SbBlock) => { b[id] = block }
  put('cd_h', { opcode: 'event_whenflagclicked', next: 'cd_s0', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 0 })
  put('cd_s0', {
    opcode: 'data_setvariableto', next: 'cd_st', parent: 'cd_h',
    inputs: { VALUE: [1, [4, '0']] }, fields: { VARIABLE: [SCORE_VARIABLE_NAME, SCORE_VARIABLE_ID] }, shadow: false, topLevel: false,
  })
  put('cd_st', {
    opcode: 'data_setvariableto', next: 'cd_r', parent: 'cd_s0',
    inputs: { VALUE: [1, [4, String(level.timeLimitSeconds)]] }, fields: { VARIABLE: [TIME_VARIABLE_NAME, TIME_VARIABLE_ID] }, shadow: false, topLevel: false,
  })
  put('cd_var', {
    opcode: 'data_variable', next: null, parent: 'cd_lt',
    inputs: {}, fields: { VARIABLE: [TIME_VARIABLE_NAME, TIME_VARIABLE_ID] }, shadow: false, topLevel: false,
  })
  put('cd_lt', {
    opcode: 'operator_lt', next: null, parent: 'cd_r',
    inputs: { OPERAND1: [2, 'cd_var'], OPERAND2: [1, [4, '1']] }, fields: {}, shadow: false, topLevel: false,
  })
  put('cd_w', {
    opcode: 'control_wait', next: 'cd_d', parent: 'cd_r',
    inputs: { DURATION: [1, [5, '1']] }, fields: {}, shadow: false, topLevel: false,
  })
  put('cd_d', {
    opcode: 'data_changevariableby', next: null, parent: 'cd_w',
    inputs: { VALUE: [1, [4, '-1']] }, fields: { VARIABLE: [TIME_VARIABLE_NAME, TIME_VARIABLE_ID] }, shadow: false, topLevel: false,
  })
  put('cd_r', {
    opcode: 'control_repeat_until', next: null, parent: 'cd_st',
    inputs: { CONDITION: [2, 'cd_lt'], SUBSTACK: [2, 'cd_w'] }, fields: {}, shadow: false, topLevel: false,
  })
  return b
}

/** 课程预置的篮子脚本：绿旗 → 一直重复 { 将 x 设为 鼠标的 x }。篮子只左右移动，y 固定。 */
function basketBlocks(): Record<string, SbBlock> {
  const b: Record<string, SbBlock> = {}
  b['bk_h'] = { opcode: 'event_whenflagclicked', next: 'bk_f', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 0 }
  b['bk_mx'] = {
    opcode: 'sensing_mousex', next: null, parent: 'bk_x',
    inputs: {}, fields: {}, shadow: false, topLevel: false,
  }
  b['bk_x'] = {
    opcode: 'motion_setx', next: null, parent: 'bk_f',
    inputs: { X: [2, 'bk_mx'] }, fields: {}, shadow: false, topLevel: false,
  }
  b['bk_f'] = {
    opcode: 'control_forever', next: null, parent: 'bk_h',
    inputs: { SUBSTACK: [2, 'bk_x'] }, fields: {}, shadow: false, topLevel: false,
  }
  return b
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

/** 程序不合法时抛错：不合法的程序绝不送进 VM。 */
export function compileProject(program: Program, level: LevelParams) {
  const problems = validateProgram(program)
  if (problems.length > 0) throw new Error(`程序不合法：${problems.join('；')}`)

  const builder = new BlockBuilder('fs', level.fruitSpeed)
  runnableScripts(program).forEach((script, i) => {
    const hat = builder.hat(0, 200 + i * 220)
    builder.chain(hat, script.body, false)
  })

  return {
    targets: [
      {
        isStage: true, name: 'Stage', ...baseTarget(),
        variables: {
          [SCORE_VARIABLE_ID]: [SCORE_VARIABLE_NAME, 0],
          [TIME_VARIABLE_ID]: [TIME_VARIABLE_NAME, level.timeLimitSeconds],
        },
        blocks: stageBlocks(level), layerOrder: 0,
        costumes: [costume('背景', L06_ASSETS.backdrop, 240, 180)],
      },
      {
        isStage: false, name: BASKET_NAME, ...baseTarget(), blocks: basketBlocks(), layerOrder: 1,
        visible: true, x: 0, y: L06_PARAMS.basketY, size: 100, direction: 90,
        draggable: false, rotationStyle: 'all around', costumes: [costume(BASKET_NAME, L06_ASSETS.basket, 40, 20)],
      },
      {
        isStage: false, name: FRUIT_NAME, ...baseTarget(), blocks: builder.blocks, layerOrder: 2,
        visible: true, x: 0, y: L06_PARAMS.spawnY, size: 100, direction: 90, draggable: false,
        rotationStyle: 'all around', costumes: [costume(FRUIT_NAME, L06_ASSETS.fruit, 20, 20)],
      },
    ],
    monitors: [],
    extensions: [],
    meta: { semver: '3.0.0', vm: '0.2.0', agent: 'KidsCoding G2-U3-L06' },
  }
}
