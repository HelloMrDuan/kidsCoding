// G2-U3-L05《倒计时游戏结束》正式页面（共享 LessonWorkspace + 本课适配器与槽位）真实浏览器测试。
// 桌面 1440 / 平板 768 / 手机 375，三个视口都在本文件里设置（不依赖 Playwright project 的个数）。
// 页面里的 Scratch VM 是真实的 scratch-vm@5.0.300，运行在沙箱 iframe 里（沙箱没有渲染器：本课舞台只显示
// timeLeft 与 score 两个变量，不需要碰撞）；时间由沙箱里的虚拟时钟推进（每帧 1000/30 毫秒），
// 所以课堂上“等待 1 秒”真的等了虚拟的 1 秒（约 31 帧），只是真实时间被压缩（每帧约 16 毫秒）。
// 积木由真实 Blockly 工作区编辑（桌面含一次真实指针拖放），判定读 VM 的真实运行轨迹与真实 operator_lt 求值记录。
//
// 确定性：没有随机数，同一个程序跑多少次都是同一条轨迹。实测锚点（桌面 Chromium 与探针）：
// 标准做法（起点 10）广播约在第 311 帧、得分 19；演示程序（重复 15 次）最后 timeLeft 是 -5；
// 固定重复 10 次行为全对但没有判断求值记录，知识证据不过。
import {readFileSync} from 'node:fs'
import {expect, test, type Page, type TestInfo} from '@playwright/test'

const URL = '/learn/g2-u3-l05'
const DRAFT_KEY = 'kidscoding-draft:G2-U3-L05'

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
  if (opts.fresh !== false) await page.addInitScript(() => { if (!sessionStorage.getItem('l5-keep')) localStorage.removeItem('kidscoding-draft:G2-U3-L05') })
  await page.goto(URL)
  await expect(page.getByTestId('l5-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
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
  if (isPhone(info) && !(await page.getByTestId('l5-task-fold-body').isVisible())) await page.getByTestId('l5-task-toggle').click()
  await expect(page.getByTestId('l5-task-content')).toBeVisible()
}

/** 共享壳的运行按钮：手机在脚本区上方有粘性运行行，其余视口用舞台下方的运行条。 */
function runButton(page: Page, info: TestInfo, where: 'stage' | 'script') {
  return page.getByTestId(where === 'script' && isPhone(info) ? 'ws-sticky-run' : 'ws-run-toggle')
}

async function showRoles(page: Page, info: TestInfo) {
  if (isPhone(info) && !(await page.getByTestId('l5-role-student').isVisible())) await page.getByTestId('ws-roles-toggle').click()
}

async function goLevel(page: Page, level: string) {
  await page.getByTestId(`l5-level-${level}`).click()
  await expect(page.getByTestId(`l5-level-${level}`)).toHaveAttribute('aria-current', 'step')
}

type BlockKind = 'flag' | 'set' | 'until' | 'repeat' | 'wait' | 'dec' | 'cast'
async function addByClick(page: Page, type: BlockKind) {
  if (!(await page.getByTestId('l5-palette').isVisible())) await page.getByTestId('l5-add-block').click()
  await page.getByTestId(`l5-add-${type}`).click()
}

/** 唯一的数字框：选中哪块积木就改哪块的数字（设为 / 重复次数 / 等待秒数 / 减少数量）。 */
async function setNumber(page: Page, value: number) {
  const box = page.getByTestId('l5-number')
  await expect(box).toBeEnabled()
  await box.fill(String(value))
}

/**
 * 搭标准做法：绿旗 → 将 timeLeft 设为 start → 重复执行直到〈timeLeft < 1〉{ 等待 1 秒; 将 timeLeft 减少 1 } → 广播「游戏结束」。
 * 全部通过抽屉点击和数字框完成；“广播”是只能放在最外层的积木，选中积木在循环里时编辑器会把它接到循环后面。
 */
async function buildStandard(page: Page, start = 10) {
  await addByClick(page, 'flag')
  await addByClick(page, 'set')
  if (start !== 10) await setNumber(page, start)
  await addByClick(page, 'until')
  await addByClick(page, 'wait')
  await addByClick(page, 'dec')
  await addByClick(page, 'cast')
}

/** 搭“固定重复”做法：次数写死（起点也是这个数时行为全对，但没有判断）。 */
async function buildRepeat(page: Page, times: number, start = 10) {
  await addByClick(page, 'flag')
  await addByClick(page, 'set')
  if (start !== 10) await setNumber(page, start)
  await addByClick(page, 'repeat')
  await setNumber(page, times)
  await addByClick(page, 'wait')
  await addByClick(page, 'dec')
  await addByClick(page, 'cast')
}

async function runAndWait(page: Page, info: TestInfo, where: 'stage' | 'script' = 'script') {
  await runButton(page, info, where).click()
  await expect(page.getByTestId('ws-feedback-conclusion').or(page.getByTestId('l5-not-judged'))).toBeVisible({timeout: 60_000})
}

/**
 * 壳只显示每层的文字，不在 DOM 上暴露 passed 属性。所以“这一层通过 / 没通过”断言课程判定写出的那句话（judge.ts 的固定措辞），
 * 并同时断言另一种说法不存在。
 */
const LAYER_TEXT = {
  stage: {pass: /倒计时从大于 0 一路数到了 0 秒/, fail: /倒计时没有开始|不应该变成负数|没有数到 0/},
  task: {pass: /本次任务达标/, fail: /本次任务未达标/},
  knowledge: {pass: /本次程序满足判断要求/, fail: /没有满足判断要求|没有看到/},
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

const programAttr = async (page: Page) => (await page.getByTestId('l5-script-host').getAttribute('data-program-json'))!
const programOf = async (page: Page) => JSON.parse(await programAttr(page))
const draftKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kidscoding-draft')))
/** 数字框改完后，工作区同步到程序要一点时间：轮询到期望的结构再往下。 */
const expectProgram = (page: Page, expected: unknown) => expect.poll(() => programOf(page)).toEqual(expected)

type P = {t: string; [k: string]: unknown}
const setT = (value: number): P => ({t: 'setTime', value})
const waitS = (secs = 1): P => ({t: 'wait', secs})
const decBy = (by = 1): P => ({t: 'decrease', by})
const cast: P = {t: 'broadcast'}
const untilZ = (...body: P[]): P => ({t: 'untilZero', body})
const repN = (times: number, ...body: P[]): P => ({t: 'repeat', times, body})
const flag = (...body: P[]) => ({scripts: [{hat: 'flag', body}]})
const standard = (start = 10) => flag(setT(start), untilZ(waitS(), decBy()), cast)

const stage = (page: Page) => page.getByTestId('l5-stage')

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}]`, () => {
    test.use({viewport: {...vp.viewport}, hasTouch: vp.hasTouch, isMobile: vp.isMobile})

    test.describe('G2-U3-L05 课堂：三端真实操作', () => {
      test.setTimeout(240_000)

      test('首屏五要素与任务：本课名称、学什么、解决什么、学完能做什么、与上节课联系、当前步骤', async ({page}, info) => {
        await open(page)
        await expect(page.getByTestId('ws-topbar')).toContainText('倒计时游戏结束')
        await expect(page.getByTestId('ws-goal-current')).toContainText('今天学')
        await page.getByTestId('ws-goal-expand').click()
        const goals = page.getByTestId('ws-goal5')
        await expect(goals).toContainText('今天学')
        await expect(goals).toContainText('要解决的问题')
        await expect(goals).toContainText('学完你能')
        await expect(goals).toContainText('上节课')
        await expect(goals).toContainText('现在要做')
        if (isPhone(info)) await expect(page.getByTestId('l5-task-bar-text')).toContainText('先写下你的预测')
        await openTask(page, info)
        await expect(page.getByTestId('l5-task-content')).toContainText('先猜一猜')
        await expect(page.getByTestId('l5-task-content')).toContainText('现在要做')
        // 探索关一进来舞台就显示本关起点与得分 0，还没运行过
        await expect(stage(page)).toHaveAttribute('data-time-left', '10')
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await expect(stage(page)).toHaveAttribute('data-over', 'false')
        await noHorizontalOverflow(page)
      })

      test('VM 自托管：沙箱只加载本站的 scratch-vm 与 storage（本课没有渲染器），没有任何请求发往站外', async ({page}) => {
        const external: string[] = []
        page.on('request', r => { const u = r.url(); if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(u) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u) })
        await open(page)
        await expect.poll(() => external).toEqual([])
        const requestedSrcs = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name))
        expect(requestedSrcs.some(u => u.includes('scratch-render'))).toBe(false)
      })

      test('第一关：不写预测不能运行；预测后运行演示程序——timeLeft 变成 -5、得分停在 19，并与预测对照', async ({page}, info) => {
        await open(page)
        await expect(page.getByTestId('l5-readonly-note')).toBeVisible()
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('ws-run-error')).toContainText('预测')
        await expect(stage(page)).toHaveAttribute('data-time-left', '10')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await openTask(page, info)
        await page.getByTestId('l5-pred-time').fill('-5')
        await page.getByTestId('l5-pred-after-no').check()
        await runAndWait(page, info, 'stage')
        // 演示程序固定重复 15 次：从 10 一直减到 -5 才停，广播时得分已经 19
        await expect(stage(page)).toHaveAttribute('data-time-left', '-5')
        await expect(stage(page)).toHaveAttribute('data-score', '19')
        await expect(stage(page)).toHaveAttribute('data-over', 'true')
        await expect(page.getByTestId('l5-pred-compare')).toContainText('你预测 timeLeft 最后是 -5')
        await expect(page.getByTestId('l5-pred-compare')).toContainText('这一次真实运行是 -5')
        await expect(page.getByTestId('l5-pred-compare')).toContainText('没有再变')
        // 第一关是观察，不下“达标”结论；三层如实显示：舞台数过了头、任务没达标、没有判断证据
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('这一关是观察')
        await expect(page.getByTestId('ws-feedback-conclusion')).not.toContainText('任务达标')
        await expectLayer(page, 'stage', false)
        await expectLayer(page, 'task', false)
        await expectLayer(page, 'knowledge', false)
        await expect(page.getByTestId('l5-level-explore')).toHaveAttribute('data-done', 'true')
        // 同一个演示程序再跑一遍，结果一模一样（虚拟时钟确定性）
        await runAndWait(page, info, 'stage')
        await expect(stage(page)).toHaveAttribute('data-time-left', '-5')
        await expect(stage(page)).toHaveAttribute('data-score', '19')
      })

      test('第一关运行中停止：明确“不判定”，演示程序保留', async ({page}, info) => {
        await open(page)
        await openTask(page, info)
        await page.getByTestId('l5-pred-time').fill('0')
        await page.getByTestId('l5-pred-after-yes').check()
        await runButton(page, info, 'stage').click()
        await expect(runButton(page, info, 'stage')).toHaveText('停止', {timeout: 15_000})
        await runButton(page, info, 'stage').click()
        await expect(page.getByTestId('l5-not-judged')).toContainText('运行被停止')
        await expect(page.getByTestId('l5-run-notice')).toContainText('已停止')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(page.getByTestId('l5-level-explore')).toHaveAttribute('data-done', 'false')
      })

      test('第二关空程序运行：舞台不过——倒计时没有开始', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await runAndWait(page, info)
        await expectLayer(page, 'stage', false)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('倒计时没有开始')
        await expectConclusion(page, false)
        await expect(page.getByTestId('l5-level-solve')).toHaveAttribute('data-done', 'false')
      })

      test('第二关标准做法：三层全过、得分 19、广播后得分不再变；通过后随便改一块积木，通过立刻作废', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildStandard(page)
        await expectProgram(page, standard())
        await runAndWait(page, info)
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'task', true)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
        await expect(stage(page)).toHaveAttribute('data-time-left', '0')
        await expect(stage(page)).toHaveAttribute('data-score', '19')
        await expect(stage(page)).toHaveAttribute('data-over', 'true')
        await expect(page.getByTestId('l5-level-solve')).toHaveAttribute('data-done', 'true')
        await openTask(page, info)
        await expect(page.getByTestId('l5-after')).toBeVisible()
        await expect(page.getByTestId('l5-alternatives')).toBeVisible()
        // 改一个数字（把起点改成 9）：旧结论立刻作废。先点工作区空白处收起分类抽屉，免得它盖住积木
        const wsBox = (await page.getByTestId('l5-blockly').boundingBox())!
        await page.mouse.click(wsBox.x + wsBox.width - 60, wsBox.y + wsBox.height - 80)
        await page.locator('.blocklyWorkspace > .blocklyBlockCanvas text.blocklyText', {hasText: '将 timeLeft 设为'}).first().click()
        await setNumber(page, 9)
        await expectProgram(page, standard(9))
        await expectResultCleared(page)
        await expect(page.getByTestId('l5-level-solve')).toHaveAttribute('data-done', 'false')
        // 起点 9 再运行：舞台过（数到了 0），任务不过（本关从 10 秒开始）
        await runAndWait(page, info)
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'task', false)
        await expect(page.getByTestId('ws-feedback-task')).toContainText('10 秒开始')
      })

      test('第二关固定重复 10 次：行为全对，只有知识证据不过——这正是不能写死次数的原因', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRepeat(page, 10)
        await expectProgram(page, flag(setT(10), repN(10, waitS(), decBy()), cast))
        await runAndWait(page, info)
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'task', true)
        await expectLayer(page, 'knowledge', false)
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('写死的次数')
        await expectConclusion(page, false)
        await expect(stage(page)).toHaveAttribute('data-score', '19')
      })

      test('第二关固定重复 15 次：数过了头变成 -5，舞台与任务都不过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildRepeat(page, 15)
        await runAndWait(page, info)
        await expectLayer(page, 'stage', false)
        await expectLayer(page, 'task', false)
        await expect(stage(page)).toHaveAttribute('data-time-left', '-5')
      })

      test('第二关忘广播：倒计时数完了也不算结束，任务不过', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await addByClick(page, 'flag')
        await addByClick(page, 'set')
        await addByClick(page, 'until')
        await addByClick(page, 'wait')
        await addByClick(page, 'dec')
        await expectProgram(page, flag(setT(10), untilZ(waitS(), decBy())))
        await runAndWait(page, info)
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'task', false)
        await expect(page.getByTestId('ws-feedback-task')).toContainText('一次都没有广播')
      })

      test('第三关：只数 6 秒——标准做法只改起点就通过；提示三条逐条出现', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'transferShort')
        await openTask(page, info)
        await page.getByTestId('l5-next-hint').click()
        await expect(page.getByTestId('l5-hint-1')).toBeVisible()
        await page.getByTestId('l5-next-hint').click()
        await expect(page.getByTestId('l5-hint-2')).toBeVisible()
        await page.getByTestId('l5-next-hint').click()
        await expect(page.getByTestId('l5-hint-3')).toBeVisible()
        await expect(page.getByTestId('l5-next-hint')).toHaveCount(0)
        await buildStandard(page, 6)
        await expectProgram(page, standard(6))
        await runAndWait(page, info)
        await expectLayer(page, 'stage', true)
        await expectLayer(page, 'task', true)
        await expectLayer(page, 'knowledge', true)
        await expectConclusion(page, true)
        await expect(stage(page)).toHaveAttribute('data-time-left', '0')
        await expect(page.getByTestId('l5-level-transferShort')).toHaveAttribute('data-done', 'true')
      })

      test('角色栏：水果的脚本是课程带来的（倒计时一到 0 得分自己停），舞台没有脚本', async ({page}, info) => {
        await open(page)
        await showRoles(page, info)
        await page.getByTestId('l5-role-fruit').click()
        await expect(page.getByTestId('l5-fruit-note')).toContainText('课程带来的')
        await page.getByTestId('l5-role-backdrop').click()
        await expect(page.getByTestId('l5-backdrop-note')).toContainText('舞台没有脚本')
        await page.getByTestId('l5-role-student').click()
        await expect(page.getByTestId('l5-script-host')).toBeVisible()
      })

      test('保存与刷新恢复：脚本、关卡、预测都在；损坏的草稿和别课的草稿一律拒绝', async ({page}, info) => {
        await open(page)
        await openTask(page, info)
        await page.getByTestId('l5-pred-time').fill('-5')
        await page.getByTestId('l5-pred-after-no').check()
        await goLevel(page, 'solve')
        await buildStandard(page)
        await expectProgram(page, standard())
        // 等共享壳的自动保存真的落盘再刷新（保存是异步的，立刻刷新会把还没保存的编辑丢掉）
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
        await page.evaluate(() => sessionStorage.setItem('l5-keep', '1'))
        await page.reload()
        await expect(page.getByTestId('l5-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('l5-level-solve')).toHaveAttribute('aria-current', 'step')
        await expectProgram(page, standard())
        await expect.poll(() => draftKeys(page)).toEqual([DRAFT_KEY])
        // 草稿里不含运行结果：没运行过就不会有“已通过”，舞台回到本关起点
        await expect(page.getByTestId('l5-level-solve')).toHaveAttribute('data-done', 'false')
        await expect(stage(page)).toHaveAttribute('data-time-left', '10')
        // 预测也恢复了：切回第一关，两个预测都还在
        await goLevel(page, 'explore')
        await openTask(page, info)
        await expect(page.getByTestId('l5-pred-time')).toHaveValue('-5')
        await expect(page.getByTestId('l5-pred-after-no')).toBeChecked()
        // 损坏的草稿：不是 JSON
        await page.evaluate(() => { localStorage.setItem('kidscoding-draft:G2-U3-L05', '{不是草稿'); sessionStorage.setItem('l5-keep', '1') })
        await page.reload()
        await expect(page.getByTestId('l5-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('l5-level-explore')).toHaveAttribute('aria-current', 'step')
        // 别课的草稿（lessonId 对不上）：同样拒绝，回到初始状态
        await page.evaluate(() => {
          localStorage.setItem('kidscoding-draft:G2-U3-L05', JSON.stringify({lessonId: 'G2-U3-L04', savedAt: new Date().toISOString(), script: {version: 1, levelId: 'solve', levels: {}, explore: {time: '', after: ''}}}))
          sessionStorage.setItem('l5-keep', '1')
        })
        await page.reload()
        await expect(page.getByTestId('l5-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('l5-level-explore')).toHaveAttribute('aria-current', 'step')
      })

      test('重新开始本关：脚本清空、舞台回到本关起点', async ({page}, info) => {
        await open(page)
        await goLevel(page, 'solve')
        await buildStandard(page)
        await runAndWait(page, info)
        await expectConclusion(page, true)
        await openTask(page, info)
        await page.getByTestId('l5-reset-level').click()
        await expectProgram(page, {scripts: []})
        await expect(stage(page)).toHaveAttribute('data-time-left', '10')
        await expect(stage(page)).toHaveAttribute('data-score', '0')
        await expect(page.getByTestId('l5-level-solve')).toHaveAttribute('data-done', 'false')
      })
    })

    test.describe('G2-U3-L05 课堂：视口专属', () => {
      test.setTimeout(240_000)

      test('手机：工具栏的添加 / 上移 / 下移 / 删除 / 数字框都在首屏、可点、可改；任务折叠成一行但任务、提示、预测一个不少', async ({page}, info) => {
        test.skip(!isPhone(info), '仅手机视口')
        await open(page)
        // 首屏几何断言（F3 整改）：不只看 toBeVisible——关键操作必须完整落在 375×812 视口内，
        // 且中心点命中自己（没有被站点底部导航等固定层遮挡）。粘性运行按钮是脚本区内运行入口。
        const geo = await page.evaluate(() => {
          const probe = (tid: string) => {
            const el = document.querySelector(`[data-testid="${tid}"]`)
            if (!el) return { tid, missing: true as const }
            const r = el.getBoundingClientRect()
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
            return {
              tid, missing: false as const,
              within: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
              covered: !(hit === el || el.contains(hit)),
              bottom: Math.round(r.bottom), viewportH: window.innerHeight,
            }
          }
          return [probe('ws-sticky-run'), probe('ws-run-toggle')]
        })
        for (const g of geo) {
          expect(g.missing, `${g.tid} 应存在`).toBe(false)
          if (!g.missing) {
            expect(g.within, `${g.tid} 应完整落在视口内（bottom=${g.bottom}/${g.viewportH}）`).toBe(true)
            expect(g.covered, `${g.tid} 中心点不应被其他固定层遮挡`).toBe(false)
          }
        }
        await goLevel(page, 'solve')
        for (const id of ['l5-add-block', 'l5-move-up', 'l5-move-down', 'l5-delete', 'l5-number']) {
          await expect(page.getByTestId(id)).toBeVisible()
        }
        await expect(page.getByTestId('l5-task-bar-text')).toContainText('搭好脚本')
        await openTask(page, info)
        await expect(page.getByTestId('l5-task-content')).toContainText('现在要做')
        await expect(page.getByTestId('l5-next-hint')).toBeVisible()
        await noHorizontalOverflow(page)
      })

      test('桌面：从分类面板拖出积木拼成标准做法并运行通过；再把“重复直到”拖进循环里会被明确拒绝', async ({page}, info) => {
        test.skip(vpOf(info) !== 'desktop', '仅桌面视口（真实指针拖放）')
        await open(page)
        await goLevel(page, 'solve')
        const ws = page.getByTestId('l5-blockly')
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
        // 量积木的整体外框（按它自己的第一行文字找组），落点按外框算比按文字行算稳：
        // “减少”要落在“等待”的下缘（循环体内侧），“广播”要落在整个循环的下缘外侧，差几像素就会吸到另一条连接上。
        const blockBox = async (firstText: string) => page.evaluate((t) => {
          const groups = [...document.querySelectorAll('.blocklyBlockCanvas g.blocklyDraggable')]
          const g = groups.find(el => el.querySelector('text')?.textContent?.trim().startsWith(t))
          if (!g) return null
          const r = (g as unknown as SVGGraphicsElement).getBoundingClientRect()
          return {x: r.x, y: r.y, width: r.width, height: r.height}
        }, firstText)
        await dragFromToolbox('事件', '当绿旗被点击', {x: wsBox.x + 300, y: wsBox.y + 40})
        const flagLabel = await label('当绿旗被点击')
        await dragFromToolbox('变量', '将 timeLeft 设为', {x: flagLabel.x - 6, y: flagLabel.y + flagLabel.height + 8})
        const setLabel = await label('将 timeLeft 设为')
        await dragFromToolbox('控制', '重复执行', {x: setLabel.x - 6, y: setLabel.y + setLabel.height + 8})
        const untilLabel = await label('重复执行')
        await dragFromToolbox('控制', '等待', {x: untilLabel.x + 12, y: untilLabel.y + untilLabel.height + 8})
        const waitBox = (await blockBox('等待'))!
        await dragFromToolbox('变量', '将 timeLeft 减少', {x: waitBox.x + 8, y: waitBox.y + waitBox.height - 6})
        const untilBox = (await blockBox('重复执行'))!
        await dragFromToolbox('事件', '广播', {x: untilBox.x + 2, y: untilBox.y + untilBox.height + 2})
        await expectProgram(page, standard())
        // 拖放结束后分类面板的抽屉可能还盖着工作区：点一下工作区空白处收起
        await page.mouse.click(wsBox.x + wsBox.width - 60, wsBox.y + wsBox.height - 80)
        await page.getByTestId('ws-run-toggle').click()
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 60_000})
        await expectConclusion(page, true)
        await expect(stage(page)).toHaveAttribute('data-score', '19')

        // 再拖一块“重复执行直到”向现有循环的身体里放：它的连接类型是 chain、循环体只收 leaf，
        // 所以它根本接不进去（这是连接层面的拒绝，不是先放进去再报错）。拖完之后循环身体里仍然只有等待和减少。
        const waitLabel2 = await label('等待')
        await dragFromToolbox('控制', '重复执行', {x: waitLabel2.x + 12, y: waitLabel2.y + waitLabel2.height + 8})
        await expect.poll(async () => {
          const p = await programOf(page)
          const inner = (p.scripts[0].body as P[]).find(b => b.t === 'untilZero')
          return inner?.body
        }).toEqual([{t: 'wait', secs: 1}, {t: 'decrease', by: 1}])
        // 拖进来的积木只会落在链尾或成为不运行的散积木：删掉它（拖放后它被选中），可运行脚本回到标准做法
        await page.getByTestId('l5-delete').click()
        await expect.poll(async () => (await programOf(page)).scripts[0]).toEqual(standard().scripts[0])
      })
    })
  })
}
