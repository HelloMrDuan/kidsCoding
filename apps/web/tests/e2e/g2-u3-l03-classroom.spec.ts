// G2-U3-L03《随机出现的礼物》正式页面（共享 LessonWorkspace + 本课适配器与三个槽位）真实浏览器测试。
// 桌面 1440 / 平板 768 / 手机 375，三个视口都在本文件里设置（不依赖 Playwright project 的个数）。
// 页面里的 Scratch VM 是真实的 scratch-vm@5.0.300，由应用自己的源站提供（OPS-024），不走 CDN。
// 积木由真实 Blockly 工作区编辑（桌面用真实指针拖放），运行走真实 VM 沙箱，判定读 VM 的运行轨迹。
//
// 随机性：自己搭的关卡每次运行都真的不一样，所以这些用例只断言“与运气无关”的结论——
//   · 知识证据只由真实 operator_random 收到的上下界决定，所以对它的断言是确定的；
//   · 上下界在要求范围内且够宽时，舞台与任务结果也是确定的（10 次取值落在范围外是不可能的；不同位置少于 3 个的概率可忽略）；
//   · 上下界过宽的程序，舞台结果取决于运气，所以这类用例**不断言舞台结果**。
import {readFileSync} from 'node:fs'
import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test'

const URL = '/learn/g2-u3-l03'
const DRAFT_KEY = 'kidscoding-draft:G2-U3-L03'
/** 演示关的固定序列（种子 7，-300～300，10 次）：方案里写明，并由独立的 Python 程序与真实 VM 核对过。 */
const DEMO_XS = [-293, -263, 287, 120, 13, -57, -20, -156, 32, 138]

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
  if (opts.fresh !== false) await page.addInitScript(() => { if (!sessionStorage.getItem('l3-keep')) localStorage.removeItem('kidscoding-draft:G2-U3-L03') })
  await page.goto(URL)
  await expect(page.getByTestId('l3-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
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
  if (isPhone(info) && !(await page.getByTestId('l3-task-fold-body').isVisible())) await page.getByTestId('l3-task-toggle').click()
  await expect(page.getByTestId('l3-task-content')).toBeVisible()
}

/** 共享壳的运行按钮：手机在脚本区上方有粘性运行行，其余视口用舞台下方的运行条。 */
function runButton(page: Page, info: TestInfo, where: 'stage' | 'script') {
  return page.getByTestId(where === 'script' && isPhone(info) ? 'ws-sticky-run' : 'ws-run-toggle')
}

async function showRoles(page: Page, info: TestInfo) {
  if (isPhone(info) && !(await page.getByTestId('l3-role-gift').isVisible())) await page.getByTestId('ws-roles-toggle').click()
}

async function goLevel(page: Page, level: string) {
  await page.getByTestId(`l3-level-${level}`).click()
  await expect(page.getByTestId(`l3-level-${level}`)).toHaveAttribute('aria-current', 'step')
}

type BlockKind = 'flag' | 'randomx' | 'repeat'
async function addByClick(page: Page, type: BlockKind) {
  if (!(await page.getByTestId('l3-palette').isVisible())) await page.getByTestId('l3-add-block').click()
  await page.getByTestId(`l3-add-${type}`).click()
}

/** 第一个数字框：重复次数，或“取随机数”的下界。 */
async function setFirst(page: Page, value: number) {
  const box = page.getByTestId('l3-number')
  await expect(box).toBeEnabled()
  await box.fill(String(value))
}
/** 第二个数字框：“取随机数”的上界。 */
async function setTo(page: Page, value: number) {
  const box = page.getByTestId('l3-number-to')
  await expect(box).toBeEnabled()
  await box.fill(String(value))
}
/** 选中的是“取随机数”积木时，同时设置下界和上界。 */
async function setBounds(page: Page, from: number, to: number) {
  await setFirst(page, from)
  await setTo(page, to)
}

/** 搭：绿旗 → 重复 times 次 → 里面一块“将 x 设为（在 from 到 to 之间取随机数）”。全部通过抽屉点击和数字框完成。 */
async function buildRandom(page: Page, times: number, from: number, to: number) {
  await addByClick(page, 'flag')
  await addByClick(page, 'repeat')
  await setFirst(page, times)
  await addByClick(page, 'randomx') // 选中的是重复 → 加进重复里面
  await setBounds(page, from, to)
}

async function runAndWait(page: Page, info: TestInfo, where: 'stage' | 'script' = 'script') {
  await runButton(page, info, where).click()
  await expect(page.getByTestId('ws-feedback-conclusion').or(page.getByTestId('l3-not-judged'))).toBeVisible({timeout: 30_000})
}

/**
 * 壳只显示每层的文字，不在 DOM 上暴露 passed 属性。所以“这一层通过 / 没通过”断言课程判定写出的那句话（judge.ts 的固定措辞），
 * 并同时断言另一种说法不存在。
 */
const LAYER_TEXT = {
  stage: {pass: /全部在本关要求的/, fail: /超出了本关要求的|只出现了|一次也没有/},
  task: {pass: /本次任务达标/, fail: /本次任务未达标/},
  knowledge: {pass: /本次程序满足取值范围要求/, fail: /没有满足取值范围要求/},
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
  await expect(c).toContainText(passed ? /任务达标，也满足了取值范围要求/ : /还没达到要求/)
  await expect(c).not.toContainText(passed ? /还没达到要求/ : /任务达标，也满足了取值范围要求/)
}
async function expectResultCleared(page: Page) {
  await expect(page.getByTestId('ws-judgment-stale')).toBeVisible()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, '页面不应出现横向溢出').toBeLessThanOrEqual(1)
}

const programAttr = async (page: Page) => (await page.getByTestId('l3-script-host').getAttribute('data-program'))!
const programOf = async (page: Page) => JSON.parse(await programAttr(page))
const draftKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kidscoding-draft')))
/** 数字框改完后，工作区同步到程序要一点时间：轮询到期望的结构再往下。 */
const expectProgram = (page: Page, expected: Record<string, unknown>) => expect.poll(() => programOf(page)).toMatchObject(expected)
const dots = (page: Page) => page.getByTestId('l3-stage-dot')

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}]`, () => {
    test.use({viewport: {...vp.viewport}, hasTouch: vp.hasTouch, isMobile: vp.isMobile})

    test.describe('G2-U3-L03 课堂：三端真实操作', () => {
      test.setTimeout(150_000)

      test('首屏五要素与任务：本课名称、学什么、解决什么、学完能做什么、与上节课联系、当前步骤', async ({page}, info) => {
        await open(page)
        await expect(page.getByTestId('ws-topbar')).toContainText('随机出现的礼物')
        await expect(page.getByTestId('ws-goal-current')).toContainText('今天学')
        await page.getByTestId('ws-goal-expand').click()
        const goals = page.getByTestId('ws-goal5')
        await expect(goals).toContainText('今天学')
        await expect(goals).toContainText('要解决的问题')
        await expect(goals).toContainText('学完你能')
        await expect(goals).toContainText('上节课')
        await expect(goals).toContainText('现在要做')
        if (isPhone(info)) await expect(page.getByTestId('l3-task-bar-text')).toContainText('先写下你的预测')
        await openTask(page, info)
        await expect(page.getByTestId('l3-task-content')).toContainText('先猜一猜')
        await expect(page.getByTestId('l3-task-content')).toContainText('现在要做')
        await noHorizontalOverflow(page)
      })

      test('Scratch VM 从本站自托管：jsDelivr 不可达时照样能运行，且没有任何请求发往 CDN', async ({page}, info) => {
        const cdn: string[] = []
        await page.route('https://cdn.jsdelivr.net/**', route => { cdn.push(route.request().url()); return route.abort() })
        await open(page)
        await openTask(page, info)
        await page.getByTestId('l3-pred-count').fill('3')
        await page.getByTestId('l3-pred-escapes-yes').check()
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await expect(page.getByTestId('l3-stage')).toHaveAttribute('data-placed', '10') // 礼物真的被 VM 放了 10 次
        expect(cdn).toEqual([])
      })

      test('舞台整幅都看得见：壳给的舞台框不裁掉舞台，礼物与圆点所在的整行都在框里；三档缩放都一样', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 10, -150, 150)
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('l3-stage')).toHaveAttribute('data-placed', '10', {timeout: 30_000})
        for (const [zoom, id] of [['缩小', 'ws-zoom-small'], ['正常', 'ws-zoom-medium'], ['放大', 'ws-zoom-large']] as const) {
          await page.getByTestId(id).click()
          // 一次 evaluate 里量完框、舞台、礼物和所有圆点（缩放后布局会变化，分次量会拿到不同时刻的数）；轮询到布局稳定
          await expect.poll(async () => page.evaluate(() => {
            const rect = (e: Element) => e.getBoundingClientRect()
            const box = rect(document.querySelector('[data-testid="ws-stage-box"]')!)
            const stage = rect(document.querySelector('[data-testid="l3-stage"]')!)
            const items = [document.querySelector('[data-testid="l3-stage-gift"]')!, ...Array.from(document.querySelectorAll('[data-testid="l3-stage-dot"]'))].map(rect)
            const inside = (r: DOMRect, o: DOMRect) => r.left >= o.left - 1 && r.right <= o.right + 1 && r.top >= o.top - 1 && r.bottom <= o.bottom + 1
            return {
              stageInBox: inside(stage, box),
              ratio: Math.round((stage.width / stage.height) * 100) / 100,
              itemsInBox: items.every(r => inside(r, box)),
              itemsInStage: items.every(r => inside(r, stage)),
              count: items.length,
            }
          }), {message: `${zoom}：整幅舞台和所有元素都在壳的舞台框里，比例 4:3`}).toEqual({stageInBox: true, ratio: 1.33, itemsInBox: true, itemsInStage: true, count: 11})
        }
      })

      test('完整答案不在开始操作前出现；提示按 1→2→3 逐级揭示', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await openTask(page, info)
        await expect(page.getByTestId('l3-hint-1')).toHaveCount(0)
        await expect(page.getByTestId('l3-after')).toHaveCount(0)
        await expect(page.getByTestId('l3-alternatives')).toHaveCount(0)
        await expect(page.getByTestId('l3-own-solution')).toHaveCount(0)
        await page.getByTestId('l3-next-hint').click()
        await expect(page.getByTestId('l3-hint-1')).toBeVisible()
        await expect(page.getByTestId('l3-hint-2')).toHaveCount(0)
        await page.getByTestId('l3-next-hint').click()
        await expect(page.getByTestId('l3-hint-2')).toBeVisible()
        await expect(page.getByTestId('l3-hint-3')).toHaveCount(0)
        await page.getByTestId('l3-next-hint').click()
        await expect(page.getByTestId('l3-hint-3')).toBeVisible()
        const all = await page.getByTestId('l3-task-content').innerText()
        expect(all).not.toMatch(/-180\s*(到|～|~)\s*180\s*之间取随机数|取随机数\s*[（(]\s*-180/)
      })

      test('第一层：不写预测不能运行；预测后运行，固定种子的 10 个位置人人相同，并与预测对照', async ({page}, info) => {
        await open(page)
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-run-error')).toContainText('预测')
        await expect(page.getByTestId('l3-stage')).toHaveAttribute('data-placed', '0')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(runButton(page, info, 'stage')).toHaveText('运行作品')
        await openTask(page, info)
        await page.getByTestId('l3-pred-count').fill('0')
        await page.getByTestId('l3-pred-escapes-no').check()
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-feedback-stage')).toBeVisible({timeout: 30_000})
        // 真实 VM 在固定种子下取出的位置：10 个圆点，x 依次等于序列；序列里有 3 个在 ±180 之外（-293、-263、287），都在舞台之外
        await expect(dots(page)).toHaveCount(10)
        expect(await dots(page).evaluateAll(els => els.map(e => Number(e.getAttribute('data-x'))))).toEqual(DEMO_XS)
        expect(await dots(page).evaluateAll(els => els.filter(e => e.getAttribute('data-out') === 'true').length)).toBe(3)
        await expect(page.getByTestId('l3-stage')).toHaveAttribute('data-gift-x', '138')
        // 舞台之外的 3 个位置（-293、-263、287）也要让孩子看得见：贴在舞台边缘的箭头，必须真的落在舞台画面里，而不是被裁掉
        expect(await dots(page).evaluateAll(els => els.filter(e => e.getAttribute('data-offstage') === 'true').map(e => e.getAttribute('data-x')))).toEqual(['-293', '-263', '287'])
        // 一次 evaluate 里量完舞台和所有标记（运行结束时页面会出反馈、发生滚动，分次量会拿到不同时刻的坐标）
        await expect.poll(() => page.evaluate(() => {
          const st = document.querySelector('[data-testid="l3-stage"]')!.getBoundingClientRect()
          const marks = Array.from(document.querySelectorAll('[data-testid="l3-stage-dot"]')).map(e => e.getBoundingClientRect())
          return {count: marks.length, allInStage: marks.every(r => r.left >= st.left - 0.5 && r.right <= st.right + 0.5 && r.top >= st.top - 0.5 && r.bottom <= st.bottom + 0.5)}
        }), {message: '10 个标记（含舞台之外的 3 个箭头）都画在舞台画面内'}).toEqual({count: 10, allInStage: true})
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('3 次超出')
        await expect(page.getByTestId('l3-pred-compare')).toContainText('你预测有 0 次跑出要求的范围')
        await expect(page.getByTestId('l3-pred-compare')).toContainText('10 次里有 3 次跑出了要求的范围')
        await expect(page.getByTestId('l3-pred-compare')).toContainText('有跑到舞台之外')
        // 第一关是观察，不下“达标”结论
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('这一关是观察')
        await expect(page.getByTestId('ws-feedback-conclusion')).not.toContainText('任务达标')
        // 再运行一次，位置完全一样（固定种子）
        await runButton(page, info, 'stage').click()
        await expect(dots(page)).toHaveCount(10)
        expect(await dots(page).evaluateAll(els => els.map(e => Number(e.getAttribute('data-x'))))).toEqual(DEMO_XS)
      })

      test('第二层：空脚本 / 只有绿旗不能判通过；范围过宽知识证据不过（与运气无关）；范围合适全部通过；改脚本后结果立即清除', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await runAndWait(page, info)
        await expectLayer(page, 'task', false)
        await expectLayer(page, 'knowledge', false)
        await expectConclusion(page, false)
        await addByClick(page, 'flag')
        await expectResultCleared(page)
        await runAndWait(page, info)
        await expectConclusion(page, false)
        // 重复 10 次、上下界 -300～300：超出本关要求的 -180～180，知识证据不通过——不管这一次碰巧取到哪些位置
        await addByClick(page, 'repeat')
        await setFirst(page, 10)
        await addByClick(page, 'randomx')
        await setBounds(page, -300, 300)
        await runAndWait(page, info)
        await expectLayer(page, 'knowledge', false)
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('-300～300')
        await expectConclusion(page, false)
        // 改上界后旧结果立即消失
        await setTo(page, 150)
        await expectResultCleared(page)
        await runAndWait(page, info)
        await expectLayer(page, 'knowledge', false) // 下界还是 -300
        await setFirst(page, -150)
        await expectResultCleared(page)
        await runAndWait(page, info)
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'task', true)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('舞台结果：')
        await expect(page.getByTestId('ws-feedback-task')).toContainText('任务结果：本次任务达标')
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('知识证据：本次程序满足取值范围要求')
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('需要进一步解释或练习')
        await expect(page.getByTestId('ws-feedback')).not.toContainText(/已(经)?掌握|学会了/)
        await expect(page.getByTestId('l3-level-solve')).toHaveAttribute('data-done', 'true')
        // 通过后才出现“你的做法 / 别的做法”
        await openTask(page, info)
        await expect(page.getByTestId('l3-own-solution')).toContainText('在 -150 到 150 之间取随机数')
        await expect(page.getByTestId('l3-alternatives')).toBeVisible()
        // 再改脚本：这一关不再算通过
        await setTo(page, 151)
        await expect(page.getByTestId('l3-level-solve')).toHaveAttribute('data-done', 'false')
      })

      test('上下界相同（写死一个数）：任务与知识证据都不通过，改成合适的范围后通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        // 上下界相同：礼物每次都在同一个位置
        await buildRandom(page, 10, 30, 30)
        await runAndWait(page, info)
        await expectLayer(page, 'task', false)
        await expect(page.getByTestId('ws-feedback-task')).toContainText('1 个不同的位置')
        await expectLayer(page, 'knowledge', false)
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('范围太窄')
        await expect(dots(page)).toHaveCount(10)
        expect(new Set(await dots(page).evaluateAll(els => els.map(e => e.getAttribute('data-x')))).size).toBe(1)
        // 改成合适的范围（选中的仍是“取随机数”积木）
        await setBounds(page, -100, 100)
        await expectResultCleared(page)
        await runAndWait(page, info)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
      })

      test('重复次数不够：只重复 5 次，礼物只出现 5 次，舞台与任务不通过；知识证据仍然通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 5, -150, 150)
        await runAndWait(page, info)
        await expectLayer(page, 'stage', false)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('只出现了 5 次')
        await expectLayer(page, 'task', false)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, false)
        await expect(dots(page)).toHaveCount(5)
      })

      test('“将 x 设为取随机数”没放进重复里：只出现 1 次，不通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await addByClick(page, 'flag')
        await addByClick(page, 'randomx') // 选中的是绿旗 → 接在绿旗下面，不在循环里
        await setBounds(page, -150, 150)
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('只出现了 1 次')
        await expectLayer(page, 'task', false)
        await expectConclusion(page, false)
        await expect(dots(page)).toHaveCount(1)
      })

      test('上下界写反了（150 到 -150）：Scratch 会对调，仍然通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 10, 150, -150)
        await runAndWait(page, info)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
        expect(await dots(page).evaluateAll(els => els.every(e => e.getAttribute('data-out') === 'false'))).toBe(true)
      })

      test('舞台读 VM 状态：圆点是礼物真实出现过的位置，礼物在最后一个位置；重跑不叠加', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 10, -150, 150)
        const stage = page.getByTestId('l3-stage')
        await expect(stage).toHaveAttribute('data-gift-x', '0')
        await expect(stage).toHaveAttribute('data-placed', '0')
        await runButton(page, info, 'stage').click()
        await expect(stage).toHaveAttribute('data-placed', '10', {timeout: 30_000})
        await expectConclusion(page, true)
        const xs = await dots(page).evaluateAll(els => els.map(e => Number(e.getAttribute('data-x'))))
        expect(xs).toHaveLength(10)
        expect(xs.every(x => x >= -150 && x <= 150)).toBe(true)
        await expect(stage).toHaveAttribute('data-gift-x', String(xs[xs.length - 1]))
        await runButton(page, info, 'stage').click()
        await expectConclusion(page, true)
        await expect(dots(page)).toHaveCount(10) // 重跑从头开始，不叠加到 20
        const again = await dots(page).evaluateAll(els => els.map(e => Number(e.getAttribute('data-x'))))
        expect(again).not.toEqual(xs) // 自己搭的关卡每次运行都真的不一样
      })

      test('保存与刷新恢复：脚本、关卡、预测都在；通过状态需要重新运行', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 10, -150, 150)
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
        const before = await programAttr(page)
        await page.evaluate(() => sessionStorage.setItem('l3-keep', '1'))
        await page.reload()
        await expect(page.getByTestId('l3-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('l3-level-solve')).toHaveAttribute('aria-current', 'step')
        await expect(page.getByTestId('ws-save-message')).toContainText('已恢复')
        expect(await programAttr(page)).toBe(before)
        await expect(page.getByTestId('l3-level-solve')).toHaveAttribute('data-done', 'false') // 旧通过不被信任
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(page.getByTestId('ws-feedback')).toContainText('暂无检查结果')
        await runAndWait(page, info)
        await expectConclusion(page, true)
        const stored = await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY)
        expect(stored).toContain('"lessonId":"G2-U3-L03"')
        expect(stored).not.toMatch(/placements|draws|passedAt/)
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

      test('第三层迁移 A：只出现在右半边——照抄上一关的 -150～150 知识证据不过，改下界为 0 才通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'transferRight')
        await buildRandom(page, 10, -150, 150) // 照抄上一关
        await runAndWait(page, info)
        await expectLayer(page, 'knowledge', false)
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('-150～150')
        await expectConclusion(page, false)
        await setBounds(page, 0, 150)
        await runAndWait(page, info)
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
        expect(await dots(page).evaluateAll(els => els.every(e => Number(e.getAttribute('data-x')) >= 0))).toBe(true)
      })

      test('第三层迁移 B：只出现在正中间——范围过宽不过；挤成一个点（0～0）太窄也不过；-60～60 通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'transferMiddle')
        await buildRandom(page, 10, -150, 150)
        await runAndWait(page, info)
        await expectLayer(page, 'knowledge', false)
        await setBounds(page, 0, 0)
        await runAndWait(page, info)
        await expectLayer(page, 'knowledge', false)
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('范围太窄')
        await expectLayer(page, 'task', false)
        await setBounds(page, -60, 60)
        await runAndWait(page, info)
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
      })

      test('关卡与课程切换不污染：切关清掉结果；每关脚本独立；返回后原脚本还在', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 10, -150, 150)
        await runAndWait(page, info)
        await expectConclusion(page, true)
        await goLevel(page, 'transferRight')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(page.getByTestId('l3-situation')).toContainText('0 到 180')
        await expect(page.getByTestId('l3-level-transferRight')).toHaveAttribute('data-done', 'false')
        expect(await programOf(page)).toEqual({scripts: []})
        await goLevel(page, 'solve')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        expect(await programOf(page)).toMatchObject({scripts: [{hat: 'flag', body: [{t: 'repeat', times: 10, body: [{t: 'randomx', from: -150, to: 150}]}]}]})
        await runAndWait(page, info)
        await expectConclusion(page, true)
      })

      test('运行中停止：不判定、脚本保留；停止后重跑结果通过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 20, -150, 150) // 20 圈，每圈一帧，留出点“停止”的时间
        const run = runButton(page, info, 'script')
        await run.click()
        await expect(run).toHaveText('停止')
        await run.click()
        await expect(page.getByTestId('l3-not-judged')).toBeVisible({timeout: 30_000})
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(run).toHaveText('运行作品')
        await expect(page.getByTestId('l3-level-solve')).toHaveAttribute('data-done', 'false')
        await runAndWait(page, info) // 脚本还在：20 次也满足“至少 10 次”
        await expectConclusion(page, true)
      })

      test('文件菜单：保存、导出、导入、重新开始本关；导入错课节作品被拒绝', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 10, -150, 150)
        await page.getByTestId('ws-file-menu-button').click()
        await expect(page.getByTestId('ws-file-new')).toHaveCount(0)
        await page.getByTestId('ws-file-save').click()
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存')
        await expect(page.getByTestId('ws-file-menu')).toHaveCount(0)
        await page.getByTestId('ws-file-menu-button').click()
        const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('ws-file-export').click()])
        expect(download.suggestedFilename()).toContain('G2-U3-L03')
        await expect(page.getByTestId('ws-file-menu')).toHaveCount(0)
        await openTask(page, info)
        await page.getByTestId('l3-reset-level').click()
        await runAndWait(page, info)
        await expectConclusion(page, false) // 清空后是空程序
        await page.getByTestId('ws-file-input').setInputFiles({name: 'wrong.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({lessonId: 'G2-U3-L02', script: {}}))})
        await expect(page.getByTestId('l3-import-error')).toContainText('不是“随机出现的礼物”')
        const path = await download.path()
        await page.getByTestId('ws-file-input').setInputFiles(path)
        await expect(page.getByTestId('l3-import-error')).toHaveCount(0)
        await runAndWait(page, info)
        await expectConclusion(page, true)
        await page.getByTestId('ws-file-menu-button').click()
        await page.getByTestId('ws-file-reset').click()
        await expect(page.getByTestId('l3-level-explore')).toHaveAttribute('aria-current', 'step')
        await goLevel(page, 'solve')
        await expect.poll(async () => (await programAttr(page))).toBe(JSON.stringify({scripts: []}))
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
      })

      test('角色管理：背景没有脚本；回到礼物后脚本还在', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 10, -150, 150)
        await showRoles(page, info)
        await page.getByTestId('l3-role-backdrop').click()
        await expect(page.getByTestId('l3-backdrop-note')).toBeVisible()
        await expect(page.getByTestId('l3-toolbar')).toHaveCount(0)
        await page.getByTestId('l3-role-gift').click()
        await expect(page.getByTestId('l3-toolbar')).toBeVisible()
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

      test('手机：工具栏的下界和上界两个数字框都在首屏、可点、可改（Gap A）；任务折叠成一行但任务、提示、预测一个不少', async ({page}, info) => {
        test.skip(!isPhone(info), '首屏编辑区是手机布局裁定，只在手机视口验证')
        await open(page)
        await goLevel(page, 'solve')
        const vh = page.viewportSize()!.height
        const NAV = 62 // 全局底部导航固定在视口底部
        for (const id of ['l3-add-block', 'l3-move-up', 'l3-move-down', 'l3-delete', 'l3-number', 'l3-number-to']) {
          const b = (await page.getByTestId(id).boundingBox())!
          expect(b.y, `${id} 在首屏`).toBeGreaterThanOrEqual(0)
          expect(b.y + b.height, `${id} 不被底部导航遮住`).toBeLessThanOrEqual(vh - NAV)
          expect(b.height, `${id} 触控高度`).toBeGreaterThanOrEqual(36)
          expect(b.x + b.width, `${id} 不超出屏幕宽度`).toBeLessThanOrEqual(375)
        }
        const host = (await page.getByTestId('l3-script-host').boundingBox())!
        const visible = Math.min(host.y + host.height, vh - NAV) - Math.max(host.y, 0)
        expect(visible, '编辑区在首屏的可见高度').toBeGreaterThanOrEqual(120)
        const bar = (await page.getByTestId('l3-task-bar').boundingBox())!
        expect(bar.height).toBeLessThanOrEqual(56)
        await expect(page.getByTestId('l3-task-bar-text')).toContainText('现在要做')
        await expect(page.getByTestId('l3-task-fold-body')).toBeHidden()
        // 只用手机上的工具栏（不碰 Blockly 工作区里的数字框）搭出并改完上下界
        await buildRandom(page, 10, -300, 300)
        await expectProgram(page, {scripts: [{body: [{t: 'repeat', times: 10, body: [{t: 'randomx', from: -300, to: 300}]}]}]})
        await setTo(page, 150)
        await expectProgram(page, {scripts: [{body: [{body: [{t: 'randomx', from: -300, to: 150}]}]}]})
        await setFirst(page, -150)
        await expectProgram(page, {scripts: [{body: [{body: [{t: 'randomx', from: -150, to: 150}]}]}]})
        await runAndWait(page, info)
        await expectConclusion(page, true)
        // 运行之后舞台上的礼物和 10 个圆点都在手机视口里看得见（不是只存在于 DOM）
        await page.getByTestId('l3-stage').scrollIntoViewIfNeeded()
        const vp = page.viewportSize()!
        for (const el of [page.getByTestId('l3-stage-gift'), ...(await dots(page).all())]) {
          const b = (await el.boundingBox())!
          expect(b.width).toBeGreaterThan(0)
          expect(b.x).toBeGreaterThanOrEqual(0)
          expect(b.x + b.width).toBeLessThanOrEqual(vp.width)
        }
        await expect(dots(page)).toHaveCount(10)
        if (process.env.L03_SHOT_DIR) {
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.screenshot({path: `${process.env.L03_SHOT_DIR}/phone-4-solve-first-screen.png`})
        }
        await openTask(page, info)
        await expect(page.getByTestId('l3-next-hint')).toBeVisible()
        await page.getByTestId('l3-task-toggle').click()
        await expect(page.getByTestId('l3-task-fold-body')).toBeHidden()
        await goLevel(page, 'explore')
        await expect(page.getByTestId('l3-task-bar-text')).toHaveAttribute('data-needs-prediction', 'true')
        await expect(page.getByTestId('l3-task-toggle')).toHaveText('写预测')
        await openTask(page, info)
        await expect(page.getByTestId('l3-pred-count')).toBeVisible()
        await expect(page.getByTestId('l3-pred-escapes-yes')).toBeVisible()
        await noHorizontalOverflow(page)
      })

      test('选中重复积木时上界框是灰的，选中“取随机数”时两个框都能改；改数字框立即改工作区', async ({page}) => {
        await open(page)
        await goLevel(page, 'solve')
        await addByClick(page, 'flag')
        await addByClick(page, 'repeat')
        await expect(page.getByTestId('l3-number')).toBeEnabled()
        await expect(page.getByTestId('l3-number-to')).toBeDisabled()
        await addByClick(page, 'randomx')
        await expect(page.getByTestId('l3-number')).toBeEnabled()
        await expect(page.getByTestId('l3-number-to')).toBeEnabled()
        await expect(page.getByTestId('l3-number')).toHaveValue('-100') // 新积木的默认下界
        await expect(page.getByTestId('l3-number-to')).toHaveValue('100')
        await setBounds(page, -7, 9)
        await expectProgram(page, {scripts: [{body: [{body: [{t: 'randomx', from: -7, to: 9}]}]}]})
      })
    })

    test.describe('G2-U3-L03 课堂：三端证据截图', () => {
      test.setTimeout(150_000)
      test('通过状态与失败状态截图', async ({page}, info) => {
        const dir = process.env.L03_SHOT_DIR
        test.skip(!dir, '未设置 L03_SHOT_DIR')
        const shot = (name: string) => page.screenshot({path: `${dir}/${vpOf(info)}-${name}.png`, fullPage: true})
        await open(page)
        await shot('1-first-visit')
        await openTask(page, info)
        await page.getByTestId('l3-pred-count').fill('0')
        await page.getByTestId('l3-pred-escapes-no').check()
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await shot('2-explore-demo')
        await goLevel(page, 'solve')
        await buildRandom(page, 10, -300, 300) // 故意写过宽
        await runAndWait(page, info)
        await shot('3-solve-fail')
        await setBounds(page, -150, 150)
        await runAndWait(page, info)
        await shot('4-solve-pass')
      })
    })

    test.describe('G2-U3-L03 课堂：桌面真实指针拖放（Blockly）', () => {
      test.setTimeout(150_000)
      test.beforeEach(async ({}, testInfo) => { test.skip(vpOf(testInfo) !== 'desktop', '拖放用鼠标指针，只在桌面视口验证') })

      test('从分类面板拖出积木到工作区并拼接，改上下界后运行通过；拖到垃圾桶删除', async ({page}) => {
        await open(page)
        await goLevel(page, 'solve')
        const ws = page.getByTestId('l3-blockly')
        const wsBox = (await ws.boundingBox())!
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
        const main = '.blocklyWorkspace > .blocklyBlockCanvas'
        const flag = (await page.locator(`${main} > g.blocklyDraggable`).first().boundingBox())!
        await dragFromToolbox('控制', '重复执行', {x: flag.x, y: flag.y + flag.height})
        const rep = (await page.locator(`${main} > g.blocklyDraggable g.blocklyDraggable`).first().boundingBox())!
        await dragFromToolbox('运动', '将 x 设为', {x: rep.x + 18, y: rep.y + 30})
        expect(await programOf(page)).toMatchObject({scripts: [{hat: 'flag', body: [{t: 'repeat', body: [{t: 'randomx'}]}]}]})
        // 拖放结束后分类面板的抽屉可能还盖着工作区的左侧：先点一下工作区空白处收起，再去点积木
        await page.mouse.click(wsBox.x + wsBox.width - 60, wsBox.y + wsBox.height - 80)
        await expect(page.locator('.blocklyFlyout').first()).toBeHidden()
        const pick = async (label: string) => { await page.locator(`${main} text.blocklyText`, {hasText: label}).first().click() }
        await pick('之间取随机数') // 点积木右边的文字：左边紧挨着分类抽屉的滚动条，会被它挡住
        await expect(page.getByTestId('l3-number')).toHaveValue('-100')
        await expect(page.getByTestId('l3-number-to')).toHaveValue('100')
        await setBounds(page, -150, 150)
        await pick('重复执行')
        await expect(page.getByTestId('l3-number')).toHaveValue('2')
        await setFirst(page, 10)
        await page.getByTestId('ws-run-toggle').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await expectConclusion(page, true)
        await expect(page.getByTestId('l3-stage')).toHaveAttribute('data-placed', '10')

        // 直接在积木上的数字框里改（Blockly 自己的输入）：把上界改成 200 → 超出要求，知识证据不通过
        await page.locator(`${main} .blocklyEditableField`, {hasText: /^150$/}).first().click() // 只匹配上界 150，不匹配下界 -150
        await page.keyboard.press('ControlOrMeta+A')
        await page.keyboard.type('200')
        await page.keyboard.press('Enter')
        await expect.poll(async () => (await programOf(page)).scripts[0].body[0].body[0].to).toBe(200)
        await expectResultCleared(page)
        await page.getByTestId('ws-run-toggle').click()
        await expectLayer(page, 'knowledge', false)

        // 拖到垃圾桶删除
        await page.locator('.blocklyTrash').first().scrollIntoViewIfNeeded()
        const trash = (await page.locator('.blocklyTrash').first().boundingBox())!
        const text = (await page.locator(`${main} text.blocklyText`, {hasText: '之间取随机数'}).first().boundingBox())!
        await page.mouse.move(text.x + 4, text.y + text.height / 2)
        await page.mouse.down()
        await page.mouse.move(trash.x + trash.width / 2, trash.y + trash.height / 2, {steps: 16})
        await page.mouse.up()
        await expect.poll(async () => programOf(page)).toEqual({scripts: [{hat: 'flag', body: [{t: 'repeat', times: 10, body: []}]}]})
        await expectResultCleared(page)
        await page.getByTestId('ws-run-toggle').click()
        await expectConclusion(page, false)
      })
    })

    test.describe('G2-U3-L03 正式页面：适配器与共享草稿', () => {
      test.setTimeout(150_000)

      test('第一关：草稿由共享 workspace-draft 写入，一课一键、不含运行结果和随机取值', async ({page}, info) => {
        await open(page)
        await openTask(page, info)
        await page.getByTestId('l3-pred-count').fill('3')
        await page.getByTestId('l3-pred-escapes-yes').check()
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
        expect(env).toMatchObject({lessonId: 'G2-U3-L03', version: 1})
        expect(Object.keys(env.script).sort()).toEqual(['levelId', 'predictions', 'programs', 'version'])
        expect(env.script.predictions).toEqual({explore: {count: '3', escapes: '会'}})
        expect(JSON.stringify(env)).not.toMatch(/placements|draws|passedAt|trail/)
      })

      test('第二关：刷新后关卡与脚本从草稿恢复、旧结果不恢复；走完四关仍然只有一个草稿键', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRandom(page, 10, -150, 150)
        await runAndWait(page, info)
        await expectConclusion(page, true)
        const before = await programAttr(page)
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
        await page.evaluate(() => sessionStorage.setItem('l3-keep', '1'))
        await page.reload()
        await expect(page.getByTestId('l3-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('l3-level-solve')).toHaveAttribute('aria-current', 'step')
        await expect(page.getByTestId('ws-save-message')).toHaveText('已恢复草稿')
        expect(await programAttr(page)).toBe(before)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        for (const id of ['transferRight', 'transferMiddle', 'explore', 'solve']) await goLevel(page, id)
        expect(await draftKeys(page)).toEqual([DRAFT_KEY])
      })

      test('不合法或损坏的草稿：不恢复、从课程起点开始、不覆盖已存的内容', async ({page}) => {
        const bad = JSON.stringify({lessonId: 'G2-U3-L03', savedAt: 'x', script: {version: 2, levelId: 'solve'}})
        await page.addInitScript(([key, value]) => {
          if (!sessionStorage.getItem('l3-seeded')) {
            sessionStorage.setItem('l3-seeded', '1')
            localStorage.setItem(key, value)
          }
        }, [DRAFT_KEY, bad])
        await open(page, {fresh: false})
        await expect(page.getByTestId('l3-level-explore')).toHaveAttribute('aria-current', 'step')
        await expect(page.getByTestId('ws-save-message')).toHaveCount(0)
        await page.waitForTimeout(1500)
        expect(await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY)).toBe(bad)
        await page.evaluate(k => localStorage.setItem(k, '{坏的'), DRAFT_KEY)
        await page.reload()
        await expect(page.getByTestId('l3-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('l3-level-explore')).toHaveAttribute('aria-current', 'step')
        await expect(page.getByTestId('ws-save-message')).toHaveCount(0)
        await page.waitForTimeout(1500)
        expect(await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY)).toBe('{坏的')
      })

      test('草稿里的上下界越界（9999）：整份草稿被拒绝，不进入工作区', async ({page}) => {
        const evil = JSON.stringify({lessonId: 'G2-U3-L03', savedAt: 'x', script: {
          version: 1, levelId: 'solve', predictions: {},
          programs: {solve: {scripts: [{hat: 'flag', body: [{t: 'randomx', from: -9999, to: 9999}]}]}, transferRight: {scripts: []}, transferMiddle: {scripts: []}},
        }})
        await page.addInitScript(([key, value]) => {
          if (!sessionStorage.getItem('l3-seeded')) {
            sessionStorage.setItem('l3-seeded', '1')
            localStorage.setItem(key, value)
          }
        }, [DRAFT_KEY, evil])
        await open(page, {fresh: false})
        await expect(page.getByTestId('l3-level-explore')).toHaveAttribute('aria-current', 'step')
        await goLevel(page, 'solve')
        expect(await programOf(page)).toEqual({scripts: []})
      })
    })
  })
}
