// G2-U3-L02《接住掉落水果》真实 Scratch VM 行为矩阵。
// 在真实浏览器里加载 public/scratch-g2-u3-l02-sandbox.html（内含真实 scratch-vm@5.0.300），
// 用 compile.ts 把学生脚本编译成 Scratch 工程送进去逐帧运行，再用 judge.ts 判定。
// 不含任何积木模拟器：移动、循环展开、落地时机全部来自 VM。
// 本地没有 jsDelivr 时：SCRATCH_VM_LOCAL_CDN=1 并用 SCRATCH_VM_LOCAL_FILE / SCRATCH_STORAGE_LOCAL_FILE 指向本地副本。
import {createServer, type Server} from 'node:http'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {expect, test, type Page} from '@playwright/test'
import {routeLocalScratchVm} from './scratch-g2-helpers'
import {compileProject} from '../../src/features/lessons/g2-u3-l02/compile'
import {judgeRun, type RunJudgment, type RunTrace} from '../../src/features/lessons/g2-u3-l02/judge'
import {L02_LEVELS, L02_PARAMS, framesToLand, type LevelId} from '../../src/features/lessons/g2-u3-l02/params'
import {programFingerprint, type Block, type Program} from '../../src/features/lessons/g2-u3-l02/program'
import {judgeSharedTrace, toJudgmentResult, toSharedRunTrace} from '../../src/features/lessons/g2-u3-l02/lesson-adapter'

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
    if (url === '/scratch-g2-u3-l02-sandbox.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(readFileSync(join(PUBLIC_DIR, 'scratch-g2-u3-l02-sandbox.html')))
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
<iframe id="f" sandbox="allow-scripts" src="/scratch-g2-u3-l02-sandbox.html"></iframe>
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
type RunResult = {trace: RunTrace; judgment: RunJudgment; frames: Array<{frame: number; basket: {x: number; y: number}; fruit: {x: number; y: number}}>}

async function ready(page: Page) {
  await routeLocalScratchVm(page)
  await page.goto(`${origin}/host.html`)
  const hello = await page.evaluate(() => (window as unknown as {ready: () => Promise<{available: boolean}>}).ready())
  expect(hello.available, 'Scratch VM 没有加载：需要网络访问 jsDelivr，或设置 SCRATCH_VM_LOCAL_CDN=1').toBe(true)
}

async function run(page: Page, program: Program, levelId: LevelId, frameMs = 0): Promise<RunResult> {
  const level = L02_LEVELS[levelId]
  const id = nextRunId++
  const message = {kind: 'RUN', id, levelId, level, fingerprint: programFingerprint(program), frameMs, project: compileProject(program, level)}
  const trace = await page.evaluate(async ({message, id}) => {
    const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{trace: unknown; error?: string; kind: string}>}
    w.post(message)
    const done = await w.waitFor(m => (m.kind === 'RUN_DONE' || m.kind === 'ERROR' || m.kind === 'REJECTED') && m.id === id)
    if (done.kind !== 'RUN_DONE') throw new Error(`${done.kind}: ${done.error}`)
    return done.trace
  }, {message, id}) as RunTrace
  const frames = await page.evaluate((id) => (window as unknown as {inboxOf: (k: string, i: number) => unknown[]}).inboxOf('FRAME', id), id) as RunResult['frames']
  return {trace, judgment: judgeRun(trace, level), frames}
}

const move = (dx: number): Block => ({t: 'move', dx})
const repeat = (times: number, ...body: Block[]): Block => ({t: 'repeat', times, body})
const flag = (...body: Block[]): Program => ({scripts: [{hat: 'flag', body}]})

function judged(r: RunResult) {
  if (r.judgment.status !== 'judged') throw new Error(`未判定：${r.judgment.reason}`)
  return r.judgment
}

test.describe('G2-U3-L02 真实 Scratch VM：三层判定矩阵', () => {
  test.setTimeout(180_000)
  test.beforeEach(async ({page}) => { await ready(page) })

  test('R1 空程序 / 只有绿旗 / 散积木：没接住、任务未完成、知识未通过', async ({page}) => {
    for (const program of [{scripts: []}, flag(), {scripts: [{hat: null, body: [repeat(3, move(50))]}]}] as Program[]) {
      const j = judged(await run(page, program, 'solve'))
      expect(j.stage.passed).toBe(false)
      expect(j.task.passed).toBe(false)
      expect(j.knowledge.passed).toBe(false)
      expect(j.passed).toBe(false)
      expect(j.conclusion).toContain('未通过')
    }
  })

  test('R2 没用循环但接住：任务通过，知识证据不通过，不写已掌握', async ({page}) => {
    const j = judged(await run(page, flag(move(100), move(30)), 'solve'))
    expect(j.stage.passed).toBe(true)
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  test('R3/R4 参数错误与移动了但不够：没接住', async ({page}) => {
    for (const program of [flag(move(10)), flag(move(30), move(30)), flag(repeat(5, move(-30))), flag(repeat(3, move(10)))]) {
      const j = judged(await run(page, program, 'solve'))
      expect(j.stage.passed).toBe(false)
      expect(j.task.passed).toBe(false)
      expect(j.passed).toBe(false)
    }
  })

  test('R3b 用了循环但距离算错：循环确实在动但任务未完成，结论未合格', async ({page}) => {
    const j = judged(await run(page, flag(repeat(3, move(10))), 'solve'))
    expect(j.knowledge.passed).toBe(true)
    expect(j.task.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  test('R5 结构不同但行为达标：按行为判，不逐块比对', async ({page}) => {
    const j = judged(await run(page, flag(move(100), move(50)), 'solve'))
    expect(j.task.passed).toBe(true)
  })

  test('R6 循环版与多种合法组合都通过；积木顺序变化不影响', async ({page}) => {
    const programs: Program[] = [
      flag(repeat(3, move(50))),
      flag(repeat(5, move(30))),
      flag(repeat(4, move(40))),
      flag(repeat(2, move(50)), move(50)),
      flag(move(50), repeat(2, move(50))),
      {scripts: [{hat: 'flag', body: [repeat(3, move(50))]}, {hat: 'flag', body: []}]},
    ]
    for (const program of programs) {
      const j = judged(await run(page, program, 'solve'))
      expect(j.task.passed, JSON.stringify(program)).toBe(true)
      expect(j.knowledge.passed, JSON.stringify(program)).toBe(true)
      expect(j.passed, JSON.stringify(program)).toBe(true)
    }
  })

  test('偶然接住：循环只贡献一小部分位移，知识证据不通过', async ({page}) => {
    const j = judged(await run(page, flag(repeat(2, move(10)), move(100), move(30)), 'solve'))
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  test('循环真实逐帧展开：每帧最多前进一圈，落地帧与参数一致', async ({page}) => {
    const r = await run(page, flag(repeat(3, move(50))), 'solve')
    expect(r.trace.landing?.frame).toBe(framesToLand(L02_LEVELS.solve))
    expect(r.trace.basketMoves.map(m => [m.frame, m.dx, m.inLoop])).toEqual([[1, 50, true], [2, 50, true], [3, 50, true]])
    const basketXs = r.frames.slice(0, 4).map(f => f.basket.x)
    expect(basketXs).toEqual([50, 100, 150, 150])
    const fruitYs = r.frames.slice(0, 3).map(f => f.fruit.y)
    expect(fruitYs).toEqual([140, 130, 120])
    expect(r.frames.at(-1)?.fruit.y).toBeLessThanOrEqual(-130)
  })

  test('排在循环后面的移动不算“在循环里”（Scratch 后续积木的 parent 指向循环块）', async ({page}) => {
    const r = await run(page, flag(repeat(2, move(50)), move(50)), 'solve')
    expect(r.trace.basketMoves.map(m => [m.frame, m.dx, m.inLoop])).toEqual([[1, 50, true], [2, 50, true], [3, 50, false]])
    const nested = await run(page, flag(repeat(2, repeat(2, move(10)), move(5))), 'solve')
    const flags = nested.trace.basketMoves.map(m => [m.dx, m.inLoop])
    expect(flags).toEqual([[10, true], [10, true], [5, true], [10, true], [10, true], [5, true]])
  })

  test('没有循环的移动被标成不在循环里', async ({page}) => {
    const r = await run(page, flag(move(100), move(30)), 'solve')
    expect(r.trace.basketMoves.every(m => !m.inLoop)).toBe(true)
  })

  test('同一程序反复运行结果一致，不叠加', async ({page}) => {
    const a = await run(page, flag(repeat(3, move(50))), 'solve')
    const b = await run(page, flag(repeat(3, move(50))), 'solve')
    const c = await run(page, flag(repeat(3, move(50))), 'solve')
    for (const r of [b, c]) {
      expect(r.trace.landing).toEqual(a.trace.landing)
      expect(r.trace.basketMoves).toEqual(a.trace.basketMoves)
    }
    expect(a.trace.landing?.basketX).toBe(150)
  })

  test('迁移：水果在左边要用负数；方向反了就漏接', async ({page}) => {
    const ok = judged(await run(page, flag(repeat(2, move(-50))), 'transferLeft'))
    expect(ok.passed).toBe(true)
    const wrongWay = judged(await run(page, flag(repeat(2, move(50))), 'transferLeft'))
    expect(wrongWay.stage.passed).toBe(false)
    const copyOfSolve = judged(await run(page, flag(repeat(3, move(50))), 'transferLeft'))
    expect(copyOfSolve.passed).toBe(false)
  })

  test('迁移：水果更快时慢慢走来不及，大步才接得住', async ({page}) => {
    const slow = await run(page, flag(repeat(15, move(10))), 'transferFast')
    expect(slow.trace.landing?.frame).toBe(framesToLand(L02_LEVELS.transferFast))
    expect(slow.trace.landing?.basketX).toBe(framesToLand(L02_LEVELS.transferFast) * 10)
    expect(judged(slow).stage.passed).toBe(false)
    for (const program of [flag(repeat(3, move(50))), flag(repeat(5, move(30)))]) {
      expect(judged(await run(page, program, 'transferFast')).passed).toBe(true)
    }
  })

  test('探索关演示程序：重复 2 次 × 20 走到 x=40，与水果 x=100 差 60，真实漏接；2×30 差 40 在容差边界上会接住', async ({page}) => {
    const demo = judged(await run(page, flag(repeat(2, move(20))), 'explore'))
    expect(demo.stage.passed).toBe(false)
    expect(demo.stage.line).toContain('相差 60')
    const edge = judged(await run(page, flag(repeat(2, move(30))), 'explore'))
    expect(edge.stage.passed).toBe(true)
    expect(edge.stage.line).toContain('相差 40')
  })

  test('快速关边界：10 次 × 15 在第 10 帧刚好到位，接得住；15 次 × 10 只走到 100，漏接', async ({page}) => {
    expect(judged(await run(page, flag(repeat(10, move(15))), 'transferFast')).passed).toBe(true)
    expect(judged(await run(page, flag(repeat(15, move(10))), 'transferFast')).stage.passed).toBe(false)
  })

  test('落地之后才执行的积木不算数（只统计落地帧之前的真实移动）', async ({page}) => {
    // 水果 10 帧落地；重复 20 次 × 10：落地时篮子只走到 100，后面的移动对本次结果没有影响。
    const r = await run(page, flag(repeat(20, move(10))), 'transferFast')
    expect(r.trace.landing?.basketX).toBe(100)
    expect(judged(r).stage.passed).toBe(false)
  })

  test('运行中停止：不判定、没有分数；停止后重跑与首次一致，再跑也不叠加', async ({page}) => {
    const program = flag(repeat(3, move(50)))
    const level = L02_LEVELS.solve
    const id = nextRunId++
    // 慢速帧（100ms/帧）以便在中途停止
    await page.evaluate(m => (window as unknown as {post: (x: unknown) => void}).post(m),
      {kind: 'RUN', id, levelId: 'solve', level, fingerprint: programFingerprint(program), frameMs: 100, project: compileProject(program, level)})
    await page.evaluate(id => (window as unknown as {waitFor: (t: (m: {kind: string; id: number; frame?: number}) => boolean) => Promise<unknown>}).waitFor(m => m.kind === 'FRAME' && m.id === id && (m.frame ?? 0) >= 2), id)
    await page.evaluate(id => (window as unknown as {post: (x: unknown) => void}).post({kind: 'STOP', id}), id)
    const stopped = await page.evaluate(id => (window as unknown as {waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{trace: unknown}>}).waitFor(m => m.kind === 'RUN_DONE' && m.id === id), id) as {trace: RunTrace}
    expect(stopped.trace.endedBy).toBe('stopped')
    expect(stopped.trace.landing).toBeNull()
    expect(judgeRun(stopped.trace, level).status).toBe('not-judged')
    const first = await run(page, program, 'solve')
    const again = await run(page, program, 'solve')
    expect(judged(first).passed).toBe(true)
    expect(again.trace.landing).toEqual(first.trace.landing)
    expect(again.trace.basketMoves).toEqual(first.trace.basketMoves)
  })

  test('真实 VM 的容差边界：相差 40 接到，41 没接到（两侧）', async ({page}) => {
    const at = async (program: Program, levelId: LevelId = 'solve') => judged(await run(page, program, levelId))
    expect((await at(flag(move(100), move(10)))).stage.passed).toBe(true) // 110，相差 40
    expect((await at(flag(move(100), move(9)))).stage.passed).toBe(false) // 109，相差 41
    expect((await at(flag(move(100), move(90)))).stage.passed).toBe(true) // 190，相差 40
    expect((await at(flag(move(100), move(91)))).stage.passed).toBe(false) // 191，相差 41
    expect((await at(flag(move(100), move(9)))).stage.line).toContain('相差 41')
  })

  test('真实 VM 的知识证据边界：循环次数 1 vs 2；循环占比恰好 50% vs 低于 50%', async ({page}) => {
    const k = async (program: Program) => judged(await run(page, program, 'solve')).knowledge.passed
    expect(await k(flag(repeat(1, move(100)), move(50)))).toBe(false) // 循环只执行 1 次
    expect(await k(flag(repeat(2, move(50)), move(50)))).toBe(true) // 循环 100 / 总 150
    expect(await k(flag(repeat(2, move(40)), move(80)))).toBe(true) // 80 / 160 = 恰好 50%
    expect(await k(flag(repeat(2, move(39)), move(82)))).toBe(false) // 78 / 160 = 48.75%
    expect(await k(flag(repeat(2, move(0)), move(100), move(50)))).toBe(false) // 0 步的循环不算
  })

  test('真实 VM 的程序上限：最大合法程序能跑；超过 12 块 / 嵌套 3 层 / 4 条脚本 / 越界数值被沙箱拒绝', async ({page}) => {
    const level = L02_LEVELS.solve
    // 合法的最大值：次数 20、移动 ±100、12 块（不含绿旗）、嵌套 2、3 条脚本
    const maxBlocks = flag(...Array.from({length: L02_PARAMS.maxBlocks}, () => move(1)))
    expect((await run(page, maxBlocks, 'solve')).trace.endedBy).toBe('landed')
    expect((await run(page, flag(repeat(L02_PARAMS.maxRepeatTimes, move(L02_PARAMS.maxMoveDx))), 'solve')).trace.endedBy).toBe('landed')
    expect((await run(page, flag(repeat(2, move(L02_PARAMS.minMoveDx))), 'solve')).trace.endedBy).toBe('landed')
    expect((await run(page, flag(repeat(2, repeat(2, move(1)))), 'solve')).trace.endedBy).toBe('landed') // 嵌套 2
    const three: Program = {scripts: [{hat: 'flag', body: [move(1)]}, {hat: 'flag', body: [move(1)]}, {hat: 'flag', body: [move(1)]}]}
    expect((await run(page, three, 'solve')).trace.endedBy).toBe('landed')

    type B = Record<string, {opcode: string; next: string | null; parent: string | null; topLevel: boolean; shadow: boolean; inputs: Record<string, unknown>; fields: Record<string, unknown>; x?: number; y?: number}>
    const send = async (project: unknown) => {
      const id = nextRunId++
      return page.evaluate(async ({project, id, level}) => {
        const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{kind: string; error?: string}>}
        w.post({kind: 'RUN', id, levelId: 'solve', level, fingerprint: 'x', frameMs: 0, project})
        return w.waitFor(m => (m.kind === 'REJECTED' || m.kind === 'RUN_DONE' || m.kind === 'ERROR') && m.id === id)
      }, {project, id, level})
    }
    const copy = (p: Program) => JSON.parse(JSON.stringify(compileProject(p, level)))
    const blocksOf = (project: {targets: Array<{blocks: unknown}>}) => project.targets[1].blocks as B

    // 13 块：先编译 12 块的合法程序，再手工在链尾追加第 13 块
    const p13 = copy(maxBlocks)
    const b13 = blocksOf(p13)
    const tail = Object.entries(b13).find(([, b]) => b.next === null && b.opcode === 'motion_changexby')![0]
    b13.bkExtra = {opcode: 'motion_changexby', next: null, parent: tail, topLevel: false, shadow: false, inputs: {DX: [1, [4, '1']]}, fields: {}}
    b13[tail].next = 'bkExtra'
    expect((await send(p13)).kind).toBe('REJECTED')

    // 嵌套 3 层：在最内层重复里再插一层重复
    const pNest = copy(flag(repeat(2, repeat(2, move(1)))))
    const bn = blocksOf(pNest)
    const [innerRepeat] = Object.entries(bn).filter(([, b]) => b.opcode === 'control_repeat' && (b.inputs.SUBSTACK as unknown[] | undefined))[1]
    const mv = Object.entries(bn).find(([, b]) => b.opcode === 'motion_changexby')![0]
    bn.bkNest = {opcode: 'control_repeat', next: null, parent: innerRepeat, topLevel: false, shadow: false, inputs: {TIMES: [1, [6, '2']], SUBSTACK: [2, mv]}, fields: {}}
    bn[innerRepeat].inputs.SUBSTACK = [2, 'bkNest']
    bn[mv].parent = 'bkNest'
    expect((await send(pNest)).kind).toBe('REJECTED')

    // 4 条脚本：再加一个帽子
    const pHats = copy(three)
    blocksOf(pHats).bkHat4 = {opcode: 'event_whenflagclicked', next: null, parent: null, topLevel: true, shadow: false, inputs: {}, fields: {}, x: 0, y: 900}
    expect((await send(pHats)).kind).toBe('REJECTED')

    // 数值越界：21 次、移动 ±101
    const pRep = copy(flag(repeat(20, move(1))))
    Object.values(blocksOf(pRep)).find(b => b.opcode === 'control_repeat')!.inputs.TIMES = [1, [6, '21']]
    expect((await send(pRep)).kind).toBe('REJECTED')
    for (const bad of ['101', '-101']) {
      const pDx = copy(flag(move(1)))
      Object.values(blocksOf(pDx)).find(b => b.opcode === 'motion_changexby')!.inputs.DX = [1, [4, bad]]
      expect((await send(pDx)).kind, `dx=${bad}`).toBe('REJECTED')
    }
    // 拒绝之后沙箱仍然可用
    expect(judged(await run(page, flag(repeat(3, move(50))), 'solve')).passed).toBe(true)
  })

  test('沙箱拒绝本课范围之外的积木、越界参数和被改过的水果脚本（失败保持安全）', async ({page}) => {
    const level = L02_LEVELS.solve
    const good = compileProject(flag(repeat(3, move(50))), level)
    const mutate = (fn: (p: ReturnType<typeof compileProject>) => void) => {
      const copy = JSON.parse(JSON.stringify(good))
      fn(copy)
      return copy
    }
    const basketBlocks = (p: ReturnType<typeof compileProject>) => p.targets[1].blocks as Record<string, {opcode: string; inputs: Record<string, unknown>}>
    const fruitBlocks = (p: ReturnType<typeof compileProject>) => p.targets[2].blocks as Record<string, {opcode: string; inputs: Record<string, unknown>}>
    const bad = {
      'opcode 不在白名单': mutate(p => { Object.values(basketBlocks(p)).find(b => b.opcode === 'motion_changexby')!.opcode = 'motion_gotoxy' }),
      '移动量越界': mutate(p => { Object.values(basketBlocks(p)).find(b => b.opcode === 'motion_changexby')!.inputs.DX = [1, [4, '9999']] }),
      '重复次数越界': mutate(p => { Object.values(basketBlocks(p)).find(b => b.opcode === 'control_repeat')!.inputs.TIMES = [1, [6, '21']] }),
      '水果脚本被改速度': mutate(p => { fruitBlocks(p).frFall.inputs.DY = [1, [4, '-1']] }),
      '带变量': mutate(p => { (p.targets[1] as unknown as {variables: Record<string, unknown>}).variables = {v: ['x', 0]} }),
      '带声音': mutate(p => { (p.targets[1] as unknown as {sounds: unknown[]}).sounds = [{name: 'a'}] }),
      '篮子起点被改': mutate(p => { (p.targets[1] as unknown as {x: number}).x = 100 }),
      '造型被换成别的素材': mutate(p => { p.targets[1].costumes[0].assetId = 'f'.repeat(32) }),
    }
    for (const [label, project] of Object.entries(bad)) {
      const id = nextRunId++
      const reply = await page.evaluate(async ({project, id, level}) => {
        const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<{kind: string; error?: string}>}
        w.post({kind: 'RUN', id, levelId: 'solve', level, fingerprint: 'x', frameMs: 0, project})
        return w.waitFor(m => (m.kind === 'REJECTED' || m.kind === 'RUN_DONE' || m.kind === 'ERROR') && m.id === id)
      }, {project, id, level})
      expect(reply.kind, `${label} 应被拒绝`).toBe('REJECTED')
    }
    // 拒绝之后沙箱仍然可用
    expect(judged(await run(page, flag(repeat(3, move(50))), 'solve')).passed).toBe(true)
  })
})

test.describe('G2-U3-L02 真实 Scratch VM：共享 RunTrace 映射与课程判定等价', () => {
  test.setTimeout(180_000)
  test.beforeEach(async ({page}) => { await ready(page) })

  test('真实 VM 轨迹经 toSharedRunTrace → judgeSharedTrace，与直接 judgeRun 的结果一致；还原的落点等于 VM 里篮子的真实 x', async ({page}) => {
    const cases: Array<[LevelId, Program]> = [
      ['solve', flag(repeat(3, move(50)))],
      ['solve', flag(repeat(3, move(10)))],
      ['solve', flag(move(100), move(50))],
      ['solve', flag(move(50), repeat(2, move(50)))],
      ['solve', flag(repeat(3, move(-50)))],
      ['solve', flag()],
      ['transferLeft', flag(repeat(5, move(-20)))],
      ['transferLeft', flag(repeat(5, move(20)))],
      ['transferFast', flag(repeat(3, move(50)))],
      ['transferFast', flag(repeat(15, move(10)))],
      ['explore', flag(repeat(2, move(20)))],
      ['solve', flag(repeat(20, move(100)), repeat(20, move(-100)))],
    ]
    for (const [levelId, program] of cases) {
      const r = await run(page, program, levelId)
      const label = `${levelId} ${JSON.stringify(program)}`
      expect(r.trace.endedBy, label).toBe('landed')
      const direct = toJudgmentResult(r.judgment, levelId)
      const shared = toSharedRunTrace(r.trace)
      expect(judgeSharedTrace(shared), label).toEqual(direct)
      // 共享轨迹按帧累加 dx 还原的落点，必须等于 VM 在落地那一帧读到的篮子 x（没有边缘限位带来的偏差）
      const landed = shared.frames.filter(f => f.frame <= shared.landingFrame!).reduce((sum, f) => sum + (f.dx ?? 0), L02_PARAMS.basketStartX)
      expect(landed, label).toBe(r.trace.landing!.basketX)
    }
  })
})
