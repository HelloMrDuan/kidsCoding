// G2-U3-L05《倒计时游戏结束》真实 Scratch VM（虚拟时钟）行为矩阵。
// 在真实浏览器里加载 public/scratch-g2-u3-l05-sandbox.html（内含真实 scratch-vm@5.0.300，没有渲染器——本课判定不需要），
// 用 compile.ts 把学生脚本编译成 Scratch 工程送进去逐帧运行，再用 judge.ts 判定。
// 不含任何积木或时间模拟：等待、减少、广播都由 VM 真实执行，时钟是沙箱里的虚拟时钟
// （每帧前进 1000/30 毫秒；探针与 Node 单测已证明这与真实等待的数值一致，且逐帧可复现）。
// VM 与 storage 由共享的 prebuild（copy-scratch-vm.mjs）放进 public/scratch-vm/，本文件的静态服务器从那里提供。
import {createServer, type Server} from 'node:http'
import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {expect, test, type Page} from '@playwright/test'
import {compileProject} from '../../src/features/lessons/g2-u3-l05/compile'
import {judgeRun, type RunJudgment, type RunTrace} from '../../src/features/lessons/g2-u3-l05/judge'
import {L05_LEVELS, type LevelId} from '../../src/features/lessons/g2-u3-l05/params'
import {programFingerprint, type Block, type Program} from '../../src/features/lessons/g2-u3-l05/program'
import {alternatives} from '../../src/features/lessons/g2-u3-l05/reference'
import {DEMO_PROGRAM} from '../../src/features/lessons/g2-u3-l05/state'

const WEB_ROOT = join(__dirname, '..', '..')
const PUBLIC_DIR = join(WEB_ROOT, 'public')
let server: Server
let origin = ''
const requested: string[] = []

test.beforeAll(async () => {
  for (const f of ['scratch-vm.js', 'scratch-storage.min.js']) {
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
    if (url === '/scratch-g2-u3-l05-sandbox.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(readFileSync(join(PUBLIC_DIR, 'scratch-g2-u3-l05-sandbox.html')))
      return
    }
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
<iframe id="f" sandbox="allow-scripts" src="/scratch-g2-u3-l05-sandbox.html"></iframe>
<script>
  const frame = document.getElementById('f');
  const inbox = [];
  const waiters = [];
  window.addEventListener('message', e => {
    if (e.source !== frame.contentWindow) return;
    inbox.push(e.data);
    for (const w of waiters.slice()) if (w.test(e.data)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(e.data); }
  });
  window.waitFor = (test, ms = 30000) => new Promise((resolve, reject) => {
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
type FrameMsg = {frame: number; timeLeft: number; score: number; over: boolean}
export type RunResult = {trace: RunTrace; judgment: RunJudgment; frames: FrameMsg[]; wallMs: number}

async function ready(page: Page) {
  await page.goto(`${origin}/host.html`)
  const hello = await page.evaluate(() => (window as unknown as {ready: () => Promise<{available: boolean}>}).ready())
  expect(hello.available, 'VM 没有加载：public/scratch-vm/ 不完整（先运行 npm run build 或 node scripts/copy-scratch-vm.mjs）').toBe(true)
  const attr = await page.locator('#f').getAttribute('sandbox')
  expect(attr).toBe('allow-scripts')
}

/** 经沙箱运行一次（frameMs 默认 0：虚拟时钟全速前进）。 */
async function run(page: Page, program: Program, levelId: LevelId, opts: {frameMs?: number} = {}): Promise<RunResult> {
  const id = nextRunId++
  const message = {
    kind: 'RUN', id, levelId, fingerprint: programFingerprint(program),
    frameMs: opts.frameMs ?? 0, project: compileProject(program),
  }
  const t0 = Date.now()
  const trace = await page.evaluate(async ({message, id}) => {
    const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{trace: unknown; error?: string; kind: string}>}
    w.post(message)
    const done = await w.waitFor(m => (m.kind === 'RUN_DONE' || m.kind === 'ERROR' || m.kind === 'REJECTED') && m.id === id)
    if (done.kind !== 'RUN_DONE') throw new Error(`${done.kind}: ${done.error}`)
    return done.trace
  }, {message, id}) as RunTrace
  const wallMs = Date.now() - t0
  const frames = await page.evaluate((id) => (window as unknown as {inboxOf: (k: string, i: number) => unknown[]}).inboxOf('FRAME', id), id) as FrameMsg[]
  return {trace, judgment: judgeRun(trace, L05_LEVELS[levelId]), frames, wallMs}
}

const flag = (...body: Block[]): Program => ({scripts: [{hat: 'flag', body}]})
const set = (value: number): Block => ({t: 'setTime', value})
const wait = (secs = 1): Block => ({t: 'wait', secs})
const dec = (by = 1): Block => ({t: 'decrease', by})
const over: Block = {t: 'broadcast'}
const until = (...body: Block[]): Block => ({t: 'untilZero', body: body as never})
const rep = (times: number, ...body: Block[]): Block => ({t: 'repeat', times, body: body as never})
const standard = (start = 10) => flag(set(start), until(wait(), dec()), over)

function judged(r: RunResult) {
  if (r.judgment.status !== 'judged') throw new Error(`应该被判定，却是：${r.judgment.reason}`)
  return r.judgment
}

test.describe('沙箱与虚拟时钟', () => {
  test('沙箱就绪：只从本站加载 VM 与 storage，不请求渲染器、不请求外部地址', async ({page}) => {
    await ready(page)
    expect(requested.every(u => u.startsWith('/'))).toBe(true)
    expect(requested.some(u => u.includes('scratch-render'))).toBe(false)
    expect(requested.some(u => u.includes('scratch-vm.js'))).toBe(true)
  })

  test('虚拟时钟全速：10 秒倒计时（约 400 帧、约 13 秒虚拟时间）在真实时间几秒内跑完', async ({page}) => {
    await ready(page)
    const r = await run(page, standard(), 'solve')
    expect(r.trace.frames.length).toBeGreaterThanOrEqual(390)
    expect(r.wallMs).toBeLessThan(5000)
  })

  test('同一个程序跑两遍：轨迹逐帧完全相同（虚拟时钟确定性）', async ({page}) => {
    await ready(page)
    const a = await run(page, standard(), 'solve')
    const b = await run(page, standard(), 'solve')
    expect(b.trace.frames).toEqual(a.trace.frames)
    expect(b.trace.broadcasts).toEqual(a.trace.broadcasts)
    expect(b.trace.checks).toEqual(a.trace.checks)
  })
})

test.describe('判定矩阵（真实浏览器 VM）', () => {
  test('标准做法：三层全部通过，广播约在第 311 帧，得分 19 且之后不变', async ({page}) => {
    await ready(page)
    const r = await run(page, standard(), 'solve')
    const j = judged(r)
    expect(j.stage.passed).toBe(true)
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(true)
    expect(j.passed).toBe(true)
    expect(r.trace.broadcasts).toHaveLength(1)
    expect(r.trace.broadcasts[0]).toBeGreaterThanOrEqual(300)
    expect(r.trace.broadcasts[0]).toBeLessThanOrEqual(320)
    const last = r.trace.frames[r.trace.frames.length - 1]
    expect(last.timeLeft).toBe(0)
    expect(last.score).toBe(19)
    // FRAME 消息与最终轨迹一致：舞台上看得到的最后数值就是轨迹的最后数值
    const lastFrame = r.frames[r.frames.length - 1]
    expect(lastFrame.timeLeft).toBe(0)
    expect(lastFrame.score).toBe(19)
    expect(lastFrame.over).toBe(true)
  })

  test('探索关演示（固定重复 15 次）：timeLeft 变成 -5，舞台与任务都不过', async ({page}) => {
    await ready(page)
    const r = await run(page, DEMO_PROGRAM, 'explore')
    const j = judged(r)
    const last = r.trace.frames[r.trace.frames.length - 1]
    expect(last.timeLeft).toBe(-5)
    expect(last.score).toBe(19)
    expect(r.trace.broadcasts).toHaveLength(1)
    expect(j.stage.passed).toBe(false)
    expect(j.task.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  test('固定重复 10 次（起点也是 10）：行为全对，只有知识证据能分辨——检查记录为空，不过', async ({page}) => {
    await ready(page)
    const r = await run(page, flag(set(10), rep(10, wait(), dec()), over), 'solve')
    const j = judged(r)
    expect(j.stage.passed).toBe(true)
    expect(j.task.passed).toBe(true)
    expect(r.trace.checks).toHaveLength(0)
    expect(j.knowledge.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  test('迁移关 6 秒：标准做法只改起点就通过', async ({page}) => {
    await ready(page)
    const r = await run(page, standard(6), 'transferShort')
    const j = judged(r)
    expect(j.passed).toBe(true)
    expect(r.trace.frames[0].timeLeft).toBe(6)
  })

  test('忘了广播：任务不过（一次都没有广播）', async ({page}) => {
    await ready(page)
    const r = await run(page, flag(set(10), until(wait(), dec())), 'solve')
    const j = judged(r)
    expect(r.trace.broadcasts).toHaveLength(0)
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('一次都没有广播')
  })

  test('广播两次：任务不过', async ({page}) => {
    await ready(page)
    const r = await run(page, flag(set(10), until(wait(), dec()), over, over), 'solve')
    const j = judged(r)
    expect(r.trace.broadcasts).toHaveLength(2)
    expect(j.task.passed).toBe(false)
  })

  test('一开始就广播：任务不过（广播时还没数到 0、也没得过分）', async ({page}) => {
    await ready(page)
    const r = await run(page, flag(over, set(10), until(wait(), dec())), 'solve')
    const j = judged(r)
    expect(j.task.passed).toBe(false)
  })

  test('空程序：舞台不过——倒计时没有开始（timeLeft 一直是 0 不算数过）', async ({page}) => {
    await ready(page)
    const r = await run(page, {scripts: []}, 'solve')
    const j = judged(r)
    expect(j.stage.passed).toBe(false)
    expect(j.stage.line).toContain('倒计时没有开始')
  })

  test('别的做法（reference）在真实浏览器里同样通过', async ({page}) => {
    await ready(page)
    for (const levelId of ['solve', 'transferShort'] as const) {
      for (const alt of alternatives(L05_LEVELS[levelId])) {
        const r = await run(page, alt.program, levelId)
        expect(judged(r).passed, `${levelId} / ${alt.title}`).toBe(true)
      }
    }
  })
})

test.describe('停止、超时与拒绝', () => {
  test('运行中停止：endedBy 是 stopped，不判定', async ({page}) => {
    await ready(page)
    const id = nextRunId++
    const program = standard()
    const done = page.evaluate(async ({id, project}) => {
      const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{trace: RunTrace; kind: string}>}
      w.post({kind: 'RUN', id, levelId: 'solve', fingerprint: 'stop-test', frameMs: 30, project})
      // 等跑出几帧再停
      await w.waitFor(m => m.kind === 'FRAME' && m.id === id)
      w.post({kind: 'STOP', id})
      const msg = await w.waitFor(m => m.kind === 'RUN_DONE' && m.id === id)
      return msg.trace
    }, {id, project: compileProject(program)})
    const trace = await done as unknown as RunTrace
    expect(trace.endedBy).toBe('stopped')
    expect(trace.frames.length).toBeGreaterThan(0)
    expect(trace.frames.length).toBeLessThan(390)
    const j = judgeRun(trace, L05_LEVELS.solve)
    expect(j.status).toBe('not-judged')
  })

  test('合法但太久：起点 20、每次等 2 秒——超过帧上限，明确“不判定”而不是静默通过', async ({page}) => {
    await ready(page)
    const r = await run(page, flag(set(20), until(wait(2), dec()), over), 'solve')
    expect(r.trace.endedBy).toBe('frameCap')
    expect(r.trace.frames.length).toBe(700)
    expect(r.judgment.status).toBe('not-judged')
  })

  test('不是 compile 产出的工程一律拒绝：改一个积木的 opcode', async ({page}) => {
    await ready(page)
    const project = compileProject(standard()) as {targets: Array<{blocks: Record<string, {opcode: string}>}>}
    const student = project.targets[1]
    const waitBlock = Object.values(student.blocks).find(b => b.opcode === 'control_wait')!
    waitBlock.opcode = 'motion_movesteps'
    const reply = await page.evaluate(async (project) => {
      const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{kind: string; error?: string}>}
      w.post({kind: 'RUN', id: 4242, levelId: 'solve', fingerprint: 'x', frameMs: 0, project})
      return w.waitFor(m => (m.kind === 'REJECTED' || m.kind === 'RUN_DONE' || m.kind === 'ERROR') && m.id === 4242)
    }, project)
    expect(reply.kind).toBe('REJECTED')
  })

  test('课程自带的水果脚本被改动一律拒绝：去掉“如果”的条件', async ({page}) => {
    await ready(page)
    const project = compileProject(standard()) as {targets: Array<{blocks: Record<string, {inputs: Record<string, unknown>}>}>}
    const fruit = project.targets[2]
    delete fruit.blocks['fi'].inputs.CONDITION
    const reply = await page.evaluate(async (project) => {
      const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{kind: string; error?: string}>}
      w.post({kind: 'RUN', id: 4343, levelId: 'solve', fingerprint: 'x', frameMs: 0, project})
      return w.waitFor(m => (m.kind === 'REJECTED' || m.kind === 'RUN_DONE' || m.kind === 'ERROR') && m.id === 4343)
    }, project)
    expect(reply.kind).toBe('REJECTED')
  })

  test('多一个角色 / 广播改名一律拒绝', async ({page}) => {
    await ready(page)
    const base = compileProject(standard()) as {targets: unknown[]; }
    const extra = JSON.parse(JSON.stringify(base)) as {targets: unknown[]}
    extra.targets.push(extra.targets[1])
    const renamed = compileProject(standard()) as {targets: Array<{broadcasts: Record<string, string>}>}
    renamed.targets[0].broadcasts['kcl5_bc'] = '别的名字'
    for (const [id, project] of [[4444, extra], [4545, renamed]] as const) {
      const reply = await page.evaluate(async ({id, project}) => {
        const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{kind: string}>}
        w.post({kind: 'RUN', id, levelId: 'solve', fingerprint: 'x', frameMs: 0, project})
        return w.waitFor(m => (m.kind === 'REJECTED' || m.kind === 'RUN_DONE' || m.kind === 'ERROR') && m.id === id)
      }, {id, project})
      expect(reply.kind).toBe('REJECTED')
    }
  })
})
