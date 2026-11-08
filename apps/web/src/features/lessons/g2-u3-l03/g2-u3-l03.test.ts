// @vitest-environment node
// G2-U3-L03 核心逻辑单元测试：参数、程序校验、编译结构、三层判定、种子序列、草稿、参考做法、沙箱常量一致。
// 判定测试用合成轨迹（只验证判定函数本身）；真实 VM 的运行结果见 tests/e2e/g2-u3-l03-vm.spec.ts。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileProject, GIFT_NAME, L03_ASSETS } from './compile'
import { L03_CONTENT, L03_CONTRACT, L03_DEMO_FROM, L03_DEMO_REPEAT, L03_DEMO_TO, validateL03Contract } from './contract'
import { effectiveBounds, isTraceCurrent, judgeRun, listPositions, predictionOutcome, UNDERSTANDING_NOTE, type RunTrace } from './judge'
import { allowedWidth, inAllowed, L03_LEVEL_ORDER, L03_LEVELS, L03_PARAMS, type LevelId } from './params'
import { countBlocks, programFingerprint, runnableScripts, validateProgram, type Block, type Program } from './program'
import { alternativeBounds, describeProgram } from './reference'
import { mulberry32, scratchRandomInt, seededSequence } from './seeded-random'
import {
  DEMO_PROGRAM, editProgram, exploreDone, fromDraft, initialState, isLevelPassed, loadDraft, recordRun, saveDraft,
  toDraft, type StorageLike,
} from './state'
import { defaultXs, syntheticTrace } from './testing/fake-vm-port'

const randomx = (from: number, to: number): Block => ({ t: 'randomx', from, to })
const repeat = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body })
const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const SOLVE: Program = flag(repeat(10, randomx(-150, 150)))

function trace(levelId: LevelId, over: { xs?: number[]; from?: number; to?: number; endedBy?: RunTrace['endedBy']; program?: Program } = {}): RunTrace {
  return syntheticTrace(levelId, over.program ?? SOLVE, 1, over)
}
function judged(t: RunTrace, levelId: LevelId) {
  const j = judgeRun(t, L03_LEVELS[levelId])
  if (j.status !== 'judged') throw new Error(`应该判定，但是：${j.reason}`)
  return j
}
function memoryStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v }, removeItem: k => { delete data[k] } }
}

describe('参数与契约', () => {
  it('教学参数现在是“提议”，不是已批准也不是已验证', () => {
    expect(L03_PARAMS.rulingStatus).toBe('proposed')
  })

  it('契约字段完整：恰 5 条目标、3 级提示、draftKey 绑定本课、教学定向', () => {
    expect(validateL03Contract(L03_CONTRACT)).toEqual([])
    expect(L03_CONTRACT.goal5).toHaveLength(5)
    expect(L03_CONTRACT.hints).toHaveLength(3)
    expect(L03_CONTRACT.draftKey).toBe('kidscoding-draft:G2-U3-L03')
    expect(L03_CONTRACT.judging.scopeLabel).toBe('教学定向')
  })

  it('故意错误的契约被拒绝', () => {
    expect(validateL03Contract({ ...L03_CONTRACT, goal5: ['a', 'b', 'c', 'd', ''] as never })).not.toEqual([])
    expect(validateL03Contract({ ...L03_CONTRACT, hints: ['a', 'b'] as never })).not.toEqual([])
    expect(validateL03Contract({ ...L03_CONTRACT, draftKey: 'kidscoding-draft:G2-U3-L02' })).not.toEqual([])
    expect(validateL03Contract({ ...L03_CONTRACT, engine: 'demo' as never })).not.toEqual([])
  })

  it('课程内容不跨课污染：不含条件积木、碰撞、计分（那是 L04）', () => {
    const all = JSON.stringify([L03_CONTRACT, L03_CONTENT])
    for (const stray of ['条件', '“如果”', '碰到', '得分', '分数', 'A1-', '摘要']) expect(all, stray).not.toContain(stray)
  })

  it('任何提示和任务说明都不含完整答案（不出现一对可直接填入的合法上下界）', () => {
    const texts = Object.values(L03_CONTENT).flatMap(c => [c.task, c.step, ...c.hints])
    for (const t of texts) {
      for (const level of Object.values(L03_LEVELS).filter(l => l.id !== 'explore')) {
        expect(t, t).not.toContain(`${level.allowedMin} 到 ${level.allowedMax} 之间取随机数`)
      }
    }
    // 提示逐级且不重复
    for (const c of Object.values(L03_CONTENT)) expect(new Set(c.hints).size).toBe(3)
  })

  it('四关：探索 1、独立 1、迁移 2；第一关只读演示且要求预测，其余关可编辑', () => {
    expect(L03_LEVEL_ORDER).toEqual(['explore', 'solve', 'transferRight', 'transferMiddle'])
    expect(L03_LEVEL_ORDER.map(id => L03_LEVELS[id].layer)).toEqual([1, 2, 3, 3])
    expect(L03_CONTENT.explore.readOnly).toBe(true)
    expect(L03_CONTENT.explore.prediction).toBeDefined()
    for (const id of ['solve', 'transferRight', 'transferMiddle'] as const) {
      expect(L03_CONTENT[id].readOnly).toBe(false)
      expect(L03_CONTENT[id].prediction).toBeUndefined()
    }
  })

  it('只有演示关用固定种子', () => {
    expect(L03_LEVEL_ORDER.filter(id => L03_LEVELS[id].seeded)).toEqual(['explore'])
  })

  it('每一关的要求范围都在舞台之内，且宽度足够做出“范围太窄”的反例', () => {
    for (const id of L03_LEVEL_ORDER) {
      const l = L03_LEVELS[id]
      expect(l.allowedMin).toBeGreaterThanOrEqual(L03_PARAMS.stageMinX)
      expect(l.allowedMax).toBeLessThanOrEqual(L03_PARAMS.stageMaxX)
      expect(allowedWidth(l)).toBeGreaterThan(L03_PARAMS.minDistinctPositions * 2)
      expect(allowedWidth(l)).toBeGreaterThanOrEqual(L03_PARAMS.requiredDraws)
    }
  })

  it('参数快照（改数值必须有意识地改这条测试，且需首席裁定）', () => {
    expect(L03_PARAMS).toMatchObject({
      stageMinX: -240, stageMaxX: 240, giftY: 0, minBound: -500, maxBound: 500, minRepeatTimes: 1, maxRepeatTimes: 20,
      maxBlocks: 8, maxNesting: 1, maxScripts: 3, requiredDraws: 10, minDistinctPositions: 3, minSpreadShare: 0.5, frameCap: 150, demoSeed: 7,
    })
    expect(L03_LEVELS.solve).toMatchObject({ allowedMin: -180, allowedMax: 180 })
    expect(L03_LEVELS.transferRight).toMatchObject({ allowedMin: 0, allowedMax: 180 })
    expect(L03_LEVELS.transferMiddle).toMatchObject({ allowedMin: -60, allowedMax: 60 })
  })

  it('inAllowed 两端都包含', () => {
    const l = L03_LEVELS.solve
    expect([inAllowed(-180, l), inAllowed(180, l), inAllowed(-181, l), inAllowed(181, l), inAllowed(0, l)]).toEqual([true, true, false, false, true])
  })
})

describe('为什么知识证据不能看运气：10 次取值全都碰巧落进 ±180 的概率', () => {
  // 上下界写成 -b～b 的程序，10 次取值全部落在 -180～180 的概率 = (361 / (2b+1))^10。
  const chance = (b: number) => (361 / (2 * b + 1)) ** 10
  it('数字与教学方案一致：过宽的范围有可观的概率“碰巧全对”，所以只看运气会放过错误程序', () => {
    const pct = (b: number) => Math.round(chance(b) * 1000) / 10
    expect([300, 240, 200, 190, 181].map(pct)).toEqual([0.6, 5.7, 35, 58.3, 94.6])
  })

  it('同一组“碰巧全在范围内”的位置：上下界过宽 → 舞台结果通过，知识证据仍不通过', () => {
    const xs = [10, -120, 80, 150, -60, 0, 100, -170, 40, 120] // 全在 ±180 内
    const lucky = judged(trace('solve', { xs, from: -200, to: 200 }), 'solve')
    expect(lucky.stage.passed).toBe(true)
    expect(lucky.task.passed).toBe(true)
    expect(lucky.knowledge.passed).toBe(false)
    expect(lucky.passed).toBe(false)
    const honest = judged(trace('solve', { xs, from: -150, to: 150 }), 'solve')
    expect(honest.knowledge.passed).toBe(true)
    expect(honest.passed).toBe(true)
  })

  it('知识证据与这一次的取值无关：同样的上下界、不同的位置，结论和文字都一样', () => {
    const a = judged(trace('solve', { xs: defaultXs('solve'), from: -150, to: 150 }), 'solve')
    const b = judged(trace('solve', { xs: defaultXs('solve').map(x => Math.round(x / 2)), from: -150, to: 150 }), 'solve')
    expect(a.knowledge.passed).toBe(b.knowledge.passed)
    expect(a.knowledge.line).toBe(b.knowledge.line)
  })
})

describe('程序校验', () => {
  it('合法程序通过；越界、小数、未知类型、太多积木、嵌套太深被拒绝', () => {
    expect(validateProgram(SOLVE)).toEqual([])
    expect(validateProgram({ scripts: [] })).toEqual([])
    expect(validateProgram(flag(randomx(-501, 0)))).not.toEqual([])
    expect(validateProgram(flag(randomx(0, 501)))).not.toEqual([])
    expect(validateProgram(flag(randomx(0.5, 3)))).not.toEqual([])
    expect(validateProgram(flag(randomx(Number.NaN, 3)))).not.toEqual([])
    expect(validateProgram(flag({ t: 'move', dx: 3 } as never))).not.toEqual([])
    expect(validateProgram(flag(repeat(2, repeat(2, randomx(0, 1)))))).not.toEqual([])
    expect(validateProgram(null)).not.toEqual([])
    expect(validateProgram({})).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'x', body: [] }] })).not.toEqual([])
  })

  it('上下界：-500 与 500 合法；±501 非法（下界、上界各自检查）', () => {
    expect(validateProgram(flag(randomx(-500, 500)))).toEqual([])
    expect(validateProgram(flag(randomx(-501, 500)))).toHaveLength(1)
    expect(validateProgram(flag(randomx(-500, 501)))).toHaveLength(1)
    expect(validateProgram(flag(randomx(-501, 501)))).toHaveLength(2)
  })

  it('颠倒的上下界是合法输入（Scratch 会对调），不在校验里拒绝', () => {
    expect(validateProgram(flag(randomx(150, -150)))).toEqual([])
  })

  it('重复次数：1 与 20 合法；0、21、1.5、NaN 非法', () => {
    for (const n of [1, 20]) expect(validateProgram(flag(repeat(n, randomx(0, 1)))), String(n)).toEqual([])
    for (const n of [0, 21, 1.5, Number.NaN]) expect(validateProgram(flag(repeat(n, randomx(0, 1)))), String(n)).not.toEqual([])
  })

  it('积木总数（不含绿旗）：8 块合法，9 块非法；分散在多个脚本里也一起计数', () => {
    const many = (n: number) => Array.from({ length: n }, () => randomx(0, 1))
    expect(validateProgram(flag(...many(8)))).toEqual([])
    expect(validateProgram(flag(...many(9)))).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'flag', body: many(5) }, { hat: 'flag', body: many(4) }] })).not.toEqual([])
    expect(countBlocks([repeat(2, randomx(0, 1), randomx(0, 1)), randomx(0, 1)])).toBe(4)
  })

  it('嵌套 1 层合法，2 层非法；脚本 3 条合法，4 条非法', () => {
    expect(validateProgram(flag(repeat(2, randomx(0, 1))))).toEqual([])
    expect(validateProgram(flag(repeat(2, repeat(2, randomx(0, 1)))))).not.toEqual([])
    const s = { hat: 'flag' as const, body: [randomx(0, 1)] }
    expect(validateProgram({ scripts: [s, s, s] })).toEqual([])
    expect(validateProgram({ scripts: [s, s, s, s] })).not.toEqual([])
  })

  it('散积木（没接绿旗）合法但不会运行', () => {
    const p: Program = { scripts: [{ hat: null, body: [randomx(0, 1)] }, { hat: 'flag', body: [randomx(2, 3)] }] }
    expect(validateProgram(p)).toEqual([])
    expect(runnableScripts(p)).toHaveLength(1)
    expect(runnableScripts(p)[0].body).toEqual([randomx(2, 3)])
  })

  it('指纹：任何编辑（含散积木、上下界互换）都会改变', () => {
    const base = programFingerprint(SOLVE)
    expect(programFingerprint(flag(repeat(10, randomx(-150, 151))))).not.toBe(base)
    expect(programFingerprint(flag(repeat(10, randomx(150, -150))))).not.toBe(base)
    expect(programFingerprint({ scripts: [...SOLVE.scripts, { hat: null, body: [] }] })).not.toBe(base)
    expect(programFingerprint(JSON.parse(JSON.stringify(SOLVE)))).toBe(base)
  })
})

describe('编译为 Scratch 工程（只检查结构，执行由真实 VM 完成）', () => {
  type P = ReturnType<typeof compileProject>['targets'][number] & { blocks: Record<string, { opcode: string; next: string | null; parent: string | null; inputs: Record<string, unknown> }> }
  const giftOf = (program: Program) => compileProject(program).targets[1] as unknown as P

  it('两个角色：舞台与“礼物”；礼物在 (0, giftY) 起点', () => {
    const t = compileProject(SOLVE).targets as unknown as Array<Record<string, unknown>>
    expect(t.map(x => x.name)).toEqual(['Stage', GIFT_NAME])
    expect(t[1]).toMatchObject({ x: 0, y: L03_PARAMS.giftY, isStage: false })
    expect(t[0].isStage).toBe(true)
  })

  it('礼物脚本编译成 Scratch 原生 opcode：绿旗 → 重复执行 → 将 x 设为（嵌套 operator_random，FROM / TO 原样）', () => {
    const g = giftOf(SOLVE)
    const ops = Object.values(g.blocks).map(b => b.opcode).sort()
    expect(ops).toEqual(['control_repeat', 'event_whenflagclicked', 'motion_setx', 'operator_random'])
    const rnd = Object.values(g.blocks).find(b => b.opcode === 'operator_random')!
    expect(rnd.inputs).toEqual({ FROM: [1, [4, '-150']], TO: [1, [4, '150']] })
    const setx = Object.values(g.blocks).find(b => b.opcode === 'motion_setx')!
    const X = setx.inputs.X as [number, string, unknown]
    expect(X[0]).toBe(3)
    expect(g.blocks[X[1]]).toBe(rnd)
    expect(rnd.parent).toBeTruthy()
    const rep = Object.values(g.blocks).find(b => b.opcode === 'control_repeat')!
    expect(rep.inputs.TIMES).toEqual([1, [6, '10']])
  })

  it('上下界原样进入工程，不被“整理”：颠倒的上下界保持颠倒，交给真实 VM 处理', () => {
    const g = giftOf(flag(repeat(10, randomx(150, -150))))
    const rnd = Object.values(g.blocks).find(b => b.opcode === 'operator_random')!
    expect(rnd.inputs).toEqual({ FROM: [1, [4, '150']], TO: [1, [4, '-150']] })
  })

  it('空程序与散积木不生成会运行的脚本', () => {
    expect(Object.keys(giftOf({ scripts: [] }).blocks)).toHaveLength(0)
    expect(Object.keys(giftOf({ scripts: [{ hat: null, body: [randomx(0, 1)] }] }).blocks)).toHaveLength(0)
  })

  it('只有绿旗：只有一个帽子积木', () => {
    expect(Object.values(giftOf(flag()).blocks).map(b => b.opcode)).toEqual(['event_whenflagclicked'])
  })

  it('不合法的程序拒绝编译，不会送进 VM', () => {
    expect(() => compileProject(flag(repeat(99, randomx(0, 1))))).toThrow('程序不合法')
    expect(() => compileProject(flag(randomx(0, 9999)))).toThrow('程序不合法')
  })

  it('块与块的父子、next 连接一致，没有悬空引用', () => {
    const g = giftOf({ scripts: [{ hat: 'flag', body: [randomx(0, 5), repeat(3, randomx(-5, 5), randomx(1, 2)), randomx(7, 8)] }] })
    const ids = new Set(Object.keys(g.blocks))
    for (const [id, b] of Object.entries(g.blocks)) {
      if (b.next) {
        expect(ids.has(b.next), `${id}.next`).toBe(true)
        expect(g.blocks[b.next].parent).toBe(id)
      }
      if (b.parent) expect(ids.has(b.parent), `${id}.parent`).toBe(true)
    }
    expect(Object.values(g.blocks).filter(b => b.opcode === 'operator_random')).toHaveLength(4)
  })

  it('最大合法程序可以编译：块数 = 积木数 × 2（每个“将 x 设为”带一个取随机数）+ 重复数 + 帽子数', () => {
    const body = [repeat(20, randomx(-500, 500), randomx(-500, 500), randomx(-500, 500)), randomx(0, 0), randomx(1, 1), randomx(2, 2), randomx(3, 3)]
    expect(countBlocks(body)).toBe(8)
    const g = giftOf(flag(...body))
    expect(Object.keys(g.blocks)).toHaveLength(1 + 1 + 7 * 2)
  })

  it('素材 ID 是沙箱内置的那两个', () => {
    const costumes = (compileProject(SOLVE).targets as unknown as Array<{ costumes: Array<{ assetId: string }> }>).map(t => t.costumes[0].assetId)
    expect(costumes).toEqual([L03_ASSETS.backdrop, L03_ASSETS.gift])
  })
})

describe('沙箱常量与 TypeScript 一致（防止两边数字漂移）', () => {
  const html = readFileSync(join(process.cwd(), 'public', 'scratch-g2-u3-l03-sandbox.html'), 'utf8')

  it('LIMITS 与 params.ts 一致', () => {
    const limits = /const LIMITS = \{([^}]*)\}/.exec(html)?.[1] ?? ''
    const read = (key: string) => Number(new RegExp(`${key}:\\s*(-?\\d+)`).exec(limits)?.[1])
    for (const key of ['stageMinX', 'stageMaxX', 'giftY', 'minBound', 'maxBound', 'minRepeatTimes', 'maxRepeatTimes', 'maxBlocks', 'maxNesting', 'maxScripts', 'frameCap', 'demoSeed'] as const) {
      expect(read(key), key).toBe(L03_PARAMS[key])
    }
  })

  it('素材 ID 与 compile.ts 一致', () => {
    for (const [key, id] of Object.entries(L03_ASSETS)) expect(html).toContain(`${key}: '${id}'`)
  })

  it('沙箱只允许本课需要的四种积木', () => {
    const set = /const ALLOWED_GIFT = new Set\(\[([^\]]*)\]\)/.exec(html)?.[1] ?? ''
    const ops = set.split(',').map(s => s.trim().replace(/'/g, '')).sort()
    expect(ops).toEqual(['control_repeat', 'event_whenflagclicked', 'motion_setx', 'operator_random'])
  })

  it('沙箱固定 scratch-vm@5.0.300 与 scratch-storage@4.0.0，同一个自托管位置，不走 CDN', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { dependencies?: Record<string, string> }
    expect(pkg.dependencies?.['scratch-vm']).toBe('5.0.300')
    expect(pkg.dependencies?.['scratch-storage']).toBe('4.0.0')
    for (const src of ['/scratch-vm/scratch-vm.js', '/scratch-vm/scratch-storage.min.js']) expect(html).toContain(`<script src="${src}"></script>`)
    expect(html).not.toMatch(/\b(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//i)
    expect(html).not.toMatch(/url\(\s*["']?\s*(?:https?:)?\/\//i)
    expect(html).not.toMatch(/jsdelivr/i)
  })

  it('沙箱的内容安全策略：不允许任何网络连接，不允许 CDN', () => {
    const csp = /Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? ''
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
    expect(csp).toContain("connect-src 'none'")
    expect(csp).not.toMatch(/jsdelivr|https?:/)
  })

  it('沙箱不发起网络请求，内置素材 SVG 不含脚本或事件属性', () => {
    const script = html.slice(html.indexOf('<script>\n(() =>'))
    expect(script).not.toMatch(/\bfetch\s*\(/)
    expect(script).not.toMatch(/XMLHttpRequest/)
    const svgBlock = /const SVG = \{([\s\S]*?)\n  \};/.exec(script)?.[1] ?? ''
    expect(svgBlock.length).toBeGreaterThan(100)
    expect(svgBlock).not.toMatch(/<script/i)
    expect(svgBlock).not.toMatch(/\son[a-z]+=/i)
    expect(svgBlock).not.toMatch(/xlink:href|<image|<foreignObject/i)
  })

  it('沙箱的种子发生器和 TypeScript 孪生是同一个算法（逐字对照关键常数）', () => {
    for (const k of ['0x6d2b79f5', 'Math.imul(t ^ (t >>> 15), t | 1)', 't ^= t + Math.imul(t ^ (t >>> 7), t | 61)', '4294967296']) expect(html, k).toContain(k)
  })
})

describe('三层判定（合成轨迹）', () => {
  it('全部在范围内、10 次、足够多的不同位置、上下界合适：三层都通过', () => {
    const j = judged(trace('solve'), 'solve')
    expect([j.stage.passed, j.task.passed, j.knowledge.passed, j.passed]).toEqual([true, true, true, true])
    expect(j.conclusion).toContain('任务达标')
    expect(j.conclusion).toContain('这只说明这一次运行的行为')
  })

  it('有一次跑出范围：舞台、任务不通过，写出是哪几个位置', () => {
    const xs = defaultXs('solve').map((x, i) => (i === 3 ? 181 : x))
    const j = judged(trace('solve', { xs }), 'solve')
    expect(j.stage.passed).toBe(false)
    expect(j.stage.line).toContain('1 次超出')
    expect(j.stage.line).toContain('181')
    expect(j.task.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  it('范围的两端都包含：恰好等于 -180 / 180 通过，-181 / 181 不通过（两侧对称）', () => {
    const base = defaultXs('solve')
    expect(judged(trace('solve', { xs: base.map((x, i) => (i === 0 ? -180 : i === 9 ? 180 : x)) }), 'solve').stage.passed).toBe(true)
    expect(judged(trace('solve', { xs: base.map((x, i) => (i === 0 ? -181 : x)) }), 'solve').stage.passed).toBe(false)
    expect(judged(trace('solve', { xs: base.map((x, i) => (i === 9 ? 181 : x)) }), 'solve').stage.passed).toBe(false)
  })

  it('次数：恰好 10 次通过，9 次不通过（写明只出现了几次）', () => {
    const ten = defaultXs('solve')
    expect(judged(trace('solve', { xs: ten }), 'solve').task.passed).toBe(true)
    const nine = judged(trace('solve', { xs: ten.slice(0, 9) }), 'solve')
    expect(nine.stage.passed).toBe(false)
    expect(nine.task.passed).toBe(false)
    expect(nine.task.line).toContain('9 次')
    expect(judged(trace('solve', { xs: [...ten, 5] }), 'solve').passed).toBe(true)
  })

  it('不同位置：恰好 3 个通过，2 个不通过（写死一个数不算随机）', () => {
    const three = Array.from({ length: 10 }, (_, i) => [10, 20, 30][i % 3])
    const two = Array.from({ length: 10 }, (_, i) => [10, 20][i % 2])
    const one = Array.from({ length: 10 }, () => 40)
    expect(judged(trace('solve', { xs: three }), 'solve').task.passed).toBe(true)
    const t2 = judged(trace('solve', { xs: two }), 'solve')
    expect(t2.task.passed).toBe(false)
    expect(t2.task.line).toContain('2 个不同的位置')
    expect(judged(trace('solve', { xs: one }), 'solve').task.passed).toBe(false)
  })

  it('上下界相同（把随机数写成了一个固定的数）：任务不通过，知识证据也不通过（范围太窄）', () => {
    const j = judged(trace('solve', { xs: Array.from({ length: 10 }, () => 30), from: 30, to: 30 }), 'solve')
    expect(j.task.passed).toBe(false)
    expect(j.knowledge.passed).toBe(false)
    expect(j.knowledge.line).toContain('范围太窄')
  })

  it('上下界宽度恰好一半通过，少 1 不通过（两个方向都测）', () => {
    const need = Math.ceil(allowedWidth(L03_LEVELS.solve) * L03_PARAMS.minSpreadShare) // 180
    const xs = defaultXs('solve')
    expect(judged(trace('solve', { xs, from: 0, to: need }), 'solve').knowledge.passed).toBe(true)
    expect(judged(trace('solve', { xs, from: 0, to: need - 1 }), 'solve').knowledge.passed).toBe(false)
    expect(judged(trace('solve', { xs, from: -need, to: 0 }), 'solve').knowledge.passed).toBe(true)
    expect(judged(trace('solve', { xs, from: -need + 1, to: 0 }), 'solve').knowledge.passed).toBe(false)
  })

  it('上下界超出要求范围一点点就不通过（下界、上界各一侧），写出实际用到的范围', () => {
    const xs = defaultXs('solve')
    const lo = judged(trace('solve', { xs, from: -181, to: 100 }), 'solve')
    const hi = judged(trace('solve', { xs, from: -100, to: 181 }), 'solve')
    expect(lo.knowledge.passed).toBe(false)
    expect(hi.knowledge.passed).toBe(false)
    expect(lo.knowledge.line).toContain('-181～100')
    expect(judged(trace('solve', { xs, from: -180, to: 180 }), 'solve').knowledge.passed).toBe(true)
  })

  it('颠倒的上下界按 Scratch 的规则对调：150 到 -150 与 -150 到 150 同样通过', () => {
    expect(effectiveBounds({ from: 150, to: -150 })).toEqual({ low: -150, high: 150 })
    expect(judged(trace('solve', { from: 150, to: -150 }), 'solve').knowledge.passed).toBe(true)
    expect(judged(trace('solve', { from: 190, to: -100 }), 'solve').knowledge.passed).toBe(false)
  })

  it('循环里每次的上下界都要对：只要有一次取随机数超范围，知识证据就不通过', () => {
    const t = trace('solve')
    t.draws[6] = { ...t.draws[6], from: -400, to: 400 }
    expect(judged(t, 'solve').knowledge.passed).toBe(false)
  })

  it('没有取随机数真正运行：知识证据不通过，并说明原因', () => {
    const t = trace('solve', { xs: [] })
    const j = judged(t, 'solve')
    expect(j.knowledge.passed).toBe(false)
    expect(j.knowledge.line).toContain('没有看到')
    expect(j.stage.passed).toBe(false)
    expect(j.task.line).toContain('没有出现在新的位置')
  })

  it('各关的要求范围各不相同：同一组位置在不同关的结论不同', () => {
    const xs = defaultXs('solve') // -180..180
    expect(judged(trace('transferRight', { xs, from: 0, to: 180 }), 'transferRight').stage.passed).toBe(false) // 有负数
    const right = Array.from({ length: 10 }, (_, i) => i * 20)
    expect(judged(trace('transferRight', { xs: right, from: 0, to: 180 }), 'transferRight').passed).toBe(true)
    const mid = Array.from({ length: 10 }, (_, i) => -60 + i * 13)
    expect(judged(trace('transferMiddle', { xs: mid, from: -60, to: 60 }), 'transferMiddle').passed).toBe(true)
    expect(judged(trace('transferMiddle', { xs: mid, from: -100, to: 100 }), 'transferMiddle').knowledge.passed).toBe(false)
  })

  it('停止、出错、超过帧数上限的运行不判定', () => {
    for (const endedBy of ['stopped', 'error', 'frameCap'] as const) {
      const j = judgeRun(trace('solve', { endedBy }), L03_LEVELS.solve)
      expect(j.status, endedBy).toBe('not-judged')
    }
    const errTrace = { ...trace('solve', { endedBy: 'error' }), error: '沙箱崩了' }
    const j = judgeRun(errTrace, L03_LEVELS.solve)
    expect(j.status === 'not-judged' && j.reason).toContain('沙箱崩了')
  })

  it('每次判定都带“理解情况”说明，而且任何结果都不宣称“已掌握”', () => {
    for (const t of [trace('solve'), trace('solve', { xs: [] }), trace('solve', { from: -400, to: 400 })]) {
      const j = judged(t, 'solve')
      expect(j.understanding).toBe(UNDERSTANDING_NOTE)
      expect(JSON.stringify(j)).not.toContain('已掌握')
      expect(j.understanding).toContain('需要进一步解释或练习')
    }
  })

  it('三层各自的前缀固定', () => {
    const j = judged(trace('solve'), 'solve')
    expect(j.stage.line.startsWith('舞台结果：')).toBe(true)
    expect(j.task.line.startsWith('任务结果：')).toBe(true)
    expect(j.knowledge.line.startsWith('知识证据：')).toBe(true)
  })

  it('失败反馈写明哪一层未通过', () => {
    expect(judged(trace('solve', { from: -400, to: 400 }), 'solve').conclusion).toContain('知识证据')
    expect(judged(trace('solve', { xs: [] }), 'solve').conclusion).toContain('任务结果')
  })

  it('长位置列表被截短，不撑爆界面', () => {
    expect(listPositions([1, 2, 3])).toBe('1、2、3')
    expect(listPositions(Array.from({ length: 30 }, (_, i) => i), 5)).toBe('0、1、2、3、4……（共 30 个）')
  })

  it('predictionOutcome：这一次有几次在要求范围外、有没有跑出整个舞台', () => {
    const t = trace('explore', { xs: [10, -200, 250, 0, 0, 0, 0, 0, 0, -300] })
    expect(predictionOutcome(t, L03_LEVELS.explore)).toEqual({ total: 10, outside: 3, beyondStage: true })
    expect(predictionOutcome(trace('explore', { xs: [-200, 200] }), L03_LEVELS.explore)).toEqual({ total: 2, outside: 2, beyondStage: false })
    expect(predictionOutcome(trace('explore', { xs: [] }), L03_LEVELS.explore)).toEqual({ total: 0, outside: 0, beyondStage: false })
  })
})

describe('种子序列（演示关）', () => {
  const EXPECTED = [-293, -263, 287, 120, 13, -57, -20, -156, 32, 138]

  it('种子 7、-300～300、10 次的序列固定（与独立的 Python 计算和真实 VM 一致）', () => {
    expect(seededSequence(L03_PARAMS.demoSeed, -300, 300, 10)).toEqual(EXPECTED)
  })

  it('同一个种子永远给同一串；不同种子给不同串', () => {
    expect(seededSequence(7, -300, 300, 10)).toEqual(seededSequence(7, -300, 300, 10))
    expect(seededSequence(8, -300, 300, 10)).not.toEqual(EXPECTED)
    const a = mulberry32(1)
    const b = mulberry32(1)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('scratchRandomInt：两端都包含；颠倒的上下界对调；相等直接返回', () => {
    expect(scratchRandomInt(3, 3, () => 0.99)).toBe(3)
    expect(scratchRandomInt(-5, 5, () => 0)).toBe(-5)
    expect(scratchRandomInt(-5, 5, () => 0.999999)).toBe(5)
    expect(scratchRandomInt(5, -5, () => 0)).toBe(-5)
    expect(scratchRandomInt(5, -5, () => 0.999999)).toBe(5)
  })

  it('上下界相等时不消耗发生器（与 Scratch 一致）：后面的序列不会因此错位', () => {
    let calls = 0
    const counting = () => { calls += 1; return 0.5 }
    expect(scratchRandomInt(3, 3, counting)).toBe(3)
    expect(calls).toBe(0)
    scratchRandomInt(1, 4, counting)
    expect(calls).toBe(1)
  })

  it('演示关的固定程序与契约常量一致，而且这串位置确实让预测有可对照的答案', () => {
    expect(DEMO_PROGRAM).toEqual({ scripts: [{ hat: 'flag', body: [{ t: 'repeat', times: L03_DEMO_REPEAT, body: [{ t: 'randomx', from: L03_DEMO_FROM, to: L03_DEMO_TO }] }] }] })
    expect(validateProgram(DEMO_PROGRAM)).toEqual([])
    const demo = syntheticTrace('explore', DEMO_PROGRAM, 1, { xs: EXPECTED, from: L03_DEMO_FROM, to: L03_DEMO_TO })
    expect(predictionOutcome(demo, L03_LEVELS.explore)).toEqual({ total: 10, outside: 3, beyondStage: true }) // -293、-263、287
    expect(judged(demo, 'explore').knowledge.passed).toBe(false) // 上下界 -300～300 超出要求
  })

  it('演示关的取值只是展示：不管结果如何，recordRun 都算“观察过”，通过由真实判定产生', () => {
    const state = recordRun(initialState(), syntheticTrace('explore', DEMO_PROGRAM, 1, { xs: EXPECTED, from: -300, to: 300 }))
    expect(isLevelPassed(state, 'explore')).toBe(true)
  })
})

describe('结果失效与落账', () => {
  it('isTraceCurrent 要求指纹、关卡、运行序号三者一致', () => {
    const t = trace('solve')
    const cur = { fingerprint: programFingerprint(SOLVE), levelId: 'solve', runId: 1 }
    expect(isTraceCurrent(t, cur)).toBe(true)
    expect(isTraceCurrent(t, { ...cur, fingerprint: 'x' })).toBe(false)
    expect(isTraceCurrent(t, { ...cur, levelId: 'explore' })).toBe(false)
    expect(isTraceCurrent(t, { ...cur, runId: 2 })).toBe(false)
    expect(isTraceCurrent(null, cur)).toBe(false)
  })

  it('通过后改动脚本，这一关立刻不再算通过；改回去才恢复', () => {
    let s = editProgram(initialState(), 'solve', SOLVE)
    s = recordRun(s, trace('solve'))
    expect(isLevelPassed(s, 'solve')).toBe(true)
    const edited = editProgram(s, 'solve', flag(repeat(10, randomx(-150, 151))))
    expect(isLevelPassed(edited, 'solve')).toBe(false)
    expect(isLevelPassed(editProgram(edited, 'solve', SOLVE), 'solve')).toBe(true)
  })

  it('用旧程序的运行结果落账给新程序：被丢弃，不污染状态', () => {
    const s = editProgram(initialState(), 'solve', flag(repeat(10, randomx(-100, 100))))
    expect(recordRun(s, trace('solve'))).toBe(s)
  })

  it('关卡之间互不影响：solve 通过不会让 transferRight 通过', () => {
    const s = recordRun(editProgram(initialState(), 'solve', SOLVE), trace('solve'))
    expect(isLevelPassed(s, 'solve')).toBe(true)
    expect(isLevelPassed(s, 'transferRight')).toBe(false)
  })

  it('同一程序再次运行未通过时，撤销之前的通过', () => {
    let s = editProgram(initialState(), 'solve', SOLVE)
    s = recordRun(s, trace('solve'))
    s = recordRun(s, trace('solve', { xs: defaultXs('solve').map((x, i) => (i === 0 ? 200 : x)) }))
    expect(isLevelPassed(s, 'solve')).toBe(false)
  })

  it('只有“任务和知识同时通过”才算通过：知识不过（上下界过宽）即使这次全在范围内也不算', () => {
    const wide = flag(repeat(10, randomx(-300, 300)))
    const s = recordRun(editProgram(initialState(), 'solve', wide), syntheticTrace('solve', wide, 1, { from: -300, to: 300 }))
    expect(isLevelPassed(s, 'solve')).toBe(false)
  })

  it('停止的运行不改变通过状态', () => {
    const s = recordRun(editProgram(initialState(), 'solve', SOLVE), trace('solve'))
    expect(isLevelPassed(recordRun(s, trace('solve', { endedBy: 'stopped' })), 'solve')).toBe(true)
  })

  it('探索关需要预测并运行观察过才算完成', () => {
    let s = initialState()
    expect(exploreDone(s)).toBe(false)
    s = { ...s, predictions: { explore: { count: '3', escapes: '会' } } }
    expect(exploreDone(s)).toBe(false)
    s = recordRun(s, syntheticTrace('explore', DEMO_PROGRAM, 1, { xs: defaultXs('explore'), from: -300, to: 300 }))
    expect(exploreDone(s)).toBe(true)
    expect(exploreDone({ ...s, predictions: { explore: { count: '3' } } })).toBe(false)
  })
})

describe('草稿', () => {
  it('保存后恢复：脚本、当前关卡、预测完整；通过状态与运行结果不被保存', () => {
    let s = editProgram(initialState(), 'solve', SOLVE)
    s = { ...s, levelId: 'solve', predictions: { explore: { count: '3', escapes: '会' } } }
    s = recordRun(s, trace('solve'))
    expect(isLevelPassed(s, 'solve')).toBe(true)
    const store = memoryStorage()
    expect(saveDraft(store, s)).toEqual({ ok: true })
    const raw = store.data[L03_CONTRACT.draftKey]
    expect(raw).not.toMatch(/passedAt|placements|draws|endedBy/)
    const loaded = loadDraft(store)
    expect(loaded.reason).toBeNull()
    expect(loaded.state).toMatchObject({ levelId: 'solve', predictions: { explore: { count: '3', escapes: '会' } } })
    expect(loaded.state?.programs.solve).toEqual(SOLVE)
    expect(isLevelPassed(loaded.state!, 'solve')).toBe(false) // 重新运行才算
  })

  it('保存失败必须报告失败，且不写入（fail-closed）', () => {
    expect(saveDraft(null, initialState())).toMatchObject({ ok: false })
    const throwing: StorageLike = { getItem: () => null, setItem: () => { throw new Error('满了') }, removeItem: () => {} }
    expect(saveDraft(throwing, initialState())).toMatchObject({ ok: false })
  })

  it('损坏的、其他课的、非法脚本的草稿被拒绝，且不覆盖好草稿', () => {
    const key = L03_CONTRACT.draftKey
    const cases: Array<[string, string]> = [
      ['{坏的', '损坏'],
      [JSON.stringify({ lessonId: 'G2-U3-L02', script: toDraft(initialState()) }), '其他课节'],
      [JSON.stringify({ lessonId: 'G2-U3-L03', script: { version: 1, levelId: 'solve', programs: { solve: flag(randomx(0, 9999)) }, predictions: {} } }), '不合法'],
      [JSON.stringify({ lessonId: 'G2-U3-L03' }), '格式无效'],
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
    const big = { ...initialState(), predictions: { explore: { count: 'x'.repeat(100) } } }
    const huge = { ...big, programs: { ...big.programs, solve: { scripts: Array.from({ length: 5000 }, () => ({ hat: null, body: [] })) } } }
    expect(saveDraft(memoryStorage(), huge)).toMatchObject({ ok: false })
    const store = memoryStorage()
    store.data[L03_CONTRACT.draftKey] = 'x'.repeat(70 * 1024)
    expect(loadDraft(store).reason).toContain('太大')
  })

  it('fromDraft：未知字段被丢掉；预测只保留有长度上限的文本；通过记录不能从草稿伪造', () => {
    const s = fromDraft({ ...toDraft(initialState()), passedAt: { solve: 'x' }, extra: 1, predictions: { explore: { count: 'y'.repeat(50), escapes: '会' } } })!
    expect(s.passedAt).toEqual({})
    expect(s.predictions.explore).toEqual({ escapes: '会' })
    expect(fromDraft({ ...toDraft(initialState()), levelId: 'nope' })).toBeNull()
    expect(fromDraft({ ...toDraft(initialState()), version: 2 })).toBeNull()
  })

  it('其他课节的草稿键互不干扰', () => {
    const store = memoryStorage()
    store.data['kidscoding-draft:G2-U3-L02'] = 'L02 的内容'
    saveDraft(store, initialState())
    expect(store.data['kidscoding-draft:G2-U3-L02']).toBe('L02 的内容')
    expect(Object.keys(store.data).sort()).toEqual(['kidscoding-draft:G2-U3-L02', 'kidscoding-draft:G2-U3-L03'])
  })
})

describe('事后参考做法', () => {
  it('枚举出的上下界都在要求范围内、宽度够，而且真的能通过知识证据；第一个是要求范围本身', () => {
    for (const id of ['solve', 'transferRight', 'transferMiddle'] as const) {
      const level = L03_LEVELS[id]
      const alts = alternativeBounds(level)
      expect(alts.length, id).toBeGreaterThanOrEqual(2)
      expect(alts[0]).toEqual({ from: level.allowedMin, to: level.allowedMax })
      for (const a of alts) {
        const xs = Array.from({ length: 10 }, (_, i) => Math.round(a.from + ((a.to - a.from) * i) / 9))
        const j = judged(trace(id, { xs, from: a.from, to: a.to }), id)
        expect(j.knowledge.passed, `${id} ${a.from}~${a.to}`).toBe(true)
        expect(j.passed, `${id} ${a.from}~${a.to}`).toBe(true)
      }
    }
  })

  it('不会给出会失败的做法：窄到一半以下的范围不在列表里', () => {
    const level = L03_LEVELS.solve
    const minSpread = Math.ceil(allowedWidth(level) * L03_PARAMS.minSpreadShare)
    for (const a of alternativeBounds(level, 50)) expect(a.to - a.from).toBeGreaterThanOrEqual(minSpread)
  })

  it('用孩子自己的脚本生成描述，而不是写死的标准答案；散积木不算', () => {
    expect(describeProgram(SOLVE)).toBe('当绿旗被点击\n  重复执行 10 次\n    将 x 设为（在 -150 到 150 之间取随机数）')
    expect(describeProgram({ scripts: [] })).toBe('（还没有搭脚本）')
    expect(describeProgram({ scripts: [{ hat: null, body: [randomx(0, 1)] }] })).toBe('（还没有搭脚本）')
  })
})
