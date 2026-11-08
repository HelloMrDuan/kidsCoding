// G2-U3-L03《随机出现的礼物》真实 Scratch VM 行为矩阵。
// 在真实浏览器里加载 public/scratch-g2-u3-l03-sandbox.html（内含真实 scratch-vm@5.0.300），
// 用 compile.ts 把学生脚本编译成 Scratch 工程送进去逐帧运行，再用 judge.ts 判定。
// 不含任何积木模拟器：随机数、设置 x、循环展开、运行结束时机全部来自 VM。
// VM 运行时由 OPS-024 自托管：prebuild 把 npm 里的 scratch-vm / scratch-storage 复制到 public/scratch-vm/，本文件的静态服务器从那里提供。
import {createServer, type Server} from 'node:http'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {expect, test, type Page} from '@playwright/test'
import {compileProject} from '../../src/features/lessons/g2-u3-l03/compile'
import {judgeRun, type RunJudgment, type RunTrace} from '../../src/features/lessons/g2-u3-l03/judge'
import {L03_LEVELS, L03_PARAMS, type LevelId} from '../../src/features/lessons/g2-u3-l03/params'
import {programFingerprint, type Block, type Program} from '../../src/features/lessons/g2-u3-l03/program'
import {seededSequence} from '../../src/features/lessons/g2-u3-l03/seeded-random'

const PUBLIC_DIR = join(__dirname, '..', '..', 'public')
let server: Server
let origin = ''

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]
    if (url === '/host.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(HOST_HTML)
      return
    }
    if (url === '/scratch-g2-u3-l03-sandbox.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(readFileSync(join(PUBLIC_DIR, 'scratch-g2-u3-l03-sandbox.html')))
      return
    }
    // 自托管的 VM 运行时（与沙箱页面里的 <script src="/scratch-vm/…"> 对应）；只放行这两个固定文件名。
    const vm = /^\/scratch-vm\/(scratch-vm\.js|scratch-storage\.min\.js)$/.exec(url)
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
<iframe id="f" sandbox="allow-scripts" src="/scratch-g2-u3-l03-sandbox.html"></iframe>
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
type FrameMsg = {frame: number; gift: {x: number; y: number}; trail: number[]}
type RunResult = {trace: RunTrace; judgment: RunJudgment; frames: FrameMsg[]}

async function ready(page: Page) {
  await page.goto(`${origin}/host.html`)
  const hello = await page.evaluate(() => (window as unknown as {ready: () => Promise<{available: boolean}>}).ready())
  expect(hello.available, 'Scratch VM 没有加载：public/scratch-vm/ 不存在或不完整（先运行 npm run build 或 node scripts/copy-scratch-vm.mjs）').toBe(true)
}

/** 经沙箱运行一次，`seeded` 默认取该关的设置（演示关固定种子，其余关不用）。 */
async function run(page: Page, program: Program, levelId: LevelId, opts: {seeded?: boolean; frameMs?: number} = {}): Promise<RunResult> {
  const level = L03_LEVELS[levelId]
  const id = nextRunId++
  const message = {
    kind: 'RUN', id, levelId, seeded: opts.seeded ?? level.seeded, fingerprint: programFingerprint(program),
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
  return {trace, judgment: judgeRun(trace, level), frames}
}

const randomx = (from: number, to: number): Block => ({t: 'randomx', from, to})
const repeat = (times: number, ...body: Block[]): Block => ({t: 'repeat', times, body})
const flag = (...body: Block[]): Program => ({scripts: [{hat: 'flag', body}]})
/** 标准做法：重复 10 次，将 x 设为 [from, to] 的随机数。 */
const draw10 = (from: number, to: number): Program => flag(repeat(10, randomx(from, to)))

function judged(r: RunResult) {
  if (r.judgment.status !== 'judged') throw new Error(`未判定：${r.judgment.reason}`)
  return r.judgment
}

test.describe('G2-U3-L03 真实 Scratch VM：随机数与取值范围', () => {
  test.setTimeout(180_000)
  test.beforeEach(async ({page}) => { await ready(page) })

  test('编译出的工程在真实 VM 里跑起来：10 次真实“取随机数”和 10 次真实“设置 x”，脚本自然结束', async ({page}) => {
    const r = await run(page, draw10(-180, 180), 'solve')
    expect(r.trace.endedBy).toBe('finished')
    expect(r.trace.draws).toHaveLength(10)
    expect(r.trace.placements).toHaveLength(10)
    // 每一次“取随机数”都是在“重复执行”里被真实调用的，收到的就是积木上写的上下界
    for (const d of r.trace.draws) {
      expect(d).toMatchObject({from: -180, to: 180, inLoop: true})
      expect(d.value).toBeGreaterThanOrEqual(-180)
      expect(d.value).toBeLessThanOrEqual(180)
      expect(Number.isInteger(d.value)).toBe(true) // 两个上下界都是整数，真实 VM 返回整数
    }
    // 礼物真的被放到了随机数取到的位置：设置 x 之后的 x 等于刚取到的值
    expect(r.trace.placements.map(p => p.x)).toEqual(r.trace.draws.map(d => d.value))
  })

  test('演示关的固定种子：真实 VM 取出的 10 个位置，和独立算出来的序列逐个一致', async ({page}) => {
    const demo = flag(repeat(10, randomx(-300, 300)))
    const r = await run(page, demo, 'explore')
    expect(r.trace.seeded).toBe(true)
    const expected = seededSequence(L03_PARAMS.demoSeed, -300, 300, 10)
    // 这串数在方案里写明，并由独立的 Python 程序算过：必须一字不差
    expect(expected).toEqual([-293, -263, 287, 120, 13, -57, -20, -156, 32, 138])
    expect(r.trace.draws.map(d => d.value)).toEqual(expected)
    expect(r.trace.placements.map(p => p.x)).toEqual(expected)
    // 同一个程序再跑一次，位置完全一样（这就是“固定种子”）
    const again = await run(page, demo, 'explore')
    expect(again.trace.placements.map(p => p.x)).toEqual(expected)
  })

  test('自己搭的关卡不用种子：两次运行的位置不一样（真的随机）', async ({page}) => {
    const a = await run(page, draw10(-180, 180), 'solve')
    const b = await run(page, draw10(-180, 180), 'solve')
    expect(a.trace.seeded).toBe(false)
    expect(a.trace.placements.map(p => p.x)).not.toEqual(b.trace.placements.map(p => p.x))
  })

  test('种子只在真实 operator_random 执行的瞬间生效，运行结束后 Math.random 恢复', async ({page}) => {
    // 先跑一次带种子的演示关，再跑不带种子的：后一次必须不受影响（不同于固定序列）
    await run(page, flag(repeat(10, randomx(-300, 300))), 'explore')
    const free = await run(page, draw10(-300, 300), 'solve', {seeded: false})
    const fixed = seededSequence(L03_PARAMS.demoSeed, -300, 300, 10)
    expect(free.trace.placements.map(p => p.x)).not.toEqual(fixed)
  })
})

// ---------------------------------------------------------------------------------------------
// 边界矩阵：每一行都是真实 VM 跑出来的结果，再由 judge.ts 判定。
// 只断言与运气无关的结论（知识证据由真实“取随机数”收到的上下界决定；位置的范围由 VM 保证）。
// ---------------------------------------------------------------------------------------------
type Layers = {stage?: boolean; task?: boolean; knowledge: boolean; passed?: boolean}

test.describe('G2-U3-L03 真实 VM：上下界边界矩阵（知识证据与运气无关）', () => {
  test.setTimeout(240_000)
  test.beforeEach(async ({page}) => { await ready(page) })

  // 宽度恰好等于要求范围一半时通过，少 1 不通过；超出要求范围 1 不通过。每一行重复运行 3 次，结论必须一致（与运气无关）。
  const rows: Array<{name: string; level: LevelId; from: number; to: number; expect: Layers}> = [
    {name: 'solve 恰好等于要求范围 -180～180', level: 'solve', from: -180, to: 180, expect: {stage: true, task: true, knowledge: true, passed: true}},
    {name: 'solve 下界超出 1：-181～180', level: 'solve', from: -181, to: 180, expect: {knowledge: false, passed: false}},
    {name: 'solve 上界超出 1：-180～181', level: 'solve', from: -180, to: 181, expect: {knowledge: false, passed: false}},
    {name: 'solve 过宽 -300～300', level: 'solve', from: -300, to: 300, expect: {knowledge: false, passed: false}},
    {name: 'solve 最大允许输入 -500～500', level: 'solve', from: -500, to: 500, expect: {knowledge: false, passed: false}},
    {name: 'solve 宽度恰好一半 -90～90', level: 'solve', from: -90, to: 90, expect: {stage: true, task: true, knowledge: true, passed: true}},
    {name: 'solve 宽度少 1：-89～90', level: 'solve', from: -89, to: 90, expect: {stage: true, knowledge: false, passed: false}},
    {name: 'solve 宽度少 1（另一侧）：-90～89', level: 'solve', from: -90, to: 89, expect: {stage: true, knowledge: false, passed: false}},
    {name: 'solve 写死一个数 30～30', level: 'solve', from: 30, to: 30, expect: {stage: true, task: false, knowledge: false, passed: false}},
    {name: 'solve 上下界写反 150～-150（Scratch 对调）', level: 'solve', from: 150, to: -150, expect: {stage: true, task: true, knowledge: true, passed: true}},
    {name: 'solve 写反且过宽 300～-300', level: 'solve', from: 300, to: -300, expect: {knowledge: false, passed: false}},
    {name: 'transferRight 恰好 0～180', level: 'transferRight', from: 0, to: 180, expect: {stage: true, task: true, knowledge: true, passed: true}},
    {name: 'transferRight 照抄上一关 -180～180', level: 'transferRight', from: -180, to: 180, expect: {knowledge: false, passed: false}},
    {name: 'transferRight 下界差 1：-1～180', level: 'transferRight', from: -1, to: 180, expect: {knowledge: false, passed: false}},
    {name: 'transferRight 上界差 1：0～181', level: 'transferRight', from: 0, to: 181, expect: {knowledge: false, passed: false}},
    {name: 'transferRight 宽度恰好一半 0～90', level: 'transferRight', from: 0, to: 90, expect: {stage: true, task: true, knowledge: true, passed: true}},
    {name: 'transferRight 宽度少 1：0～89', level: 'transferRight', from: 0, to: 89, expect: {knowledge: false, passed: false}},
    {name: 'transferMiddle 恰好 -60～60', level: 'transferMiddle', from: -60, to: 60, expect: {stage: true, task: true, knowledge: true, passed: true}},
    {name: 'transferMiddle 宽度恰好一半 -30～30', level: 'transferMiddle', from: -30, to: 30, expect: {stage: true, task: true, knowledge: true, passed: true}},
    {name: 'transferMiddle 宽度少 1：-29～30', level: 'transferMiddle', from: -29, to: 30, expect: {stage: true, knowledge: false, passed: false}},
    {name: 'transferMiddle 过宽 -61～60', level: 'transferMiddle', from: -61, to: 60, expect: {knowledge: false, passed: false}},
    {name: 'transferMiddle 挤成一点 0～0', level: 'transferMiddle', from: 0, to: 0, expect: {task: false, knowledge: false, passed: false}},
  ]
  for (const row of rows) {
    test(row.name, async ({page}) => {
      for (let i = 0; i < 3; i++) {
        const r = await run(page, draw10(row.from, row.to), row.level)
        expect(r.trace.endedBy).toBe('finished')
        expect(r.trace.draws).toHaveLength(10)
        for (const d of r.trace.draws) expect([d.from, d.to]).toEqual([row.from, row.to]) // 积木上写的数，原样到了真实 VM
        const lo = Math.min(row.from, row.to)
        const hi = Math.max(row.from, row.to)
        for (const p of r.trace.placements) expect(p.x >= lo && p.x <= hi, `x=${p.x}`).toBe(true) // VM 取值不超出上下界
        const j = judged(r)
        expect(j.knowledge.passed, `第 ${i + 1} 次 知识证据`).toBe(row.expect.knowledge)
        if (row.expect.stage !== undefined) expect(j.stage.passed, `第 ${i + 1} 次 舞台`).toBe(row.expect.stage)
        if (row.expect.task !== undefined) expect(j.task.passed, `第 ${i + 1} 次 任务`).toBe(row.expect.task)
        if (row.expect.passed !== undefined) expect(j.passed, `第 ${i + 1} 次 总体`).toBe(row.expect.passed)
      }
    })
  }

  test('过宽的上下界：位置是否碰巧在范围内取决于运气，但知识证据永远不通过；多次运行里确实会碰到跑出范围的情况', async ({page}) => {
    // -240～240 对 -180～180：每次取值落在要求范围内的概率约 75%；
    // 重复 20 次、跑 6 轮 = 120 次取值，全部落在范围内的概率约 1e-15，所以必然看到“跑出范围”的位置。
    let outside = 0
    for (let i = 0; i < 6; i++) {
      const r = await run(page, flag(repeat(20, randomx(-240, 240))), 'solve')
      expect(judged(r).knowledge.passed).toBe(false)
      outside += r.trace.placements.filter(p => p.x < -180 || p.x > 180).length
    }
    expect(outside).toBeGreaterThan(0)
  })

  test('两端都包含：上下界相邻（5～6）重复 20 次，真实 VM 取到过 5 也取到过 6，没有别的值', async ({page}) => {
    const r = await run(page, flag(repeat(20, randomx(5, 6))), 'solve')
    const xs = new Set(r.trace.placements.map(p => p.x))
    expect([...xs].sort()).toEqual([5, 6])
  })

  test('取值是整数：上下界都是整数时，真实 VM 返回整数（含负数、0）', async ({page}) => {
    const r = await run(page, flag(repeat(20, randomx(-3, 3))), 'solve')
    for (const p of r.trace.placements) {
      expect(Number.isInteger(p.x)).toBe(true)
      expect(p.x).toBeGreaterThanOrEqual(-3)
      expect(p.x).toBeLessThanOrEqual(3)
    }
  })
})

test.describe('G2-U3-L03 真实 VM：程序结构（循环、次数、多脚本、散积木）', () => {
  test.setTimeout(180_000)
  test.beforeEach(async ({page}) => { await ready(page) })

  test('不在循环里：只取 1 次，inLoop 为 false；舞台与任务不通过', async ({page}) => {
    const r = await run(page, flag(randomx(-100, 100)), 'solve')
    expect(r.trace.draws).toHaveLength(1)
    expect(r.trace.draws[0].inLoop).toBe(false)
    expect(r.trace.placements).toHaveLength(1)
    const j = judged(r)
    expect(j.stage.passed).toBe(false)
    expect(j.task.passed).toBe(false)
  })

  test('重复次数 1 / 9 / 10 / 20：取随机数的次数正好等于重复次数；9 次不够，10 次和 20 次够', async ({page}) => {
    for (const [times, enough] of [[1, false], [9, false], [10, true], [20, true]] as const) {
      const r = await run(page, flag(repeat(times, randomx(-100, 100))), 'solve')
      expect(r.trace.draws, `重复 ${times}`).toHaveLength(times)
      expect(r.trace.draws.every(d => d.inLoop)).toBe(true)
      expect(r.trace.placements).toHaveLength(times)
      expect(judged(r).stage.passed, `重复 ${times}`).toBe(enough)
    }
  })

  test('循环里放两块：次数乘二；循环外面还有一块：外面那块 inLoop 为 false', async ({page}) => {
    const two = await run(page, flag(repeat(5, randomx(-50, 50), randomx(-60, 60))), 'solve')
    expect(two.trace.draws).toHaveLength(10)
    expect(two.trace.draws.map(d => d.to)).toEqual([50, 60, 50, 60, 50, 60, 50, 60, 50, 60])
    const mixed = await run(page, flag(randomx(-10, 10), repeat(3, randomx(-20, 20)), randomx(-30, 30)), 'solve')
    expect(mixed.trace.draws.map(d => [d.to, d.inLoop])).toEqual([[10, false], [20, true], [20, true], [20, true], [30, false]])
  })

  test('循环里的每一次取随机数都带着积木上写的上下界（不同积木不同上下界不混）', async ({page}) => {
    const r = await run(page, flag(repeat(2, randomx(-1, 1), randomx(100, 110))), 'solve')
    expect(r.trace.draws.map(d => [d.from, d.to])).toEqual([[-1, 1], [100, 110], [-1, 1], [100, 110]])
    for (const d of r.trace.draws) expect(d.value >= Math.min(d.from, d.to) && d.value <= Math.max(d.from, d.to)).toBe(true)
  })

  test('两条绿旗脚本同时运行：取值次数是两条之和，上下界各自独立', async ({page}) => {
    const p: Program = {scripts: [{hat: 'flag', body: [repeat(5, randomx(-10, 10))]}, {hat: 'flag', body: [repeat(5, randomx(200, 210))]}]}
    const r = await run(page, p, 'solve')
    expect(r.trace.endedBy).toBe('finished')
    expect(r.trace.draws).toHaveLength(10)
    expect(r.trace.draws.filter(d => d.to === 10)).toHaveLength(5)
    expect(r.trace.draws.filter(d => d.to === 210)).toHaveLength(5)
    expect(judged(r).knowledge.passed).toBe(false) // 其中一条的上下界超出本关范围
  })

  test('没有接绿旗的散积木不会运行：空脚本、只有散积木、只有绿旗都是 0 次取值，自然结束', async ({page}) => {
    for (const p of [{scripts: []}, {scripts: [{hat: null, body: [randomx(0, 1)]}]}, flag()] as Program[]) {
      const r = await run(page, p, 'solve')
      expect(r.trace.endedBy).toBe('finished')
      expect(r.trace.draws).toHaveLength(0)
      expect(r.trace.placements).toHaveLength(0)
      const j = judged(r)
      expect(j.passed).toBe(false)
      expect(j.knowledge.line).toContain('没有看到')
    }
  })

  test('散积木和绿旗脚本并存：只有绿旗脚本运行', async ({page}) => {
    const p: Program = {scripts: [{hat: null, body: [randomx(500, 500)]}, {hat: 'flag', body: [repeat(10, randomx(-100, 100))]}]}
    const r = await run(page, p, 'solve')
    expect(r.trace.draws).toHaveLength(10)
    expect(r.trace.draws.every(d => d.to === 100)).toBe(true)
  })

  test('礼物从 (0, 0) 起，每次运行都从头开始：上一次的位置不带到下一次', async ({page}) => {
    await run(page, flag(repeat(5, randomx(200, 200))), 'solve')
    const r = await run(page, flag(repeat(10, randomx(-100, 100))), 'solve')
    expect(r.frames[0].gift.y).toBe(0)
    expect(r.trace.placements).toHaveLength(10)
    expect(r.trace.placements.every(p => p.x >= -100 && p.x <= 100)).toBe(true)
  })

  test('逐帧报告：每帧的 trail 就是到那一帧为止真实放置过的 x，单调增长，最后一帧与轨迹一致', async ({page}) => {
    const r = await run(page, draw10(-150, 150), 'solve', {frameMs: 10})
    const xs = r.trace.placements.map(p => p.x)
    expect(r.frames.length).toBeGreaterThan(1)
    let prev = 0
    for (const f of r.frames) {
      expect(f.trail.length).toBeGreaterThanOrEqual(prev)
      expect(f.trail).toEqual(xs.slice(0, f.trail.length)) // 是真实放置序列的前缀
      prev = f.trail.length
    }
    const last = r.frames[r.frames.length - 1]
    expect(last.trail).toEqual(xs)
    expect(last.gift.x).toBe(xs[xs.length - 1])
  })

  test('种子只属于演示关：同样的程序，seeded=true 给固定序列，seeded=false 不给；种子不改变上下界的含义', async ({page}) => {
    const fixed = await run(page, flag(repeat(10, randomx(0, 10))), 'solve', {seeded: true})
    const again = await run(page, flag(repeat(10, randomx(0, 10))), 'solve', {seeded: true})
    expect(fixed.trace.placements.map(p => p.x)).toEqual(again.trace.placements.map(p => p.x))
    expect(fixed.trace.placements.every(p => p.x >= 0 && p.x <= 10)).toBe(true)
    expect(fixed.trace.seeded).toBe(true)
    const free = await run(page, flag(repeat(10, randomx(0, 10))), 'solve', {seeded: false})
    expect(free.trace.seeded).toBe(false)
  })
})

test.describe('G2-U3-L03 真实 VM：停止、拒绝与异常', () => {
  test.setTimeout(180_000)
  test.beforeEach(async ({page}) => { await ready(page) })

  /** 发出一次运行请求但不等待结束，返回 id。 */
  async function start(page: Page, program: Program, levelId: LevelId, frameMs: number) {
    const id = nextRunId++
    const level = L03_LEVELS[levelId]
    await page.evaluate(m => (window as unknown as {post: (x: unknown) => void}).post(m), {
      kind: 'RUN', id, levelId, seeded: false, fingerprint: programFingerprint(program), frameMs, project: compileProject(program, level),
    })
    return id
  }
  const wait = (page: Page, kind: string, id: number) =>
    page.evaluate(({kind, id}) => (window as unknown as {waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<unknown>}).waitFor(m => m.kind === kind && m.id === id), {kind, id})
  const post = (page: Page, msg: unknown) => page.evaluate(m => (window as unknown as {post: (x: unknown) => void}).post(m), msg)

  test('运行中停止：endedBy 为 stopped，没跑完，不判定；停止之后不再有新的取值', async ({page}) => {
    const id = await start(page, flag(repeat(20, randomx(-100, 100))), 'solve', 60)
    await wait(page, 'STARTED', id)
    await wait(page, 'FRAME', id)
    await post(page, {kind: 'STOP', id})
    const done = await wait(page, 'RUN_DONE', id) as {trace: RunTrace}
    expect(done.trace.endedBy).toBe('stopped')
    expect(done.trace.placements.length).toBeLessThan(20)
    expect(judgeRun(done.trace, L03_LEVELS.solve).status).toBe('not-judged')
    const n = done.trace.placements.length
    await page.waitForTimeout(400)
    const frames = await page.evaluate(i => (window as unknown as {inboxOf: (k: string, i: number) => {trail: number[]}[]}).inboxOf('FRAME', i), id)
    expect(frames[frames.length - 1].trail.length).toBeLessThanOrEqual(n + 1)
    expect(await page.evaluate(i => (window as unknown as {inboxOf: (k: string, i: number) => unknown[]}).inboxOf('RUN_DONE', i).length, id)).toBe(1) // 只回一次结果
  })

  test('停止之后马上重跑：新的一次不受旧的影响，正常结束', async ({page}) => {
    const first = await start(page, flag(repeat(20, randomx(-100, 100))), 'solve', 60)
    await wait(page, 'STARTED', first)
    await post(page, {kind: 'STOP', id: first})
    await wait(page, 'RUN_DONE', first)
    const r = await run(page, draw10(-150, 150), 'solve')
    expect(r.trace.endedBy).toBe('finished')
    expect(r.trace.placements).toHaveLength(10)
    expect(judged(r).passed).toBe(true)
  })

  test('新的一次运行取代没结束的旧运行：旧运行的消息不再出现', async ({page}) => {
    const first = await start(page, flag(repeat(20, randomx(-100, 100))), 'solve', 80)
    await wait(page, 'STARTED', first)
    const r = await run(page, draw10(-150, 150), 'solve')
    expect(r.trace.endedBy).toBe('finished')
    const late = await page.evaluate(i => (window as unknown as {inboxOf: (k: string, i: number) => unknown[]}).inboxOf('RUN_DONE', i).length, first)
    expect(late).toBeLessThanOrEqual(1)
  })

  // ---- 沙箱只接受本课的积木：任何越界的工程在进入 VM 之前就被拒绝 ----
  type Raw = {targets: Array<{blocks: Record<string, Record<string, unknown>>; [k: string]: unknown}>}
  const base = (): Raw => JSON.parse(JSON.stringify(compileProject(draw10(-150, 150), L03_LEVELS.solve)))
  const idsOf = (p: Raw, opcode: string) => Object.entries(p.targets[1].blocks).filter(([, b]) => b.opcode === opcode).map(([id]) => id)
  const gift = (p: Raw) => p.targets[1].blocks

  const rejected: Array<{name: string; reason: string; mutate: (p: Raw) => void}> = [
    {name: '不属于本课的积木（移动 10 步）', reason: '本课不允许的积木：motion_movesteps', mutate: p => { gift(p)[idsOf(p, 'control_repeat')[0]].opcode = 'motion_movesteps' }},
    {name: '不属于本课的积木（按下按键触发）', reason: '本课不允许的积木：event_whenkeypressed', mutate: p => { gift(p)[idsOf(p, 'event_whenflagclicked')[0]].opcode = 'event_whenkeypressed' }},
    {name: '不属于本课的积木（说话）', reason: '本课不允许的积木：looks_say', mutate: p => { gift(p).zz = {opcode: 'looks_say', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true} }},
    {name: '不属于本课的积木（永远重复）', reason: '本课不允许的积木：control_forever', mutate: p => { gift(p)[idsOf(p, 'control_repeat')[0]].opcode = 'control_forever' }},
    {name: '下界超出 -500～500（501）', reason: '上下界超出范围', mutate: p => { (gift(p)[idsOf(p, 'operator_random')[0]].inputs as Record<string, unknown>).TO = [1, [4, '501']] }},
    {name: '下界超出 -500～500（-501）', reason: '上下界超出范围', mutate: p => { (gift(p)[idsOf(p, 'operator_random')[0]].inputs as Record<string, unknown>).FROM = [1, [4, '-501']] }},
    {name: '上下界不是整数（1.5）', reason: '上下界超出范围', mutate: p => { (gift(p)[idsOf(p, 'operator_random')[0]].inputs as Record<string, unknown>).TO = [1, [4, '1.5']] }},
    {name: '上下界不是数字（abc）', reason: '上下界超出范围', mutate: p => { (gift(p)[idsOf(p, 'operator_random')[0]].inputs as Record<string, unknown>).TO = [1, [4, 'abc']] }},
    {name: '上下界不是直接写的数字（用变量/别的积木代替）', reason: '上下界超出范围', mutate: p => { (gift(p)[idsOf(p, 'operator_random')[0]].inputs as Record<string, unknown>).TO = [3, 'zz', [4, '0']] }},
    {name: '重复次数 21', reason: '重复次数超出范围', mutate: p => { (gift(p)[idsOf(p, 'control_repeat')[0]].inputs as Record<string, unknown>).TIMES = [1, [6, '21']] }},
    {name: '重复次数 0', reason: '重复次数超出范围', mutate: p => { (gift(p)[idsOf(p, 'control_repeat')[0]].inputs as Record<string, unknown>).TIMES = [1, [6, '0']] }},
    {name: '重复次数不是整数', reason: '重复次数超出范围', mutate: p => { (gift(p)[idsOf(p, 'control_repeat')[0]].inputs as Record<string, unknown>).TIMES = [1, [6, '2.5']] }},
    {name: '“将 x 设为”里没有放“取随机数”（直接写数字）', reason: '里必须放“取随机数”', mutate: p => { (gift(p)[idsOf(p, 'motion_setx')[0]].inputs as Record<string, unknown>).X = [1, [4, '9999']] }},
    {name: '“取随机数”多出来一个（没有被任何“将 x 设为”使用）', reason: '恰好带一个“取随机数”', mutate: p => { gift(p).zz = {opcode: 'operator_random', next: null, parent: null, inputs: {FROM: [1, [4, '0']], TO: [1, [4, '1']]}, fields: {}, shadow: false, topLevel: false} }},
    {name: '绿旗散开的积木（没有接绿旗）', reason: '没有绿旗的散积木', mutate: p => { gift(p).zz = {opcode: 'control_repeat', next: null, parent: null, inputs: {TIMES: [1, [6, '2']]}, fields: {}, shadow: false, topLevel: true} }},
    {name: '积木选项（fields）不符合本课', reason: '积木选项不符合本课', mutate: p => { gift(p)[idsOf(p, 'control_repeat')[0]].fields = {X: ['y']} }},
    {name: '影子积木', reason: '不允许影子积木', mutate: p => { gift(p)[idsOf(p, 'control_repeat')[0]].shadow = true }},
    {name: '积木连接成环', reason: '积木连接不对', mutate: p => { const rep = idsOf(p, 'control_repeat')[0]; const sx = idsOf(p, 'motion_setx')[0]; gift(p)[sx].next = rep }},
    {name: '嵌套两层重复', reason: '重复嵌套太深', mutate: p => {
      const rep = idsOf(p, 'control_repeat')[0]
      const inner = 'zi'
      gift(p)[inner] = {opcode: 'control_repeat', next: null, parent: rep, inputs: {TIMES: [1, [6, '2']]}, fields: {}, shadow: false, topLevel: false}
      const sx = idsOf(p, 'motion_setx')[0]
      ;(gift(p)[inner].inputs as Record<string, unknown>).SUBSTACK = [2, sx]
      gift(p)[sx].parent = inner
      ;(gift(p)[rep].inputs as Record<string, unknown>).SUBSTACK = [2, inner]
    }},
    {name: '积木太多（超过 8 块）', reason: '积木太多', mutate: p => {
      const rep = idsOf(p, 'control_repeat')[0]
      let prev = idsOf(p, 'motion_setx')[0]
      for (let i = 0; i < 8; i++) {
        const sx = `zs${i}`
        const rd = `zr${i}`
        gift(p)[rd] = {opcode: 'operator_random', next: null, parent: sx, inputs: {FROM: [1, [4, '0']], TO: [1, [4, '1']]}, fields: {}, shadow: false, topLevel: false}
        gift(p)[sx] = {opcode: 'motion_setx', next: null, parent: prev, inputs: {X: [3, rd, [4, '0']]}, fields: {}, shadow: false, topLevel: false}
        gift(p)[prev].next = sx
        prev = sx
      }
      void rep
    }},
    {name: '脚本太多（4 个绿旗）', reason: '脚本太多', mutate: p => { for (let i = 0; i < 3; i++) gift(p)[`zh${i}`] = {opcode: 'event_whenflagclicked', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 300 + i * 100} }},
    {name: '多出一个角色', reason: '工程需要 2 个对象', mutate: p => { p.targets.push(JSON.parse(JSON.stringify(p.targets[1]))) }},
    {name: '角色名不对', reason: '角色名单不对', mutate: p => { p.targets[1].name = '别的角色' }},
    {name: '礼物起点不对（x=50）', reason: '礼物起点不对', mutate: p => { p.targets[1].x = 50 }},
    {name: '舞台上带着积木', reason: '舞台不对', mutate: p => { p.targets[0].blocks = {zz: {opcode: 'event_whenflagclicked', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true}} }},
    {name: '带声音', reason: '不允许声音', mutate: p => { p.targets[1].sounds = [{name: 'x'}] }},
    {name: '带变量', reason: '不允许变量', mutate: p => { p.targets[1].variables = {a: ['v', 0]} }},
    {name: '造型素材不是沙箱内置的', reason: '造型不对', mutate: p => { (p.targets[1].costumes as Array<{assetId: string}>)[0].assetId = '00000000000000000000000000000000' }},
  ]
  for (const c of rejected) {
    test(`沙箱拒绝：${c.name}`, async ({page}) => {
      const project = base()
      c.mutate(project)
      const id = nextRunId++
      await post(page, {kind: 'RUN', id, levelId: 'solve', seeded: false, fingerprint: 'x', frameMs: 0, project})
      const msg = await page.evaluate(i => (window as unknown as {waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{kind: string; error?: string}>}).waitFor(m => (m.kind === 'REJECTED' || m.kind === 'RUN_DONE' || m.kind === 'ERROR' || m.kind === 'STARTED') && m.id === i), id)
      expect(msg.kind, `沙箱应拒绝，实际：${msg.kind} ${msg.error ?? ''}`).toBe('REJECTED')
      expect(msg.error, '因为预期的原因被拒绝，而不是被别的检查误挡').toContain(c.reason)
      await page.waitForTimeout(150)
      expect(await page.evaluate(i => (window as unknown as {inboxOf: (k: string, i: number) => unknown[]}).inboxOf('STARTED', i).length, id)).toBe(0) // 一帧都没有运行
      // 被拒绝之后沙箱仍然可用
      const ok = await run(page, draw10(-150, 150), 'solve')
      expect(ok.trace.endedBy).toBe('finished')
    })
  }

  test('合法的工程不被误拒（基线）：没有做任何修改的 base 能运行', async ({page}) => {
    const id = nextRunId++
    await post(page, {kind: 'RUN', id, levelId: 'solve', seeded: false, fingerprint: 'x', frameMs: 0, project: base()})
    const done = await wait(page, 'RUN_DONE', id) as {trace: RunTrace}
    expect(done.trace.endedBy).toBe('finished')
  })

  test('运行编号不合法（0）被拒绝并报错', async ({page}) => {
    await post(page, {kind: 'RUN', id: 0, levelId: 'solve', seeded: false, fingerprint: 'x', frameMs: 0, project: base()})
    const m = await page.evaluate(() => (window as unknown as {waitFor: (t: (m: {kind: string}) => boolean) => Promise<{kind: string; id: number}>}).waitFor(m => m.kind === 'ERROR')) as {kind: string; id: number}
    expect(m.kind).toBe('ERROR')
  })

  test('帧数上限：有效程序最多 20 圈，远低于上限；上限本身是对异常工程的兜底（值与 params 一致）', async ({page}) => {
    const r = await run(page, flag(repeat(20, randomx(-100, 100), randomx(-100, 100), randomx(-100, 100))), 'solve')
    expect(r.trace.endedBy).toBe('finished')
    expect(r.trace.framesRun).toBeLessThan(L03_PARAMS.frameCap)
    expect(r.trace.framesRun).toBeLessThanOrEqual(25)
  })
})
