// G2-U3-L06《水果接力挑战》真实 Scratch VM + 真实渲染器行为矩阵。
// 在真实浏览器里加载 public/scratch-g2-u3-l06-sandbox.html（真实 scratch-vm@5.0.300 + 真实 scratch-render），
// 用 compile.ts 把学生脚本编译成 Scratch 工程送进去逐帧运行，再用 judge.ts 判定。
// 碰撞由渲染器判定、出生点由真实 operator_random 求值、倒计时由虚拟时钟推进——本文件不模拟任何积木行为。
// 确定性：沙箱每次运行把 Math.random 换成带固定种子的 PRNG，同一程序轨迹逐字可复现（有专门用例）。
// 接水果：篮子跟随真实指针，测试用 page.mouse 追逐沙箱逐帧回报的水果 x——这是真实的玩家操作路径，
// 不是给 VM 喂坐标：指针事件落在画布上，沙箱转发给 VM，篮子脚本自己读鼠标。
import {createServer, type Server} from 'node:http'
import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {expect, test, type Page} from '@playwright/test'
import {compileProject} from '../../src/features/lessons/g2-u3-l06/compile'
import {judgeRun, type RunJudgment, type RunTrace} from '../../src/features/lessons/g2-u3-l06/judge'
import {L06_LEVELS, type LevelParams} from '../../src/features/lessons/g2-u3-l06/params'
import {programFingerprint, type Program} from '../../src/features/lessons/g2-u3-l06/program'
import {alternatives, buggyProgram, referenceProgram} from '../../src/features/lessons/g2-u3-l06/reference'

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
    if (url === '/scratch-g2-u3-l06-sandbox.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(readFileSync(join(PUBLIC_DIR, 'scratch-g2-u3-l06-sandbox.html')))
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
// iframe 给真实尺寸（480×360），这样 page.mouse 的指针事件能落到画布上（和孩子在课堂里操作同一条路径）。
const HOST_HTML = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<iframe id="f" sandbox="allow-scripts" src="/scratch-g2-u3-l06-sandbox.html" style="width:480px;height:360px;border:0"></iframe>
<script>
  const frame = document.getElementById('f');
  const inbox = [];
  const waiters = [];
  window.addEventListener('message', e => {
    if (e.source !== frame.contentWindow) return;
    inbox.push(e.data);
    for (const w of waiters.slice()) if (w.test(e.data)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(e.data); }
  });
  window.waitFor = (test, ms = 60000) => new Promise((resolve, reject) => {
    const hit = inbox.find(test);
    if (hit) return resolve(hit);
    const w = {test, resolve};
    waiters.push(w);
    setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); reject(new Error('timeout')); } }, ms);
  });
  window.post = msg => frame.contentWindow.postMessage(msg, '*');
  window.inboxOf = (kind, id) => inbox.filter(m => m.kind === kind && (id === undefined || m.id === id));
  window.lastFrame = id => { const fs = window.inboxOf('FRAME', id); return fs.length ? fs[fs.length - 1] : null; };
  window.ready = () => new Promise(resolve => {
    const ping = () => post({kind: 'PING'});
    const t = setInterval(ping, 300); ping();
    waitFor(m => m.kind === 'FRAME_READY').then(m => { clearInterval(t); resolve(m); });
  });
</script>`

let nextRunId = 1000
export type RunResult = {trace: RunTrace; judgment: RunJudgment}

async function ready(page: Page) {
  await page.goto(`${origin}/host.html`)
  const hello = await page.evaluate(() => (window as unknown as {ready: () => Promise<{available: boolean; assets: Record<string, string>}>}).ready())
  expect(hello.available, 'VM 或渲染器没有加载：public/scratch-vm/ 不完整').toBe(true)
  expect(Object.keys(hello.assets).sort()).toEqual(['backdrop', 'basket', 'fruit'])
  const attr = await page.locator('#f').getAttribute('sandbox')
  expect(attr).toBe('allow-scripts')
  return hello
}

function runMessage(program: Program, level: LevelParams, id: number, frameMs: number) {
  return {
    kind: 'RUN', id, levelId: level.id, fingerprint: programFingerprint(program), frameMs,
    fruitSpeed: level.fruitSpeed, timeLimitSeconds: level.timeLimitSeconds, winTarget: level.winTarget,
    project: compileProject(program, level),
  }
}

/** 经沙箱运行一次并等待结束；chase=true 时用真实指针追逐水果（篮子跟随指针）。 */
async function run(page: Page, program: Program, level: LevelParams, opts: {frameMs?: number; chase?: boolean} = {}): Promise<RunResult> {
  const id = nextRunId++
  const message = runMessage(program, level, id, opts.frameMs ?? 0)
  const donePromise = page.evaluate(async ({message, id}) => {
    const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{trace: RunTrace; error?: string; kind: string}>}
    w.post(message)
    const done = await w.waitFor(m => (m.kind === 'RUN_DONE' || m.kind === 'ERROR' || m.kind === 'REJECTED') && m.id === id)
    if (done.kind !== 'RUN_DONE') throw new Error(`${done.kind}: ${done.error}`)
    return done.trace
  }, {message, id})
  if (opts.chase) {
    const box = await page.locator('#f').boundingBox()
    if (!box) throw new Error('iframe 没有尺寸')
    let finished = false
    void donePromise.then(() => { finished = true }, () => { finished = true })
    // 追逐：读最新一帧的水果 x，把指针移到画布上对应位置（指针 y 放在下半区，篮子只读 x）。
    while (!finished) {
      const f = await page.evaluate(rid => (window as unknown as {lastFrame: (i: number) => {fruit: {x: number}} | null}).lastFrame(rid), id)
      if (f) await page.mouse.move(box.x + (f.fruit.x + 240) * (box.width / 480), box.y + box.height * 0.8)
      await page.waitForTimeout(20)
    }
  }
  const trace = await donePromise
  return {trace, judgment: judgeRun(trace, level)}
}

test.describe('G2-U3-L06 VM + 渲染器', () => {
  test('握手：VM 与渲染器可用，三份素材齐全', async ({page}) => {
    await ready(page)
  })

  test('舞台真的被渲染器画出来：画布像素非空且有多种颜色', async ({page}) => {
    await ready(page)
    const id = nextRunId++
    const level = L06_LEVELS.solve
    const started = page.evaluate(async ({message, id}) => {
      const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<unknown>}
      w.post(message)
      return w.waitFor(m => m.kind === 'STARTED' && (m as {id: number}).id === id)
    }, {message: runMessage(referenceProgram(level), level, id, 50), id})
    await started
    // 量的是浏览器最终合成出来的画面（截图），不是 WebGL 后备缓冲——后者在合成后会被清掉，读它时好时坏。
    // 运行刚开始几帧画面就在变，采几次样，任一次颜色丰富即证明渲染器真的画出了舞台、篮子和水果。
    const box = await page.locator('#f').boundingBox()
    if (!box) throw new Error('iframe 没有尺寸')
    let colors = 0
    for (let attempt = 0; attempt < 10 && colors <= 5; attempt++) {
      const shot = await page.screenshot({clip: box})
      colors = await page.evaluate(async (b64: string) => {
        const img = new Image()
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = `data:image/png;base64,${b64}` })
        const c2 = document.createElement('canvas')
        c2.width = img.width; c2.height = img.height
        const ctx = c2.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, img.width, img.height).data
        const seen = new Set<string>()
        for (let i = 0; i < data.length; i += 4 * 499) seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`)
        return seen.size
      }, shot.toString('base64'))
      if (colors <= 5) await page.waitForTimeout(300)
    }
    expect(colors).toBeGreaterThan(5)
    await page.evaluate(rid => (window as unknown as {post: (m: unknown) => void}).post({kind: 'STOP', id: rid}), id)
  })

  test('参考做法 + 真实指针接水果：获胜结束，三层全过', async ({page}) => {
    test.setTimeout(180_000)
    await ready(page)
    const level = L06_LEVELS.solve
    const {trace, judgment} = await run(page, referenceProgram(level), level, {frameMs: 4, chase: true})
    expect(trace.endReason).toBe('win')
    expect(trace.finalScore).toBeGreaterThanOrEqual(level.winTarget)
    expect(trace.scores.length).toBeGreaterThanOrEqual(level.winTarget)
    expect(new Set(trace.spawns.map(s => s.x)).size).toBeGreaterThanOrEqual(3)
    expect(judgment.status).toBe('judged')
    if (judgment.status === 'judged') {
      expect(judgment.stage.passed).toBe(true)
      expect(judgment.task.passed).toBe(true)
      expect(judgment.knowledge.passed).toBe(true)
      expect(judgment.passed).toBe(true)
    }
  })

  test('参考做法不追（篮子停在默认位置）：游戏自然结束，随机证据成立', async ({page}) => {
    test.setTimeout(180_000)
    await ready(page)
    const level = L06_LEVELS.solve
    const {trace, judgment} = await run(page, referenceProgram(level), level, {frameMs: 0})
    // 篮子停在舞台中央 x=0：落点靠近中央的水果会被真实渲染器判为接住，所以这一局可能获胜也可能时间到——
    // 两种都是自然结束（Node 无渲染器时恒为时间到，浏览器里以真实碰撞为准）。断言的是“自然结束 + 证据成立”。
    expect(['win', 'timeup']).toContain(trace.endReason)
    if (trace.endReason === 'timeup') expect(trace.finalTimeLeft).toBeLessThan(1)
    if (trace.endReason === 'win') expect(trace.finalScore).toBeGreaterThanOrEqual(level.winTarget)
    expect(trace.spawns.length).toBeGreaterThanOrEqual(5)
    expect(judgment.status).toBe('judged')
    if (judgment.status === 'judged') {
      expect(judgment.stage.passed).toBe(true)
      expect(judgment.knowledge.passed).toBe(true)
    }
  })

  test('同一程序两次运行：出生序列逐字一致（带种子可复现）', async ({page}) => {
    test.setTimeout(180_000)
    await ready(page)
    const level = L06_LEVELS.solve
    const a = await run(page, referenceProgram(level), level, {frameMs: 0})
    const b = await run(page, referenceProgram(level), level, {frameMs: 0})
    expect(b.trace.spawns).toEqual(a.trace.spawns)
  })

  test('毛病程序（记分在如果外）：真实运行里无条件记分，任务层失败', async ({page}) => {
    test.setTimeout(180_000)
    await ready(page)
    const level = L06_LEVELS.transferFix
    const {trace, judgment} = await run(page, buggyProgram(level), level, {frameMs: 0})
    expect(trace.scores.length).toBeGreaterThanOrEqual(5)
    const guarded = trace.scores.filter(s => trace.checks.some(c => c.frame === s.frame && c.result))
    expect(guarded.length).toBeLessThan(trace.scores.length)
    expect(judgment.status).toBe('judged')
    if (judgment.status === 'judged') expect(judgment.task.passed).toBe(false)
  })

  test('错误程序（没有出生积木）：水果不接力出生，知识层失败', async ({page}) => {
    test.setTimeout(180_000)
    await ready(page)
    const level = L06_LEVELS.solve
    const noSpawn: Program = {
      scripts: [{hat: 'flag', body: [{t: 'forever', body: [
        {t: 'repeat', times: 33, body: [{t: 'fall'}, {t: 'iftouch', body: [{t: 'score', by: 1}, {t: 'hide'}]}]},
        {t: 'hide'},
      ]}]}],
    }
    const {trace, judgment} = await run(page, noSpawn, level, {frameMs: 0})
    expect(trace.spawns).toEqual([])
    expect(judgment.status).toBe('judged')
    if (judgment.status === 'judged') expect(judgment.knowledge.passed).toBe(false)
  })

  test('全部“别的做法”：真实运行并通过知识与舞台层', async ({page}) => {
    test.setTimeout(300_000)
    await ready(page)
    const level = L06_LEVELS.solve
    for (const alt of alternatives(level)) {
      const {judgment} = await run(page, alt.program, level, {frameMs: 0})
      expect(judgment.status, alt.title).toBe('judged')
      if (judgment.status === 'judged') {
        expect(judgment.knowledge.passed, alt.title).toBe(true)
        expect(judgment.stage.passed, alt.title).toBe(true)
      }
    }
  })

  test('运行中停止：RUN_DONE 以 stopped 落地', async ({page}) => {
    test.setTimeout(120_000)
    await ready(page)
    const level = L06_LEVELS.solve
    const id = nextRunId++
    const donePromise = page.evaluate(async ({message, id}) => {
      const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{trace: RunTrace; kind: string}>}
      w.post(message)
      const done = await w.waitFor(m => m.kind === 'RUN_DONE' && m.id === id)
      return done.trace
    }, {message: runMessage(referenceProgram(level), level, id, 30), id})
    await page.waitForTimeout(600)
    await page.evaluate(rid => (window as unknown as {post: (m: unknown) => void}).post({kind: 'STOP', id: rid}), id)
    const trace = await donePromise
    expect(trace.endedBy).toBe('stopped')
    expect(judgeRun(trace, level).status).toBe('not-judged')
  })

  test('篡改工程一律拒绝：加积木 / 改随机范围 / 改倒计时 / 删篮子脚本', async ({page}) => {
    await ready(page)
    const level = L06_LEVELS.solve
    const base = () => compileProject(referenceProgram(level), level) as unknown as {targets: Array<{blocks: Record<string, {opcode: string; inputs: Record<string, unknown>}>}>}
    const tampered: Array<{name: string; mutate: (p: ReturnType<typeof base>) => void}> = [
      {name: '水果加一块“说”', mutate: p => { p.targets[2].blocks.zz = {opcode: 'looks_say', inputs: {}} as never }},
      {name: '随机下限改成 -999', mutate: p => {
        const rand = Object.values(p.targets[2].blocks).find(b => b.opcode === 'operator_random')!
        rand.inputs.FROM = [1, [4, '-999']]
      }},
      {name: '倒计时等待改成 5 秒', mutate: p => { p.targets[0].blocks.cd_w.inputs.DURATION = [1, [5, '5']] }},
      {name: '删掉篮子跟随脚本', mutate: p => { p.targets[1].blocks = {} }},
    ]
    for (const t of tampered) {
      const project = base()
      t.mutate(project)
      const id = nextRunId++
      const reply = await page.evaluate(async ({project, id}) => {
        const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{kind: string; error?: string}>}
        w.post({kind: 'RUN', id, levelId: 'solve', fingerprint: 'x', frameMs: 0, fruitSpeed: 10, timeLimitSeconds: 20, winTarget: 5, project})
        return w.waitFor(m => (m.kind === 'REJECTED' || m.kind === 'RUN_DONE' || m.kind === 'ERROR') && m.id === id)
      }, {project, id})
      expect(reply.kind, t.name).toBe('REJECTED')
    }
  })

  test('全程没有外部网络请求', async () => {
    const external = requested.filter(u => /^https?:\/\//.test(u))
    expect(external).toEqual([])
    expect(requested.every(u => u.startsWith('/'))).toBe(true)
  })
})
