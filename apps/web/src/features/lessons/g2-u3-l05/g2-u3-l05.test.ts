// @vitest-environment node
// G2-U3-L05 核心逻辑单元测试：契约、草稿与恢复、舞台字典、参考做法（真实 VM 验证）、沙箱与 TS 一致性。
// 判定矩阵在 judge.vm.test.ts（真实 scratch-vm）；这里的合成轨迹只验证状态/草稿函数本身。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileProject, L05_ASSETS } from './compile'
import { L05_ACTIVITY_NOTE, L05_CONTENT, L05_CONTRACT, levelSituation, validateL05Contract } from './contract'
import { judgeRun, type RunTrace } from './judge'
import { L05_LEVEL_ORDER, L05_LEVELS, L05_PARAMS } from './params'
import { validateProgram, type Block, type Program } from './program'
import { alternatives, describeProgram } from './reference'
import {
  DEMO_PROGRAM, demoOutcome, editProgram, exploreDone, fromDraft, initialState, isLevelPassed, loadDraft,
  recordRun, saveDraft, toDraft, type StorageLike,
} from './state'
import { parseStageState, startDisplay, stageStateOf } from './stage-state'
import { runProgramInRealVm } from './testing/node-vm-runner'
import { syntheticTrace } from './testing/fake-vm-port'

const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const STANDARD: Program = flag(
  { t: 'setTime', value: 10 },
  { t: 'untilZero', body: [{ t: 'wait', secs: 1 }, { t: 'decrease', by: 1 }] },
  { t: 'broadcast' },
)

function memoryStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v }, removeItem: k => { delete data[k] } }
}

describe('参数与契约', () => {
  it('教学参数现在是“提议”，不是已批准也不是已验证', () => {
    expect(L05_PARAMS.rulingStatus).toBe('proposed')
  })

  it('契约字段完整：恰 5 条目标、3 级提示、draftKey 绑定本课、教学定向', () => {
    expect(validateL05Contract(L05_CONTRACT)).toEqual([])
    expect(L05_CONTRACT.goal5).toHaveLength(5)
    expect(L05_CONTRACT.hints).toHaveLength(3)
    expect(L05_CONTRACT.draftKey).toBe('kidscoding-draft:G2-U3-L05')
    expect(L05_CONTRACT.judging.scopeLabel).toBe('教学定向')
  })

  it('课程文案不用“随机”这个词（本课没有任何随机数，首席已裁定方向为“计时与游戏结束”）', () => {
    const all = JSON.stringify({ contract: L05_CONTRACT, content: L05_CONTENT, note: L05_ACTIVITY_NOTE })
    expect(all).not.toContain('随机')
  })

  it('三关顺序与起点：探索 10、独立 10、迁移 6', () => {
    expect(L05_LEVEL_ORDER).toEqual(['explore', 'solve', 'transferShort'])
    expect(L05_LEVELS.explore.startSeconds).toBe(10)
    expect(L05_LEVELS.solve.startSeconds).toBe(10)
    expect(L05_LEVELS.transferShort.startSeconds).toBe(6)
    expect(levelSituation(L05_LEVELS.transferShort)).toContain('6 秒')
  })

  it('探索关演示程序本身合法，且它就是“没有判断、固定重复 15 次”', () => {
    expect(validateProgram(DEMO_PROGRAM)).toEqual([])
    const body = DEMO_PROGRAM.scripts[0].body
    expect(body.some(b => b.t === 'repeat' && b.times === 15)).toBe(true)
    expect(body.some(b => b.t === 'untilZero')).toBe(false)
  })
})

describe('草稿：保存、恢复、拒绝', () => {
  it('存取往返：脚本、关卡、预测都回来；通过状态不入草稿', () => {
    const storage = memoryStorage()
    let s = initialState()
    s = editProgram(s, 'solve', STANDARD)
    s = { ...s, levelId: 'solve', predictions: { explore: { time: '-5', after: '不会' } } }
    expect(saveDraft(storage, s)).toEqual({ ok: true })
    const loaded = loadDraft(storage)
    expect(loaded.reason).toBeNull()
    expect(loaded.state?.levelId).toBe('solve')
    expect(loaded.state?.programs.solve).toEqual(STANDARD)
    expect(loaded.state?.predictions.explore).toEqual({ time: '-5', after: '不会' })
    expect(loaded.state?.passedAt).toEqual({})
  })

  it('信封不对（别的课、损坏 JSON、没有 script）一律拒绝，且不给出状态', () => {
    const storage = memoryStorage()
    storage.setItem('kidscoding-draft:G2-U3-L05', JSON.stringify({ lessonId: 'G2-U3-L04', script: toDraft(initialState()) }))
    expect(loadDraft(storage).state).toBeNull()
    storage.setItem('kidscoding-draft:G2-U3-L05', '{坏掉的')
    expect(loadDraft(storage).state).toBeNull()
    storage.setItem('kidscoding-draft:G2-U3-L05', JSON.stringify({ lessonId: 'G2-U3-L05' }))
    expect(loadDraft(storage).state).toBeNull()
  })

  it('草稿里有不合法的程序（比如等待 9 秒）→ 整体拒绝恢复，不部分恢复', () => {
    const bad = toDraft(initialState())
    bad.programs.solve = flag({ t: 'wait', secs: 9 })
    expect(fromDraft(bad)).toBeNull()
    expect(fromDraft({ ...bad, version: 2 })).toBeNull()
    expect(fromDraft(null)).toBeNull()
    expect(fromDraft('字符串')).toBeNull()
  })

  it('存储不可用时保存明确失败，不假装成功', () => {
    expect(saveDraft(null, initialState()).ok).toBe(false)
    expect(loadDraft(null).state).toBeNull()
  })
})

describe('运行落账与失效', () => {
  it('合成通过轨迹落账后该关算通过；改一个数字，指纹对不上就失效', () => {
    let s = editProgram(initialState(), 'solve', STANDARD)
    s = { ...s, levelId: 'solve' }
    const trace = syntheticTrace('solve', STANDARD, 1)
    const after = recordRun(s, trace)
    expect(isLevelPassed(after, 'solve')).toBe(true)
    const edited = editProgram(after, 'solve', flag({ t: 'setTime', value: 9 }, { t: 'untilZero', body: [{ t: 'wait', secs: 1 }, { t: 'decrease', by: 1 }] }, { t: 'broadcast' }))
    expect(isLevelPassed(edited, 'solve')).toBe(false)
  })

  it('探索关：演示轨迹判定不通过也算“观察过”；没写预测时不算完成', () => {
    const trace = syntheticTrace('explore', DEMO_PROGRAM, 1, { finalTime: -5 })
    const j = judgeRun(trace, L05_LEVELS.explore)
    expect(j.status).toBe('judged')
    if (j.status === 'judged') expect(j.passed).toBe(false)
    let s = recordRun(initialState(), trace)
    expect(isLevelPassed(s, 'explore')).toBe(true)
    expect(exploreDone(s)).toBe(false) // 还没写预测
    s = { ...s, predictions: { explore: { time: '-5', after: '不会' } } }
    expect(exploreDone(s)).toBe(true)
  })

  it('过期轨迹（指纹对不上）不落账', () => {
    const s = editProgram(initialState(), 'solve', STANDARD)
    const trace = syntheticTrace('solve', flag({ t: 'setTime', value: 8 }), 1)
    expect(recordRun(s, trace)).toBe(s)
  })

  it('demoOutcome 读真实轨迹字段：最终时间、得分、广播后得分是否变化', () => {
    const trace = syntheticTrace('explore', DEMO_PROGRAM, 1, { finalTime: -5 })
    const o = demoOutcome(trace)
    expect(o.finalTime).toBe(-5)
    expect(o.broadcasts).toBe(1)
    expect(o.scoreChangedAfterBroadcast).toBe(false)
  })
})

describe('舞台字典', () => {
  it('往返一致；缺字段 / 类型不对 / 关卡不对一律返回 null', () => {
    const d = startDisplay('transferShort')
    expect(d).toEqual({ timeLeft: 6, score: 0, over: false })
    const dict = stageStateOf({ timeLeft: 3, score: 7, over: false }, true, 'solve')
    expect(parseStageState(dict)?.display).toEqual({ timeLeft: 3, score: 7, over: false })
    expect(parseStageState({ ...dict, timeLeft: '3' })).toBeNull()
    expect(parseStageState({ ...dict, levelId: 'nope' })).toBeNull()
    expect(parseStageState(null)).toBeNull()
    expect(parseStageState(undefined)).toBeNull()
  })
})

describe('参考做法（通过之后才出现）：真实 VM 逐个验证', () => {
  // 一次真实 VM 运行在本机约 1–4 秒（scratch-vm 加载 + 约 400 帧），默认 5 秒超时在共享 CPU 上会偶发不够：
  // 每个做法单独一个用例并显式放宽到 30 秒，断言不变。
  for (const levelId of ['solve', 'transferShort'] as const) {
    for (const alt of alternatives(L05_LEVELS[levelId])) {
      it(`${levelId} / ${alt.title}：真的通过三层判定`, { timeout: 30_000 }, async () => {
        const trace: RunTrace = await runProgramInRealVm(alt.program, { levelId })
        const j = judgeRun(trace, L05_LEVELS[levelId])
        if (j.status !== 'judged') throw new Error(`别的做法没有被判定：${alt.title}`)
        expect(j.passed, `${levelId} / ${alt.title}`).toBe(true)
      })
    }
  }
  it('每关至少两个别的做法', () => {
    for (const levelId of ['solve', 'transferShort'] as const) {
      expect(alternatives(L05_LEVELS[levelId]).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('describeProgram 把学生程序写成可读的几行', () => {
    const text = describeProgram(STANDARD)
    expect(text).toContain('当绿旗被点击')
    expect(text).toContain('将 timeLeft 设为 10')
    expect(text).toContain('重复执行直到〈timeLeft < 1〉')
    expect(text).toContain('广播“游戏结束”')
  })
})

describe('角色造型素材（F1 整改）', () => {
  it('三个角色各用自己的造型 ID，互不相同，也不是旧的共用空白图', () => {
    const project = compileProject(STANDARD) as { targets: { name: string; costumes: { assetId: string }[] }[] }
    const byName = new Map(project.targets.map(t => [t.name, t.costumes[0].assetId]))
    expect(byName.get('Stage')).toBe(L05_ASSETS.backdrop)
    expect(byName.get('学生')).toBe(L05_ASSETS.student)
    expect(byName.get('水果')).toBe(L05_ASSETS.fruit)
    expect(new Set(byName.values()).size).toBe(3)
    expect([...byName.values()]).not.toContain('b1c2d3e4f5a60718293a4b5c6d7e8f90')
  })

  it('沙箱为三个造型各内置一份真实 SVG（不是 4×4 空白图），并随握手回传素材', () => {
    const html = readFileSync(join(process.cwd(), 'public', 'scratch-g2-u3-l05-sandbox.html'), 'utf8')
    expect(html).not.toContain('width="4" height="4"')
    expect(html).toContain('assets: {backdrop: uri(SVG.backdrop), student: uri(SVG.student), fruit: uri(SVG.fruit)}')
    // 学生有帽子和笑脸、水果是红苹果、背景有天空草地：用关键形状粗检三份图各就其位。
    expect(html).toContain('#e5484d')
    expect(html).toContain('#ffd43b')
  })
})

describe('舞台配色只用 V2 token（F2 整改）', () => {
  it('stage-view 无暖色硬编码（只允许 L04 先例的 #fff），且用了 --kc-action 圆环', () => {
    const src = readFileSync(join(process.cwd(), 'src/features/lessons/g2-u3-l05/ui/stage-view.tsx'), 'utf8')
    const hexes = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    expect(hexes).toEqual(['#fff'])
    expect(src).toContain('var(--kc-action)')
    expect(src).toContain('var(--kc-danger)')
    expect(src).toContain('var(--kc-success)')
  })

  it('classroom CSS 不再引用不存在的 --kc-brand', () => {
    const css = readFileSync(join(process.cwd(), 'src/features/lessons/g2-u3-l05/ui/classroom.module.css'), 'utf8')
    expect(css).not.toContain('--kc-brand')
    expect(css).toContain('var(--kc-action)')
  })
})

describe('沙箱常量与 TypeScript 一致（防止两边数字漂移）', () => {
  const html = readFileSync(join(process.cwd(), 'public', 'scratch-g2-u3-l05-sandbox.html'), 'utf8')

  it('LIMITS 与 params.ts 一致', () => {
    const limits = /const LIMITS = \{([^}]*)\}/.exec(html)?.[1] ?? ''
    const read = (key: string) => Number(new RegExp(`${key}:\\s*(-?[\\d.]+)`).exec(limits)?.[1])
    for (const key of ['frameCap', 'settleFrames', 'maxBlocks', 'maxScripts', 'minStart', 'maxStart', 'minWait', 'maxWait', 'minDecrease', 'maxDecrease', 'minRepeatTimes', 'maxRepeatTimes', 'broadcastSlackFrames'] as const) {
      expect(read(key), key).toBe(L05_PARAMS[key])
    }
    expect(read('scoreEverySeconds')).toBe(L05_PARAMS.scoreEverySeconds)
  })

  it('虚拟时钟步长与素材 ID 一致', () => {
    expect(html).toContain('1000 / 30')
    for (const assetId of Object.values(L05_ASSETS)) expect(html).toContain(`'${assetId}'`)
    expect(html).toContain("'kcl5_time'")
    expect(html).toContain("'kcl5_bc'")
  })

  it('沙箱用虚拟时钟且有防死循环的重绘请求（与 Node 运行器同做法）', () => {
    expect(html).toContain('Date.now = () => virtualNow')
    expect(html).toContain('virtualNow += STEP_MS')
    expect(html).toContain('stepThread')
    expect(html).toContain('requestRedraw()')
    expect(html).toContain('updateCurrentMSecs()')
  })

  it('沙箱只允许本课需要的九种学生积木', () => {
    const set = /const STUDENT_OPS = new Set\(\[([\s\S]*?)\]\)/.exec(html)?.[1] ?? ''
    const ops = set.split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean).sort()
    expect(ops).toEqual([
      'control_repeat', 'control_repeat_until', 'control_wait', 'data_changevariableby', 'data_setvariableto',
      'data_variable', 'event_broadcast', 'event_whenflagclicked', 'operator_lt',
    ])
  })

  it('沙箱固定自托管的 scratch-vm / scratch-storage，不走 CDN', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { dependencies?: Record<string, string> }
    expect(pkg.dependencies?.['scratch-vm']).toBe('5.0.300')
    expect(pkg.dependencies?.['scratch-storage']).toBe('4.0.0')
    for (const src of ['/scratch-vm/scratch-vm.js', '/scratch-vm/scratch-storage.min.js']) expect(html).toContain(`<script src="${src}"></script>`)
    expect(html).not.toContain('/scratch-vm/scratch-render.js') // 本课不用渲染器
    expect(html).not.toMatch(/\b(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//i)
    expect(html).not.toMatch(/jsdelivr/i)
  })

  it('沙箱的内容安全策略：不允许任何网络连接', () => {
    const csp = /Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? ''
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
    expect(csp).toContain("connect-src 'none'")
    expect(csp).not.toMatch(/jsdelivr|https?:/)
  })

  it('沙箱不发起网络请求', () => {
    const script = html.slice(html.indexOf('<script>\n(() =>'))
    expect(script).not.toMatch(/\bfetch\s*\(/)
    expect(script).not.toMatch(/XMLHttpRequest/)
  })
})
