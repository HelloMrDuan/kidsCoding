// @vitest-environment node
// G2-U3-L04 核心逻辑单元测试：参数、程序校验、编译结构、三层判定边界、草稿、参考做法。
// 判定测试用合成轨迹（只验证判定函数本身）；真实 VM + 真实渲染器的运行结果见 tests/e2e/g2-u3-l04-vm.spec.ts。
import { describe, expect, it } from 'vitest'
import { BASKET_NAME, compileProject, GROUND_BALL_NAME, HIT_BALL_NAME, L04_ASSETS, SCORE_VARIABLE_ID, SCORE_VARIABLE_NAME } from './compile'
import { L04_ACTIVITY_NOTE, L04_CONTENT, L04_CONTRACT, L04_DEMO_REPEAT, levelSituation, validateL04Contract } from './contract'
import { isTraceCurrent, judgeRun, predictionOutcome, UNDERSTANDING_NOTE, type BallName, type RunTrace } from './judge'
import { fallFrames, L04_LEVEL_ORDER, L04_LEVELS, L04_PARAMS, type LevelId } from './params'
import { countBlocks, programFingerprint, runnableScripts, validateProgram, type Block, type Program } from './program'
import { alternatives, describeProgram } from './reference'
import {
  DEMO_PROGRAM, editProgram, exploreDone, fromDraft, initialState, isLevelPassed, loadDraft, recordRun, saveDraft,
  toDraft, type StorageLike,
} from './state'
import { parseStageState, startPositions, stageStateOf } from './stage-state'
import { syntheticTrace } from './testing/fake-vm-port'

type Leaf = { t: 'score'; by: number } | { t: 'hide' }
const score = (by: number): Leaf => ({ t: 'score', by })
const hide: Leaf = { t: 'hide' }
const iftouch = (...body: Leaf[]): Block => ({ t: 'iftouch', body })
const repeat = (times: number, ...body: Array<Leaf | Block>): Block => ({ t: 'repeat', times, body: body as never })
const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const STANDARD: Program = flag(repeat(30, iftouch(score(1), hide)))

function memoryStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v }, removeItem: k => { delete data[k] } }
}

/** 构造一份合成轨迹：每个球在哪些帧检查（结果）、哪些帧加分。 */
function trace(over: {
  level?: LevelId
  scores?: Array<{ ball: BallName; by: number; frame: number }>
  checks?: RunTrace['checks']
  finalScore?: number
  endedBy?: RunTrace['endedBy']
} = {}): RunTrace {
  return syntheticTrace(over.level ?? 'solve', STANDARD, 1, over)
}
function judged(t: RunTrace, level: LevelId = 'solve') {
  const j = judgeRun(t, L04_LEVELS[level])
  if (j.status !== 'judged') throw new Error(`应该判定，但是：${j.reason}`)
  return j
}
const red = (frame: number, by = 1) => ({ ball: '红球' as BallName, by, frame })
const blue = (frame: number, by = 1) => ({ ball: '蓝球' as BallName, by, frame })

describe('参数与契约', () => {
  it('教学参数现在是“提议”，不是已批准也不是已验证', () => {
    expect(L04_PARAMS.rulingStatus).toBe('proposed')
  })

  it('契约字段完整：恰 5 条目标、3 级提示、draftKey 绑定本课、教学定向', () => {
    expect(validateL04Contract(L04_CONTRACT)).toEqual([])
    expect(L04_CONTRACT.goal5).toHaveLength(5)
    expect(L04_CONTRACT.hints).toHaveLength(3)
    expect(L04_CONTRACT.draftKey).toBe('kidscoding-draft:G2-U3-L04')
    expect(L04_CONTRACT.judging.scopeLabel).toBe('教学定向')
  })

  it('故意错误的契约被拒绝', () => {
    expect(validateL04Contract({ ...L04_CONTRACT, goal5: ['a', 'b', 'c', 'd', ''] as never })).not.toEqual([])
    expect(validateL04Contract({ ...L04_CONTRACT, hints: ['a', 'b'] as never })).not.toEqual([])
    expect(validateL04Contract({ ...L04_CONTRACT, draftKey: 'kidscoding-draft:G2-U3-L03' })).not.toEqual([])
    expect(validateL04Contract({ ...L04_CONTRACT, engine: 'demo' as never })).not.toEqual([])
  })

  it('课程内容不跨课污染：不含倒计时 / 计时 / 随机数 / 克隆（那是 L05 及以后，或上一课）', () => {
    const all = JSON.stringify([L04_CONTRACT, L04_CONTENT])
    for (const stray of ['倒计时', '计时', '克隆', 'A1-', '摘要']) expect(all, stray).not.toContain(stray)
  })

  it('任何提示和任务说明都不含完整答案（不把“如果—得分—隐藏”三块按顺序写成可抄的程序，也不给出刚好够的重复次数）', () => {
    const texts = Object.values(L04_CONTENT).flatMap(c => [c.task, c.step, ...c.hints])
    for (const t of texts) {
      // 刚好够的次数（21、41）不能出现在文案里
      expect(t, t).not.toMatch(/重复(?:执行)?\s*(?:21|41)\s*次/)
      // 不能出现“如果…得分…并隐藏/再隐藏/然后隐藏”这样把三块串起来的指令
      expect(t, t).not.toMatch(/如果[^。]*得分[^。]*(?:并|再|然后)[^。]*隐藏/)
      expect(t, t).not.toMatch(/隐藏[^。]*(?:放在|放到|放进)[^。]*如果/)
    }
    for (const c of Object.values(L04_CONTENT)) expect(new Set(c.hints).size).toBe(3)
  })

  it('四关：探索 1、独立 1、迁移 2；第一关只读演示且要求预测，其余关可编辑', () => {
    expect(L04_LEVEL_ORDER).toEqual(['explore', 'solve', 'transferPoints', 'transferSlow'])
    expect(L04_LEVEL_ORDER.map(id => L04_LEVELS[id].layer)).toEqual([1, 2, 3, 3])
    expect(L04_CONTENT.explore.readOnly).toBe(true)
    expect(L04_CONTENT.explore.prediction).toBeDefined()
    for (const id of ['solve', 'transferPoints', 'transferSlow'] as const) {
      expect(L04_CONTENT[id].readOnly).toBe(false)
      expect(L04_CONTENT[id].prediction).toBeUndefined()
    }
  })

  it('关卡参数快照（改数值必须有意识地改这条测试，且需首席裁定）', () => {
    expect(L04_LEVELS.explore).toMatchObject({ ballSpeed: 10, points: 1 })
    expect(L04_LEVELS.solve).toMatchObject({ ballSpeed: 10, points: 1 })
    expect(L04_LEVELS.transferPoints).toMatchObject({ ballSpeed: 10, points: 2 })
    expect(L04_LEVELS.transferSlow).toMatchObject({ ballSpeed: 5, points: 1 })
    expect(L04_PARAMS).toMatchObject({
      basketX: 0, basketY: -90, ballStartY: 150, hitBallX: 0, groundBallX: -150, fallDistance: 310,
      minRepeatTimes: 1, maxRepeatTimes: 100, minScoreStep: 1, maxScoreStep: 9, maxBlocks: 8, maxNesting: 2, maxScripts: 3, frameCap: 150,
    })
    expect(L04_DEMO_REPEAT).toBe(40)
  })

  it('舞台几何：球最终整个在舞台里、且在篮子下面不重叠；球的起点在舞台里', () => {
    const { basketY, ballStartY, groundY, stageMinX, stageMaxX, hitBallX, groundBallX } = L04_PARAMS
    for (const level of Object.values(L04_LEVELS)) {
      const finalY = ballStartY - fallFrames(level) * level.ballSpeed // 球最终球心
      expect(finalY - 20, `${level.id} 球底边在舞台里`).toBeGreaterThanOrEqual(groundY)
      expect(finalY + 20, `${level.id} 球顶边低于篮子底边（不压着篮子）`).toBeLessThan(basketY - 20)
    }
    for (const x of [hitBallX, groundBallX]) expect(x - 20 >= stageMinX && x + 20 <= stageMaxX).toBe(true)
    // 蓝球离篮子足够远，不会碰到：篮子半宽 40 + 球半宽 20 = 60
    expect(Math.abs(groundBallX - L04_PARAMS.basketX)).toBeGreaterThan(60)
  })

  it('下落帧数：向下取整，球速 10 → 31 帧，球速 5 → 62 帧', () => {
    expect(fallFrames(L04_LEVELS.solve)).toBe(31)
    expect(fallFrames(L04_LEVELS.transferSlow)).toBe(62)
  })

  it('levelSituation 来自参数：写明本关每个球加几分', () => {
    expect(levelSituation(L04_LEVELS.solve)).toContain('加 1 分')
    expect(levelSituation(L04_LEVELS.transferPoints)).toContain('加 2 分')
    expect(levelSituation(L04_LEVELS.transferSlow)).toContain('更慢')
  })
})

describe('程序校验', () => {
  it('合法程序通过；空程序、散积木合法', () => {
    expect(validateProgram(STANDARD)).toEqual([])
    expect(validateProgram({ scripts: [] })).toEqual([])
    expect(validateProgram({ scripts: [{ hat: null, body: [score(1)] }] })).toEqual([])
  })

  it('未知类型、格式不对被拒绝', () => {
    expect(validateProgram(flag({ t: 'move', dx: 3 } as never))).not.toEqual([])
    expect(validateProgram(null)).not.toEqual([])
    expect(validateProgram({})).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'x', body: [] }] })).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'flag', body: 'no' }] })).not.toEqual([])
    expect(validateProgram(flag(null as never))).not.toEqual([])
  })

  it('重复次数：1 与 100 合法；0、101、1.5、NaN 非法（两端各自检查）', () => {
    for (const n of [1, 100]) expect(validateProgram(flag(repeat(n, iftouch(score(1))))), String(n)).toEqual([])
    for (const n of [0, 101, 1.5, Number.NaN, -3]) expect(validateProgram(flag(repeat(n, iftouch(score(1))))), String(n)).not.toEqual([])
  })

  it('得分增量：1 与 9 合法；0、10、1.5、NaN、负数非法（两端各自检查）', () => {
    for (const n of [1, 9]) expect(validateProgram(flag(iftouch(score(n)))), String(n)).toEqual([])
    for (const n of [0, 10, 1.5, Number.NaN, -1]) expect(validateProgram(flag(iftouch(score(n)))), String(n)).not.toEqual([])
  })

  it('积木总数（不含绿旗）：8 块合法，9 块非法；分散在多个脚本里也一起计数；嵌套的积木也算', () => {
    const many = (n: number): Block[] => Array.from({ length: n }, () => ({ t: 'iftouch', body: [] }) as Block)
    expect(validateProgram(flag(...many(8)))).toEqual([])
    expect(validateProgram(flag(...many(9)))).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'flag', body: many(5) }, { hat: 'flag', body: many(4) }] })).not.toEqual([])
    expect(countBlocks([repeat(2, iftouch(score(1), hide)), score(1)])).toBe(5)
    // 8 块：重复(1) + 如果(1) + 6 个叶子
    expect(validateProgram(flag(repeat(5, iftouch(score(1), hide, score(1), hide, score(1), hide))))).toEqual([])
    expect(validateProgram(flag(repeat(5, iftouch(score(1), hide, score(1), hide, score(1), hide, score(1)))))).not.toEqual([])
  })

  it('嵌套：重复 > 如果 > 叶子 合法；重复里再放重复非法；如果里放如果非法；如果里放重复非法', () => {
    expect(validateProgram(flag(repeat(2, iftouch(score(1)))))).toEqual([])
    expect(validateProgram(flag(repeat(2, repeat(2, score(1)))))).not.toEqual([])
    expect(validateProgram(flag({ t: 'iftouch', body: [{ t: 'iftouch', body: [score(1)] } as never] }))).not.toEqual([])
    expect(validateProgram(flag({ t: 'iftouch', body: [repeat(2, score(1)) as never] }))).not.toEqual([])
    // 重复必须在最外层，哪怕外面没有别的容器
    expect(validateProgram(flag(iftouch(score(1)), repeat(2, score(1))))).toEqual([])
  })

  it('每一种非法都写明原因（不是笼统的“程序不合法”）', () => {
    expect(validateProgram(flag(repeat(2, repeat(2, score(1)))))[0]).toContain('只能放在最外层')
    expect(validateProgram(flag({ t: 'iftouch', body: [{ t: 'iftouch', body: [] } as never] }))[0]).toContain('不能再放“如果”')
    expect(validateProgram(flag(repeat(0, score(1))))[0]).toContain('重复次数')
    expect(validateProgram(flag(score(10)))[0]).toContain('得分增量')
  })

  it('脚本条数：3 条合法，4 条非法', () => {
    const s = { hat: 'flag' as const, body: [iftouch(score(1))] }
    expect(validateProgram({ scripts: [s, s, s] })).toEqual([])
    expect(validateProgram({ scripts: [s, s, s, s] })).not.toEqual([])
  })

  it('散积木（没接绿旗）合法但不会运行', () => {
    const p: Program = { scripts: [{ hat: null, body: [score(1)] }, { hat: 'flag', body: [iftouch(score(2))] }] }
    expect(runnableScripts(p)).toHaveLength(1)
    expect(runnableScripts(p)[0].body).toEqual([iftouch(score(2))])
  })

  it('指纹：任何编辑（含散积木、隐藏的位置、增量）都会改变', () => {
    const base = programFingerprint(STANDARD)
    expect(programFingerprint(flag(repeat(30, iftouch(hide, score(1)))))).not.toBe(base)
    expect(programFingerprint(flag(repeat(31, iftouch(score(1), hide))))).not.toBe(base)
    expect(programFingerprint(flag(repeat(30, iftouch(score(2), hide))))).not.toBe(base)
    expect(programFingerprint({ scripts: [...STANDARD.scripts, { hat: null, body: [] }] })).not.toBe(base)
    expect(programFingerprint(JSON.parse(JSON.stringify(STANDARD)))).toBe(base)
  })
})

describe('编译为 Scratch 工程（只检查结构，执行由真实 VM 完成）', () => {
  type Blk = { opcode: string; next: string | null; parent: string | null; inputs: Record<string, unknown>; fields: Record<string, unknown>; shadow: boolean; topLevel: boolean }
  type Target = { name: string; isStage: boolean; blocks: Record<string, Blk>; x?: number; y?: number; visible?: boolean; variables: Record<string, unknown>; costumes: Array<{ assetId: string }> }
  const targets = (program: Program, level: LevelId = 'solve') => compileProject(program, L04_LEVELS[level]).targets as unknown as Target[]
  const ball = (program: Program, which: 2 | 3, level: LevelId = 'solve') => targets(program, level)[which]
  const childOps = (t: Target) => Object.entries(t.blocks).filter(([id]) => /^(hb|gb)s/.test(id)).map(([, b]) => b.opcode).sort()
  const fallOps = (t: Target) => Object.entries(t.blocks).filter(([id]) => /^(hb|gb)[hrm]$/.test(id)).map(([, b]) => b.opcode).sort()

  it('四个对象：舞台、篮子、红球、蓝球；起点与参数一致；舞台带“得分”变量，初值 0', () => {
    const t = targets(STANDARD)
    expect(t.map(x => x.name)).toEqual(['Stage', BASKET_NAME, HIT_BALL_NAME, GROUND_BALL_NAME])
    expect(t[0].isStage).toBe(true)
    expect(t[0].variables).toEqual({ [SCORE_VARIABLE_ID]: [SCORE_VARIABLE_NAME, 0] })
    expect([t[1].x, t[1].y]).toEqual([L04_PARAMS.basketX, L04_PARAMS.basketY])
    expect([t[2].x, t[2].y]).toEqual([L04_PARAMS.hitBallX, L04_PARAMS.ballStartY])
    expect([t[3].x, t[3].y]).toEqual([L04_PARAMS.groundBallX, L04_PARAMS.ballStartY])
    expect(t.every(x => x.isStage || x.visible === true)).toBe(true)
    expect(Object.keys(t[1].blocks)).toHaveLength(0) // 篮子没有脚本
  })

  it('孩子的脚本编译成 Scratch 原生 opcode，并且被**复制**到两个球上，各自独立的积木 id', () => {
    for (const w of [2, 3] as const) {
      expect(childOps(ball(STANDARD, w)), `球 ${w}`).toEqual(['control_if', 'control_repeat', 'data_changevariableby', 'event_whenflagclicked', 'looks_hide', 'sensing_touchingobject', 'sensing_touchingobjectmenu'].sort())
    }
    const idsA = Object.keys(ball(STANDARD, 2).blocks)
    const idsB = Object.keys(ball(STANDARD, 3).blocks)
    expect(idsA.filter(i => /^hbs/.test(i)).length).toBe(idsB.filter(i => /^gbs/.test(i)).length)
    expect(idsA.some(i => /^gb/.test(i))).toBe(false) // 红球上没有蓝球的 id
  })

  it('课程预置的下落脚本：绿旗 → 重复 floor(310/速度) 次 { 将 y 增加 -速度 }，每个球一份，随关卡速度变化', () => {
    for (const [level, speed, frames] of [['solve', 10, 31], ['transferSlow', 5, 62]] as const) {
      for (const w of [2, 3] as const) {
        const b = ball({ scripts: [] }, w, level).blocks
        expect(fallOps(ball({ scripts: [] }, w, level))).toEqual(['control_repeat', 'event_whenflagclicked', 'motion_changeyby'])
        const prefix = w === 2 ? 'hb' : 'gb'
        expect(b[`${prefix}r`].inputs.TIMES).toEqual([1, [6, String(frames)]])
        expect(b[`${prefix}m`].inputs.DY).toEqual([1, [4, String(-speed)]])
      }
    }
  })

  it('“如果〈碰到 篮子？〉”：control_if 的 CONDITION 是 sensing_touchingobject，菜单是检测“篮子”的影子积木', () => {
    const b = ball(STANDARD, 2).blocks
    const ifId = Object.entries(b).find(([id, x]) => /^hbs/.test(id) && x.opcode === 'control_if')![0]
    const cond = (b[ifId].inputs.CONDITION as [number, string])[1]
    expect(b[cond].opcode).toBe('sensing_touchingobject')
    expect(b[cond].parent).toBe(ifId)
    const menu = (b[cond].inputs.TOUCHINGOBJECTMENU as [number, string])[1]
    expect(b[menu]).toMatchObject({ opcode: 'sensing_touchingobjectmenu', shadow: true, parent: cond })
    expect(b[menu].fields.TOUCHINGOBJECTMENU).toEqual([BASKET_NAME, null])
  })

  it('得分增量原样进入工程，变量是舞台的“得分”', () => {
    const b = ball(flag(repeat(5, iftouch(score(7)))), 2).blocks
    const change = Object.values(b).find(x => x.opcode === 'data_changevariableby')!
    expect(change.inputs.VALUE).toEqual([1, [4, '7']])
    expect(change.fields.VARIABLE).toEqual([SCORE_VARIABLE_NAME, SCORE_VARIABLE_ID])
  })

  it('块与块的父子、next 连接一致，没有悬空引用', () => {
    for (const w of [2, 3] as const) {
      const g = ball(flag(repeat(3, iftouch(score(1), hide), iftouch(hide)), score(2)), w).blocks
      const ids = new Set(Object.keys(g))
      for (const [id, b] of Object.entries(g)) {
        if (b.next) {
          expect(ids.has(b.next), `${id}.next`).toBe(true)
          expect(g[b.next].parent).toBe(id)
        }
        if (b.parent) expect(ids.has(b.parent), `${id}.parent`).toBe(true)
      }
    }
  })

  it('空程序、散积木、只有绿旗：球上只有课程预置的下落脚本（加上绿旗）', () => {
    expect(childOps(ball({ scripts: [] }, 2))).toEqual([])
    expect(childOps(ball({ scripts: [{ hat: null, body: [score(1)] }] }, 2))).toEqual([])
    expect(childOps(ball(flag(), 2))).toEqual(['event_whenflagclicked'])
  })

  it('不合法的程序拒绝编译，不会送进 VM', () => {
    expect(() => compileProject(flag(repeat(101, score(1))), L04_LEVELS.solve)).toThrow('程序不合法')
    expect(() => compileProject(flag(score(99)), L04_LEVELS.solve)).toThrow('程序不合法')
    expect(() => compileProject(flag(repeat(2, repeat(2, score(1)))), L04_LEVELS.solve)).toThrow('程序不合法')
  })

  it('素材 ID 是沙箱内置的那四个', () => {
    expect(targets(STANDARD).map(t => t.costumes[0].assetId)).toEqual([L04_ASSETS.backdrop, L04_ASSETS.basket, L04_ASSETS.hitBall, L04_ASSETS.groundBall])
  })
})

describe('三层判定（合成轨迹）', () => {
  it('标准通过：红球碰到篮子时加一次分，蓝球没加：三层都通过', () => {
    const j = judged(trace())
    expect([j.stage.passed, j.task.passed, j.knowledge.passed, j.passed]).toEqual([true, true, true, true])
    expect(j.conclusion).toContain('任务达标')
    expect(j.conclusion).toContain('这只说明这一次运行的行为')
  })

  it('舞台结果：恰好等于要求才通过；多 1、少 1 都不通过（两侧）', () => {
    expect(judged(trace({ finalScore: 1 })).stage.passed).toBe(true)
    expect(judged(trace({ finalScore: 2 })).stage.passed).toBe(false)
    expect(judged(trace({ finalScore: 0 })).stage.passed).toBe(false)
    expect(judged(trace({ finalScore: 2, level: 'transferPoints', scores: [red(21, 2)] }), 'transferPoints').stage.passed).toBe(true)
    expect(judged(trace({ finalScore: 1, level: 'transferPoints', scores: [red(21, 1)] }), 'transferPoints').stage.passed).toBe(false)
  })

  it('任务结果：红球恰好一次且分数等于本关；两次不通过；加错分数不通过；一次都没有不通过', () => {
    expect(judged(trace({ scores: [red(21)] })).task.passed).toBe(true)
    const twice = judged(trace({ scores: [red(21), red(22)] }))
    expect(twice.task.passed).toBe(false)
    expect(twice.task.line).toContain('红球被加了 2 次分')
    const wrongBy = judged(trace({ scores: [red(21, 2)] }))
    expect(wrongBy.task.passed).toBe(false)
    expect(wrongBy.task.line).toContain('红球这一次加了 2 分，本关要求每个球加 1 分')
    const none = judged(trace({ scores: [], checks: [{ frame: 1, ball: '红球', result: false }], finalScore: 0 }))
    expect(none.task.passed).toBe(false)
    expect(none.task.line).toContain('一次分都没有加')
  })

  it('任务结果：蓝球只要被加分就不通过，即使红球正确；写明加了几次', () => {
    const j = judged(trace({ scores: [red(21), blue(21)] }))
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('蓝球也被加了 1 次分')
    expect(judged(trace({ scores: [red(21), blue(21), blue(22)] })).task.line).toContain('蓝球也被加了 2 次分')
  })

  it('舞台通过但任务不通过：总分碰巧对（迁移 A，红蓝各加 1 分 = 2）', () => {
    const j = judged(trace({ level: 'transferPoints', scores: [red(1), blue(1)], checks: [{ frame: 1, ball: '红球', result: false }] }), 'transferPoints')
    expect([j.stage.passed, j.task.passed, j.knowledge.passed]).toEqual([true, false, false])
  })

  it('知识证据：每次得分的同一帧，同一个球必须有一次检查且为 true', () => {
    expect(judged(trace({ scores: [red(21)] })).knowledge.passed).toBe(true)
    // 加分发生在没有检查的帧
    expect(judged(trace({ scores: [red(30)], checks: [{ frame: 21, ball: '红球', result: true }] })).knowledge.passed).toBe(false)
    // 同一帧有检查，但是 false
    expect(judged(trace({ scores: [red(21)], checks: [{ frame: 21, ball: '红球', result: false }] })).knowledge.passed).toBe(false)
  })

  it('知识证据必须按球配对：蓝球的加分不能“借用”红球同一帧的 true 检查', () => {
    const j = judged(trace({ scores: [red(21), blue(21)], checks: [{ frame: 21, ball: '红球', result: true }, { frame: 21, ball: '蓝球', result: false }] }))
    expect(j.knowledge.passed).toBe(false)
    expect(j.knowledge.line).toContain('蓝球')
    expect(j.knowledge.line).toContain('共 1 次加分没有被条件挡住')
    // 对照：蓝球也有自己的 true 检查时（理论上），就不算未把关
    const ok = judged(trace({ scores: [red(21), blue(21)], checks: [{ frame: 21, ball: '红球', result: true }, { frame: 21, ball: '蓝球', result: true }] }))
    expect(ok.knowledge.passed).toBe(true)
  })

  it('知识证据必须同一帧：隔帧的 true 检查不算数', () => {
    const j = judged(trace({ scores: [red(22)], checks: [{ frame: 21, ball: '红球', result: true }] }))
    expect(j.knowledge.passed).toBe(false)
  })

  it('知识证据：没有任何检查 → 不通过，并区分“加了分却没检查”和“什么都没做”', () => {
    const scored = judged(trace({ scores: [red(1), blue(1)], checks: [] }))
    expect(scored.knowledge.passed).toBe(false)
    expect(scored.knowledge.line).toContain('没有看到“碰到 篮子？”被检查，球就被加了分')
    const nothing = judged(trace({ scores: [], checks: [], finalScore: 0 }))
    expect(nothing.knowledge.passed).toBe(false)
    expect(nothing.knowledge.line).toContain('没有看到“碰到 篮子？”被检查过')
  })

  it('知识证据：检查了但从未得分 → 不通过，并区分“碰到过却没加分”和“检查的时候球还没到”', () => {
    const neverTouched = judged(trace({ scores: [], finalScore: 0, checks: [{ frame: 1, ball: '红球', result: false }, { frame: 1, ball: '蓝球', result: false }] }))
    expect(neverTouched.knowledge.line).toContain('检查的次数可能不够')
    const touchedNoScore = judged(trace({ scores: [], finalScore: 0, checks: [{ frame: 21, ball: '红球', result: true }] }))
    expect(touchedNoScore.knowledge.line).toContain('有过真的时候，但这时没有加分')
  })

  it('知识证据不通过时，写明哪个球、多少次加分没被挡住', () => {
    const j = judged(trace({ scores: [red(1), red(2), blue(1)], checks: [{ frame: 1, ball: '红球', result: false }] }))
    expect(j.knowledge.line).toContain('红球')
    expect(j.knowledge.line).toContain('蓝球')
    expect(j.knowledge.line).toContain('共 3 次加分没有被条件挡住')
  })

  it('“任务通过 ⇒ 知识证据通过 / 舞台结果通过”：枚举小范围合成轨迹，确认这两条蕴含在本课结构里成立', () => {
    // 合成轨迹的空间：红球 0～2 次加分、蓝球 0～1 次加分，每次加分的那一帧检查是 true 或 false 或缺失
    const states: Array<'true' | 'false' | 'none'> = ['true', 'false', 'none']
    let taskPassedCount = 0
    for (const rn of [0, 1, 2]) for (const bn of [0, 1]) for (const rc of states) for (const bc of states) {
      const scores = [...Array.from({ length: rn }, (_, i) => red(21 + i)), ...(bn ? [blue(21)] : [])]
      const checks: RunTrace['checks'] = []
      if (rc !== 'none') checks.push(...scores.filter(s => s.ball === '红球').map(s => ({ frame: s.frame, ball: '红球' as BallName, result: rc === 'true' })))
      if (bc !== 'none') checks.push(...scores.filter(s => s.ball === '蓝球').map(s => ({ frame: s.frame, ball: '蓝球' as BallName, result: bc === 'true' })))
      const j = judged(trace({ scores, checks }))
      if (j.task.passed) {
        taskPassedCount++
        expect(j.stage.passed, `红${rn}蓝${bn}红检查${rc}蓝检查${bc}`).toBe(true)
      }
    }
    expect(taskPassedCount).toBeGreaterThan(0)
    // 任务通过但知识证据不通过只可能出现在“红球加分但没有被检查为真”——这是合成轨迹才能构造的（真实 VM 里两个球同脚本，做不到）
    const synthetic = judged(trace({ scores: [red(21)], checks: [] }))
    expect([synthetic.task.passed, synthetic.knowledge.passed]).toEqual([true, false])
  })

  it('停止、出错、超过帧数上限的运行不判定', () => {
    for (const endedBy of ['stopped', 'error', 'frameCap'] as const) {
      expect(judgeRun(trace({ endedBy }), L04_LEVELS.solve).status, endedBy).toBe('not-judged')
    }
    const err = { ...trace({ endedBy: 'error' }), error: '沙箱崩了' }
    const j = judgeRun(err, L04_LEVELS.solve)
    expect(j.status === 'not-judged' && j.reason).toContain('沙箱崩了')
  })

  it('每次判定都带“理解情况”说明，而且任何结果都不宣称“已掌握”', () => {
    for (const t of [trace(), trace({ scores: [] , checks: [], finalScore: 0 }), trace({ scores: [red(1), blue(1)], checks: [] })]) {
      const j = judged(t)
      expect(j.understanding).toBe(UNDERSTANDING_NOTE)
      expect(JSON.stringify(j)).not.toContain('已掌握')
      expect(j.understanding).toContain('需要进一步解释或练习')
    }
  })

  it('三层各自的前缀固定；失败反馈写明哪一层未通过', () => {
    const j = judged(trace({ scores: [red(21), blue(21)] }))
    expect(j.stage.line.startsWith('舞台结果：')).toBe(true)
    expect(j.task.line.startsWith('任务结果：')).toBe(true)
    expect(j.knowledge.line.startsWith('知识证据：')).toBe(true)
    expect(j.conclusion).toContain('任务结果')
    expect(judged(trace({ scores: [red(21)], checks: [] })).conclusion).toContain('知识证据')
  })

  it('predictionOutcome：红球、蓝球各被加了几次分，最终得分', () => {
    expect(predictionOutcome(trace({ scores: [red(21), red(22), red(23)], finalScore: 3 }))).toEqual({ redScoreTimes: 3, blueScoreTimes: 0, finalScore: 3 })
    expect(predictionOutcome(trace({ scores: [], checks: [], finalScore: 0 }))).toEqual({ redScoreTimes: 0, blueScoreTimes: 0, finalScore: 0 })
  })
})

describe('结果失效与落账', () => {
  it('isTraceCurrent 要求指纹、关卡、运行序号三者一致', () => {
    const t = trace()
    const cur = { fingerprint: programFingerprint(STANDARD), levelId: 'solve', runId: 1 }
    expect(isTraceCurrent(t, cur)).toBe(true)
    expect(isTraceCurrent(t, { ...cur, fingerprint: 'x' })).toBe(false)
    expect(isTraceCurrent(t, { ...cur, levelId: 'explore' })).toBe(false)
    expect(isTraceCurrent(t, { ...cur, runId: 2 })).toBe(false)
    expect(isTraceCurrent(null, cur)).toBe(false)
  })

  it('通过后改动脚本，这一关立刻不再算通过；改回去才恢复', () => {
    let s = editProgram(initialState(), 'solve', STANDARD)
    s = recordRun(s, trace())
    expect(isLevelPassed(s, 'solve')).toBe(true)
    const edited = editProgram(s, 'solve', flag(repeat(31, iftouch(score(1), hide))))
    expect(isLevelPassed(edited, 'solve')).toBe(false)
    expect(isLevelPassed(editProgram(edited, 'solve', STANDARD), 'solve')).toBe(true)
  })

  it('用旧程序的运行结果落账给新程序：被丢弃，不污染状态', () => {
    const s = editProgram(initialState(), 'solve', flag(repeat(31, iftouch(score(1), hide))))
    expect(recordRun(s, trace())).toBe(s)
  })

  it('关卡之间互不影响；同一程序再次运行未通过时撤销之前的通过；停止的运行不改变通过状态', () => {
    let s = recordRun(editProgram(initialState(), 'solve', STANDARD), trace())
    expect(isLevelPassed(s, 'solve')).toBe(true)
    expect(isLevelPassed(s, 'transferPoints')).toBe(false)
    expect(isLevelPassed(recordRun(s, trace({ endedBy: 'stopped' })), 'solve')).toBe(true)
    s = recordRun(s, trace({ scores: [red(21), blue(21)] }))
    expect(isLevelPassed(s, 'solve')).toBe(false)
  })

  it('探索关需要预测并运行观察过才算完成（不看判定结果，只要正常跑完）', () => {
    let s = initialState()
    expect(exploreDone(s)).toBe(false)
    s = { ...s, predictions: { explore: { score: '1', blue: '不会' } } }
    expect(exploreDone(s)).toBe(false)
    s = recordRun(s, syntheticTrace('explore', DEMO_PROGRAM, 1, { scores: Array.from({ length: 8 }, (_, i) => red(21 + i)), finalScore: 8 }))
    expect(exploreDone(s)).toBe(true)
    expect(exploreDone({ ...s, predictions: { explore: { score: '1' } } })).toBe(false)
  })

  it('探索关的固定程序：重复 40 次 { 如果〈碰到篮子〉{ 得分+1 } }，故意没有隐藏', () => {
    expect(DEMO_PROGRAM).toEqual({ scripts: [{ hat: 'flag', body: [{ t: 'repeat', times: 40, body: [{ t: 'iftouch', body: [{ t: 'score', by: 1 }] }] }] }] })
    expect(validateProgram(DEMO_PROGRAM)).toEqual([])
    expect(JSON.stringify(DEMO_PROGRAM)).not.toContain('hide')
  })
})

describe('草稿', () => {
  it('保存后恢复：脚本、当前关卡、预测完整；通过状态与运行结果不被保存', () => {
    let s = editProgram(initialState(), 'solve', STANDARD)
    s = { ...s, levelId: 'solve', predictions: { explore: { score: '8', blue: '不会' } } }
    s = recordRun(s, trace())
    expect(isLevelPassed(s, 'solve')).toBe(true)
    const store = memoryStorage()
    expect(saveDraft(store, s)).toEqual({ ok: true })
    const raw = store.data[L04_CONTRACT.draftKey]
    expect(raw).not.toMatch(/passedAt|checks|scores|hides|finalScore|endedBy/)
    const loaded = loadDraft(store)
    expect(loaded.reason).toBeNull()
    expect(loaded.state).toMatchObject({ levelId: 'solve', predictions: { explore: { score: '8', blue: '不会' } } })
    expect(loaded.state?.programs.solve).toEqual(STANDARD)
    expect(isLevelPassed(loaded.state!, 'solve')).toBe(false)
  })

  it('保存失败必须报告失败，且不写入（fail-closed）', () => {
    expect(saveDraft(null, initialState())).toMatchObject({ ok: false })
    const throwing: StorageLike = { getItem: () => null, setItem: () => { throw new Error('满了') }, removeItem: () => {} }
    expect(saveDraft(throwing, initialState())).toMatchObject({ ok: false })
  })

  it('损坏的、其他课的、非法脚本的草稿被拒绝，且不覆盖好草稿', () => {
    const key = L04_CONTRACT.draftKey
    const cases: Array<[string, string]> = [
      ['{坏的', '损坏'],
      [JSON.stringify({ lessonId: 'G2-U3-L03', script: toDraft(initialState()) }), '其他课节'],
      [JSON.stringify({ lessonId: 'G2-U3-L04', script: { version: 1, levelId: 'solve', programs: { solve: flag(score(99)) }, predictions: {} } }), '不合法'],
      [JSON.stringify({ lessonId: 'G2-U3-L04' }), '格式无效'],
    ]
    for (const [raw, reason] of cases) {
      const store = memoryStorage()
      store.data[key] = raw
      const r = loadDraft(store)
      expect(r.state, raw).toBeNull()
      expect(r.reason, raw).toContain(reason)
      expect(store.data[key]).toBe(raw)
    }
  })

  it('超过 64KB 的草稿不保存也不恢复', () => {
    const base = initialState()
    const huge = { ...base, programs: { ...base.programs, solve: { scripts: Array.from({ length: 5000 }, () => ({ hat: null, body: [] })) } } }
    expect(saveDraft(memoryStorage(), huge)).toMatchObject({ ok: false })
    const store = memoryStorage()
    store.data[L04_CONTRACT.draftKey] = 'x'.repeat(70 * 1024)
    expect(loadDraft(store).reason).toContain('太大')
  })

  it('fromDraft：未知字段被丢掉；预测只保留有长度上限的文本；通过记录不能从草稿伪造；非法结构被拒绝', () => {
    const s = fromDraft({ ...toDraft(initialState()), passedAt: { solve: 'x' }, extra: 1, predictions: { explore: { score: 'y'.repeat(50), blue: '不会' } } })!
    expect(s.passedAt).toEqual({})
    expect(s.predictions.explore).toEqual({ blue: '不会' })
    expect(fromDraft({ ...toDraft(initialState()), levelId: 'nope' })).toBeNull()
    expect(fromDraft({ ...toDraft(initialState()), version: 2 })).toBeNull()
    expect(fromDraft({ ...toDraft(initialState()), programs: { solve: flag(repeat(2, repeat(2, score(1)))) } })).toBeNull()
  })

  it('其他课节的草稿键互不干扰', () => {
    const store = memoryStorage()
    store.data['kidscoding-draft:G2-U3-L03'] = 'L03 的内容'
    saveDraft(store, initialState())
    expect(store.data['kidscoding-draft:G2-U3-L03']).toBe('L03 的内容')
    expect(Object.keys(store.data).sort()).toEqual(['kidscoding-draft:G2-U3-L03', 'kidscoding-draft:G2-U3-L04'])
  })
})

describe('舞台状态字典', () => {
  it('startPositions 是具体的起点（不引用被测的参数以外的东西）', () => {
    expect(startPositions('solve')).toEqual({
      basket: { x: 0, y: -90 }, hitBall: { x: 0, y: 150, visible: true }, groundBall: { x: -150, y: 150, visible: true }, score: 0,
    })
  })
  it('往返不变：stageStateOf → parseStageState', () => {
    const p = { basket: { x: 0, y: -90 }, hitBall: { x: 0, y: -60, visible: false }, groundBall: { x: -150, y: 20, visible: true }, score: 3 }
    expect(parseStageState(stageStateOf(p, true, 'transferSlow'))).toEqual({ positions: p, running: true, levelId: 'transferSlow' })
  })
})

describe('事后参考做法', () => {
  it('每一关都有别的做法；都是合法程序；没有重复的标题；都有 flag 脚本', () => {
    for (const id of ['solve', 'transferPoints', 'transferSlow'] as const) {
      const alts = alternatives(L04_LEVELS[id])
      expect(alts.length, id).toBeGreaterThanOrEqual(2)
      expect(new Set(alts.map(a => a.title)).size).toBe(alts.length)
      for (const a of alts) {
        expect(validateProgram(a.program), a.title).toEqual([])
        expect(runnableScripts(a.program)).toHaveLength(1)
      }
    }
  })

  it('“刚好够”的做法重复次数等于球第一次碰到篮子的帧（真实 VM 实测：速度 10 → 21，速度 5 → 41）', () => {
    const just = (id: 'solve' | 'transferSlow') => alternatives(L04_LEVELS[id]).find(a => a.title.includes('刚好够'))!.program.scripts[0].body[0] as { times: number }
    expect(just('solve').times).toBe(21)
    expect(just('transferSlow').times).toBe(41)
  })

  it('得分增量跟随本关要求（迁移 A 的做法加 2 分）', () => {
    const json = JSON.stringify(alternatives(L04_LEVELS.transferPoints).map(a => a.program))
    expect(json).toContain('"by":2')
    expect(json).not.toContain('"by":1')
  })

  it('没实测过的球速不给别的做法', () => {
    expect(alternatives({ id: 'solve', layer: 2, ballSpeed: 15, points: 1 })).toEqual([])
  })

  it('用孩子自己的脚本生成描述，而不是写死的标准答案；散积木不算', () => {
    expect(describeProgram(STANDARD)).toBe('当绿旗被点击\n  重复执行 30 次\n    如果〈碰到 篮子？〉那么\n      将 得分 增加 1\n      隐藏')
    expect(describeProgram({ scripts: [] })).toBe('（还没有搭脚本）')
    expect(describeProgram({ scripts: [{ hat: null, body: [score(1)] }] })).toBe('（还没有搭脚本）')
  })

  it('课程说明里列出的积木种类就是编辑器真的提供的五种', () => {
    expect(L04_ACTIVITY_NOTE).toContain('五种')
    for (const name of ['当绿旗被点击', '重复执行', '如果碰到篮子', '将得分增加', '隐藏']) expect(L04_ACTIVITY_NOTE).toContain(name)
  })
})
