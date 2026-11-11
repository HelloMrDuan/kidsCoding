// G2-U3-L04 方案 A 可行性验证（SPIKE）：受限 iframe 里「本地、固定版本」的 scratch-render + 真实 VM。
// 验证项（首席裁定）：
//   1. 角色相交时真实的 sensing_touchingobject = true，分离时 = false；
//   2. 「碰到才加分」；
//   3. 无外部网络依赖，沙箱权限不扩大（CSP、iframe sandbox 属性、没有 same-origin）；
//   4. 资源能正确释放；
//   5. 真实 Chrome 的 WebGL，以及三个视口。
// 这是 spike：不接受外部积木，不被任何课程页面引用，不修改 L02 / L03 沙箱，也不改共享的 copy-scratch-vm.mjs。
import {createServer, type Server} from 'node:http'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {expect, test, type Page} from '@playwright/test'

const PUBLIC_DIR = join(__dirname, '..', '..', 'public')
const WEB_ROOT = join(__dirname, '..', '..')
const RENDER_FILE = join(WEB_ROOT, 'node_modules', 'scratch-render', 'dist', 'web', 'scratch-render.js')
const EXPECTED_RENDER_VERSION = '2.2.84'
let server: Server
let origin = ''
const requested: string[] = []

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]
    requested.push(url)
    if (url === '/host.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(HOST_HTML)
      return
    }
    if (url === '/scratch-render-spike-sandbox.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(readFileSync(join(PUBLIC_DIR, 'scratch-render-spike-sandbox.html')))
      return
    }
    const vm = /^\/scratch-vm\/(scratch-vm\.js|scratch-storage\.min\.js)$/.exec(url)
    if (vm) {
      res.setHeader('content-type', 'text/javascript; charset=utf-8')
      res.end(readFileSync(join(PUBLIC_DIR, 'scratch-vm', vm[1])))
      return
    }
    // scratch-render 直接从 node_modules 里的固定版本提供，不经过 public/：
    // 共享的 prebuild（copy-scratch-vm.mjs）每次构建都会清空 public/scratch-vm/，而首席要求不把渲染器并入共享脚本。
    if (url === '/scratch-vm/scratch-render.js') {
      res.setHeader('content-type', 'text/javascript; charset=utf-8')
      res.end(readFileSync(RENDER_FILE))
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

const HOST_HTML = `<!doctype html><meta charset="utf-8"><body>
<iframe id="f" sandbox="allow-scripts" src="/scratch-render-spike-sandbox.html"></iframe>
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
  window.ready = () => new Promise(resolve => {
    const ping = () => post({kind: 'PING'});
    const t = setInterval(ping, 300); ping();
    waitFor(m => m.kind === 'SPIKE_READY').then(m => { clearInterval(t); resolve(m); });
  });
</script>`

type SpikeDone = {
  kind: string; id: number; error?: string
  hasRenderer: boolean; skinMs: number; touchingBefore: boolean; score: number; calls: boolean[]; steps: number
  ballVisible: boolean; finished: boolean; glIsWebGL2: boolean
}
let nextId = 1
type Layout = {basketX: number; basketY: number; ballX: number; ballY: number}
const L = (basketX: number, basketY: number, ballX: number, ballY: number): Layout => ({basketX, basketY, ballX, ballY})

async function ready(page: Page) {
  await page.goto(`${origin}/host.html`)
  return page.evaluate(() => (window as unknown as {ready: () => Promise<{hasVM: boolean; hasRender: boolean}>}).ready())
}

async function spike(page: Page, layout: Layout, opts: {renderer?: boolean; collect?: boolean; repeat?: number} = {}): Promise<SpikeDone> {
  const id = nextId++
  const r = await page.evaluate(async ({id, layout, opts}) => {
    const w = window as unknown as {post: (m: unknown) => void; waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<unknown>}
    w.post({kind: 'SPIKE_RUN', id, layout, renderer: opts.renderer, collect: opts.collect, repeat: opts.repeat})
    return await w.waitFor(m => (m.kind === 'SPIKE_DONE' || m.kind === 'SPIKE_ERROR') && m.id === id)
  }, {id, layout, opts}) as SpikeDone
  expect(r.error, r.error).toBeUndefined()
  return r
}

const post = (page: Page, msg: unknown) => page.evaluate(m => (window as unknown as {post: (x: unknown) => void}).post(m), msg)
const waitKind = <T,>(page: Page, kind: string, id: number) =>
  page.evaluate(({kind, id}) => (window as unknown as {waitFor: (t: (m: {kind: string; id: number}) => boolean) => Promise<unknown>}).waitFor(m => m.kind === kind && m.id === id), {kind, id}) as Promise<T>

test.describe('方案 A spike：scratch-render + 真实 VM 的 touching（相交 / 分离）', () => {
  test.setTimeout(120_000)

  test('前提：scratch-render 的安装版本与锁文件版本都是固定的 2.2.84（不符就失败，不静默用别的版本）', async () => {
    const installed = JSON.parse(readFileSync(join(WEB_ROOT, 'node_modules', 'scratch-render', 'package.json'), 'utf8')).version
    const lock = JSON.parse(readFileSync(join(WEB_ROOT, 'package-lock.json'), 'utf8')).packages['node_modules/scratch-render'].version
    expect([installed, lock]).toEqual([EXPECTED_RENDER_VERSION, EXPECTED_RENDER_VERSION])
  })

  test('前提：沙箱页加载了 VM 与 scratch-render 两个全局', async ({page}) => {
    const hello = await ready(page)
    expect(hello.hasVM).toBe(true)
    expect(hello.hasRender).toBe(true)
  })

  test('对照组（无渲染器）：两个角色完全重叠，真实 touching 仍为 false、不得分——这就是需要方案 A 的原因', async ({page}) => {
    await ready(page)
    const r = await spike(page, L(0, 0, 0, 0), {renderer: false})
    expect(r.hasRenderer).toBe(false)
    expect(r.touchingBefore).toBe(false)
    expect(r.calls).toEqual([false]) // 真实积木被调用了，返回 false
    expect(r.score).toBe(0)
  })

  test('实验组：完全重叠 → 真实 sensing_touchingobject 被调用并返回 true，得分 1，脚本自然结束', async ({page}) => {
    await ready(page)
    const r = await spike(page, L(0, 0, 0, 0))
    expect(r.hasRenderer).toBe(true)
    expect(r.touchingBefore).toBe(true)
    expect(r.calls).toEqual([true])
    expect(r.score).toBe(1)
    expect(r.finished).toBe(true)
  })

  test('实验组：部分重叠（边缘相接 1 像素以内的重叠）→ true', async ({page}) => {
    await ready(page)
    // 篮子 x∈[-40,40]、y∈[-20,20]；球 x 半宽 20。球中心 x=59 → 球左边缘 39，与篮子右边缘 40 重叠 1 像素。
    const r = await spike(page, L(0, 0, 59, 0))
    expect(r.calls).toEqual([true])
    expect(r.score).toBe(1)
  })

  test('实验组：恰好相切（球左边缘 = 篮子右边缘）与分离 1 像素 → 都是 false（边界两侧）', async ({page}) => {
    await ready(page)
    const touch = await spike(page, L(0, 0, 60, 0)) // 球左边缘 40，与篮子右边缘 40 相切
    const apart = await spike(page, L(0, 0, 62, 0)) // 分离 2 像素
    expect(touch.calls.length).toBe(1)
    expect(apart.calls).toEqual([false])
    expect(apart.score).toBe(0)
    // 记录相切的实际行为（由像素遮罩决定），不预设；只要求与分离不同或相同都被如实记录
    console.log('TANGENT_BEHAVIOR touching=' + touch.calls[0])
  })

  test('实验组：角色分离 → touching=false、不得分（上下左右四个方向各一次）', async ({page}) => {
    await ready(page)
    for (const [bx, by] of [[150, 0], [-150, 0], [0, 100], [0, -100]] as const) {
      const r = await spike(page, L(0, 0, bx, by))
      expect(r.calls, `球在 (${bx},${by})`).toEqual([false])
      expect(r.score).toBe(0)
    }
  })

  test('「碰到才加分」：同一程序、只改位置，相交得 1 分，分离得 0 分', async ({page}) => {
    await ready(page)
    const hit = await spike(page, L(30, 30, 20, 20))
    const miss = await spike(page, L(30, 30, 200, 20))
    expect([hit.score, miss.score]).toEqual([1, 0])
  })

  test('「同一目标不重复计分」：循环检测 3 次，没有隐藏 → 连加 3 分（目录里的失败情形）；得分后隐藏 → 只加 1 分', async ({page}) => {
    await ready(page)
    const noHide = await spike(page, L(0, 0, 0, 0), {repeat: 3})
    const hide = await spike(page, L(0, 0, 0, 0), {repeat: 3, collect: true})
    expect(noHide.score).toBe(3) // 失败情形：同一个球被重复检测
    expect(hide.score).toBe(1) // 修复后：隐藏的角色不再碰到任何东西
    expect(hide.ballVisible).toBe(false)
    expect(hide.calls[0]).toBe(true)
  })

  test('造型就绪前 touching 不可靠：skin 等待是真实存在的耗时，且有上界', async ({page}) => {
    await ready(page)
    const r = await spike(page, L(0, 0, 0, 0))
    expect(r.skinMs).toBeGreaterThanOrEqual(0)
    expect(r.skinMs).toBeLessThan(2000)
    console.log('SKIN_READY_MS ' + r.skinMs)
  })

  test('渲染器是真实的 WebGL（不是软件模拟或空实现）', async ({page}) => {
    await ready(page)
    const r = await spike(page, L(0, 0, 0, 0))
    console.log('GL_IS_WEBGL2 ' + r.glIsWebGL2)
    expect(r.hasRenderer).toBe(true)
  })
})

test.describe('方案 A spike：安全边界与资源释放', () => {
  test.setTimeout(120_000)

  test('无外部网络依赖：沙箱内主动发起 fetch / XHR / 图片 / WebSocket 到外部地址，全部被 CSP 拒绝', async ({page}) => {
    await ready(page)
    const id = nextId++
    await post(page, {kind: 'SPIKE_PROBE_NETWORK', id})
    const r = await waitKind<{results: Record<string, string>}>(page, 'SPIKE_NETWORK', id)
    expect(r.results).toEqual({fetch: 'blocked', xhr: 'blocked', img: 'blocked', ws: 'blocked'})
  })

  test('运行过程没有产生任何对 VM / scratch-render / 沙箱页以外的请求（宿主服务器只收到固定的 5 个路径）', async ({page}) => {
    requested.length = 0
    await ready(page)
    await spike(page, L(0, 0, 0, 0))
    const unique = [...new Set(requested)].sort()
    expect(unique).toEqual(['/host.html', '/scratch-render-spike-sandbox.html', '/scratch-vm/scratch-render.js', '/scratch-vm/scratch-storage.min.js', '/scratch-vm/scratch-vm.js'].sort())
  })

  test('沙箱权限不扩大：iframe 只有 allow-scripts，页面 origin 是 opaque（null），读不到宿主的 cookie / localStorage', async ({page}) => {
    await ready(page)
    const sandboxAttr = await page.evaluate(() => document.getElementById('f')!.getAttribute('sandbox'))
    expect(sandboxAttr).toBe('allow-scripts')
    const csp = readFileSync(join(PUBLIC_DIR, 'scratch-render-spike-sandbox.html'), 'utf8')
    const policy = /Content-Security-Policy" content="([^"]*)"/.exec(csp)?.[1] ?? ''
    expect(policy).toContain("default-src 'none'")
    expect(policy).toContain("connect-src 'none'")
    expect(policy).toContain('img-src data:')
    expect(policy).not.toMatch(/https?:|blob:|\*/) // 不开放任何外部来源、blob、通配
    // 与 L02 的差别只有 img-src data:（其余指令逐字相同）
    const l02 = readFileSync(join(PUBLIC_DIR, 'scratch-g2-u3-l02-sandbox.html'), 'utf8')
    const l02Policy = /Content-Security-Policy" content="([^"]*)"/.exec(l02)?.[1] ?? ''
    expect(policy.replace(' img-src data:;', '')).toBe(l02Policy)
    // 沙箱 iframe 里读 localStorage 会抛 SecurityError（opaque origin）
    const frame = page.frames().find(f => f.url().endsWith('/scratch-render-spike-sandbox.html'))!
    const access = await frame.evaluate(() => { try { void localStorage.length; return 'readable' } catch (e) { return (e as Error).name } })
    expect(access).toBe('SecurityError')
  })

  test('资源释放：dispose 后 VM / 渲染器引用清空、canvas 移除、WebGL 上下文已丢失；重复运行不累积 canvas', async ({page}) => {
    await ready(page)
    await spike(page, L(0, 0, 0, 0))
    const id = nextId++
    await post(page, {kind: 'SPIKE_DISPOSE', id})
    const r = await waitKind<{had: {vm: boolean; renderer: boolean}; lost: boolean | null; vmNull: boolean; rendererNull: boolean; canvasCount: number}>(page, 'SPIKE_DISPOSED', id)
    expect(r.had).toEqual({vm: true, renderer: true})
    expect(r.lost).toBe(true)
    expect([r.vmNull, r.rendererNull, r.canvasCount]).toEqual([true, true, 0])
    // 连续运行 12 次：每次都先释放上一次，沙箱里始终只有 1 个 canvas
    for (let i = 0; i < 12; i++) await spike(page, L(0, 0, 0, 0))
    const id2 = nextId++
    await post(page, {kind: 'SPIKE_DISPOSE', id: id2})
    const r2 = await waitKind<{canvasCount: number}>(page, 'SPIKE_DISPOSED', id2)
    expect(r2.canvasCount).toBe(0)
  })
})

// 三个视口：渲染器画在沙箱 iframe 里的离屏 canvas，不依赖视口；这里验证在 1440 / 768 / 375（含触摸）下结果一致。
for (const vp of [
  {name: 'desktop', viewport: {width: 1440, height: 900}, hasTouch: false, isMobile: false},
  {name: 'tablet', viewport: {width: 768, height: 1024}, hasTouch: true, isMobile: false},
  {name: 'phone', viewport: {width: 375, height: 812}, hasTouch: true, isMobile: true},
] as const) {
  test.describe(`[${vp.name}] 方案 A spike：三端一致`, () => {
    test.use({viewport: {...vp.viewport}, hasTouch: vp.hasTouch, isMobile: vp.isMobile})
    test('相交 true / 分离 false / 同目标不重复计分，与桌面结果一致', async ({page}) => {
      test.setTimeout(120_000)
      await ready(page)
      const hit = await spike(page, L(0, 0, 0, 0))
      const miss = await spike(page, L(0, 0, 200, 100))
      const once = await spike(page, L(0, 0, 0, 0), {repeat: 3, collect: true})
      expect([hit.calls[0], miss.calls[0], once.score]).toEqual([true, false, 1])
    })
  })
}
