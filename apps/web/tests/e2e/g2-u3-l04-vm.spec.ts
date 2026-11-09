// G2-U3-L04《判断碰撞得分》真实 Scratch VM + 真实渲染器行为矩阵。
// 在真实浏览器里加载 public/scratch-g2-u3-l04-sandbox.html（内含真实 scratch-vm@5.0.300 与 scratch-render@2.2.84），
// 用 compile.ts 把学生脚本编译成 Scratch 工程送进去逐帧运行，再用 judge.ts 判定。
// 不含任何积木或碰撞模拟：touching 的返回值来自真实渲染器，检查、得分、隐藏全部来自 VM 里真实执行的积木。
// VM 与渲染器由共享的 prebuild（copy-scratch-vm.mjs）放进 public/scratch-vm/，本文件的静态服务器从那里提供：
// 因此这个 spec 同时证明 scratch-render.js 在 prebuild 之后仍然存在（见 beforeAll 里的存在性断言）。
import {createServer, type Server} from 'node:http'
import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {expect, test, type Page} from '@playwright/test'
import {compileProject, L04_ASSETS} from '../../src/features/lessons/g2-u3-l04/compile'
import {judgeRun, type RunJudgment, type RunTrace} from '../../src/features/lessons/g2-u3-l04/judge'
import {L04_LEVELS, L04_PARAMS, type LevelId} from '../../src/features/lessons/g2-u3-l04/params'
import {programFingerprint, validateProgram, type Block, type Program} from '../../src/features/lessons/g2-u3-l04/program'
import {alternatives} from '../../src/features/lessons/g2-u3-l04/reference'

const WEB_ROOT = join(__dirname, '..', '..')
const PUBLIC_DIR = join(WEB_ROOT, 'public')
let server: Server
let origin = ''
const requested: string[] = []

test.beforeAll(async () => {
  for (const f of ['scratch-vm.js', 'scratch-storage.min.js', 'scratch-render.js']) {
    expect(existsSync(join(PUBLIC_DIR, 'scratch-vm', f)), `public/scratch-vm/${f} 不存在：先运行 npm run build 或 node scripts/copy-scratch-vm.mjs`).toBe(true)
  }
  server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]
    requested.push(url)
    if (url === '/host.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(HOST_HTML)
      return
    }
    if (url === '/scratch-g2-u3-l04-sandbox.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(readFileSync(join(PUBLIC_DIR, 'scratch-g2-u3-l04-sandbox.html')))
      return
    }
    const vm = /^\/scratch-vm\/(scratch-vm\.js|scratch-storage\.min\.js|scratch-render\.js)$/.exec(url)
    if (vm) {
      res.setHeader('content-type', 'text/javascript; charset=utf-8')
      res.end(readFileSync(join(PUBLIC_DIR, 'scratch-vm', vm[1])))
      return
    }
    res.statusCode = 404
    res.end()
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
})
test.afterAll(async () => { await new Promise(resolve => server.close(resolve)) })

// 宿主页：和真实课堂一样把沙箱放进 sandbox="allow-scripts" 的 iframe，只通过 postMessage 通信。
const HOST_HTML = `<!doctype html><meta charset="utf-8"><body>
<iframe id="f" sandbox="allow-scripts" src="/scratch-g2-u3-l04-sandbox.html"></iframe>
<script>
  const frame = document.getElementById('f');
  const inbox = [];
  const waiters = [];
  window.addEventListener('message', e => {
    if (e.source !== frame.contentWindow) return;
    inbox.push(e.data);
    for (const w of waiters.slice()) if (w.test(e.data)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(e.data); }
  });
  window.waitFor = (test, ms = 20000) => new Promise((resolve, reject) => {
    const hit = inbox.find(test);
    if (hit) return resolve(hit);
    const w = {test, resolve};
    waiters.push(w);
    setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); reject(new Error('timeout')); } }, ms);
  });
  window.post = msg => frame.contentWindow.postMessage(msg, '*');
  window.inboxOf = (kind, id) => inbox.filter(m => m.kind === kind && (id === undefined || m.id === id));
  window.ready = () => new Promise(resolve => {
    const ping = () => post({kind: 'PING'});
    const t = setInterval(ping, 300); ping();
    waitFor(m => m.kind === 'FRAME_READY').then(m => { clearInterval(t); resolve(m); });
  });
</script>`

let nextRunId = 1000
type FrameMsg = {frame: number; basket: {x: number; y: number}; hitBall: {x: number; y: number; visible: boolean}; groundBall: {x: number; y: number; visible: boolean}; score: number}
export type RunResult = {trace: RunTrace; judgment: RunJudgment; frames: FrameMsg[]; skinMs: number | null; sizes: Record<string, [number, number]> | null}

async function ready(page: Page) {
  await page.goto(`${origin}/host.html`)
  const hello = await page.evaluate(() => (window as unknown as {ready: () => Promise<{available: boolean}>}).ready())
  expect(hello.available, 'VM 或渲染器没有加载：public/scratch-vm/ 不完整（先运行 npm run build 或 node scripts/copy-scratch-vm.mjs）').toBe(true)
}

/** 经沙箱运行一次。 */
async function run(page: Page, program: Program, levelId: LevelId, opts: {frameMs?: number} = {}): Promise<RunResult> {
  const level = L04_LEVELS[levelId]
  const id = nextRunId++
  const message = {
    kind: 'RUN', id, levelId, ballSpeed: level.ballSpeed, fingerprint: programFingerprint(program),
    frameMs: opts.frameMs ?? 0, project: compileProject(program, level),
  }
  const trace = await page.evaluate(async ({message, id}) => {
    const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{trace: unknown; error?: string; kind: string}>}
    w.post(message)
    const done = await w.waitFor(m => (m.kind === 'RUN_DONE' || m.kind === 'ERROR' || m.kind === 'REJECTED') && m.id === id)
    if (done.kind !== 'RUN_DONE') throw new Error(`${done.kind}: ${done.error}`)
    return done.trace
  }, {message, id}) as RunTrace
  const frames = await page.evaluate((id) => (window as unknown as {inboxOf: (k: string, i: number) => unknown[]}).inboxOf('FRAME', id), id) as FrameMsg[]
  const started = await page.evaluate((id) => (window as unknown as {inboxOf: (k: string, i: number) => Array<{skinMs: number; sizes: Record<string, [number, number]>}>}).inboxOf('STARTED', id), id)
  return {trace, judgment: judgeRun(trace, level), frames, skinMs: started[0]?.skinMs ?? null, sizes: started[0]?.sizes ?? null}
}

const score = (by: number): Block => ({t: 'score', by})
const hide: Block = {t: 'hide'}
const iftouch = (...body: Array<Block & {t: 'score' | 'hide'}>): Block => ({t: 'iftouch', body})
const repeat = (times: number, ...body: Block[]): Block => ({t: 'repeat', times, body: body as never})
const flag = (...body: Block[]): Program => ({scripts: [{hat: 'flag', body}]})
/** 标准做法：重复 times 次 { 如果〈碰到 篮子？〉那么 { 将 得分 增加 by；隐藏 } } */
const standard = (times: number, by = 1): Program => flag(repeat(times, iftouch(score(by) as never, hide as never)))

export function judged(r: RunResult) {
  if (r.judgment.status !== 'judged') throw new Error(`未判定：${r.judgment.reason}`)
  return r.judgment
}

/** 把一次运行压成便于断言/打印的摘要。 */
function summary(r: RunResult) {
  const j = r.judgment.status === 'judged' ? r.judgment : null
  return {
    score: r.trace.finalScore,
    red: r.trace.scores.filter(x => x.ball === '红球').length,
    blue: r.trace.scores.filter(x => x.ball === '蓝球').length,
    redFrames: r.trace.scores.filter(x => x.ball === '红球').map(x => x.frame),
    trueChecks: r.trace.checks.filter(c => c.result).length,
    hides: r.trace.hides.map(h => `${h.ball}@${h.frame}`),
    visible: r.trace.visible,
    layers: j ? [j.stage.passed, j.task.passed, j.knowledge.passed, j.passed] : null,
    frames: r.trace.framesRun,
  }
}

type Layers = [stage: boolean, task: boolean, knowledge: boolean, passed: boolean]
type Row = {
  name: string; level: LevelId; program: Program
  score: number; red: number; blue: number; layers: Layers
  /** 判定三层措辞里必须出现的片段（证明失败是因为预期的原因，而不是别的）。 */
  says?: {stage?: string; task?: string; knowledge?: string}
  redHideFrame?: number
}
const R = (r: Row) => r

// 每一行都是真实 VM + 真实渲染器跑出来的结果；期望值来自实测，不是估算。帧号按沙箱约定（第一次 _step() 是第 1 帧）。
const ROWS: Row[] = [
  R({name: '标准做法：重复 40 次 { 如果〈碰到篮子〉{ 得分+1；隐藏 } }', level: 'solve', program: standard(40), score: 1, red: 1, blue: 0, layers: [true, true, true, true], redHideFrame: 25}),
  R({name: '隐藏在得分之前也通过（顺序不影响）', level: 'solve', program: flag(repeat(40, iftouch(hide as never, score(1) as never))), score: 1, red: 1, blue: 0, layers: [true, true, true, true]}),
  R({name: '没有“如果”：重复 40 次 { 得分+1 } → 两个球都被加了分', level: 'solve', program: flag(repeat(40, score(1))), score: 80, red: 40, blue: 40, layers: [false, false, false, false],
    says: {task: '蓝球也被加了', knowledge: '没有用到判断'}}),
  R({name: '没有“如果”，只加一次（不在重复里）：红蓝各加 1 分', level: 'solve', program: flag(score(1)), score: 2, red: 1, blue: 1, layers: [false, false, false, false],
    says: {task: '蓝球也被加了 1 次', knowledge: '没有用到判断'}}),
  R({name: '有“如果”，没有隐藏：红球被连加 8 次（同一球重复计分）', level: 'solve', program: flag(repeat(40, iftouch(score(1) as never))), score: 8, red: 8, blue: 0, layers: [false, false, true, false],
    says: {stage: '最终得分是 8 分', task: '红球被加了 8 次分', knowledge: '满足判断要求'}}),
  R({name: '检查次数恰好够：重复 25 次（球第 25 帧到）', level: 'solve', program: standard(25), score: 1, red: 1, blue: 0, layers: [true, true, true, true]}),
  R({name: '检查次数少 1：重复 24 次 → 球到的时候检查已经结束，得 0 分', level: 'solve', program: standard(24), score: 0, red: 0, blue: 0, layers: [false, false, false, false],
    says: {task: '一次分都没有加', knowledge: '检查的次数可能不够'}}),
  R({name: '检查次数少 2：重复 23 次', level: 'solve', program: standard(23), score: 0, red: 0, blue: 0, layers: [false, false, false, false]}),
  R({name: '隐藏写在“如果”外面：两个球第 1 帧就被隐藏，什么都碰不到', level: 'solve', program: flag(repeat(40, iftouch(score(1) as never), hide)), score: 0, red: 0, blue: 0, layers: [false, false, false, false],
    says: {knowledge: '检查的次数可能不够'}}),
  R({name: '只检查一次（“如果”不在“重复”里）：球还没到，得 0 分', level: 'solve', program: flag(iftouch(score(1) as never, hide as never)), score: 0, red: 0, blue: 0, layers: [false, false, false, false]}),
  R({name: '空程序', level: 'solve', program: {scripts: []}, score: 0, red: 0, blue: 0, layers: [false, false, false, false], says: {knowledge: '没有用到判断'}}),
  R({name: '只有绿旗', level: 'solve', program: flag(), score: 0, red: 0, blue: 0, layers: [false, false, false, false]}),
  // ---- 有真实的检查，但得分不受它约束（这是知识证据“按球、同一帧配对”要抓住的情形）----
  R({name: '有检查但得分在条件外：重复 40 次 { 如果{隐藏}；得分+1 } → 80 次加分里 79 次没被条件挡住', level: 'solve', program: flag(repeat(40, iftouch(hide as never), score(1))), score: 80, red: 40, blue: 40, layers: [false, false, false, false],
    says: {knowledge: '共 79 次加分没有被条件挡住'}}),
  R({name: '有检查但得分在条件外，只做一次', level: 'solve', program: flag(iftouch(hide as never), score(1)), score: 2, red: 1, blue: 1, layers: [false, false, false, false],
    says: {knowledge: '共 2 次加分没有被条件挡住'}}),
  R({name: '两条脚本：一条负责检查，另一条无条件加分（判定看行为，不看“有没有如果”）', level: 'solve', program: {scripts: [{hat: 'flag', body: [repeat(40, iftouch(hide as never))]}, {hat: 'flag', body: [score(1)]}]}, score: 2, red: 1, blue: 1, layers: [false, false, false, false],
    says: {knowledge: '共 2 次加分没有被条件挡住'}}),
  R({name: '散积木（没接绿旗）和标准脚本并存：散积木不运行，得分仍是 1', level: 'solve', program: {scripts: [{hat: null, body: [score(1)]}, {hat: 'flag', body: [repeat(40, iftouch(score(1) as never, hide as never))]}]}, score: 1, red: 1, blue: 0, layers: [true, true, true, true]}),
  R({name: '标准脚本外面再多一个无条件“得分+1”：红球 2 次、蓝球 1 次', level: 'solve', program: flag(repeat(40, iftouch(score(1) as never, hide as never)), score(1)), score: 3, red: 2, blue: 1, layers: [false, false, false, false],
    says: {task: '红球被加了 2 次分', knowledge: '没有被条件挡住'}}),
  // ---- 迁移 A：每个球 2 分 ----
  R({name: '迁移 A：标准做法加 2 分', level: 'transferPoints', program: standard(40, 2), score: 2, red: 1, blue: 0, layers: [true, true, true, true]}),
  R({name: '迁移 A：照抄上一关的加 1 分 → 舞台、任务不通过，知识证据通过', level: 'transferPoints', program: standard(40, 1), score: 1, red: 1, blue: 0, layers: [false, false, true, false],
    says: {task: '红球这一次加了 1 分，本关要求每个球加 2 分'}}),
  R({name: '迁移 A：没有“如果”、各加 1 分 → 总分碰巧是 2（舞台通过），但任务和知识证据指出蓝球也被算了', level: 'transferPoints', program: flag(repeat(1, score(1))), score: 2, red: 1, blue: 1, layers: [true, false, false, false],
    says: {stage: '正好是本关要求的 2 分', task: '蓝球也被加了 1 次', knowledge: '没有用到判断'}}),
  // ---- 迁移 B：球更快 ----
  R({name: '迁移 B：重复 13 次恰好够（球第 13 帧到）', level: 'transferFast', program: standard(13), score: 1, red: 1, blue: 0, layers: [true, true, true, true], redHideFrame: 13}),
  R({name: '迁移 B：重复 12 次错过了球', level: 'transferFast', program: standard(12), score: 0, red: 0, blue: 0, layers: [false, false, false, false], says: {knowledge: '检查的次数可能不够'}}),
  R({name: '迁移 B：照抄上一关的重复 10 次也错过', level: 'transferFast', program: standard(10), score: 0, red: 0, blue: 0, layers: [false, false, false, false]}),
  R({name: '迁移 B：重复 40 次也通过', level: 'transferFast', program: standard(40), score: 1, red: 1, blue: 0, layers: [true, true, true, true]}),
  // ---- 探索关（只读演示程序，没有隐藏）----
  R({name: '探索关演示：球速 10、不隐藏 → 8 分、蓝球不加分', level: 'explore', program: flag(repeat(40, iftouch(score(1) as never))), score: 8, red: 8, blue: 0, layers: [false, false, true, false]}),
]

test.describe('G2-U3-L04 真实 Scratch VM + 渲染器：判定矩阵（每行跑 2 次，结果必须一致）', () => {
  test.setTimeout(240_000)
  test.beforeEach(async ({page}) => { await ready(page) })
  for (const row of ROWS) {
    test(row.name, async ({page}) => {
      for (let i = 0; i < 2; i++) {
        const r = await run(page, row.program, row.level)
        expect(r.trace.endedBy, `第 ${i + 1} 次`).toBe('finished')
        const sum = summary(r)
        expect([sum.score, sum.red, sum.blue], `第 ${i + 1} 次：得分 / 红球加分次数 / 蓝球加分次数`).toEqual([row.score, row.red, row.blue])
        expect(sum.layers, `第 ${i + 1} 次：舞台 / 任务 / 知识 / 总体`).toEqual(row.layers)
        const j = judged(r)
        if (row.says?.stage) expect(j.stage.line).toContain(row.says.stage)
        if (row.says?.task) expect(j.task.line).toContain(row.says.task)
        if (row.says?.knowledge) expect(j.knowledge.line).toContain(row.says.knowledge)
        if (row.redHideFrame !== undefined) expect(r.trace.hides.filter(h => h.ball === '红球').map(h => h.frame)).toEqual([row.redHideFrame])
      }
    })
  }
})

test.describe('G2-U3-L04 真实 Scratch VM + 渲染器：真实碰撞与行为守护', () => {
  test.setTimeout(180_000)
  test.beforeEach(async ({page}) => { await ready(page) })

  test('touching 来自真实渲染器：红球只在落到篮子上的那几帧为 true，蓝球一次都不是', async ({page}) => {
    const r = await run(page, flag(repeat(40, iftouch(score(1) as never))), 'explore')
    const redTrue = r.trace.checks.filter(c => c.ball === '红球' && c.result).map(c => c.frame)
    expect(redTrue).toEqual([25, 26, 27, 28, 29, 30, 31, 32]) // 连续 8 帧，正是红球与篮子重叠的帧
    expect(r.trace.checks.filter(c => c.ball === '蓝球' && c.result)).toHaveLength(0)
    // 红球 true 的帧，位置确实与篮子相交：球心 y 在 (-130-20-20, -130+20+20) 的范围里
    for (const f of redTrue) {
      const m = r.frames.find(x => x.frame === f)!
      expect(m.hitBall.y, `第 ${f} 帧红球位置`).toBeLessThanOrEqual(L04_PARAMS.basketY + 40)
      expect(m.hitBall.y).toBeGreaterThanOrEqual(L04_PARAMS.basketY - 40)
      expect(Math.abs(m.hitBall.x - m.basket.x)).toBeLessThan(40)
    }
    // 蓝球始终离篮子很远
    for (const m of r.frames) expect(Math.abs(m.groundBall.x - m.basket.x)).toBeGreaterThan(100)
  })

  test('球的位置逐帧回报：红球和蓝球每帧下落球速的距离，篮子不动', async ({page}) => {
    const r = await run(page, standard(40), 'solve', {frameMs: 0})
    const f1 = r.frames.find(f => f.frame === 1)!
    const f2 = r.frames.find(f => f.frame === 2)!
    expect(f1.groundBall.y - f2.groundBall.y).toBe(L04_LEVELS.solve.ballSpeed)
    expect(r.frames.every(f => f.basket.x === L04_PARAMS.basketX && f.basket.y === L04_PARAMS.basketY)).toBe(true)
    expect(r.frames[0].groundBall.x).toBe(L04_PARAMS.groundBallX)
    expect(r.frames[0].hitBall.x).toBe(L04_PARAMS.hitBallX)
    const last = r.frames[r.frames.length - 1]
    expect(last.groundBall.y).toBeLessThanOrEqual(L04_PARAMS.groundY + 40) // 蓝球落到了地上
  })

  test('得分变量由真实积木改：舞台上最后的得分等于 trace.finalScore，每一帧回报的得分单调不减', async ({page}) => {
    const r = await run(page, flag(repeat(40, iftouch(score(1) as never))), 'solve')
    const scores = r.frames.map(f => f.score)
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1])
    expect(scores[scores.length - 1]).toBe(r.trace.finalScore)
  })

  test('帧不等于迭代：球落地、下落脚本结束后没有重绘请求，孩子的循环在同一帧里跑完剩下的迭代', async ({page}) => {
    const r = await run(page, flag(repeat(40, score(1))), 'solve')
    const byFrame = new Map<number, number>()
    for (const e of r.trace.scores.filter(x => x.ball === '红球')) byFrame.set(e.frame, (byFrame.get(e.frame) ?? 0) + 1)
    // 下落期间（第 1～33 帧）每帧恰好一次
    for (let f = 1; f <= 33; f++) expect(byFrame.get(f), `第 ${f} 帧`).toBe(1)
    // 最后一帧一次性多了 7 次（40 - 33）
    expect(byFrame.get(34)).toBe(7)
  })

  test('“等 SVG 造型就绪”这道守卫真的执行了：点绿旗之前各角色的包围盒就是造型的真实尺寸（没等的话是比真实尺寸大 1 的占位值），耗时有上界', async ({page}) => {
    // 如实说明这条测试能证明什么、不能证明什么：本课的球要落 24 帧才碰到篮子，而造型几毫秒内就会就绪，所以**删掉这道守卫
    // 不会改变本课任何判定结果，也杀不掉“删掉守卫”的变异**——这是本课场景下的等价变异。守卫的必要性证据在 spike（#499）：
    // 那里球和篮子一开始就重叠，“不等造型”的变异被发现。这里只断言：点绿旗之前读到的尺寸是造型的真实尺寸，且等待有上界。
    const r = await run(page, standard(40), 'solve')
    expect(r.sizes).toEqual({'篮子': [80, 40], '红球': [40, 40], '蓝球': [40, 40]})
    expect(r.skinMs).not.toBeNull()
    expect(r.skinMs!).toBeLessThan(L04_PARAMS.skinWaitMs)
  })

  test('两个球用的是同一段孩子脚本：红球和蓝球的检查次数相同', async ({page}) => {
    const r = await run(page, standard(40), 'solve')
    const n = (b: string) => r.trace.checks.filter(c => c.ball === b).length
    expect(n('红球')).toBeGreaterThan(0)
    expect(n('红球')).toBeGreaterThanOrEqual(25) // 红球在第 25 帧得分后就隐藏，但此前已检查了至少 25 次
    expect(n('蓝球')).toBe(40) // 蓝球从不隐藏，40 次检查全部执行
  })

  test('每次运行都从头开始：上一次的得分、隐藏状态不带到下一次', async ({page}) => {
    await run(page, standard(40), 'solve') // 红球被隐藏
    const r = await run(page, flag(), 'solve') // 空脚本
    expect(r.trace.finalScore).toBe(0)
    expect(r.trace.visible).toEqual({红球: true, 蓝球: true})
    expect(r.frames[0].hitBall.visible).toBe(true)
  })
})

test.describe('G2-U3-L04 正式沙箱：安全边界（独立于 spike 的断言）', () => {
  test.setTimeout(120_000)
  const html = readFileSync(join(PUBLIC_DIR, 'scratch-g2-u3-l04-sandbox.html'), 'utf8')
  const l02 = readFileSync(join(PUBLIC_DIR, 'scratch-g2-u3-l02-sandbox.html'), 'utf8')
  const l03Path = join(PUBLIC_DIR, 'scratch-g2-u3-l03-sandbox.html')
  const csp = (h: string) => /Content-Security-Policy" content="([^"]*)"/.exec(h)?.[1] ?? ''

  test('CSP 与 L02 沙箱逐字相同，只多一条 img-src data:；不开放网络、blob、外部来源、通配', () => {
    const policy = csp(html)
    expect(policy).toContain("default-src 'none'")
    expect(policy).toContain("connect-src 'none'")
    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
    expect(policy).toContain('img-src data:')
    expect(policy).not.toMatch(/https?:|blob:|\*|ws:|wss:/)
    expect(policy.replace(' img-src data:;', '')).toBe(csp(l02))
  })

  test('L03 沙箱（如果存在）的 CSP 也与本沙箱只差 img-src data:（渲染器没有改变其他课程的沙箱）', () => {
    test.skip(!existsSync(l03Path), 'L03 沙箱不在这个分支里（#494 未合并）')
    expect(csp(html).replace(' img-src data:;', '')).toBe(csp(readFileSync(l03Path, 'utf8')))
  })

  test('沙箱页只加载三个本源脚本（VM、storage、render），没有任何外部地址', () => {
    const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1])
    expect(srcs).toEqual(['/scratch-vm/scratch-vm.js', '/scratch-vm/scratch-storage.min.js', '/scratch-vm/scratch-render.js'])
    expect(html).not.toMatch(/\b(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//i)
    expect(html).not.toMatch(/url\(\s*["']?\s*(?:https?:)?\/\//i)
    expect(html).not.toMatch(/jsdelivr/i)
  })

  test('沙箱不发起网络请求，内置 SVG 不含脚本或事件属性', () => {
    const script = html.slice(html.indexOf('<script>\n(() =>'))
    expect(script).not.toMatch(/\bfetch\s*\(/)
    expect(script).not.toMatch(/XMLHttpRequest|WebSocket|sendBeacon/)
    const svgBlock = /const SVG = \{([\s\S]*?)\n  \};/.exec(script)?.[1] ?? ''
    expect(svgBlock.length).toBeGreaterThan(100)
    expect(svgBlock).not.toMatch(/<script/i)
    expect(svgBlock).not.toMatch(/\son[a-z]+=/i)
    expect(svgBlock).not.toMatch(/xlink:href|<image|<foreignObject/i)
  })

  test('LIMITS 与 params.ts 一致（防止两边数字漂移）', () => {
    const limits = /const LIMITS = \{([^}]*)\}/.exec(html)?.[1] ?? ''
    const read = (key: string) => Number(new RegExp(`${key}:\\s*(-?\\d+)`).exec(limits)?.[1])
    for (const key of ['stageMinX', 'stageMaxX', 'groundY', 'basketX', 'basketY', 'ballStartY', 'hitBallX', 'groundBallX', 'fallDistance', 'minRepeatTimes', 'maxRepeatTimes', 'minScoreStep', 'maxScoreStep', 'maxBlocks', 'maxNesting', 'maxScripts', 'frameCap', 'skinWaitMs'] as const) {
      expect(read(key), key).toBe(L04_PARAMS[key])
    }
  })

  test('素材 ID 与 compile.ts 一致', () => {
    for (const [key, id] of Object.entries(L04_ASSETS)) expect(html, key).toContain(`${key}: '${id}'`)
  })

  test('沙箱只允许本课需要的积木', () => {
    const set = /const ALLOWED_BALL = new Set\(\[([\s\S]*?)\]\)/.exec(html)?.[1] ?? ''
    const ops = [...set.matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort()
    expect(ops).toEqual(['control_if', 'control_repeat', 'data_changevariableby', 'event_whenflagclicked', 'looks_hide', 'motion_changeyby', 'sensing_touchingobject', 'sensing_touchingobjectmenu'])
  })

  test('宿主 iframe 只有 allow-scripts；沙箱里读 localStorage 抛 SecurityError（opaque origin）', async ({page}) => {
    await ready(page)
    expect(await page.evaluate(() => document.getElementById('f')!.getAttribute('sandbox'))).toBe('allow-scripts')
    const frame = page.frames().find(f => f.url().endsWith('/scratch-g2-u3-l04-sandbox.html'))!
    const access = await frame.evaluate(() => { try { void localStorage.length; return 'readable' } catch (e) { return (e as Error).name } })
    expect(access).toBe('SecurityError')
  })

  test('沙箱内主动发起 fetch / XHR / 图片 / WebSocket 到外部地址，全部被拒绝', async ({page}) => {
    await ready(page)
    const frame = page.frames().find(f => f.url().endsWith('/scratch-g2-u3-l04-sandbox.html'))!
    const results = await frame.evaluate(async () => {
      const attempts: Record<string, () => Promise<string>> = {
        fetch: () => fetch('https://example.com/x').then(() => 'allowed', () => 'blocked'),
        xhr: () => new Promise(res => { try { const x = new XMLHttpRequest(); x.open('GET', 'https://example.com/x'); x.onerror = () => res('blocked'); x.onload = () => res('allowed'); x.send() } catch { res('blocked') } }),
        img: () => new Promise(res => { const i = new Image(); i.onload = () => res('allowed'); i.onerror = () => res('blocked'); i.src = 'https://example.com/x.png' }),
        ws: () => new Promise(res => { try { const w = new WebSocket('wss://example.com/x'); w.onerror = () => res('blocked'); w.onopen = () => res('allowed') } catch { res('blocked') } }),
      }
      const out: Record<string, string> = {}
      await Promise.all(Object.entries(attempts).map(async ([k, f]) => { out[k] = await f() }))
      return out
    })
    expect(results).toEqual({fetch: 'blocked', xhr: 'blocked', img: 'blocked', ws: 'blocked'})
  })

  test('运行（含渲染器）期间没有产生任何对 VM / 渲染器 / 沙箱页以外的请求', async ({page}) => {
    requested.length = 0
    await ready(page)
    await run(page, standard(40), 'solve')
    expect([...new Set(requested)].sort()).toEqual(['/host.html', '/scratch-g2-u3-l04-sandbox.html', '/scratch-vm/scratch-render.js', '/scratch-vm/scratch-storage.min.js', '/scratch-vm/scratch-vm.js'].sort())
  })
})

test.describe('G2-U3-L04 参考做法：每一个“别的做法”都真的在真实 VM 里通过三层判定', () => {
  test.setTimeout(180_000)
  test.beforeEach(async ({page}) => { await ready(page) })
  for (const levelId of ['solve', 'transferPoints', 'transferFast'] as const) {
    test(`${levelId}：所有别的做法合法，且真实运行全部通过`, async ({page}) => {
      const alts = alternatives(L04_LEVELS[levelId])
      expect(alts.length, '这一关应该有别的做法').toBeGreaterThanOrEqual(2)
      for (const alt of alts) {
        expect(validateProgram(alt.program), alt.title).toEqual([])
        const r = await run(page, alt.program, levelId)
        const j = judged(r)
        expect([j.stage.passed, j.task.passed, j.knowledge.passed, j.passed], `${levelId} · ${alt.title}`).toEqual([true, true, true, true])
      }
    })
  }
  test('没实测过的球速不给“别的做法”（宁可少给，不给没验证过的）', () => {
    expect(alternatives({id: 'solve', layer: 2, ballSpeed: 15, points: 1})).toEqual([])
  })
})

test.describe('G2-U3-L04 真实 Scratch VM + 渲染器：停止、拒绝与资源释放', () => {
  test.setTimeout(180_000)
  test.beforeEach(async ({page}) => { await ready(page) })

  const post = (page: Page, msg: unknown) => page.evaluate(m => (window as unknown as {post: (x: unknown) => void}).post(m), msg)
  const wait = (page: Page, kind: string, id: number) =>
    page.evaluate(({kind, id}) => (window as unknown as {waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<unknown>}).waitFor(m => m.kind === kind && m.id === id), {kind, id})
  async function start(page: Page, program: Program, levelId: LevelId, frameMs: number) {
    const id = nextRunId++
    const level = L04_LEVELS[levelId]
    await post(page, {kind: 'RUN', id, levelId, ballSpeed: level.ballSpeed, fingerprint: programFingerprint(program), frameMs, project: compileProject(program, level)})
    return id
  }

  test('运行中停止：endedBy 为 stopped，不判定，渲染器被释放', async ({page}) => {
    const id = await start(page, standard(40), 'solve', 60)
    await wait(page, 'STARTED', id)
    await wait(page, 'FRAME', id)
    await post(page, {kind: 'STOP', id})
    const done = await wait(page, 'RUN_DONE', id) as {trace: RunTrace}
    expect(done.trace.endedBy).toBe('stopped')
    expect(judgeRun(done.trace, L04_LEVELS.solve).status).toBe('not-judged')
    const did = nextRunId++
    await post(page, {kind: 'DISPOSE', id: did})
    const d = await wait(page, 'DISPOSED', did) as {vmNull: boolean; rendererNull: boolean; canvasCount: number}
    expect([d.vmNull, d.rendererNull, d.canvasCount]).toEqual([true, true, 0])
  })

  test('停止之后马上重跑：新的一次不受旧的影响', async ({page}) => {
    const first = await start(page, standard(40), 'solve', 60)
    await wait(page, 'STARTED', first)
    await post(page, {kind: 'STOP', id: first})
    await wait(page, 'RUN_DONE', first)
    const r = await run(page, standard(40), 'solve')
    expect(r.trace.endedBy).toBe('finished')
    expect(judged(r).passed).toBe(true)
  })

  test('资源释放：每次运行结束后 VM / 渲染器引用清空、canvas 移除；连续运行 12 次不累积', async ({page}) => {
    for (let i = 0; i < 12; i++) await run(page, standard(40), 'solve')
    const did = nextRunId++
    await post(page, {kind: 'DISPOSE', id: did})
    const d = await wait(page, 'DISPOSED', did) as {had: {vm: boolean; renderer: boolean}; vmNull: boolean; rendererNull: boolean; canvasCount: number}
    // 运行正常结束时沙箱已经自己释放了：此时没有任何东西需要释放
    expect(d.had).toEqual({vm: false, renderer: false})
    expect([d.vmNull, d.rendererNull, d.canvasCount]).toEqual([true, true, 0])
    // 最近一次真正的释放（最后一次运行结束时）：确实有渲染器，并且 WebGL 上下文确实已经丢失
    expect((d as unknown as {lastRelease: {had: boolean; contextLost: boolean}}).lastRelease).toEqual({had: true, contextLost: true})
  })

  // ---- 沙箱只接受本课的工程：任何越界的工程在进入 VM 之前就被拒绝，并且说明原因 ----
  type Raw = {targets: Array<{blocks: Record<string, Record<string, unknown>>; [k: string]: unknown}>}
  const base = (): Raw => JSON.parse(JSON.stringify(compileProject(standard(40), L04_LEVELS.solve)))
  const ballBlocks = (p: Raw, i = 2) => p.targets[i].blocks
  /** 孩子自己的积木（红球 hbs…、蓝球 gbs…）；课程预置的下落脚本 hbh / hbr / hbm 不在其中。 */
  const idsOf = (p: Raw, opcode: string, i = 2) => Object.entries(ballBlocks(p, i)).filter(([id, b]) => b.opcode === opcode && /^(hb|gb)s/.test(id)).map(([id]) => id)

  const rejected: Array<{name: string; reason: string; mutate: (p: Raw) => void}> = [
    {name: '不属于本课的积木（移动 10 步）', reason: '本课不允许的积木：motion_movesteps', mutate: p => { ballBlocks(p)[idsOf(p, 'control_repeat')[0]].opcode = 'motion_movesteps' }},
    {name: '孩子脚本里放了“将 y 增加”（只有课程预置的下落脚本能用）', reason: '本课不允许的积木：motion_changeyby', mutate: p => { ballBlocks(p)[idsOf(p, 'looks_hide')[0]].opcode = 'motion_changeyby' }},
    {name: '不属于本课的积木（说话）', reason: '本课不允许的积木：looks_say', mutate: p => { ballBlocks(p).zz = {opcode: 'looks_say', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true} }},
    {name: '不属于本课的积木（永远重复）', reason: '本课不允许的积木：control_forever', mutate: p => { ballBlocks(p)[idsOf(p, 'control_repeat')[0]].opcode = 'control_forever' }},
    {name: '重复次数 0', reason: '重复次数超出范围', mutate: p => { (ballBlocks(p)[idsOf(p, 'control_repeat')[0]].inputs as Record<string, unknown>).TIMES = [1, [6, '0']] }},
    {name: '重复次数 101', reason: '重复次数超出范围', mutate: p => { (ballBlocks(p)[idsOf(p, 'control_repeat')[0]].inputs as Record<string, unknown>).TIMES = [1, [6, '101']] }},
    {name: '重复次数不是整数', reason: '重复次数超出范围', mutate: p => { (ballBlocks(p)[idsOf(p, 'control_repeat')[0]].inputs as Record<string, unknown>).TIMES = [1, [6, '2.5']] }},
    {name: '得分增量 0', reason: '得分增量超出范围', mutate: p => { (ballBlocks(p)[idsOf(p, 'data_changevariableby')[0]].inputs as Record<string, unknown>).VALUE = [1, [4, '0']] }},
    {name: '得分增量 10', reason: '得分增量超出范围', mutate: p => { (ballBlocks(p)[idsOf(p, 'data_changevariableby')[0]].inputs as Record<string, unknown>).VALUE = [1, [4, '10']] }},
    {name: '得分增量是负数', reason: '得分增量超出范围', mutate: p => { (ballBlocks(p)[idsOf(p, 'data_changevariableby')[0]].inputs as Record<string, unknown>).VALUE = [1, [4, '-1']] }},
    {name: '改的不是“得分”变量', reason: '得分增量超出范围，或不是“得分”变量', mutate: p => { (ballBlocks(p)[idsOf(p, 'data_changevariableby')[0]].fields as Record<string, unknown>).VARIABLE = ['别的变量', 'zzz'] }},
    {name: '“如果”的条件检测的不是篮子（改成检测“蓝球”）', reason: '只能检测“碰到 篮子”', mutate: p => { const m = idsOf(p, 'sensing_touchingobjectmenu')[0]; ;(ballBlocks(p)[m].fields as Record<string, unknown>).TOUCHINGOBJECTMENU = ['蓝球', null] }},
    {name: '“如果”的条件不是“碰到”积木（用白名单内的“隐藏”顶替，绕过白名单才测得到条件检查）', reason: '“如果”的条件必须是“碰到 篮子？”', mutate: p => {
      const i = idsOf(p, 'control_if')[0]; const c = idsOf(p, 'sensing_touchingobject')[0]; const m = idsOf(p, 'sensing_touchingobjectmenu')[0]
      delete ballBlocks(p)[m]; delete ballBlocks(p)[c]
      ballBlocks(p).zc = {opcode: 'looks_hide', next: null, parent: i, inputs: {}, fields: {}, shadow: false, topLevel: false}
      ;(ballBlocks(p)[i].inputs as Record<string, unknown>).CONDITION = [2, 'zc']
    }},
    {name: '“碰到”积木的菜单不是影子积木', reason: '只能检测“碰到 篮子”', mutate: p => { const m = idsOf(p, 'sensing_touchingobjectmenu')[0]; ballBlocks(p)[m].shadow = false }},
    {name: '“如果”里面套“重复”', reason: '“如果”里面只能放“得分”和“隐藏”', mutate: p => { const i = idsOf(p, 'control_if')[0]; const inner = 'zi'; ballBlocks(p)[inner] = {opcode: 'control_repeat', next: null, parent: i, inputs: {TIMES: [1, [6, '2']]}, fields: {}, shadow: false, topLevel: false}; const sub = (ballBlocks(p)[i].inputs as Record<string, unknown>).SUBSTACK as [number, string]; const old = sub[1]; ballBlocks(p)[old].parent = inner; ;(ballBlocks(p)[inner].inputs as Record<string, unknown>).SUBSTACK = [2, old]; ;(ballBlocks(p)[i].inputs as Record<string, unknown>).SUBSTACK = [2, inner] }},
    {name: '“重复”里再套“重复”', reason: '“重复执行”只能放在最外层', mutate: p => { const r = idsOf(p, 'control_repeat')[0]; const inner = 'zr'; ballBlocks(p)[inner] = {opcode: 'control_repeat', next: null, parent: r, inputs: {TIMES: [1, [6, '2']]}, fields: {}, shadow: false, topLevel: false}; const sub = (ballBlocks(p)[r].inputs as Record<string, unknown>).SUBSTACK as [number, string]; const old = sub[1]; ballBlocks(p)[old].parent = inner; ;(ballBlocks(p)[inner].inputs as Record<string, unknown>).SUBSTACK = [2, old]; ;(ballBlocks(p)[r].inputs as Record<string, unknown>).SUBSTACK = [2, inner] }},
    {name: '散积木（没有接绿旗）', reason: '本课不接收没有绿旗的散积木', mutate: p => { ballBlocks(p).zz = {opcode: 'looks_hide', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true} }},
    {name: '积木选项（fields）不符合本课', reason: '绿旗积木结构不对', mutate: p => { ballBlocks(p)[idsOf(p, 'event_whenflagclicked').find(i => !i.endsWith('h'))!].fields = {X: ['y']} }},
    {name: '积木太多（超过 8 块）', reason: '积木太多', mutate: p => {
      const i = idsOf(p, 'control_if')[0]
      const sub = (ballBlocks(p)[i].inputs as Record<string, unknown>).SUBSTACK as [number, string]
      let prev = sub[1]
      while (ballBlocks(p)[prev].next) prev = ballBlocks(p)[prev].next as string
      for (let k = 0; k < 8; k++) { const id = `zh${k}`; ballBlocks(p)[id] = {opcode: 'looks_hide', next: null, parent: prev, inputs: {}, fields: {}, shadow: false, topLevel: false}; ballBlocks(p)[prev].next = id; prev = id }
    }},
    {name: '脚本太多（4 个绿旗）', reason: '脚本太多', mutate: p => { for (let k = 0; k < 4; k++) ballBlocks(p)[`zh${k}`] = {opcode: 'event_whenflagclicked', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true} }},
    {name: '课程预置的下落脚本被改（球速）', reason: '下落脚本被改动', mutate: p => { (ballBlocks(p)['hbm'].inputs as Record<string, unknown>).DY = [1, [4, '-1']] }},
    {name: '课程预置的下落脚本被改（次数）', reason: '下落脚本被改动', mutate: p => { (ballBlocks(p)['hbr'].inputs as Record<string, unknown>).TIMES = [1, [6, '1']] }},
    {name: '两个球的脚本不一样', reason: '两个球的脚本必须一样', mutate: p => { const id = idsOf(p, 'data_changevariableby', 3)[0]; (ballBlocks(p, 3)[id].inputs as Record<string, unknown>).VALUE = [1, [4, '2']] }},
    {name: '两个球的脚本不一样（结构不同：蓝球少了“隐藏”）', reason: '两个球的脚本必须一样', mutate: p => { const id = idsOf(p, 'looks_hide', 3)[0]; const prev = Object.entries(ballBlocks(p, 3)).find(([, b]) => b.next === id)![0]; ballBlocks(p, 3)[prev].next = null; delete ballBlocks(p, 3)[id] }},
    {name: '两个球的脚本不一样（重复次数不同）', reason: '两个球的脚本必须一样', mutate: p => { const id = idsOf(p, 'control_repeat', 3)[0]; (ballBlocks(p, 3)[id].inputs as Record<string, unknown>).TIMES = [1, [6, '41']] }},
    {name: '球速与工程里的下落脚本不一致', reason: '下落脚本被改动', mutate: p => { p.targets[2].blocks['hbr'] = {...p.targets[2].blocks['hbr'], inputs: {...(p.targets[2].blocks['hbr'].inputs as object), TIMES: [1, [6, '99']]}} }},
    {name: '对象数量不对', reason: '工程需要 4 个对象', mutate: p => { p.targets.pop() }},
    {name: '舞台上带着积木', reason: '舞台不对', mutate: p => { p.targets[0].blocks = {zz: {opcode: 'event_whenflagclicked', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true}} }},
    {name: '舞台变量被改（初始得分不是 0）', reason: '舞台变量不对', mutate: p => { (p.targets[0].variables as Record<string, unknown>).kcl4_score = ['得分', 99] }},
    {name: '舞台多一个变量', reason: '舞台变量不对', mutate: p => { (p.targets[0].variables as Record<string, unknown>).extra = ['x', 0] }},
    {name: '篮子带了积木', reason: '篮子不对', mutate: p => { p.targets[1].blocks = {zz: {opcode: 'looks_hide', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true}} }},
    {name: '红球起点不对', reason: '角色起点不对', mutate: p => { p.targets[2].x = 30 }},
    {name: '蓝球起点不对', reason: '角色起点不对', mutate: p => { p.targets[3].y = 0 }},
    {name: '篮子起点不对', reason: '角色起点不对', mutate: p => { p.targets[1].x = 80 }},
    {name: '角色一开始是隐藏的', reason: '角色起点不对', mutate: p => { p.targets[2].visible = false }},
    {name: '带声音', reason: '本课不允许声音', mutate: p => { p.targets[2].sounds = [{name: 'x'}] }},
    {name: '角色带变量', reason: '本课不允许角色变量', mutate: p => { p.targets[2].variables = {a: ['v', 0]} }},
    {name: '带广播', reason: '本课不允许列表或广播', mutate: p => { p.targets[2].broadcasts = {a: 'x'} }},
    {name: '造型素材不是沙箱内置的', reason: '造型不对', mutate: p => { (p.targets[2].costumes as Array<{assetId: string}>)[0].assetId = '00000000000000000000000000000000' }},
  ]
  for (const c of rejected) {
    test(`沙箱拒绝：${c.name}`, async ({page}) => {
      const project = base()
      c.mutate(project)
      const id = nextRunId++
      await post(page, {kind: 'RUN', id, levelId: 'solve', ballSpeed: 10, fingerprint: 'x', frameMs: 0, project})
      const msg = await page.evaluate(i => (window as unknown as {waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{kind: string; error?: string}>}).waitFor(m => (m.kind === 'REJECTED' || m.kind === 'RUN_DONE' || m.kind === 'ERROR' || m.kind === 'STARTED') && m.id === i), id)
      expect(msg.kind, `沙箱应拒绝，实际：${msg.kind} ${msg.error ?? ''}`).toBe('REJECTED')
      expect(msg.error, '因为预期的原因被拒绝，而不是被别的检查误挡').toContain(c.reason)
      await page.waitForTimeout(150)
      expect(await page.evaluate(i => (window as unknown as {inboxOf: (k: string, i: number) => unknown[]}).inboxOf('STARTED', i).length, id)).toBe(0) // 一帧都没有运行
      const ok = await run(page, standard(40), 'solve') // 被拒绝之后沙箱仍然可用
      expect(ok.trace.endedBy).toBe('finished')
    })
  }

  test('合法的工程不被误拒（基线）：没有做任何修改的 base 能运行', async ({page}) => {
    const id = nextRunId++
    await post(page, {kind: 'RUN', id, levelId: 'solve', ballSpeed: 10, fingerprint: 'x', frameMs: 0, project: base()})
    const done = await wait(page, 'RUN_DONE', id) as {trace: RunTrace}
    expect(done.trace.endedBy).toBe('finished')
  })

  test('球速超出范围被拒绝', async ({page}) => {
    for (const speed of [0, 41, Number.NaN]) {
      const id = nextRunId++
      await post(page, {kind: 'RUN', id, levelId: 'solve', ballSpeed: speed, fingerprint: 'x', frameMs: 0, project: base()})
      const m = await page.evaluate(i => (window as unknown as {waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{kind: string; error?: string}>}).waitFor(m => (m.kind === 'REJECTED' || m.kind === 'RUN_DONE' || m.kind === 'ERROR') && m.id === i), id) as {kind: string; error?: string}
      expect(m.kind, `速度 ${speed}`).toBe('REJECTED')
      expect(m.error, `速度 ${speed}：因为“球速不对”被拒绝，而不是被后面的下落脚本检查顺带挡住`).toBe('球速不对')
    }
  })

  test('运行编号不合法（0）被拒绝并报错', async ({page}) => {
    await post(page, {kind: 'RUN', id: 0, levelId: 'solve', ballSpeed: 10, fingerprint: 'x', frameMs: 0, project: base()})
    const m = await page.evaluate(() => (window as unknown as {waitFor: (t: (m: {kind: string}) => boolean) => Promise<{kind: string}>}).waitFor(m => m.kind === 'ERROR')) as {kind: string}
    expect(m.kind).toBe('ERROR')
  })
})
