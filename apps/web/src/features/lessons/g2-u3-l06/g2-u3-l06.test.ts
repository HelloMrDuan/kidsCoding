// G2-U3-L06 核心单测：参数 / 程序校验 / 编译结构 / 三层判定（合成轨迹）/ 状态与草稿 / 契约 / 沙箱守卫。
// 碰撞与记分的真实行为不在这里测（Node 无渲染器，sensing 恒假）——见 judge.vm.test.ts 的边界说明与浏览器 E2E。

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BASKET_NAME, compileProject, FRUIT_NAME, L06_ASSETS, SCORE_VARIABLE_ID, TIME_VARIABLE_ID } from './compile'
import { L06_ACTIVITY_NOTE, L06_CONTENT, L06_CONTRACT, validateL06Contract } from './contract'
import { judgeRun, type RunTrace } from './judge'
import { fallFrames, L06_LEVELS, L06_PARAMS, type LevelId } from './params'
import { EMPTY_PROGRAM, validateProgram, type Program } from './program'
import { alternatives, buggyProgram, referenceProgram } from './reference'
import { fromDraft, initialState, isLevelPassed, loadDraft, programFor, recordRun, saveDraft, toDraft, type StorageLike } from './state'

const ref = (id: LevelId = 'solve') => referenceProgram(L06_LEVELS[id])

describe('参数与关卡', () => {
  it('参数仍是提议状态，获胜目标与契约一致（接到 5 颗）', () => {
    expect(L06_PARAMS.rulingStatus).toBe('proposed')
    expect(L06_PARAMS.winTarget).toBe(5)
    for (const level of Object.values(L06_LEVELS)) expect(level.winTarget).toBe(5)
  })
  it('fallFrames 按速度取整：速度 10 → 33，速度 16 → 20', () => {
    expect(fallFrames(L06_LEVELS.solve)).toBe(33)
    expect(fallFrames(L06_LEVELS.transferFast)).toBe(20)
  })
  it('四关顺序与层级正确', () => {
    expect(Object.values(L06_LEVELS).map(l => l.layer)).toEqual([1, 2, 3, 3])
  })
})

describe('程序校验', () => {
  it('参考做法与全部“别的做法”在每一关都合法', () => {
    for (const level of Object.values(L06_LEVELS)) {
      expect(validateProgram(referenceProgram(level))).toEqual([])
      for (const alt of alternatives(level)) expect(validateProgram(alt.program)).toEqual([])
    }
  })
  it('毛病程序本身合法（它的毛病在行为，不在结构）', () => {
    expect(validateProgram(buggyProgram(L06_LEVELS.transferFix))).toEqual([])
  })
  it('空程序合法（还没开始搭）', () => {
    expect(validateProgram(EMPTY_PROGRAM)).toEqual([])
  })
  it('拒绝：重复里放重复、如果里放循环、一直重复嵌套、得分超范围、积木超量', () => {
    const bad: Program[] = [
      { scripts: [{ hat: 'flag', body: [{ t: 'repeat', times: 3, body: [{ t: 'repeat', times: 3, body: [] }] }] }] },
      { scripts: [{ hat: 'flag', body: [{ t: 'iftouch', body: [{ t: 'repeat', times: 3, body: [] } as never] }] }] },
      { scripts: [{ hat: 'flag', body: [{ t: 'repeat', times: 3, body: [{ t: 'forever', body: [] } as never] }] }] },
      { scripts: [{ hat: 'flag', body: [{ t: 'score', by: 99 }] }] },
      { scripts: [{ hat: 'flag', body: Array.from({ length: 13 }, () => ({ t: 'hide' as const })) }] },
    ]
    for (const p of bad) expect(validateProgram(p).length).toBeGreaterThan(0)
  })
})

describe('编译结构', () => {
  const project = compileProject(ref(), L06_LEVELS.solve)
  it('三个对象：舞台（双变量+倒计时）、篮子（跟随指针）、水果（学生脚本）', () => {
    expect(project.targets.map(t => t.name)).toEqual(['Stage', BASKET_NAME, FRUIT_NAME])
    const stage = project.targets[0]
    expect(stage.variables[SCORE_VARIABLE_ID]).toEqual(['得分', 0])
    expect(stage.variables[TIME_VARIABLE_ID]).toEqual(['时间', 20])
    const stageOps = Object.values(stage.blocks).map(b => b.opcode)
    expect(stageOps).toContain('control_repeat_until')
    expect(stageOps).toContain('control_wait')
    const basketOps = Object.values(project.targets[1].blocks).map(b => b.opcode)
    expect(basketOps).toEqual(expect.arrayContaining(['control_forever', 'sensing_mousex', 'motion_setx']))
  })
  it('出生序列是 setx(随机) → sety(顶部) → show，随机范围来自参数', () => {
    const blocks = project.targets[2].blocks
    const setx = Object.values(blocks).find(b => b.opcode === 'motion_setx')!
    const randId = (setx.inputs.X as [number, string])[1]
    const rand = blocks[randId]
    expect(rand.opcode).toBe('operator_random')
    expect(rand.inputs.FROM).toEqual([1, [4, String(L06_PARAMS.randomMinX)]])
    expect(rand.inputs.TO).toEqual([1, [4, String(L06_PARAMS.randomMaxX)]])
    const sety = blocks[setx.next!]
    expect(sety.opcode).toBe('motion_sety')
    expect(blocks[sety.next!].opcode).toBe('looks_show')
  })
  it('parent 链符合 Scratch 约定：next 的父就是前一块，SUBSTACK 首块的父是 C 型块（沙箱按此校验）', () => {
    for (const target of project.targets) {
      const blocks = target.blocks
      for (const [id, b] of Object.entries(blocks)) {
        if (b.next) expect(blocks[b.next].parent, `${target.name}:${id}->${b.next}`).toBe(id)
        const sub = (b.inputs as { SUBSTACK?: [number, string] }).SUBSTACK
        if (sub) expect(blocks[sub[1]].parent, `${target.name}:${id} SUBSTACK`).toBe(id)
        if (b.parent) expect(blocks[b.parent], `${target.name}:${id} parent 存在`).toBeTruthy()
      }
    }
  })
  it('造型 ID 与沙箱内置素材一致；不合法程序拒绝编译', () => {
    for (const t of project.targets) expect(Object.values(L06_ASSETS)).toContain(t.costumes[0].assetId)
    expect(() => compileProject({ scripts: [{ hat: 'flag', body: [{ t: 'score', by: 99 }] }] }, L06_LEVELS.solve)).toThrow()
  })
})

// ---- 合成轨迹（三层判定） ----------------------------------------------------

function trace(over: Partial<RunTrace> = {}): RunTrace {
  const spawns = over.spawns ?? [-120, 45, 190, -30, 88].map((x, i) => ({ frame: 1 + i * 39, x }))
  const scores = over.scores ?? spawns.map(s => ({ frame: s.frame + 25, by: 1 }))
  return {
    levelId: 'solve', runId: 1, fingerprint: 'x', endedBy: 'finished', framesRun: 230,
    endReason: 'win', winFrame: 220, timeupFrame: null,
    randoms: spawns.map(s => ({ frame: s.frame, value: s.x })),
    spawns,
    checks: [...spawns.map(s => ({ frame: s.frame + 10, result: false })), ...scores.map(s => ({ frame: s.frame, result: true }))],
    scores,
    hides: scores.map(s => ({ frame: s.frame })),
    finalScore: 5, finalTimeLeft: 9, fruitVisible: false, basketX: 0,
    ...over,
  }
}
const judge = (t: RunTrace) => judgeRun(t, L06_LEVELS.solve)

describe('三层判定（合成轨迹）', () => {
  it('标准获胜局：三层全过', () => {
    const j = judge(trace())
    expect(j.status).toBe('judged')
    if (j.status === 'judged') {
      expect(j.stage.passed).toBe(true)
      expect(j.task.passed).toBe(true)
      expect(j.knowledge.passed).toBe(true)
      expect(j.passed).toBe(true)
    }
  })
  it('时间到结束（接住 3 颗）：舞台与任务过，结论仍可达标', () => {
    const spawns = [-120, 45, 190, -30, 88, 12].map((x, i) => ({ frame: 1 + i * 39, x }))
    const scores = spawns.slice(0, 3).map(s => ({ frame: s.frame + 25, by: 1 }))
    const j = judge(trace({
      spawns, scores, endReason: 'timeup', winFrame: null, timeupFrame: 600,
      randoms: spawns.map(s => ({ frame: s.frame, value: s.x })),
      checks: [...spawns.map(s => ({ frame: s.frame + 10, result: false })), ...scores.map(s => ({ frame: s.frame, result: true }))],
      finalScore: 3, finalTimeLeft: 0, framesRun: 605,
    }))
    expect(j.status).toBe('judged')
    if (j.status === 'judged') {
      expect(j.stage.passed).toBe(true)
      expect(j.task.passed).toBe(true)
      expect(j.knowledge.passed).toBe(true)
      expect(j.passed).toBe(true)
    }
  })
  it('记分没有被“碰到篮子？”把关 → 任务层失败', () => {
    const j = judge(trace({ checks: [{ frame: 3, result: false }] }))
    expect(j.status === 'judged' && !j.task.passed).toBe(true)
  })
  it('同一颗重复记分 → 任务层失败', () => {
    const scores = [{ frame: 26, by: 1 }, { frame: 27, by: 1 }, { frame: 65, by: 1 }, { frame: 104, by: 1 }, { frame: 143, by: 1 }]
    const j = judge(trace({ scores, finalScore: 5 }))
    expect(j.status === 'judged' && !j.task.passed).toBe(true)
  })
  it('时间到之后还记分（过期加分）→ 任务层失败', () => {
    const j = judge(trace({
      endReason: 'timeup', winFrame: null, timeupFrame: 100, finalScore: 5, finalTimeLeft: 0,
    }))
    expect(j.status === 'judged' && !j.task.passed).toBe(true)
  })
  it('碰到篮子却漏记分 → 任务层失败', () => {
    const j = judge(trace({
      scores: [{ frame: 26, by: 1 }], finalScore: 1, endReason: 'timeup', winFrame: null, timeupFrame: 600, finalTimeLeft: 0,
      checks: [{ frame: 26, result: true }, { frame: 65, result: true }],
    }))
    expect(j.status === 'judged' && !j.task.passed).toBe(true)
  })
  it('出生位置写死（没有随机求值）→ 知识层失败', () => {
    const j = judge(trace({ randoms: [] }))
    expect(j.status === 'judged' && !j.knowledge.passed).toBe(true)
  })
  it('只出现 2 个不同位置 → 知识层失败（看不出随机）', () => {
    const spawns = [10, 10, 60, 10, 60].map((x, i) => ({ frame: 1 + i * 39, x }))
    const j = judge(trace({ spawns, randoms: spawns.map(s => ({ frame: s.frame, value: s.x })) }))
    expect(j.status === 'judged' && !j.knowledge.passed).toBe(true)
  })
  it('出生与随机对不上（先随机再改位置）→ 知识层失败', () => {
    const j = judge(trace({ randoms: [-120, 45, 190, -30, 88].map((x, i) => ({ frame: 1 + i * 39, value: x + 1 })) }))
    expect(j.status === 'judged' && !j.knowledge.passed).toBe(true)
  })
  it('被停止 / 出错 / 帧上限：不判定', () => {
    for (const endedBy of ['stopped', 'error', 'frameCap'] as const) {
      expect(judge(trace({ endedBy })).status).toBe('not-judged')
    }
  })
})

describe('状态与草稿', () => {
  it('初始：探索关、迁移 A 预置毛病程序、其余空', () => {
    const s = initialState()
    expect(s.levelId).toBe('explore')
    expect(programFor(s, 'explore')).toEqual(ref('explore'))
    expect(programFor(s, 'transferFix')).toEqual(buggyProgram(L06_LEVELS.transferFix))
    expect(programFor(s, 'solve')).toEqual(EMPTY_PROGRAM)
  })
  it('草稿往返一致；损坏、别课、非法程序的草稿都被拒绝', () => {
    const s = initialState()
    expect(fromDraft(toDraft(s))).toEqual(s)
    expect(fromDraft(null)).toBeNull()
    expect(fromDraft({ version: 2 })).toBeNull()
    expect(fromDraft({ ...toDraft(s), programs: { solve: { scripts: [{ hat: 'flag', body: [{ t: 'score', by: 99 }] }] } } })).toBeNull()
  })
  it('存取：信封带 lessonId；别课草稿拒绝恢复；超 64KB 拒绝', () => {
    const store = new Map<string, string>()
    const storage: StorageLike = { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v) }, removeItem: k => { store.delete(k) } }
    expect(saveDraft(storage, initialState()).ok).toBe(true)
    const loaded = loadDraft(storage)
    expect(loaded.state?.levelId).toBe('explore')
    store.set(L06_CONTRACT.draftKey, JSON.stringify({ lessonId: 'G2-U3-L05', savedAt: 'x', script: toDraft(initialState()) }))
    expect(loadDraft(storage).state).toBeNull()
    store.set(L06_CONTRACT.draftKey, 'x'.repeat(70 * 1024))
    expect(loadDraft(storage).state).toBeNull()
  })
  it('recordRun：探索关运行即观察；solve 三层过才通过；改程序后通过失效', () => {
    let s = initialState()
    const fp = (p: Program) => JSON.stringify(p)
    const t1 = trace({ levelId: 'explore', fingerprint: fp(programFor(s, 'explore')) })
    s = recordRun(s, t1)
    expect(isLevelPassed(s, 'explore')).toBe(true)
    const bad = trace({ levelId: 'solve', fingerprint: fp(ref()), randoms: [] })
    const s2 = { ...initialState(), programs: { ...initialState().programs, solve: ref() } }
    expect(isLevelPassed(recordRun(s2, bad), 'solve')).toBe(false)
    const good = trace({ levelId: 'solve', fingerprint: fp(ref()) })
    const s3 = recordRun(s2, good)
    expect(isLevelPassed(s3, 'solve')).toBe(true)
  })
})

describe('契约与文案', () => {
  it('契约合法：五要素、三级提示、草稿键与课程号一致', () => {
    expect(validateL06Contract(L06_CONTRACT)).toEqual([])
    expect(L06_CONTRACT.draftKey).toBe('kidscoding-draft:G2-U3-L06')
    expect(L06_CONTRACT.goal5[3]).toContain('L05')
    for (const c of Object.values(L06_CONTENT)) {
      expect(c.hints).toHaveLength(3)
      expect(c.task.length).toBeGreaterThan(10)
    }
    expect(L06_ACTIVITY_NOTE).toContain('教学定向')
  })
})

describe('沙箱守卫（静态核对沙箱页与 compile 的一致性）', () => {
  const html = readFileSync(join(process.cwd(), 'public', 'scratch-g2-u3-l06-sandbox.html'), 'utf8')
  it('加载真实渲染器与 VM；素材 ID 与 compile 一致', () => {
    expect(html).toContain('/scratch-vm/scratch-render.js')
    expect(html).toContain('/scratch-vm/scratch-vm.js')
    for (const id of Object.values(L06_ASSETS)) expect(html).toContain(id)
  })
  it('带种子 PRNG、虚拟时钟、指针转发、观察五积木都在', () => {
    expect(html).toContain('mulberry32')
    expect(html).toContain('Date.now = ')
    expect(html).toContain("postIOData('mouse'")
    for (const op of ['operator_random', 'motion_setx', 'sensing_touchingobject', 'data_changevariableby', 'looks_hide']) {
      expect(html).toContain(op)
    }
  })
  it('CSP 不放行网络；没有外部脚本地址', () => {
    expect(html).toContain("connect-src 'none'")
    expect(html).not.toMatch(/src="https?:/)
  })
})
