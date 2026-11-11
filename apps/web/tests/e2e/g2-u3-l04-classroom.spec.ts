// G2-U3-L04《判断碰撞得分》正式页面（共享 LessonWorkspace + 本课适配器与三个槽位）真实浏览器测试。
// 桌面 1440 / 平板 768 / 手机 375，三个视口都在本文件里设置（不依赖 Playwright project 的个数）。
// 页面里的 Scratch VM 是真实的 scratch-vm@5.0.300，碰撞由真实的 scratch-render@2.2.84 在沙箱 iframe 里判定；
// 两个文件都由应用自己的源站提供（/scratch-vm/），不走 CDN。积木由真实 Blockly 工作区编辑（桌面用真实指针拖放），
// 运行走真实 VM 沙箱，判定读 VM 的运行轨迹。
//
// 确定性：球的下落和碰撞是确定的（没有随机数），同一个程序跑多少次都是同一个结果，所以这里可以断言具体的得分。
// 实测值（桌面 Chromium，球速 10）：球第一次碰到篮子是第 21 帧，连续碰 8 帧；球速 5 时第一次碰到是第 41 帧。
import {readFileSync} from 'node:fs'
import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test'

const URL = '/learn/g2-u3-l04'
const DRAFT_KEY = 'kidscoding-draft:G2-U3-L04'

// 本地沙箱的浏览器没有中文字体，汉字会渲染成空白，宽度也不对（溢出检查会失真）。
// 设置 L02_CJK_FONT_FILE 指向一个 woff2 中文字体即可注入；CI 的 Chrome 自带中文字体，不需要设置。
async function injectCjkFont(page: Page) {
  const file = process.env.L02_CJK_FONT_FILE
  if (!file) return
  const font = readFileSync(file)
  await page.route('**/__cjk-font.woff2', route => route.fulfill({body: font, contentType: 'font/woff2'}))
  await page.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent = "@font-face{font-family:KcCjk;src:url(/__cjk-font.woff2) format('woff2')} body,body *,svg text{font-family:KcCjk,sans-serif !important}"
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style))
  })
}

async function open(page: Page, opts: {fresh?: boolean} = {}) {
  await injectCjkFont(page)
  if (opts.fresh !== false) await page.addInitScript(() => { if (!sessionStorage.getItem('l4-keep')) localStorage.removeItem('kidscoding-draft:G2-U3-L04') })
  await page.goto(URL)
  await expect(page.getByTestId('l4-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
}

const VIEWPORTS = [
  {name: 'desktop', viewport: {width: 1440, height: 900}, hasTouch: false, isMobile: false},
  {name: 'tablet', viewport: {width: 768, height: 1024}, hasTouch: true, isMobile: false},
  {name: 'phone', viewport: {width: 375, height: 812}, hasTouch: true, isMobile: true},
] as const
type ViewportName = (typeof VIEWPORTS)[number]['name']
const vpOf = (info: TestInfo): ViewportName => {
  const hit = VIEWPORTS.find(v => info.titlePath.some(t => t === `[${v.name}]`))
  if (!hit) throw new Error('用例不在任何视口分组里')
  return hit.name
}
const isPhone = (info: TestInfo) => vpOf(info) === 'phone'

/** 任务内容在编辑槽位里：手机上默认折叠成一行任务栏，要读或填就先展开。 */
async function openTask(page: Page, info: TestInfo) {
  if (isPhone(info) && !(await page.getByTestId('l4-task-fold-body').isVisible())) await page.getByTestId('l4-task-toggle').click()
  await expect(page.getByTestId('l4-task-content')).toBeVisible()
}

/** 共享壳的运行按钮：手机在脚本区上方有粘性运行行，其余视口用舞台下方的运行条。 */
function runButton(page: Page, info: TestInfo, where: 'stage' | 'script') {
  return page.getByTestId(where === 'script' && isPhone(info) ? 'ws-sticky-run' : 'ws-run-toggle')
}

async function showRoles(page: Page, info: TestInfo) {
  if (isPhone(info) && !(await page.getByTestId('l4-role-ball').isVisible())) await page.getByTestId('ws-roles-toggle').click()
}

async function goLevel(page: Page, level: string) {
  await page.getByTestId(`l4-level-${level}`).click()
  await expect(page.getByTestId(`l4-level-${level}`)).toHaveAttribute('aria-current', 'step')
}

type BlockKind = 'flag' | 'repeat' | 'iftouch' | 'score' | 'hide'
async function addByClick(page: Page, type: BlockKind) {
  if (!(await page.getByTestId('l4-palette').isVisible())) await page.getByTestId('l4-add-block').click()
  await page.getByTestId(`l4-add-${type}`).click()
}

/** 唯一的数字框：选中“重复执行”时是重复次数，选中“将 得分 增加”时是加几分。 */
async function setNumber(page: Page, value: number) {
  const box = page.getByTestId('l4-number')
  await expect(box).toBeEnabled()
  await box.fill(String(value))
}

/**
 * 搭标准做法：绿旗 → 重复 times 次 → 如果〈碰到 篮子？〉→ 将 得分 增加 by →（隐藏）。
 * 全部通过抽屉点击和数字框完成；每次新加的积木都被选中，下一块会放进它里面或接在它后面。
 */
async function buildProgram(page: Page, o: {times: number; by?: number; hide?: boolean; withIf?: boolean}) {
  await addByClick(page, 'flag')
  await addByClick(page, 'repeat')
  await setNumber(page, o.times)
  if (o.withIf !== false) await addByClick(page, 'iftouch')
  await addByClick(page, 'score')
  await setNumber(page, o.by ?? 1)
  if (o.hide !== false) await addByClick(page, 'hide')
}

async function runAndWait(page: Page, info: TestInfo, where: 'stage' | 'script' = 'script') {
  await runButton(page, info, where).click()
  await expect(page.getByTestId('ws-feedback-conclusion').or(page.getByTestId('l4-not-judged'))).toBeVisible({timeout: 30_000})
}

/**
 * 壳只显示每层的文字，不在 DOM 上暴露 passed 属性。所以“这一层通过 / 没通过”断言课程判定写出的那句话（judge.ts 的固定措辞），
 * 并同时断言另一种说法不存在。
 */
const LAYER_TEXT = {
  stage: {pass: /正好是本关要求的/, fail: /本关要求是/},
  task: {pass: /本次任务达标/, fail: /本次任务未达标/},
  knowledge: {pass: /本次程序满足判断要求/, fail: /没有满足判断要求|没有用到判断/},
} as const
async function expectLayer(page: Page, id: keyof typeof LAYER_TEXT, passed: boolean) {
  const row = page.getByTestId(`ws-feedback-${id}`)
  await expect(row).toBeVisible()
  await expect(row).toContainText(passed ? LAYER_TEXT[id].pass : LAYER_TEXT[id].fail)
  await expect(row).not.toContainText(passed ? LAYER_TEXT[id].fail : LAYER_TEXT[id].pass)
}
async function expectConclusion(page: Page, passed: boolean) {
  const c = page.getByTestId('ws-feedback-conclusion')
  await expect(c).toBeVisible()
  await expect(c).toContainText(passed ? /任务达标，也满足了判断要求/ : /还没达到要求/)
  await expect(c).not.toContainText(passed ? /还没达到要求/ : /任务达标，也满足了判断要求/)
}
async function expectResultCleared(page: Page) {
  await expect(page.getByTestId('ws-judgment-stale')).toBeVisible()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, '页面不应出现横向溢出').toBeLessThanOrEqual(1)
}

const programAttr = async (page: Page) => (await page.getByTestId('l4-script-host').getAttribute('data-program'))!
const programOf = async (page: Page) => JSON.parse(await programAttr(page))
const draftKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kidscoding-draft')))
/** 数字框改完后，工作区同步到程序要一点时间：轮询到期望的结构再往下。 */
const expectProgram = (page: Page, expected: unknown) => expect.poll(() => programOf(page)).toEqual(expected)

type P = {t: string; [k: string]: unknown}
const score = (by: number): P => ({t: 'score', by})
const hide: P = {t: 'hide'}
const iftouch = (...body: P[]): P => ({t: 'iftouch', body})
const repeat = (times: number, ...body: P[]): P => ({t: 'repeat', times, body})
const flag = (...body: P[]) => ({scripts: [{hat: 'flag', body}]})
/** 标准做法：重复 times 次 { 如果 碰到篮子 { 得分 +by; 隐藏 } } */
const standard = (times = 30, by = 1) => flag(repeat(times, iftouch(score(by), hide)))

const stage = (page: Page) => page.getByTestId('l4-stage')

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}]`, () => {
    test.use({viewport: {...vp.viewport}, hasTouch: vp.hasTouch, isMobile: vp.isMobile})

    test.describe('G2-U3-L04 课堂：三端真实操作', () => {
      test.setTimeout(150_000)

      test('首屏五要素与任务：本课名称、学什么、解决什么、学完能做什么、与上节课联系、当前步骤', async ({page}, info) => {
        await open(page)
        await expect(page.getByTestId('ws-topbar')).toContainText('判断碰撞得分')
        await expect(page.getByTestId('ws-goal-current')).toContainText('今天学')
        await page.getByTestId('ws-goal-expand').click()
        const goals = page.getByTestId('ws-goal5')
        await expect(goals).toContainText('今天学')
        await expect(goals).toContainText('要解决的问题')
        await expect(goals).toContainText('学完你能')
        await expect(goals).toContainText('上节课')
        await expect(goals).toContainText('现在要做')
        if (isPhone(info)) await expect(page.getByTestId('l4-task-bar-text')).toContainText('先写下你的预测')
        await openTask(page, info)
        await expect(page.getByTestId('l4-task-content')).toContainText('先猜一猜')
        await expect(page.getByTestId('l4-task-content')).toContainText('现在要做')
        await noHorizontalOverflow(page)
      })

      test('Scratch VM 与渲染器从本站自托管：CDN 不可达时照样能运行，没有任何请求发往站外，且页面真的加载了 scratch-render', async ({page}, info) => {
        const cdn: string[] = []
        const requested: string[] = []
        const csp: string[] = []
        await page.route('https://cdn.jsdelivr.net/**', route => { cdn.push(route.request().url()); return route.abort() })
        page.on('request', r => requested.push(r.url()))
        page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()) })
        await open(page)
        const origin = new globalThis.URL(page.url()).origin
        await openTask(page, info)
        await page.getByTestId('l4-pred-score').fill('8')
        await page.getByTestId('l4-pred-blue-no').check()
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await expect(stage(page)).toHaveAttribute('data-score', '8') // 分数是真实 VM 里的变量，真实渲染器判出的碰撞
        expect(cdn).toEqual([])
        const outside = requested.filter(u => !/^(data|blob|about):/.test(u) && !u.startsWith(origin))
        expect(outside, '所有请求都发往本站（含 data:/blob:）').toEqual([])
        expect(requested.some(u => u.startsWith(`${origin}/scratch-vm/scratch-render.js`)), '沙箱真的从本站加载了 scratch-render.js').toBe(true)
        expect(requested.some(u => u.startsWith(`${origin}/scratch-vm/scratch-vm.js`))).toBe(true)
        // 已知且不放宽 CSP 的噪音：scratch-render 自带的字体渲染尝试加载 data 之外的字体，被 font-src 拦下；除此之外不应有任何 CSP 违规
        const unexpected = csp.filter(t => !/font-src/.test(t))
        expect(unexpected, `只允许 font-src 噪音，其余 CSP 违规一律失败：${csp.join(' | ')}`).toEqual([])
        test.info().annotations.push({type: 'csp-console', description: `font-src 噪音 ${csp.length} 条`})
      })

      test('prebuild 清理之后 /scratch-vm/ 里仍有三份固定版本资源（构建没有把 scratch-render 删掉）', async ({page}) => {
        await open(page)
        const sizes: Record<string, number> = {}
        for (const f of ['scratch-vm.js', 'scratch-storage.min.js', 'scratch-render.js']) {
          const r = await page.request.get(`/scratch-vm/${f}`)
          expect(r.status(), f).toBe(200)
          sizes[f] = (await r.body()).length
        }
        expect(sizes['scratch-vm.js']).toBeGreaterThan(7_000_000)
        expect(sizes['scratch-storage.min.js']).toBeGreaterThan(50_000)
        expect(sizes['scratch-render.js']).toBeGreaterThan(3_000_000)
      })

      test('舞台整幅都看得见：壳给的舞台框不裁掉舞台，篮子、两个球、得分与要求说明都在框里；三档缩放、运行前后都一样', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        // 不隐藏：运行之后三个角色都还看得见（要量的就是它们都在框里）
        await buildProgram(page, {times: 30, hide: false})
        const measure = () => page.evaluate(() => {
          const rect = (e: Element) => e.getBoundingClientRect()
          const box = rect(document.querySelector('[data-testid="ws-stage-box"]')!)
          const st = rect(document.querySelector('[data-testid="l4-stage"]')!)
          const ids = ['l4-stage-basket', 'l4-stage-ground-ball', 'l4-stage-hit-ball', 'l4-stage-score', 'l4-situation']
          const items = ids.map(id => document.querySelector(`[data-testid="${id}"]`)).filter((e): e is Element => !!e).map(rect)
          const inside = (r: DOMRect, o: DOMRect) => r.left >= o.left - 1 && r.right <= o.right + 1 && r.top >= o.top - 1 && r.bottom <= o.bottom + 1
          return {
            stageInBox: inside(st, box),
            ratio: Math.round((st.width / st.height) * 100) / 100,
            itemsInBox: items.every(r => inside(r, box)),
            itemsInStage: items.every(r => inside(r, st)),
            count: items.length,
          }
        })
        const zooms = [['缩小', 'ws-zoom-small'], ['正常', 'ws-zoom-medium'], ['放大', 'ws-zoom-large']] as const
        for (const phase of ['运行前', '运行后'] as const) {
          if (phase === '运行后') {
            await runButton(page, info, 'stage').click()
            await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
            await expect(stage(page)).toHaveAttribute('data-score', '8')
            await expect(stage(page)).toHaveAttribute('data-hit-visible', 'true') // 没有隐藏，红球还在
          }
          for (const [zoom, id] of zooms) {
            await page.getByTestId(id).click()
            // 一次 evaluate 里量完框、舞台和所有元素（缩放后布局会变化，分次量会拿到不同时刻的数）；轮询到布局稳定
            await expect.poll(measure, {message: `${phase}·${zoom}：整幅舞台和所有元素都在壳的舞台框里，比例 4:3`})
              .toEqual({stageInBox: true, ratio: 1.33, itemsInBox: true, itemsInStage: true, count: 5})
          }
        }
        // 球落在地面上：两个球最后的球心都是 -160（球整个在舞台里，不被舞台下沿切掉）
        await expect(stage(page)).toHaveAttribute('data-ground-y', '-160')
        await expect(stage(page)).toHaveAttribute('data-hit-y', '-160')
      })

      test('完整答案不在开始操作前出现；提示按 1→2→3 逐级揭示', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await openTask(page, info)
        await expect(page.getByTestId('l4-hint-1')).toHaveCount(0)
        await expect(page.getByTestId('l4-after')).toHaveCount(0)
        await expect(page.getByTestId('l4-alternatives')).toHaveCount(0)
        await expect(page.getByTestId('l4-own-solution')).toHaveCount(0)
        await page.getByTestId('l4-next-hint').click()
        await expect(page.getByTestId('l4-hint-1')).toBeVisible()
        await expect(page.getByTestId('l4-hint-2')).toHaveCount(0)
        await page.getByTestId('l4-next-hint').click()
        await expect(page.getByTestId('l4-hint-2')).toBeVisible()
        await expect(page.getByTestId('l4-hint-3')).toHaveCount(0)
        await page.getByTestId('l4-next-hint').click()
        await expect(page.getByTestId('l4-hint-3')).toBeVisible()
        // 任务与提示里不直接给出能抄的完整程序（不出现具体的重复次数 + 将得分增加的组合答案）
        const all = await page.getByTestId('l4-task-content').innerText()
        expect(all).not.toMatch(/重复执行\s*(2[0-9]|3[0-9])\s*次\s*[{｛]/)
        expect(all).not.toMatch(/重复\s*21\s*次/)
      })

      test('第一层：不写预测不能运行；预测后运行固定程序，红球连续加分、蓝球不加分，并与预测对照；重复运行结果相同', async ({page}, info) => {
        await open(page)
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-run-error')).toContainText('预测')
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(runButton(page, info, 'stage')).toHaveText('运行作品')
        // 球在起点：都在舞台上方（y=150）
        await expect(stage(page)).toHaveAttribute('data-hit-y', '150')
        await expect(stage(page)).toHaveAttribute('data-ground-y', '150')
        await openTask(page, info)
        await page.getByTestId('l4-pred-score').fill('1')
        await page.getByTestId('l4-pred-blue-no').check()
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-feedback-stage')).toBeVisible({timeout: 30_000})
        // 固定程序没有“隐藏”：红球在篮子里停留的 8 帧每一帧都碰到，得 8 分；蓝球落在地上，一分都没有
        await expect(stage(page)).toHaveAttribute('data-score', '8')
        await expect(stage(page)).toHaveAttribute('data-hit-visible', 'true')
        await expect(stage(page)).toHaveAttribute('data-ground-visible', 'true')
        await expect(page.getByTestId('l4-stage-score')).toHaveText('得分 8')
        await expect(page.getByTestId('l4-pred-compare')).toContainText('你预测红球最后得分是 1')
        await expect(page.getByTestId('l4-pred-compare')).toContainText('蓝球不会加分')
        await expect(page.getByTestId('l4-pred-compare')).toContainText('红球被加了 8 次分，最后得分是 8，蓝球被加了 0 次分')
        // 第一关是观察，不下“达标”结论；三层仍如实显示（舞台、任务都没到本关要求，因为红球被重复加分）
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('这一关是观察')
        await expect(page.getByTestId('ws-feedback-conclusion')).not.toContainText('任务达标')
        await expectLayer(page, 'stage', false)
        await expectLayer(page, 'task', false)
        await expect(page.getByTestId('ws-feedback-task')).toContainText('红球被加了 8 次分')
        // 再运行一次：同一个结果（没有随机数，也没有叠加）
        await runButton(page, info, 'stage').click()
        await expect(stage(page)).toHaveAttribute('data-score', '8')
        await expect(page.getByTestId('l4-pred-compare')).toContainText('红球被加了 8 次分')
      })

      test('第一关的程序是只读的演示：能看到搭好的脚本，没有编辑工具栏', async ({page}) => {
        await open(page)
        await expect(page.getByTestId('l4-readonly-note')).toBeVisible()
        await expect(page.getByTestId('l4-toolbar')).toHaveCount(0)
        await expect(page.getByTestId('l4-palette')).toHaveCount(0)
        // 演示程序：重复 40 次 { 如果 碰到篮子 { 得分 +1 } }，故意没有隐藏
        expect(await programOf(page)).toEqual(flag(repeat(40, iftouch(score(1)))))
      })

      test('第二层：空脚本 / 只有绿旗 / 没有“如果”/ 次数不够 / 没有“隐藏”都不能判通过；标准做法三层全部通过；改脚本后结果立即清除', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await runAndWait(page, info)
        await expectLayer(page, 'task', false)
        await expectLayer(page, 'knowledge', false)
        await expectConclusion(page, false)
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await addByClick(page, 'flag')
        await expectResultCleared(page)
        await runAndWait(page, info)
        await expectConclusion(page, false)
        // 没有“如果”：重复里直接加分，两个球都被加分（蓝球没碰到篮子也得分）：任务不通过、知识证据不通过
        await addByClick(page, 'repeat')
        await setNumber(page, 5)
        await addByClick(page, 'score')
        await runAndWait(page, info)
        await expectLayer(page, 'stage', false)
        await expectLayer(page, 'task', false)
        await expect(page.getByTestId('ws-feedback-task')).toContainText('蓝球也被加了')
        await expectLayer(page, 'knowledge', false)
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('没有用到判断')
        await expectConclusion(page, false)
        // 有“如果”但没有“隐藏”：红球在篮子里的每一帧都会再被检查到，被加 8 次分：舞台和任务不通过，但“如果”确实在把关，知识证据通过
        await addByClick(page, 'hide') // 先加一块再删：验证删除；选中的是刚加的“隐藏”
        await page.getByTestId('l4-delete').click()
        await expectResultCleared(page)
        await expect(page.getByTestId('l4-delete')).toBeDisabled() // 删除后没有选中
        // 重来：整关清空后搭“没有隐藏”的做法
        await openTask(page, info)
        await page.getByTestId('l4-reset-level').click()
        await buildProgram(page, {times: 30, hide: false})
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '8')
        await expectLayer(page, 'stage', false)
        await expectLayer(page, 'task', false)
        await expect(page.getByTestId('ws-feedback-task')).toContainText('红球被加了 8 次分')
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, false)
        // 补上“隐藏”（选中的是“将 得分 增加”，新块接在它后面，仍在“如果”里面）：三层通过
        await addByClick(page, 'hide')
        await expectResultCleared(page)
        await expectProgram(page, standard())
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '1')
        await expect(stage(page)).toHaveAttribute('data-hit-visible', 'false') // 红球加分后消失了
        await expect(stage(page)).toHaveAttribute('data-ground-visible', 'true')
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'task', true)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('舞台结果：')
        await expect(page.getByTestId('ws-feedback-task')).toContainText('任务结果：本次任务达标')
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('知识证据：本次程序满足判断要求')
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('需要进一步解释或练习')
        await expect(page.getByTestId('ws-feedback')).not.toContainText(/已(经)?掌握|学会了/)
        await expect(page.getByTestId('l4-level-solve')).toHaveAttribute('data-done', 'true')
        // 通过后才出现“你的做法 / 别的做法”
        await openTask(page, info)
        await expect(page.getByTestId('l4-own-solution')).toContainText('重复执行 30 次')
        await expect(page.getByTestId('l4-own-solution')).toContainText('将 得分 增加 1')
        await expect(page.getByTestId('l4-alternatives')).toBeVisible()
        // 再改脚本（选中的是“隐藏”，删掉它）：这一关不再算通过
        await page.getByTestId('l4-delete').click()
        await expect(page.getByTestId('l4-level-solve')).toHaveAttribute('data-done', 'false')
      })

      test('重复次数不够：重复 20 次，检查结束时球还没落到篮子上，得 0 分；重复 21 次刚好够（第 21 帧球第一次碰到篮子）', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildProgram(page, {times: 20})
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await expectLayer(page, 'stage', false)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('最终得分是 0 分')
        await expectLayer(page, 'task', false)
        await expect(page.getByTestId('ws-feedback-task')).toContainText('一次分都没有加')
        await expectLayer(page, 'knowledge', false)
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('检查的次数可能不够')
        await expectConclusion(page, false)
        // 选中“重复执行”，把次数改成 21：刚好在第一次碰到篮子的那一帧检查到
        await page.locator('.blocklyWorkspace > .blocklyBlockCanvas text.blocklyText', {hasText: '重复执行'}).first().click()
        await setNumber(page, 21)
        await expectResultCleared(page)
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '1')
        await expectConclusion(page, true)
      })

      test('舞台读 VM 状态：两个球真的落下来（起点 150 → 地面 -160）；加分的红球消失、蓝球留在地上；重跑从头开始，分数不叠加', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildProgram(page, {times: 30})
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await expect(stage(page)).toHaveAttribute('data-hit-y', '150')
        await expect(stage(page)).toHaveAttribute('data-ground-y', '150')
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await expect(stage(page)).toHaveAttribute('data-score', '1')
        await expect(stage(page)).toHaveAttribute('data-ground-y', '-160')
        await expect(stage(page)).toHaveAttribute('data-ground-visible', 'true')
        await expect(stage(page)).toHaveAttribute('data-hit-visible', 'false')
        await expect(page.getByTestId('l4-stage-ground-ball')).toBeVisible()
        await expect(page.getByTestId('l4-stage-hit-ball')).toHaveCount(0)
        await expectConclusion(page, true)
        await runButton(page, info, 'stage').click()
        await expectConclusion(page, true)
        await expect(stage(page)).toHaveAttribute('data-score', '1') // 重跑从 0 开始，不是 1+1
        await expect(page.getByTestId('l4-stage-score')).toHaveText('得分 1')
      })

      test('保存与刷新恢复：脚本、关卡、预测都在；通过状态需要重新运行；草稿里没有运行结果', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildProgram(page, {times: 30})
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
        const before = await programAttr(page)
        await page.evaluate(() => sessionStorage.setItem('l4-keep', '1'))
        await page.reload()
        await expect(page.getByTestId('l4-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('l4-level-solve')).toHaveAttribute('aria-current', 'step')
        await expect(page.getByTestId('ws-save-message')).toContainText('已恢复')
        expect(await programAttr(page)).toBe(before)
        await expect(page.getByTestId('l4-level-solve')).toHaveAttribute('data-done', 'false') // 旧通过不被信任
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(page.getByTestId('ws-feedback')).toContainText('暂无检查结果')
        await expect(stage(page)).toHaveAttribute('data-score', '0') // 舞台回到起点，不显示上次的分数
        await runAndWait(page, info)
        await expectConclusion(page, true)
        const stored = await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY)
        expect(stored).toContain('"lessonId":"G2-U3-L04"')
        expect(stored).not.toMatch(/scores|checks|passedAt|finalScore|trace/)
      })

      test('保存失败必须显示“未能保存”，不显示“已保存”', async ({page}) => {
        await page.addInitScript(() => {
          Storage.prototype.setItem = () => { throw new Error('quota') }
        })
        await open(page)
        await goLevel(page, 'solve')
        await addByClick(page, 'flag')
        await expect(page.getByTestId('ws-save-chip')).toContainText('未能保存', {timeout: 15_000})
        await expect(page.getByTestId('ws-save-chip')).not.toContainText('已保存')
      })

      test('第三层迁移 A：每个球 2 分——照抄上一关（加 1 分）不过，改成 2 分才通过；不用“如果”总分碰巧是 2 但任务仍不通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'transferPoints')
        await expect(page.getByTestId('l4-situation')).toContainText('加 2 分')
        // 照抄上一关：每个球加 1 分
        await buildProgram(page, {times: 30, by: 1})
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '1')
        await expectLayer(page, 'stage', false)
        await expectLayer(page, 'task', false)
        await expect(page.getByTestId('ws-feedback-task')).toContainText('红球这一次加了 1 分，本关要求每个球加 2 分')
        await expectConclusion(page, false)
        // 选中“将 得分 增加”，改成 2
        await page.locator('.blocklyWorkspace > .blocklyBlockCanvas text.blocklyText', {hasText: '将 得分 增加'}).first().click()
        await setNumber(page, 2)
        await expectResultCleared(page)
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '2')
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'task', true)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
        // 总分碰巧对：不用“如果”，重复 1 次、每球加 2 分 → 红球 2 + 蓝球 2 = 4；用重复 1 次、加 1 分 → 总分 2（舞台通过），但每个球只加了 1 分、蓝球也加了分
        await openTask(page, info)
        await page.getByTestId('l4-reset-level').click()
        await buildProgram(page, {times: 1, by: 1, withIf: false, hide: false})
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '2')
        await expectLayer(page, 'stage', true) // 总分碰巧等于要求
        await expectLayer(page, 'task', false) // 逐球核算抓出问题：蓝球也加了分，红球只加了 1 分
        await expect(page.getByTestId('ws-feedback-task')).toContainText('蓝球也被加了')
        await expectLayer(page, 'knowledge', false)
        await expectConclusion(page, false)
      })

      test('第三层迁移 B：球落得更慢——照抄上一关的重复 30 次得 0 分（球第 41 帧才碰到篮子），把次数改到 50 才通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'transferSlow')
        await expect(page.getByTestId('l4-situation')).toContainText('加 1 分')
        await openTask(page, info)
        await expect(page.getByTestId('l4-task-content')).toContainText('球落得更慢')
        await buildProgram(page, {times: 30})
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await expectLayer(page, 'task', false)
        await expectConclusion(page, false)
        // 重复 40 次也不够（第 41 帧才第一次碰到）
        await page.locator('.blocklyWorkspace > .blocklyBlockCanvas text.blocklyText', {hasText: '重复执行'}).first().click()
        await setNumber(page, 40)
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await setNumber(page, 50)
        await expectResultCleared(page)
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '1')
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'task', true)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
        // 慢球 62 帧落地：整个球仍在舞台里
        await expect(stage(page)).toHaveAttribute('data-ground-y', '-160')
      })

      test('关卡与课程切换不污染：切关清掉结果；每关脚本独立；返回后原脚本还在', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildProgram(page, {times: 30})
        await runAndWait(page, info)
        await expectConclusion(page, true)
        await goLevel(page, 'transferPoints')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(page.getByTestId('l4-situation')).toContainText('加 2 分')
        await expect(page.getByTestId('l4-level-transferPoints')).toHaveAttribute('data-done', 'false')
        expect(await programOf(page)).toEqual({scripts: []})
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await goLevel(page, 'solve')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        expect(await programOf(page)).toEqual(standard())
        await runAndWait(page, info)
        await expectConclusion(page, true)
      })

      test('运行中停止：不判定、脚本保留；停止后重跑结果通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildProgram(page, {times: 100}) // 100 圈，每圈一帧，留出点“停止”的时间
        const run = runButton(page, info, 'script')
        await run.click()
        await expect(run).toHaveText('停止')
        await run.click()
        await expect(page.getByTestId('l4-not-judged')).toBeVisible({timeout: 30_000})
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(run).toHaveText('运行作品')
        await expect(page.getByTestId('l4-level-solve')).toHaveAttribute('data-done', 'false')
        await runAndWait(page, info) // 脚本还在：100 次也满足“至少 21 次”
        await expectConclusion(page, true)
      })

      test('文件菜单：保存、导出、导入、重新开始本关；导入错课节作品被拒绝', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildProgram(page, {times: 30})
        await page.getByTestId('ws-file-menu-button').click()
        await expect(page.getByTestId('ws-file-new')).toHaveCount(0)
        await page.getByTestId('ws-file-save').click()
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存')
        await expect(page.getByTestId('ws-file-menu')).toHaveCount(0)
        await page.getByTestId('ws-file-menu-button').click()
        const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('ws-file-export').click()])
        expect(download.suggestedFilename()).toContain('G2-U3-L04')
        await expect(page.getByTestId('ws-file-menu')).toHaveCount(0)
        await openTask(page, info)
        await page.getByTestId('l4-reset-level').click()
        await runAndWait(page, info)
        await expectConclusion(page, false) // 清空后是空程序
        await page.getByTestId('ws-file-input').setInputFiles({name: 'wrong.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({lessonId: 'G2-U3-L03', script: {}}))})
        await expect(page.getByTestId('l4-import-error')).toContainText('不是“判断碰撞得分”')
        const path = await download.path()
        await page.getByTestId('ws-file-input').setInputFiles(path)
        await expect(page.getByTestId('l4-import-error')).toHaveCount(0)
        await runAndWait(page, info)
        await expectConclusion(page, true)
        await page.getByTestId('ws-file-menu-button').click()
        await page.getByTestId('ws-file-reset').click()
        await expect(page.getByTestId('l4-level-explore')).toHaveAttribute('aria-current', 'step')
        await goLevel(page, 'solve')
        await expect.poll(async () => (await programAttr(page))).toBe(JSON.stringify({scripts: []}))
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
      })

      test('角色管理：篮子和背景没有脚本；回到球之后脚本还在', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildProgram(page, {times: 30})
        await showRoles(page, info)
        await page.getByTestId('l4-role-backdrop').click()
        await expect(page.getByTestId('l4-backdrop-note')).toBeVisible()
        await expect(page.getByTestId('l4-toolbar')).toHaveCount(0)
        await page.getByTestId('l4-role-basket').click()
        await expect(page.getByTestId('l4-basket-note')).toBeVisible()
        await expect(page.getByTestId('l4-toolbar')).toHaveCount(0)
        await page.getByTestId('l4-role-ball').click()
        await expect(page.getByTestId('l4-toolbar')).toBeVisible()
        await expectProgram(page, standard())
        await runAndWait(page, info)
        await expectConclusion(page, true)
      })

      test('没有严重溢出、按钮不被遮挡、运行按钮在视口内可点', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await noHorizontalOverflow(page)
        const run: Locator = runButton(page, info, 'script')
        await run.scrollIntoViewIfNeeded()
        const box = await run.boundingBox()
        const vp = page.viewportSize()!
        expect(box).not.toBeNull()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1)
        expect(box!.height).toBeGreaterThanOrEqual(36)
        const hit = await page.evaluate(({x, y}) => {
          const el = document.elementFromPoint(x, y)
          return el?.closest('[data-testid]')?.getAttribute('data-testid') ?? el?.tagName
        }, {x: box!.x + box!.width / 2, y: box!.y + box!.height / 2})
        expect(hit, '运行按钮中心点不应被别的元素遮挡').toMatch(/^ws-(run-toggle|sticky-run)/)
        await info.attach(`${vpOf(info)}-script.png`, {body: await page.screenshot(), contentType: 'image/png'})
      })

      test('手机：工具栏的添加 / 上移 / 下移 / 删除 / 数字框都在首屏、可点、可改（Gap A）；任务折叠成一行但任务、提示、预测一个不少', async ({page}, info) => {
        test.skip(!isPhone(info), '首屏编辑区是手机布局裁定，只在手机视口验证')
        await open(page)
        await goLevel(page, 'solve')
        const vh = page.viewportSize()!.height
        const NAV = 62 // 全局底部导航固定在视口底部
        for (const id of ['l4-add-block', 'l4-move-up', 'l4-move-down', 'l4-delete', 'l4-number']) {
          const b = (await page.getByTestId(id).boundingBox())!
          expect(b.y, `${id} 在首屏`).toBeGreaterThanOrEqual(0)
          expect(b.y + b.height, `${id} 不被底部导航遮住`).toBeLessThanOrEqual(vh - NAV)
          expect(b.height, `${id} 触控高度`).toBeGreaterThanOrEqual(36)
          expect(b.x + b.width, `${id} 不超出屏幕宽度`).toBeLessThanOrEqual(375)
        }
        const host = (await page.getByTestId('l4-script-host').boundingBox())!
        const visible = Math.min(host.y + host.height, vh - NAV) - Math.max(host.y, 0)
        expect(visible, '编辑区在首屏的可见高度').toBeGreaterThanOrEqual(120)
        const bar = (await page.getByTestId('l4-task-bar').boundingBox())!
        expect(bar.height).toBeLessThanOrEqual(56)
        await expect(page.getByTestId('l4-task-bar-text')).toContainText('现在要做')
        await expect(page.getByTestId('l4-task-fold-body')).toBeHidden()
        // 只用手机上的工具栏（不碰 Blockly 工作区里的数字框）搭出并改完程序
        await buildProgram(page, {times: 30, by: 3, hide: false})
        await expectProgram(page, flag(repeat(30, iftouch(score(3)))))
        await runAndWait(page, info)
        await expect(stage(page)).toHaveAttribute('data-score', '24') // 球在篮子里 8 帧，每次加 3
        // 运行之后舞台上的篮子和两个球都在手机视口里看得见（不是只存在于 DOM）
        await page.getByTestId('l4-stage').scrollIntoViewIfNeeded()
        const vp = page.viewportSize()!
        for (const id of ['l4-stage-basket', 'l4-stage-hit-ball', 'l4-stage-ground-ball']) {
          const b = (await page.getByTestId(id).boundingBox())!
          expect(b.width, id).toBeGreaterThan(0)
          expect(b.x, id).toBeGreaterThanOrEqual(0)
          expect(b.x + b.width, id).toBeLessThanOrEqual(vp.width)
        }
        if (process.env.L04_SHOT_DIR) {
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.screenshot({path: `${process.env.L04_SHOT_DIR}/phone-4-solve-first-screen.png`})
        }
        await openTask(page, info)
        await expect(page.getByTestId('l4-next-hint')).toBeVisible()
        await page.getByTestId('l4-task-toggle').click()
        await expect(page.getByTestId('l4-task-fold-body')).toBeHidden()
        await goLevel(page, 'explore')
        await expect(page.getByTestId('l4-task-bar-text')).toHaveAttribute('data-needs-prediction', 'true')
        await expect(page.getByTestId('l4-task-toggle')).toHaveText('写预测')
        await openTask(page, info)
        await expect(page.getByTestId('l4-pred-score')).toBeVisible()
        await expect(page.getByTestId('l4-pred-blue-yes')).toBeVisible()
        await noHorizontalOverflow(page)
      })

      test('数字框：选中重复时是次数、选中得分时是分数，选中“如果”“隐藏”“绿旗”时是灰的；改数字框立即改工作区', async ({page}) => {
        await open(page)
        await goLevel(page, 'solve')
        await addByClick(page, 'flag')
        await expect(page.getByTestId('l4-number')).toBeDisabled()
        await addByClick(page, 'repeat')
        await expect(page.getByTestId('l4-number')).toBeEnabled()
        await expect(page.getByTestId('l4-number')).toHaveValue('30') // 新“重复执行”的默认次数
        await addByClick(page, 'iftouch')
        await expect(page.getByTestId('l4-number')).toBeDisabled()
        await addByClick(page, 'score')
        await expect(page.getByTestId('l4-number')).toBeEnabled()
        await expect(page.getByTestId('l4-number')).toHaveValue('1') // 新“将 得分 增加”的默认分数
        await setNumber(page, 7)
        await expectProgram(page, flag(repeat(30, iftouch(score(7)))))
        await addByClick(page, 'hide')
        await expect(page.getByTestId('l4-number')).toBeDisabled()
        // 越界的数字：积木上限 9，超出的值被 Blockly 钳到范围内，程序始终合法
        await page.locator('.blocklyWorkspace > .blocklyBlockCanvas text.blocklyText', {hasText: '将 得分 增加'}).first().click()
        await setNumber(page, 50)
        await expect.poll(async () => (await programOf(page)).scripts[0].body[0].body[0].body[0].by).toBeLessThanOrEqual(9)
      })
    })

    test.describe('G2-U3-L04 课堂：三端证据截图', () => {
      test.setTimeout(150_000)
      test('通过状态与失败状态截图', async ({page}, info) => {
        const dir = process.env.L04_SHOT_DIR
        test.skip(!dir, '未设置 L04_SHOT_DIR')
        const shot = (name: string) => page.screenshot({path: `${dir}/${vpOf(info)}-${name}.png`, fullPage: true})
        await open(page)
        await shot('1-first-visit')
        await openTask(page, info)
        await page.getByTestId('l4-pred-score').fill('1')
        await page.getByTestId('l4-pred-blue-no').check()
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await shot('2-explore-demo')
        await goLevel(page, 'solve')
        await buildProgram(page, {times: 30, hide: false}) // 故意不隐藏：红球被连续加分
        await runAndWait(page, info)
        await shot('3-solve-fail')
        await addByClick(page, 'hide')
        await runAndWait(page, info)
        await shot('4-solve-pass')
      })
    })

    test.describe('G2-U3-L04 课堂：桌面真实指针拖放（Blockly）', () => {
      test.setTimeout(150_000)
      test.beforeEach(async ({}, testInfo) => { test.skip(vpOf(testInfo) !== 'desktop', '拖放用鼠标指针，只在桌面视口验证') })

      test('从分类面板拖出积木到工作区并拼接成标准做法，运行通过；再拖入“如果套如果”被明确拒绝，删除后恢复', async ({page}) => {
        await open(page)
        await goLevel(page, 'solve')
        const ws = page.getByTestId('l4-blockly')
        const wsBox = (await ws.boundingBox())!
        const main = '.blocklyWorkspace > .blocklyBlockCanvas'
        const label = async (text: string, nth = 0) => (await page.locator(`${main} text.blocklyText`, {hasText: text}).nth(nth).boundingBox())!
        const dragFromToolbox = async (category: string, blockText: string, dropTopLeft: {x: number; y: number}) => {
          await page.locator('.blocklyToolboxCategory', {hasText: category}).first().click()
          const flyoutBlock = page.locator('.blocklyFlyout .blocklyDraggable', {hasText: blockText}).first()
          await expect(flyoutBlock).toBeVisible()
          const b = (await flyoutBlock.boundingBox())!
          const grab = {x: 14, y: Math.min(14, b.height / 2)}
          await page.mouse.move(b.x + grab.x, b.y + grab.y)
          await page.mouse.down()
          await page.mouse.move(dropTopLeft.x + grab.x, dropTopLeft.y + grab.y, {steps: 14})
          await page.mouse.up()
          await page.waitForTimeout(350)
        }
        await dragFromToolbox('事件', '当绿旗被点击', {x: wsBox.x + 300, y: wsBox.y + 40})
        const flagLabel = await label('当绿旗被点击')
        await dragFromToolbox('控制', '重复执行', {x: flagLabel.x - 6, y: flagLabel.y + flagLabel.height + 8})
        const repLabel = await label('重复执行')
        await dragFromToolbox('控制', '如果', {x: repLabel.x + 12, y: repLabel.y + repLabel.height + 8})
        const ifLabel = await label('如果 碰到 篮子？')
        await dragFromToolbox('变量', '将 得分 增加', {x: ifLabel.x + 12, y: ifLabel.y + ifLabel.height + 8})
        const scoreLabel = await label('将 得分 增加')
        await dragFromToolbox('外观', '隐藏', {x: scoreLabel.x - 8, y: scoreLabel.y + scoreLabel.height - 2})
        await expect.poll(async () => (await programOf(page))).toMatchObject({scripts: [{hat: 'flag', body: [{t: 'repeat', body: [{t: 'iftouch', body: [{t: 'score'}, {t: 'hide'}]}]}]}]})
        // 拖放结束后分类面板的抽屉可能还盖着工作区的左侧：先点一下工作区空白处收起
        await page.mouse.click(wsBox.x + wsBox.width - 60, wsBox.y + wsBox.height - 80)
        await expect(page.locator('.blocklyFlyout').first()).toBeHidden()
        await page.locator(`${main} text.blocklyText`, {hasText: '重复执行'}).first().click()
        await expect(page.getByTestId('l4-number')).toHaveValue('30')
        await page.getByTestId('ws-run-toggle').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await expectConclusion(page, true)
        await expect(stage(page)).toHaveAttribute('data-score', '1')

        // 直接在积木上的数字框里改（Blockly 自己的输入）：把 30 改成 20 → 检查次数不够，一分都得不到
        await page.locator(`${main} .blocklyEditableField`, {hasText: /^30$/}).first().click()
        await page.keyboard.press('ControlOrMeta+A')
        await page.keyboard.type('20')
        await page.keyboard.press('Enter')
        await expect.poll(async () => (await programOf(page)).scripts[0].body[0].times).toBe(20)
        await expectResultCleared(page)
        await page.getByTestId('ws-run-toggle').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await expectConclusion(page, false)

        // 把第二块“如果”拖进第一块“如果”里面：Scratch 积木上允许，但本课不允许“如果”里再放“如果”，必须明确拒绝并写明原因
        const ifLabel2 = await label('如果 碰到 篮子？')
        await dragFromToolbox('控制', '如果', {x: ifLabel2.x + 12, y: ifLabel2.y + ifLabel2.height + 8})
        await expect(page.getByTestId('l4-problems')).toContainText('不能再放“如果”')
        await expect(page.getByTestId('l4-shell-run')).toBeDisabled()
        // 删除刚拖进去的那一块（拖放后它被选中）：恢复合法，又能运行
        await page.getByTestId('l4-delete').click()
        await expect(page.getByTestId('l4-problems')).toHaveCount(0)
        await expect(page.getByTestId('l4-shell-run')).toBeEnabled()

        // 拖到垃圾桶删除
        await page.locator('.blocklyTrash').first().scrollIntoViewIfNeeded()
        const trash = (await page.locator('.blocklyTrash').first().boundingBox())!
        const hideText = await label('隐藏')
        await page.mouse.move(hideText.x + 4, hideText.y + hideText.height / 2)
        await page.mouse.down()
        await page.mouse.move(trash.x + trash.width / 2, trash.y + trash.height / 2, {steps: 16})
        await page.mouse.up()
        await expect.poll(async () => (await programOf(page)).scripts[0].body[0].body[0].body.map((b: P) => b.t)).toEqual(['score'])
        await expectResultCleared(page)
      })
    })

    test.describe('G2-U3-L04 正式页面：适配器与共享草稿', () => {
      test.setTimeout(150_000)

      test('第一关：草稿由共享 workspace-draft 写入，一课一键、不含运行结果', async ({page}, info) => {
        await open(page)
        await openTask(page, info)
        await page.getByTestId('l4-pred-score').fill('3')
        await page.getByTestId('l4-pred-blue-yes').check()
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('舞台结果：')
        await expect(page.getByTestId('ws-feedback-task')).toContainText('任务结果：')
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('知识证据：')
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('需要进一步解释或练习')
        await expect(page.getByTestId('ws-feedback')).not.toContainText(/已(经)?掌握/)
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
        expect(await draftKeys(page)).toEqual([DRAFT_KEY])
        const env = JSON.parse((await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY))!)
        expect(env).toMatchObject({lessonId: 'G2-U3-L04', version: 1})
        expect(Object.keys(env.script).sort()).toEqual(['levelId', 'predictions', 'programs', 'version'])
        expect(env.script.predictions).toEqual({explore: {score: '3', blue: '会'}})
        expect(JSON.stringify(env)).not.toMatch(/scores|checks|passedAt|finalScore|trace/)
      })

      test('第二关：刷新后关卡与脚本从草稿恢复、旧结果不恢复；走完四关仍然只有一个草稿键', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildProgram(page, {times: 30})
        await runAndWait(page, info)
        await expectConclusion(page, true)
        const before = await programAttr(page)
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
        await page.evaluate(() => sessionStorage.setItem('l4-keep', '1'))
        await page.reload()
        await expect(page.getByTestId('l4-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('l4-level-solve')).toHaveAttribute('aria-current', 'step')
        await expect(page.getByTestId('ws-save-message')).toHaveText('已恢复草稿')
        expect(await programAttr(page)).toBe(before)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        for (const id of ['transferPoints', 'transferSlow', 'explore', 'solve']) await goLevel(page, id)
        expect(await draftKeys(page)).toEqual([DRAFT_KEY])
      })

      test('不合法或损坏的草稿：不恢复、从课程起点开始、不覆盖已存的内容', async ({page}) => {
        const bad = JSON.stringify({lessonId: 'G2-U3-L04', savedAt: 'x', script: {version: 2, levelId: 'solve'}})
        await page.addInitScript(([key, value]) => {
          if (!sessionStorage.getItem('l4-seeded')) {
            sessionStorage.setItem('l4-seeded', '1')
            localStorage.setItem(key, value)
          }
        }, [DRAFT_KEY, bad])
        await open(page, {fresh: false})
        await expect(page.getByTestId('l4-level-explore')).toHaveAttribute('aria-current', 'step')
        await expect(page.getByTestId('ws-save-message')).toHaveCount(0)
        await page.waitForTimeout(1500)
        expect(await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY)).toBe(bad)
        await page.evaluate(k => localStorage.setItem(k, '{坏的'), DRAFT_KEY)
        await page.reload()
        await expect(page.getByTestId('l4-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('l4-level-explore')).toHaveAttribute('aria-current', 'step')
        await expect(page.getByTestId('ws-save-message')).toHaveCount(0)
        await page.waitForTimeout(1500)
        expect(await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY)).toBe('{坏的')
      })

      for (const [name, body] of [
        ['重复 9999 次', [{t: 'repeat', times: 9999, body: []}]],
        ['如果里套如果', [{t: 'iftouch', body: [{t: 'iftouch', body: []}]}]],
        ['得分增量 99', [{t: 'iftouch', body: [{t: 'score', by: 99}]}]],
      ] as const) {
        test(`草稿里有非法程序（${name}）：整份草稿被拒绝，不进入工作区`, async ({page}) => {
          const evil = JSON.stringify({lessonId: 'G2-U3-L04', savedAt: 'x', script: {
            version: 1, levelId: 'solve', predictions: {},
            programs: {solve: {scripts: [{hat: 'flag', body}]}, transferPoints: {scripts: []}, transferSlow: {scripts: []}},
          }})
          await page.addInitScript(([key, value]) => {
            if (!sessionStorage.getItem('l4-seeded')) {
              sessionStorage.setItem('l4-seeded', '1')
              localStorage.setItem(key, value)
            }
          }, [DRAFT_KEY, evil])
          await open(page, {fresh: false})
          await expect(page.getByTestId('l4-level-explore')).toHaveAttribute('aria-current', 'step')
          await goLevel(page, 'solve')
          expect(await programOf(page)).toEqual({scripts: []})
        })
      }
    })
  })
}
