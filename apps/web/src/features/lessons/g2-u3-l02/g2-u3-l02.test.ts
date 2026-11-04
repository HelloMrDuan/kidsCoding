// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BASKET_NAME, compileProject, FRUIT_NAME, L02_ASSETS } from './compile'
import { L02_CONTENT, L02_CONTRACT, L02_DEMO_REPEAT, L02_DEMO_STEP, validateL02Contract } from './contract'
import { isTraceCurrent, judgeRun, type BasketMove, type RunTrace } from './judge'
import { fruitFallRepeats, framesToLand, L02_LEVEL_ORDER, L02_LEVELS, L02_PARAMS, type LevelId } from './params'
import { programFingerprint, validateProgram, type Block, type Program } from './program'
import { alternativeSolutions, describeProgram } from './reference'
import {
  DEMO_PROGRAM, editProgram, exploreDone, fromDraft, initialState, isLevelPassed, loadDraft, recordRun, saveDraft,
  toDraft, type StorageLike,
} from './state'

const move = (dx: number): Block => ({ t: 'move', dx })
const repeat = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body })
const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })

/** 合成轨迹：仅用于测试判定函数本身；真实 VM 产生的轨迹见 tests/e2e/g2-u3-l02-vm.spec.ts。 */
function trace(levelId: LevelId, program: Program, over: Partial<RunTrace> & { basketX: number; moves: BasketMove[] }): RunTrace {
  const level = L02_LEVELS[levelId]
  const frame = framesToLand(level)
  return {
    levelId, runId: 1, fingerprint: programFingerprint(program), endedBy: 'landed', framesRun: frame,
    start: { basketX: 0, fruitX: level.fruitX },
    landing: { frame, basketX: over.basketX, fruitX: level.fruitX, fruitY: L02_PARAMS.basketY - 10 },
    basketMoves: over.moves,
    ...over,
  }
}
const loopMoves = (n: number, dx: number): BasketMove[] => Array.from({ length: n }, (_, i) => ({ frame: i + 1, dx, inLoop: true }))

describe('参数与契约', () => {
  it('参数状态是“首席批准的试点运行参数”，不是已验证的正式参数', () => {
    expect(L02_PARAMS.rulingStatus).toBe('pilot-approved')
    expect(L02_PARAMS.rulingStatus).not.toBe('approved')
  })

  it('契约字段完整：恰 5 条目标、3 级提示、draftKey 绑定本课、教学定向', () => {
    expect(validateL02Contract(L02_CONTRACT)).toEqual([])
    expect(L02_CONTRACT.goal5).toHaveLength(5)
    expect(L02_CONTRACT.hints).toHaveLength(3)
    expect(L02_CONTRACT.draftKey).toBe('kidscoding-draft:G2-U3-L02')
    expect(L02_CONTRACT.engine).toBe('scratch-vm')
    expect(L02_CONTRACT.judging.scopeLabel).toBe('教学定向')
  })

  it('故意错误的契约被拒绝', () => {
    expect(validateL02Contract({ ...L02_CONTRACT, draftKey: 'kidscoding-draft:A1-U3-L02' })).not.toEqual([])
    expect(validateL02Contract({ ...L02_CONTRACT, goal5: ['a', 'b', 'c', 'd'] as unknown as typeof L02_CONTRACT.goal5 })).not.toEqual([])
  })

  it('课程内容不跨课污染：没有 A1 摘要、API 或其他课程标题', () => {
    const text = JSON.stringify([L02_CONTRACT, L02_CONTENT])
    for (const stray of ['摘要', 'API', '忠实', 'A1-U3', '随机', '得分', '分数', '变量']) {
      expect(text, `不应出现“${stray}”`).not.toContain(stray)
    }
    expect(L02_CONTRACT.title).toBe('接住掉落水果')
  })

  it('每一关有三级提示，且任何提示和任务说明都不含完整答案', () => {
    for (const id of L02_LEVEL_ORDER) {
      const c = L02_CONTENT[id]
      expect(c.hints).toHaveLength(3)
      const text = [c.task, ...c.hints].join('')
      if (id === 'solve' || id === 'transferLeft' || id === 'transferFast') {
        // 不给出“重复 N 次 + 每次 S”的完整数字组合
        expect(text).not.toMatch(/重复\s*3\s*次[，,]?\s*每次\s*50/)
        expect(text).not.toMatch(/3\s*[×x*]\s*50/)
        expect(text).not.toMatch(/5\s*[×x*]\s*30/)
      }
    }
    expect(L02_CONTENT.explore.readOnly).toBe(true)
    expect(L02_CONTENT.solve.readOnly).toBe(false)
  })

  it('三层活动齐全：探索 1 关、独立 1 关、迁移 2 关', () => {
    expect(L02_LEVEL_ORDER.map(id => L02_CONTENT[id].layer)).toEqual([1, 2, 3, 3])
  })
})

describe('程序校验', () => {
  it('合法程序通过；越界、未知类型、太多积木、嵌套太深被拒绝', () => {
    expect(validateProgram(flag(repeat(3, move(50))))).toEqual([])
    expect(validateProgram(flag(move(101)))).not.toEqual([])
    expect(validateProgram(flag(move(-101)))).not.toEqual([])
    expect(validateProgram(flag(move(1.5)))).not.toEqual([])
    expect(validateProgram(flag(repeat(21, move(1))))).not.toEqual([])
    expect(validateProgram(flag(repeat(0, move(1))))).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'flag', body: [{ t: 'jump' }] }] })).not.toEqual([])
    expect(validateProgram(flag(...Array.from({ length: 13 }, () => move(1))))).not.toEqual([])
    expect(validateProgram(flag(repeat(2, repeat(2, repeat(2, move(1))))))).not.toEqual([])
    expect(validateProgram('hi')).not.toEqual([])
  })
})

describe('编译为 Scratch 工程（只检查结构，执行由真实 VM 完成）', () => {
  it('篮子脚本编译成 Scratch 原生 opcode，水果脚本是课程预置', () => {
    const project = compileProject(flag(repeat(3, move(50))), L02_LEVELS.solve)
    expect(project.targets.map(t => t.name)).toEqual(['Stage', BASKET_NAME, FRUIT_NAME])
    const basket = Object.values(project.targets[1].blocks as Record<string, { opcode: string }>)
    expect(basket.map(b => b.opcode).sort()).toEqual(['control_repeat', 'event_whenflagclicked', 'motion_changexby'])
    const fruit = Object.values(project.targets[2].blocks as Record<string, { opcode: string }>)
    expect(fruit.map(b => b.opcode).sort()).toEqual(['control_repeat', 'event_whenflagclicked', 'motion_changeyby', 'motion_gotoxy'])
    expect(project.targets[1].costumes[0].assetId).toBe(L02_ASSETS.basket)
  })

  it('空程序与散积木不生成会运行的篮子脚本', () => {
    expect(Object.keys(compileProject({ scripts: [] }, L02_LEVELS.solve).targets[1].blocks)).toHaveLength(0)
    const loose = compileProject({ scripts: [{ hat: null, body: [move(50)] }] }, L02_LEVELS.solve)
    expect(Object.keys(loose.targets[1].blocks)).toHaveLength(0)
  })

  it('只有绿旗：只有一个帽子积木', () => {
    expect(Object.keys(compileProject(flag(), L02_LEVELS.solve).targets[1].blocks)).toHaveLength(1)
  })

  it('不合法的程序拒绝编译，不会送进 VM', () => {
    expect(() => compileProject(flag(move(500)), L02_LEVELS.solve)).toThrow('程序不合法')
  })

  it('块与块的父子、next 连接一致', () => {
    const project = compileProject(flag(repeat(2, move(10), move(20)), move(30)), L02_LEVELS.solve)
    const blocks = project.targets[1].blocks as Record<string, { next: string | null; parent: string | null; inputs: Record<string, unknown[]> }>
    for (const [id, b] of Object.entries(blocks)) {
      if (b.next) expect(blocks[b.next].parent).toBe(id)
      const sub = b.inputs.SUBSTACK
      if (sub) expect(blocks[sub[1] as string].parent).toBe(id)
    }
  })

  it('水果下落次数足够落到篮子高度', () => {
    for (const id of L02_LEVEL_ORDER) {
      const level = L02_LEVELS[id]
      expect(fruitFallRepeats(level) * level.fallSpeed).toBeGreaterThanOrEqual(L02_PARAMS.fruitStartY - L02_PARAMS.basketY)
    }
  })
})

describe('沙箱常量与 TypeScript 一致（防止两边数字漂移）', () => {
  const html = readFileSync(join(process.cwd(), 'public', 'scratch-g2-u3-l02-sandbox.html'), 'utf8')

  it('LIMITS 与 params.ts 一致', () => {
    const limits = /const LIMITS = \{([^}]*)\}/.exec(html)?.[1] ?? ''
    const read = (key: string) => Number(new RegExp(`${key}:\\s*(-?\\d+)`).exec(limits)?.[1])
    expect(read('basketStartX')).toBe(L02_PARAMS.basketStartX)
    expect(read('basketY')).toBe(L02_PARAMS.basketY)
    expect(read('fruitStartY')).toBe(L02_PARAMS.fruitStartY)
    expect(read('maxRepeatTimes')).toBe(L02_PARAMS.maxRepeatTimes)
    expect(read('minRepeatTimes')).toBe(L02_PARAMS.minRepeatTimes)
    expect(read('maxMoveDx')).toBe(L02_PARAMS.maxMoveDx)
    expect(read('minMoveDx')).toBe(L02_PARAMS.minMoveDx)
    expect(read('maxBlocks')).toBe(L02_PARAMS.maxBlocks)
    expect(read('maxNesting')).toBe(L02_PARAMS.maxNesting)
    expect(read('maxScripts')).toBe(L02_PARAMS.maxScripts)
    expect(read('frameCap')).toBe(L02_PARAMS.frameCap)
  })

  it('素材 ID 与 compile.ts 一致', () => {
    for (const [key, id] of Object.entries(L02_ASSETS)) expect(html).toContain(`${key}: '${id}'`)
  })

  it('沙箱固定 scratch-vm@5.0.300 与 scratch-storage@4.0.0（和 G2 沙箱同版本）', () => {
    expect(html).toContain('scratch-vm@5.0.300/dist/web/scratch-vm.min.js')
    expect(html).toContain('scratch-storage@4.0.0/dist/web/scratch-storage.min.js')
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
})

describe('三层判定（合成轨迹；对应 ACCEPTANCE R1~R7）', () => {
  const level = L02_LEVELS.solve

  it('R1 只有绿旗：没接住、任务未完成、知识未通过、结论未合格', () => {
    const p = flag()
    const j = judgeRun(trace('solve', p, { basketX: 0, moves: [] }), level)
    expect(j.status).toBe('judged')
    if (j.status !== 'judged') return
    expect(j.stage.passed).toBe(false)
    expect(j.task.passed).toBe(false)
    expect(j.knowledge.passed).toBe(false)
    expect(j.passed).toBe(false)
    expect(j.conclusion).toContain('未通过')
    expect(j.conclusion).not.toContain('掌握')
  })

  it('R2 没循环但接住：任务通过、知识未通过、不写已掌握', () => {
    const p = flag(move(100), move(30))
    const j = judgeRun(trace('solve', p, { basketX: 130, moves: [{ frame: 1, dx: 100, inLoop: false }, { frame: 2, dx: 30, inLoop: false }] }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(false)
    expect(j.passed).toBe(false)
    expect(j.knowledge.line).toContain('没有满足循环应用要求')
  })

  it('R3 参数错误：没接住，结论未合格', () => {
    const j = judgeRun(trace('solve', flag(move(10)), { basketX: 10, moves: [{ frame: 1, dx: 10, inLoop: false }] }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.stage.passed).toBe(false)
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('还差')
    expect(j.passed).toBe(false)
  })

  it('R4 移动正确但没到目标（x=60，差 90）：没接住，并写明差值', () => {
    const j = judgeRun(trace('solve', flag(move(30), move(30)), { basketX: 60, moves: [{ frame: 1, dx: 30, inLoop: false }, { frame: 2, dx: 30, inLoop: false }] }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.stage.passed).toBe(false)
    expect(j.stage.line).toContain('相差 90')
  })

  it('R5 结构不同但行为达标：按行为判，任务通过', () => {
    const j = judgeRun(trace('solve', flag(move(100), move(50)), { basketX: 150, moves: [{ frame: 1, dx: 100, inLoop: false }, { frame: 2, dx: 50, inLoop: false }] }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.task.passed).toBe(true)
  })

  it('R6 循环版：任务和知识都通过，才出现“任务达标，也满足了循环应用要求”，且不宣称已掌握', () => {
    const j = judgeRun(trace('solve', flag(repeat(3, move(50))), { basketX: 150, moves: loopMoves(3, 50) }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.passed).toBe(true)
    expect(j.conclusion).toContain('任务达标，也满足了循环应用要求')
    expect(j.conclusion).not.toContain('掌握')
    expect(j.understanding).toContain('需要进一步解释或练习')
  })

  it('偶然接住：循环只走了 20，其余靠普通积木，知识不通过', () => {
    const moves: BasketMove[] = [...loopMoves(2, 10), { frame: 3, dx: 100, inLoop: false }, { frame: 4, dx: 30, inLoop: false }]
    const j = judgeRun(trace('solve', flag(repeat(2, move(10)), move(100), move(30)), { basketX: 150, moves }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(false)
    expect(j.knowledge.line).toContain('大部分距离不是')
  })

  it('循环只执行 1 次不算循环证据', () => {
    const j = judgeRun(trace('solve', flag(repeat(1, move(150))), { basketX: 150, moves: loopMoves(1, 100) }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.knowledge.passed).toBe(false)
  })

  it('循环走过头再手动拉回：循环确实走了绝大部分位移，知识证据通过，但没接住所以任务不通过', () => {
    const moves: BasketMove[] = [...loopMoves(3, 50), { frame: 4, dx: -100, inLoop: false }]
    const j = judgeRun(trace('solve', flag(repeat(3, move(50)), move(-100)), { basketX: 50, moves }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.knowledge.passed).toBe(true)
    expect(j.task.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  it('循环往右走一点点、普通积木往左走很多：方向与总位移相反，知识证据不通过', () => {
    const moves: BasketMove[] = [...loopMoves(2, 10), { frame: 3, dx: -100, inLoop: false }]
    const j = judgeRun(trace('solve', flag(repeat(2, move(10)), move(-100)), { basketX: -80, moves }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.knowledge.passed).toBe(false)
  })

  it('循环里的移动和循环外的移动互相抵消到总位移为 0：不算循环证据', () => {
    const moves: BasketMove[] = [...loopMoves(2, 50), { frame: 3, dx: -100, inLoop: false }]
    const j = judgeRun(trace('solve', flag(repeat(2, move(50)), move(-100)), { basketX: 0, moves }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.knowledge.passed).toBe(false)
  })

  it('落地之后才发生的移动不计入', () => {
    const level3 = L02_LEVELS.transferFast
    const moves: BasketMove[] = [...loopMoves(10, 10), { frame: 11, dx: 50, inLoop: false }, { frame: 12, dx: 50, inLoop: false }]
    const j = judgeRun(trace('transferFast', flag(), { basketX: 100, moves }), level3)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.stage.passed).toBe(false)
    expect(j.stage.line).toContain('篮子 x=100')
  })

  it('停止、出错、没落地的运行不判定', () => {
    const p = flag(repeat(3, move(50)))
    const base = trace('solve', p, { basketX: 150, moves: loopMoves(3, 50) })
    expect(judgeRun({ ...base, endedBy: 'stopped', landing: null }, level).status).toBe('not-judged')
    expect(judgeRun({ ...base, endedBy: 'error', error: 'x', landing: null }, level).status).toBe('not-judged')
    expect(judgeRun({ ...base, endedBy: 'frameCap', landing: null }, level).status).toBe('not-judged')
  })

  it('失败反馈写明哪一层未通过', () => {
    const j = judgeRun(trace('solve', flag(), { basketX: 0, moves: [] }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.conclusion).toContain('任务结果')
    expect(j.conclusion).toContain('知识证据')
  })
})

describe('结果失效', () => {
  const p = flag(repeat(3, move(50)))
  const good = trace('solve', p, { basketX: 150, moves: loopMoves(3, 50) })

  it('isTraceCurrent 要求指纹、关卡、运行序号三者一致', () => {
    const cur = { fingerprint: programFingerprint(p), levelId: 'solve', runId: 1 }
    expect(isTraceCurrent(good, cur)).toBe(true)
    expect(isTraceCurrent(good, { ...cur, fingerprint: programFingerprint(flag(repeat(4, move(50)))) })).toBe(false)
    expect(isTraceCurrent(good, { ...cur, levelId: 'transferLeft' })).toBe(false)
    expect(isTraceCurrent(good, { ...cur, runId: 2 })).toBe(false)
    expect(isTraceCurrent(null, cur)).toBe(false)
  })

  it('通过后改动脚本，这一关立刻不再算通过；改回去才恢复', () => {
    let s = editProgram(initialState(), 'solve', p)
    s = recordRun(s, good)
    expect(isLevelPassed(s, 'solve')).toBe(true)
    s = editProgram(s, 'solve', flag(repeat(4, move(50))))
    expect(isLevelPassed(s, 'solve')).toBe(false)
    s = editProgram(s, 'solve', p)
    expect(isLevelPassed(s, 'solve')).toBe(true)
  })

  it('用旧程序的运行结果落账给新程序：被丢弃，不污染状态', () => {
    let s = editProgram(initialState(), 'solve', flag(repeat(4, move(50))))
    s = recordRun(s, good)
    expect(isLevelPassed(s, 'solve')).toBe(false)
  })

  it('关卡之间互不影响：solve 通过不会让 transferLeft 通过', () => {
    let s = editProgram(initialState(), 'solve', p)
    s = editProgram(s, 'transferLeft', p)
    s = recordRun(s, good)
    expect(isLevelPassed(s, 'solve')).toBe(true)
    expect(isLevelPassed(s, 'transferLeft')).toBe(false)
  })

  it('同一程序再次运行未通过时，撤销之前的通过', () => {
    let s = editProgram(initialState(), 'solve', p)
    s = recordRun(s, good)
    const bad = { ...good, landing: { ...good.landing!, basketX: 0 }, basketMoves: [] }
    s = recordRun(s, bad)
    expect(isLevelPassed(s, 'solve')).toBe(false)
  })

  it('探索关需要预测并运行观察过才算完成', () => {
    let s = initialState()
    const t = trace('explore', DEMO_PROGRAM, { basketX: 40, moves: loopMoves(2, 20) })
    s = recordRun(s, t)
    expect(exploreDone(s)).toBe(false)
    s = { ...s, predictions: { explore: { x: '40', caught: '接不住' } } }
    expect(exploreDone(s)).toBe(true)
  })

  it('停止的运行不改变通过状态', () => {
    let s = editProgram(initialState(), 'solve', p)
    s = recordRun(s, good)
    s = recordRun(s, { ...good, endedBy: 'stopped', landing: null })
    expect(isLevelPassed(s, 'solve')).toBe(true)
  })
})

function memoryStorage(initial: Record<string, string> = {}, failWrites = false): StorageLike & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { if (failWrites) throw new Error('quota'); data[k] = v },
    removeItem: k => { delete data[k] },
  }
}

describe('草稿', () => {
  it('保存后恢复：脚本、当前关卡、预测完整；通过状态与运行结果不被保存', () => {
    const storage = memoryStorage()
    let s = editProgram(initialState(), 'solve', flag(repeat(3, move(50))))
    s = editProgram(s, 'transferLeft', flag(repeat(2, move(-50))))
    s = { ...s, levelId: 'transferLeft', predictions: { explore: { x: '40', caught: '接不住' } } }
    s = recordRun(s, trace('solve', flag(repeat(3, move(50))), { basketX: 150, moves: loopMoves(3, 50) }))
    expect(isLevelPassed(s, 'solve')).toBe(true)
    expect(saveDraft(storage, s)).toEqual({ ok: true })
    expect(Object.keys(storage.data)).toEqual(['kidscoding-draft:G2-U3-L02'])
    const loaded = loadDraft(storage)
    expect(loaded.reason).toBeNull()
    expect(loaded.state?.levelId).toBe('transferLeft')
    expect(loaded.state?.programs.solve).toEqual(flag(repeat(3, move(50))))
    expect(loaded.state?.programs.transferLeft).toEqual(flag(repeat(2, move(-50))))
    expect(loaded.state?.predictions.explore).toEqual({ x: '40', caught: '接不住' })
    expect(isLevelPassed(loaded.state!, 'solve')).toBe(false)
    expect(JSON.stringify(toDraft(s))).not.toContain('landing')
  })

  it('保存失败必须报告失败，且不写入（fail-closed）', () => {
    const r = saveDraft(memoryStorage({}, true), initialState())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('未能保存')
    expect(saveDraft(null, initialState()).ok).toBe(false)
  })

  it('损坏的、其他课的、非法脚本的草稿被拒绝，且不覆盖好草稿', () => {
    const key = 'kidscoding-draft:G2-U3-L02'
    expect(loadDraft(memoryStorage({ [key]: '{坏' })).state).toBeNull()
    expect(loadDraft(memoryStorage({ [key]: JSON.stringify({ lessonId: 'A1-U3-L02', savedAt: 'x', script: toDraft(initialState()) }) })).reason).toContain('其他课节')
    const evil = { ...toDraft(initialState()), programs: { solve: flag(move(9999)), transferLeft: { scripts: [] }, transferFast: { scripts: [] } } }
    const l = loadDraft(memoryStorage({ [key]: JSON.stringify({ lessonId: 'G2-U3-L02', savedAt: 'x', script: evil }) }))
    expect(l.state).toBeNull()
    expect(l.reason).toContain('不合法')
    expect(fromDraft({ version: 2 })).toBeNull()
    expect(fromDraft(null)).toBeNull()
  })

  it('超过 64KB 的草稿不保存也不恢复', () => {
    const big = { ...initialState(), predictions: { explore: { x: 'x'.repeat(10) } } }
    expect(saveDraft(memoryStorage(), big).ok).toBe(true)
    const huge = 'x'.repeat(70 * 1024)
    expect(loadDraft(memoryStorage({ 'kidscoding-draft:G2-U3-L02': huge })).state).toBeNull()
  })

  it('其他课节的草稿键互不干扰', () => {
    const storage = memoryStorage({ 'kidscoding-draft:A1-U3-L02': '{"lessonId":"A1-U3-L02","script":{"picked":[1,2,3]}}' })
    saveDraft(storage, initialState())
    expect(storage.data['kidscoding-draft:A1-U3-L02']).toContain('picked')
    expect(Object.keys(storage.data).sort()).toEqual(['kidscoding-draft:A1-U3-L02', 'kidscoding-draft:G2-U3-L02'])
  })
})

describe('事后参考做法', () => {
  it('枚举出的做法都满足落地前执行完并落在容差内', () => {
    for (const id of ['solve', 'transferLeft', 'transferFast'] as const) {
      const level = L02_LEVELS[id]
      const alts = alternativeSolutions(level)
      expect(alts.length).toBeGreaterThan(0)
      for (const a of alts) {
        expect(a.times).toBeLessThanOrEqual(framesToLand(level))
        expect(Math.abs(a.total - level.fruitX)).toBeLessThanOrEqual(L02_PARAMS.catchTolerance)
      }
    }
  })

  it('用孩子自己的脚本生成描述，而不是写死的标准答案', () => {
    expect(describeProgram(flag(repeat(4, move(40))))).toBe('当绿旗被点击\n　重复执行 4 次\n　　将 x 坐标增加 40')
  })
})

describe('首席批准的试点参数（快照：改数值必须有意识地改这条测试）', () => {
  it('舞台、起点、容差、程序限制、知识证据阈值与批准清单一致', () => {
    expect({
      basketStartX: L02_PARAMS.basketStartX, basketY: L02_PARAMS.basketY, fruitStartY: L02_PARAMS.fruitStartY,
      catchTolerance: L02_PARAMS.catchTolerance,
      maxRepeatTimes: L02_PARAMS.maxRepeatTimes, minRepeatTimes: L02_PARAMS.minRepeatTimes,
      maxMoveDx: L02_PARAMS.maxMoveDx, minMoveDx: L02_PARAMS.minMoveDx,
      maxBlocks: L02_PARAMS.maxBlocks, maxNesting: L02_PARAMS.maxNesting,
      minLoopIterations: L02_PARAMS.minLoopIterations, minLoopShare: L02_PARAMS.minLoopShare,
    }).toEqual({
      basketStartX: 0, basketY: -130, fruitStartY: 150,
      catchTolerance: 40,
      maxRepeatTimes: 20, minRepeatTimes: 1,
      maxMoveDx: 100, minMoveDx: -100,
      maxBlocks: 12, maxNesting: 2,
      minLoopIterations: 2, minLoopShare: 0.5,
    })
  })

  it('关卡：探索 x=100、独立 x=150、迁移 x=-100、加速 30/帧；其余下落速度 10/帧', () => {
    expect(L02_LEVELS.explore).toMatchObject({ fruitX: 100, fallSpeed: 10, layer: 1 })
    expect(L02_LEVELS.solve).toMatchObject({ fruitX: 150, fallSpeed: 10, layer: 2 })
    expect(L02_LEVELS.transferLeft).toMatchObject({ fruitX: -100, fallSpeed: 10, layer: 3 })
    expect(L02_LEVELS.transferFast).toMatchObject({ fruitX: 150, fallSpeed: 30, layer: 3 })
    expect(framesToLand(L02_LEVELS.solve)).toBe(28)
    expect(framesToLand(L02_LEVELS.transferFast)).toBe(10)
  })

  it('探索关失败示例是 2×20：篮子停在 40，与水果 100 相差 60', () => {
    expect(L02_DEMO_REPEAT).toBe(2)
    expect(L02_DEMO_STEP).toBe(20)
    const x = L02_PARAMS.basketStartX + L02_DEMO_REPEAT * L02_DEMO_STEP
    expect(Math.abs(L02_LEVELS.explore.fruitX - x)).toBe(60)
    expect(Math.abs(L02_LEVELS.explore.fruitX - x)).toBeGreaterThan(L02_PARAMS.catchTolerance)
  })

  it('所有关卡的坐标都在 Scratch 舞台范围内，下落速度是能整除落差的正整数', () => {
    for (const id of L02_LEVEL_ORDER) {
      const l = L02_LEVELS[id]
      expect(Math.abs(l.fruitX)).toBeLessThanOrEqual(240)
      expect(Number.isInteger(l.fallSpeed) && l.fallSpeed > 0).toBe(true)
    }
    expect(Math.abs(L02_PARAMS.basketY)).toBeLessThanOrEqual(180)
    expect(L02_PARAMS.fruitStartY).toBeLessThanOrEqual(180)
    expect(L02_PARAMS.basketStartX + L02_PARAMS.maxRepeatTimes * L02_PARAMS.maxMoveDx).toBeGreaterThan(240) // 越界移动由 Scratch 舞台边界处理，不在本课范围
  })
})

describe('程序限制的恰好边界（正向与反向）', () => {
  const ok = (p: unknown) => validateProgram(p)
  it('重复次数：1 与 20 合法；0、21、1.5、NaN 非法', () => {
    expect(ok(flag(repeat(1, move(1))))).toEqual([])
    expect(ok(flag(repeat(20, move(1))))).toEqual([])
    for (const bad of [0, 21, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(ok(flag(repeat(bad, move(1)))), String(bad)).not.toEqual([])
  })

  it('x 增加量：-100 与 100 合法（包括 0）；±101、小数、NaN 非法', () => {
    for (const good of [-100, -1, 0, 1, 100]) expect(ok(flag(move(good))), String(good)).toEqual([])
    for (const bad of [-101, 101, 0.5, Number.NaN, Number.NEGATIVE_INFINITY]) expect(ok(flag(move(bad))), String(bad)).not.toEqual([])
  })

  it('积木总数（不含绿旗）：12 块合法，13 块非法；分散在多个循环里也一起计数', () => {
    expect(ok(flag(...Array.from({ length: 12 }, () => move(1))))).toEqual([])
    expect(ok(flag(...Array.from({ length: 13 }, () => move(1))))).not.toEqual([])
    expect(ok(flag(repeat(2, ...Array.from({ length: 11 }, () => move(1)))))).toEqual([]) // 1 个重复 + 11 个移动 = 12
    expect(ok(flag(repeat(2, ...Array.from({ length: 12 }, () => move(1)))))).not.toEqual([]) // 13
    expect(ok({ scripts: [{ hat: 'flag', body: Array.from({ length: 6 }, () => move(1)) }, { hat: 'flag', body: Array.from({ length: 7 }, () => move(1)) }] })).not.toEqual([]) // 6 + 7 = 13
  })

  it('嵌套深度：2 层重复合法，3 层非法', () => {
    expect(ok(flag(repeat(2, repeat(2, move(1)))))).toEqual([])
    expect(ok(flag(repeat(2, repeat(2, repeat(2, move(1))))))).not.toEqual([])
  })

  it('脚本条数：3 条合法，4 条非法', () => {
    const script = { hat: 'flag' as const, body: [move(1)] }
    expect(ok({ scripts: [script, script, script] })).toEqual([])
    expect(ok({ scripts: [script, script, script, script] })).not.toEqual([])
  })

  it('最大合法程序可以编译，且编译结果的块数 = 积木数 + 帽子数', () => {
    const p = flag(repeat(20, ...Array.from({ length: 11 }, () => move(100))))
    const project = compileProject(p, L02_LEVELS.solve)
    expect(Object.keys(project.targets[1].blocks)).toHaveLength(13) // 1 帽子 + 1 重复 + 11 移动
  })
})

describe('三层结果的恰好边界', () => {
  const level = L02_LEVELS.solve
  const judged = (basketX: number, moves: BasketMove[]) => {
    const j = judgeRun(trace('solve', flag(), { basketX, moves }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    return j
  }

  it('容差：相差恰好 40 接到，41 没接到（两侧对称）', () => {
    const noLoop = (x: number): BasketMove[] => [{ frame: 1, dx: x, inLoop: false }]
    expect(judged(110, noLoop(110)).stage.passed).toBe(true) // 150-110 = 40
    expect(judged(190, noLoop(190)).stage.passed).toBe(true) // 190-150 = 40
    expect(judged(109, noLoop(109)).stage.passed).toBe(false)
    expect(judged(191, noLoop(191)).stage.passed).toBe(false)
    expect(judged(109, noLoop(109)).stage.line).toContain('相差 41')
  })

  it('篮子没有移动：即使起点就在容差内也不算任务达标（本课水果 x 都离起点超过容差，用左右关验证“没移动”分支）', () => {
    const j = judgeRun(trace('solve', flag(), { basketX: 0, moves: [] }), level)
    if (j.status !== 'judged') throw new Error('应当判定')
    expect(j.task.line).toContain('篮子没有移动')
    // 构造“起点已在容差内”的关卡：水果 x=30，篮子不动
    const near = { ...level, fruitX: 30 }
    const t = trace('solve', flag(), { basketX: 0, moves: [] })
    const jn = judgeRun({ ...t, landing: { ...t.landing!, fruitX: 30 }, start: { basketX: 0, fruitX: 30 } }, near)
    if (jn.status !== 'judged') throw new Error('应当判定')
    expect(jn.stage.passed).toBe(true) // 舞台上确实接到了
    expect(jn.task.passed).toBe(false) // 但篮子没移动，任务不达标
  })

  it('循环次数：循环里的移动执行 1 次不满足，2 次满足', () => {
    expect(judged(150, loopMoves(1, 150)).knowledge.passed).toBe(false)
    expect(judged(150, loopMoves(2, 75)).knowledge.passed).toBe(true)
  })

  it('循环占比：恰好 50% 满足，低于 50% 不满足', () => {
    const mixed = (loopDx: number, otherDx: number): BasketMove[] => [...loopMoves(2, loopDx), { frame: 3, dx: otherDx, inLoop: false }]
    expect(judged(160, mixed(40, 80)).knowledge.passed).toBe(true) // 80 / 160 = 50%
    expect(judged(160, mixed(39, 82)).knowledge.passed).toBe(false) // 78 / 160 = 48.75%
    expect(judged(160, mixed(41, 78)).knowledge.passed).toBe(true) // 82 / 160
  })

  it('循环里的 0 步移动不算“执行了移动”：1 次有效 + 1 次 0 步，只数 1 次，次数不够', () => {
    const moves: BasketMove[] = [
      { frame: 1, dx: 150, inLoop: true },
      { frame: 2, dx: 0, inLoop: true },
    ]
    // 没有 0 步过滤时会数成 2 次、占比 100%，错误地通过；有过滤时只有 1 次有效移动。
    expect(judged(150, moves).knowledge.passed).toBe(false)
    expect(judged(150, [...moves, { frame: 3, dx: 0, inLoop: true }]).knowledge.passed).toBe(false)
    expect(judged(150, [{ frame: 1, dx: 75, inLoop: true }, { frame: 2, dx: 0, inLoop: true }, { frame: 3, dx: 75, inLoop: true }]).knowledge.passed).toBe(true)
  })

  it('落地帧恰好等于移动帧时这一步算数；晚一帧不算（用它决定占比，才区分得出）', () => {
    const landFrame = framesToLand(level)
    // 循环 2×40 = 80；落地帧上又有一步“循环外的 −90”。
    //  算数：总位移 = 80 − 90 = −10，方向与循环（+80）相反 → 知识证据不通过。
    //  若这一步被错误地排除：总位移 = 80，循环占 100% → 会错误地通过。
    const onLanding: BasketMove[] = [...loopMoves(2, 40), { frame: landFrame, dx: -90, inLoop: false }]
    expect(judged(-10, onLanding).knowledge.passed).toBe(false)
    // 晚一帧的同一步不进入统计：总位移 = 80，循环占 100% → 通过。
    const afterLanding: BasketMove[] = [...loopMoves(2, 40), { frame: landFrame + 1, dx: -90, inLoop: false }]
    expect(judged(80, afterLanding).knowledge.passed).toBe(true)
  })
})

describe('反馈措辞统一，且任何结果都不宣称“已掌握”', () => {
  const level = L02_LEVELS.solve
  const scenarios: Array<[string, number, BasketMove[]]> = [
    ['空程序', 0, []],
    ['无循环接到', 130, [{ frame: 1, dx: 130, inLoop: false }]],
    ['循环接到', 150, loopMoves(3, 50)],
    ['循环不够', 30, loopMoves(3, 10)],
    ['偶然接到', 150, [...loopMoves(2, 10), { frame: 3, dx: 130, inLoop: false }]],
  ]
  for (const [name, x, moves] of scenarios) {
    it(`${name}：三行标签固定为 舞台结果/任务结果/知识证据，并附“需要进一步解释或练习”`, () => {
      const j = judgeRun(trace('solve', flag(), { basketX: x, moves }), level)
      if (j.status !== 'judged') throw new Error('应当判定')
      expect(j.stage.line.startsWith('舞台结果：')).toBe(true)
      expect(j.task.line.startsWith('任务结果：')).toBe(true)
      expect(j.knowledge.line.startsWith('知识证据：')).toBe(true)
      expect(j.understanding).toContain('需要进一步解释或练习')
      const all = [j.stage.line, j.task.line, j.knowledge.line, j.conclusion, j.understanding].join('\n')
      expect(all).not.toContain('任务判定')
      expect(all).not.toMatch(/已(经)?掌握|学会了|完全掌握/)
      expect(all).not.toContain('接住了') // 统一为“接到了水果/没接到水果”
    })
  }
})
