// 把学生的程序编译成 Scratch 3 工程（sb3 JSON），交给真实 Scratch VM 执行。
// 角色：舞台（变量 timeLeft、score，广播“游戏结束”）、学生（只放学生的脚本）、水果（课程自带的得分脚本，学生看不到也改不了）。
// 本模块只生成数据，不运行任何积木。

import { L05_PARAMS } from './params'
import type { Block, Program } from './program'
import { runnableScripts } from './program'

/** 沙箱内置的原创 SVG 造型使用的资源 ID（沙箱只接受这三个，各对应一个真实造型）。 */
export const L05_ASSETS = {
  backdrop: 'c3d4e5f6a7b8293a4b5c6d7e8f901a23',
  student: 'a1b2c3d4e5f60718293a4b5c6d7e8f01',
  fruit: 'b2c3d4e5f6a718293a4b5c6d7e8f9012',
} as const
export const STUDENT_NAME = '学生'
export const FRUIT_NAME = '水果'
export const TIME_VAR = { id: 'kcl5_time', name: 'timeLeft' } as const
export const SCORE_VAR = { id: 'kcl5_score', name: 'score' } as const
export const BROADCAST_ID = 'kcl5_bc'

type Sb3Block = Record<string, unknown>

const num = (v: number) => [4, String(v)]
const timeField = { VARIABLE: [TIME_VAR.name, TIME_VAR.id] }

class Chain {
  readonly blocks: Record<string, Sb3Block> = {}
  private n = 0
  constructor(private readonly prefix: string) {}

  private id(): string { return `${this.prefix}${this.n++}` }

  private add(opcode: string, parent: string | null, extra: Partial<Sb3Block> = {}): string {
    const id = this.id()
    this.blocks[id] = { opcode, next: null, parent, inputs: {}, fields: {}, shadow: false, topLevel: false, ...extra }
    return id
  }

  /** 把一串积木连成一条链，返回第一块的 id（空串返回 null）。 */
  chain(blocks: Block[], parent: string | null): string | null {
    let first: string | null = null
    let prev: string | null = null
    for (const b of blocks) {
      const id = this.one(b, prev ?? parent)
      if (!first) first = id
      if (prev) this.blocks[prev].next = id
      prev = id
    }
    return first
  }

  private one(b: Block, parent: string | null): string {
    switch (b.t) {
      case 'setTime':
        return this.add('data_setvariableto', parent, { inputs: { VALUE: [1, num(b.value)] }, fields: timeField })
      case 'wait':
        return this.add('control_wait', parent, { inputs: { DURATION: [1, num(b.secs)] } })
      case 'decrease':
        return this.add('data_changevariableby', parent, { inputs: { VALUE: [1, num(-b.by)] }, fields: timeField })
      case 'broadcast':
        return this.add('event_broadcast', parent, { inputs: { BROADCAST_INPUT: [1, [11, L05_PARAMS.broadcastName, BROADCAST_ID]] } })
      case 'repeat': {
        const id = this.add('control_repeat', parent, { inputs: { TIMES: [1, num(b.times)] } })
        const body = this.chain(b.body, id)
        if (body) (this.blocks[id].inputs as Record<string, unknown>).SUBSTACK = [2, body]
        return id
      }
      case 'untilZero': {
        const id = this.add('control_repeat_until', parent)
        // 条件固定为 timeLeft < 1
        const cond = this.add('operator_lt', id)
        const v = this.add('data_variable', cond, { fields: timeField })
        this.blocks[cond].inputs = { OPERAND1: [3, v, [10, '']], OPERAND2: [1, num(1)] }
        const inputs = this.blocks[id].inputs as Record<string, unknown>
        inputs.CONDITION = [2, cond]
        const body = this.chain(b.body, id)
        if (body) inputs.SUBSTACK = [2, body]
        return id
      }
    }
  }

  /** 帽子积木 + 一条链。 */
  script(hatOpcode: string, body: Block[]): void {
    const hat = this.add(hatOpcode, null, { topLevel: true, x: 0, y: 0 })
    const first = this.chain(body, hat)
    if (first) this.blocks[hat].next = first
  }
}

/** 学生的积木：只编译接在绿旗下面的脚本（散积木 Scratch 不会运行，也不进工程）。 */
export function studentBlocks(program: Program): Record<string, Sb3Block> {
  const c = new Chain('s')
  runnableScripts(program).forEach(s => c.script('event_whenflagclicked', s.body))
  return c.blocks
}

/** 课程自带的得分脚本：重复执行{ 等待 0.5 秒；如果〈timeLeft > 0〉{ score 增加 1 } }。 */
export function fruitBlocks(): Record<string, Sb3Block> {
  const b: Record<string, Sb3Block> = {}
  const mk = (id: string, opcode: string, parent: string | null, extra: Partial<Sb3Block> = {}) => {
    b[id] = { opcode, next: null, parent, inputs: {}, fields: {}, shadow: false, topLevel: false, ...extra }
  }
  mk('fh', 'event_whenflagclicked', null, { topLevel: true, x: 0, y: 0, next: 'ff' })
  mk('ff', 'control_forever', 'fh', { inputs: { SUBSTACK: [2, 'fw'] } })
  mk('fw', 'control_wait', 'ff', { next: 'fi', inputs: { DURATION: [1, num(L05_PARAMS.scoreEverySeconds)] } })
  mk('fi', 'control_if', 'fw', { inputs: { CONDITION: [2, 'fc'], SUBSTACK: [2, 'fa'] } })
  mk('fc', 'operator_gt', 'fi', { inputs: { OPERAND1: [3, 'fv', [10, '']], OPERAND2: [1, num(0)] } })
  mk('fv', 'data_variable', 'fc', { fields: timeField })
  mk('fa', 'data_changevariableby', 'fi', { inputs: { VALUE: [1, num(1)] }, fields: { VARIABLE: [SCORE_VAR.name, SCORE_VAR.id] } })
  return b
}

const costume = (name: string, assetId: string, cx: number, cy: number) => ({ assetId, name, md5ext: `${assetId}.svg`, dataFormat: 'svg', rotationCenterX: cx, rotationCenterY: cy })
const baseTarget = () => ({ variables: {}, lists: {}, broadcasts: {}, comments: {}, currentCostume: 0, sounds: [], volume: 100, tempo: 60 })
const sprite = (name: string, blocks: Record<string, Sb3Block>, layerOrder: number) => ({
  isStage: false, name, ...baseTarget(), blocks, layerOrder, visible: false, x: 0, y: 0, size: 100,
  direction: 90, draggable: false, rotationStyle: 'all around',
  costumes: [costume(name, name === STUDENT_NAME ? L05_ASSETS.student : L05_ASSETS.fruit, 50, name === STUDENT_NAME ? 60 : 50)],
})

export function compileProject(program: Program): Record<string, unknown> {
  return {
    targets: [
      {
        isStage: true, name: 'Stage', ...baseTarget(), blocks: {}, layerOrder: 0, costumes: [costume('背景', L05_ASSETS.backdrop, 240, 180)],
        variables: { [TIME_VAR.id]: [TIME_VAR.name, 0], [SCORE_VAR.id]: [SCORE_VAR.name, 0] },
        broadcasts: { [BROADCAST_ID]: L05_PARAMS.broadcastName },
      },
      sprite(STUDENT_NAME, studentBlocks(program), 1),
      sprite(FRUIT_NAME, fruitBlocks(), 2),
    ],
    monitors: [],
    extensions: [],
    meta: { semver: '3.0.0', vm: '0.2.0', agent: 'KidsCoding G2-U3-L05' },
  }
}
