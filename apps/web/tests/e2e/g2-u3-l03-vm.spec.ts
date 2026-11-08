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
