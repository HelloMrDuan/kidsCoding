// G2-U3-L02《接住掉落水果》正式页面（共享 LessonWorkspace + 本课适配器与三个槽位）真实浏览器测试。
// 桌面 1440 / 平板 768 / 手机 375，三个视口都在本文件里设置（不依赖 Playwright project 的个数）。
// 页面里的 Scratch VM 是真实的 scratch-vm@5.0.300（CI 走 jsDelivr；本地用 SCRATCH_VM_LOCAL_CDN=1 + 本地副本）。
// 积木由真实 Blockly 工作区编辑（桌面用真实指针拖放），运行走真实 VM 沙箱，判定读 VM 的运行轨迹。
//
// 从过渡课堂页迁移到共享壳时：用例标题、操作步骤、断言的内容都保持不变，只把定位从 l2-* 换成壳的 ws-*（壳拥有的界面：
// 顶栏、保存标签、文件菜单、运行按钮、反馈区）。壳的语义与旧页面不同、因而断言形式必须改变的地方，都在用例里用“壳语义：”注释说明。
import {readFileSync} from 'node:fs'
import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test'
import {routeLocalScratchVm} from './scratch-g2-helpers'

const URL = '/learn/g2-u3-l02'
const DRAFT_KEY = 'kidscoding-draft:G2-U3-L02'

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
  await routeLocalScratchVm(page)
  if (opts.fresh !== false) await page.addInitScript(() => { if (!sessionStorage.getItem('l2-keep')) localStorage.removeItem('kidscoding-draft:G2-U3-L02') })
  await page.goto(URL)
  await expect(page.getByTestId('l2-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
}

// 三个视口写在 spec 里（桌面 1440 / 平板 768 / 手机 375），不依赖 Playwright 配置里有几个 project：
// 仓库 CI 的浏览器 Job 统一用 `--project=desktop`，这样在 CI 里也能覆盖三端。
const VIEWPORTS = [
  {name: 'desktop', viewport: {width: 1440, height: 900}, hasTouch: false, isMobile: false},
  {name: 'tablet', viewport: {width: 768, height: 1024}, hasTouch: true, isMobile: false},
  {name: 'phone', viewport: {width: 375, height: 812}, hasTouch: true, isMobile: true},
] as const
type ViewportName = (typeof VIEWPORTS)[number]['name']
/** 从用例标题路径里读出当前视口（`[phone] ...`）。 */
const vpOf = (info: TestInfo): ViewportName => {
  const hit = VIEWPORTS.find(v => info.titlePath.some(t => t === `[${v.name}]`))
  if (!hit) throw new Error('用例不在任何视口分组里')
  return hit.name
}
const isPhone = (info: TestInfo) => vpOf(info) === 'phone'

/**
 * 任务内容（说明、预测、三级提示、事后反思）在编辑槽位里：手机上默认折叠成一行任务栏（让积木编辑区留在首屏），
 * 要读或填就先展开；桌面、平板本来就展开。
 */
async function openTask(page: Page, info: TestInfo) {
  if (isPhone(info) && !(await page.getByTestId('l2-task-fold-body').isVisible())) await page.getByTestId('l2-task-toggle').click()
  await expect(page.getByTestId('l2-task-content')).toBeVisible()
}

/** 共享壳的运行按钮：手机在脚本区上方有粘性运行行（始终在视口里），其余视口用舞台下方的运行条。 */
function runButton(page: Page, info: TestInfo, where: 'stage' | 'script') {
  return page.getByTestId(where === 'script' && isPhone(info) ? 'ws-sticky-run' : 'ws-run-toggle')
}

/** 手机上角色栏默认收起，要点“展开角色”；平板、桌面始终显示。 */
async function showRoles(page: Page, info: TestInfo) {
  if (isPhone(info) && !(await page.getByTestId('l2-role-fruit').isVisible())) await page.getByTestId('ws-roles-toggle').click()
}

async function goLevel(page: Page, level: string) {
  await page.getByTestId(`l2-level-${level}`).click()
  await expect(page.getByTestId(`l2-level-${level}`)).toHaveAttribute('aria-current', 'step')
}

/** 通过抽屉点击添加积木（手机、平板、桌面通用的真实操作）。 */
async function addByClick(page: Page, type: 'flag' | 'move' | 'repeat') {
  if (!(await page.getByTestId('l2-palette').isVisible())) await page.getByTestId('l2-add-block').click()
  await page.getByTestId(`l2-add-${type}`).click()
}

async function setSelectedNumber(page: Page, value: number) {
  const box = page.getByTestId('l2-number')
  await expect(box).toBeEnabled()
  await box.fill(String(value))
}

/** 搭：绿旗 → 重复 times 次 → 里面一块“将 x 坐标增加 dx”。全部通过抽屉点击和数字框完成。 */
async function buildLoop(page: Page, times: number, dx: number) {
  await addByClick(page, 'flag')
  await addByClick(page, 'repeat')
  await setSelectedNumber(page, times)
  await addByClick(page, 'move') // 选中的是重复 → 加进重复里面
  await setSelectedNumber(page, dx)
}

async function runAndWait(page: Page, info: TestInfo, where: 'stage' | 'script' = 'script') {
  await runButton(page, info, where).click()
  await expect(page.getByTestId('ws-feedback-conclusion').or(page.getByTestId('l2-not-judged'))).toBeVisible({timeout: 30_000})
}

/**
 * 壳语义：壳只显示每层的文字，不在 DOM 上暴露 passed 属性（旧页面有 data-passed）。
 * 所以“这一层通过 / 没通过”改为断言课程判定写出的那句话（judge.ts 的固定措辞），并同时断言另一种说法不存在。
 */
const LAYER_TEXT = {
  stage: {pass: /接到了水果/, fail: /没接到水果/},
  task: {pass: /本次任务达标/, fail: /本次任务未达标/},
  knowledge: {pass: /本次程序满足循环应用要求/, fail: /没有满足循环应用要求/},
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
  await expect(c).toContainText(passed ? /任务达标，也满足了循环应用要求/ : /还没达到要求/)
  await expect(c).not.toContainText(passed ? /还没达到要求/ : /任务达标，也满足了循环应用要求/)
}
/** 旧结果被清掉：壳在编辑后显示“旧判定已失效”，并且不再有结论。 */
async function expectResultCleared(page: Page) {
  await expect(page.getByTestId('ws-judgment-stale')).toBeVisible()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, '页面不应出现横向溢出').toBeLessThanOrEqual(1)
}

const programAttr = async (page: Page) => (await page.getByTestId('l2-script-host').getAttribute('data-program'))!
const draftKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kidscoding-draft')))

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}]`, () => {
    test.use({viewport: {...vp.viewport}, hasTouch: vp.hasTouch, isMobile: vp.isMobile})
  test.describe('G2-U3-L02 课堂：三端真实操作', () => {
    test.setTimeout(150_000)

    test('首屏五要素与任务：本课名称、学什么、解决什么、学完能做什么、与上节课联系、当前步骤', async ({page}, info) => {
      await open(page)
      await expect(page.getByTestId('ws-topbar')).toContainText('接住掉落水果')
      // 壳语义：五要素在“当前目标”条里，默认只显示第 1 条，点“展开全部 5 个目标”后五条齐全。
      await expect(page.getByTestId('ws-goal-current')).toContainText('今天学')
      await page.getByTestId('ws-goal-expand').click()
      const goals = page.getByTestId('ws-goal5')
      await expect(goals).toContainText('今天学')
      await expect(goals).toContainText('要解决的问题')
      await expect(goals).toContainText('学完你能')
      await expect(goals).toContainText('上节课')
      await expect(goals).toContainText('现在要做')
      // 当前步骤（本关“现在要做”）：桌面 / 平板在任务内容里，手机在任务栏里（一行）。
      if (isPhone(info)) await expect(page.getByTestId('l2-task-bar-text')).toContainText('先写下你的预测')
      await openTask(page, info)
      await expect(page.getByTestId('l2-task-content')).toContainText('先猜一猜')
      await expect(page.getByTestId('l2-task-content')).toContainText('现在要做')
      await noHorizontalOverflow(page)
    })

    test('完整答案不在开始操作前出现；提示按 1→2→3 逐级揭示', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await openTask(page, info)
      await expect(page.getByTestId('l2-hint-1')).toHaveCount(0)
      await expect(page.getByTestId('l2-after')).toHaveCount(0)
      await expect(page.getByTestId('l2-alternatives')).toHaveCount(0)
      await expect(page.getByTestId('l2-own-solution')).toHaveCount(0)
      await page.getByTestId('l2-next-hint').click()
      await expect(page.getByTestId('l2-hint-1')).toBeVisible()
      await expect(page.getByTestId('l2-hint-2')).toHaveCount(0)
      await page.getByTestId('l2-next-hint').click()
      await expect(page.getByTestId('l2-hint-2')).toBeVisible()
      await expect(page.getByTestId('l2-hint-3')).toHaveCount(0)
      await page.getByTestId('l2-next-hint').click()
      await expect(page.getByTestId('l2-hint-3')).toBeVisible()
      const all = await page.getByTestId('l2-task-content').innerText()
      expect(all).not.toMatch(/3\s*[×x*]\s*50|重复\s*3\s*次/)
    })

    test('第一层：不写预测不能运行；预测后运行，对比预测与真实结果', async ({page}, info) => {
      await open(page)
      // 壳语义：壳自己的运行按钮不知道“要先写预测”，所以不会置灰；点它时适配器同步拒绝并给出原因（壳显示 ws-run-error），
      // 舞台不动、不判定。课程自己的工具栏运行按钮（≥768px）仍然置灰并写明原因。
      await runButton(page, info, 'stage').click()
      await expect(page.getByTestId('ws-run-error')).toContainText('预测')
      await expect(page.getByTestId('l2-stage')).toHaveAttribute('data-basket-x', '0')
      await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
      await expect(runButton(page, info, 'stage')).toHaveText('运行作品')
      await openTask(page, info)
      await page.getByTestId('l2-pred-x').fill('40')
      await page.getByTestId('l2-pred-caught-no').check()
      await runButton(page, info, 'stage').click()
      await expect(page.getByTestId('ws-feedback-stage')).toBeVisible({timeout: 30_000})
      await expect(page.getByTestId('ws-feedback-stage')).toContainText('相差 60')
      await expect(page.getByTestId('ws-feedback-stage')).toContainText('没接到水果')
      await expect(page.getByTestId('l2-pred-compare')).toContainText('你预测篮子停在 x=40')
      await expect(page.getByTestId('l2-pred-compare')).toContainText('真实结果是篮子停在 x=40')
    })

    test('第二层：空脚本 / 只有绿旗 不能判通过；循环版通过；改脚本后结果立即清除', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      // 空程序
      await runAndWait(page, info)
      await expectLayer(page, 'task', false)
      await expectLayer(page, 'knowledge', false)
      await expectConclusion(page, false)
      // 只有绿旗
      await addByClick(page, 'flag')
      await expectResultCleared(page) // 加了积木：旧结果马上清掉
      await runAndWait(page, info)
      await expectConclusion(page, false)
      // 加循环，参数先故意错
      await addByClick(page, 'repeat')
      await setSelectedNumber(page, 3)
      await addByClick(page, 'move')
      await setSelectedNumber(page, 10)
      await runAndWait(page, info)
      await expectLayer(page, 'stage', false)
      await expectLayer(page, 'knowledge', true) // 循环确实在动
      await expectConclusion(page, false)
      // 改参数后旧结果立即消失
      await setSelectedNumber(page, 50)
      await expectResultCleared(page)
      await runAndWait(page, info)
      await expectLayer(page, 'stage', true)
      await expectLayer(page, 'task', true)
      await expectLayer(page, 'knowledge', true)
      await expectConclusion(page, true)
      // 统一措辞：舞台结果 / 任务结果 / 知识证据；通过时也不写“已掌握”，并明确“需要进一步解释或练习”
      await expect(page.getByTestId('ws-feedback-stage')).toContainText('舞台结果：')
      await expect(page.getByTestId('ws-feedback-stage')).toContainText('接到了水果')
      await expect(page.getByTestId('ws-feedback-task')).toContainText('任务结果：本次任务达标')
      await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('知识证据：本次程序满足循环应用要求')
      await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('需要进一步解释或练习')
      await expect(page.getByTestId('ws-feedback')).not.toContainText(/已(经)?掌握|学会了/)
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('data-done', 'true')
      // 通过后才出现“你的做法 / 别的做法”
      await openTask(page, info)
      await expect(page.getByTestId('l2-own-solution')).toContainText('重复执行 3 次')
      await expect(page.getByTestId('l2-alternatives')).toBeVisible()
      // 再改脚本：这一关不再算通过
      await setSelectedNumber(page, 20)
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('data-done', 'false')
    })

    test('只有舞台读 VM 状态：运行时篮子和水果真的在移动，停止后重跑不叠加', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, 3, 50)
      const stage = page.getByTestId('l2-stage')
      await expect(stage).toHaveAttribute('data-basket-x', '0')
      await expect(stage).toHaveAttribute('data-fruit-y', '150')
      await runButton(page, info, 'stage').click()
      await expect(stage).toHaveAttribute('data-basket-x', '150', {timeout: 30_000})
      await expectConclusion(page, true)
      const y = Number(await stage.getAttribute('data-fruit-y'))
      expect(y).toBeLessThanOrEqual(-130)
      // 再跑一次：从头开始，结果一样
      await runButton(page, info, 'stage').click()
      await expectConclusion(page, true)
      await expect(stage).toHaveAttribute('data-basket-x', '150')
    })

    test('保存与刷新恢复：脚本、关卡、预测都在；通过状态需要重新运行', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, 3, 50)
      await runAndWait(page, info)
      await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
      await page.evaluate(() => sessionStorage.setItem('l2-keep', '1'))
      await page.reload()
      await expect(page.getByTestId('l2-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('aria-current', 'step')
      await expect(page.getByTestId('ws-save-message')).toContainText('已恢复')
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('data-done', 'false') // 旧通过不被信任
      await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
      await expect(page.getByTestId('ws-feedback')).toContainText('暂无检查结果')
      // 恢复出来的脚本是真实的：直接运行就通过
      await runAndWait(page, info)
      await expectConclusion(page, true)
      const stored = await page.evaluate(() => localStorage.getItem('kidscoding-draft:G2-U3-L02'))
      expect(stored).toContain('"lessonId":"G2-U3-L02"')
      expect(stored).not.toContain('landing')
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

    test('第三层迁移：水果在左边，复制第二关的数字会漏接，改成负数才接住', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'transferLeft')
      await buildLoop(page, 3, 50) // 照抄上一关
      await runAndWait(page, info)
      await expectLayer(page, 'stage', false)
      await expectConclusion(page, false)
      await setSelectedNumber(page, -40) // 选中的是里面的 move
      await runAndWait(page, info)
      await expectConclusion(page, true)
      await expect(page.getByTestId('l2-stage')).toHaveAttribute('data-basket-x', '-120')
    })

    test('第三层迁移：水果更快，慢慢走来不及，大步才接得住', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'transferFast')
      await buildLoop(page, 15, 10)
      await runAndWait(page, info)
      await expectLayer(page, 'stage', false)
      await expect(page.getByTestId('ws-feedback-stage')).toContainText('第 10 帧')
      // 水果第 10 帧落地：重复最多只有 10 圈算数。每次改成 15，10 圈走到 150，接得住。
      await setSelectedNumber(page, 15)
      await runAndWait(page, info)
      await expectConclusion(page, true)
      await expect(page.getByTestId('l2-stage')).toHaveAttribute('data-basket-x', '150')
    })

    test('关卡与课程切换不污染：切关清掉结果；每关脚本独立；返回后原脚本还在', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, 3, 50)
      await runAndWait(page, info)
      await expectConclusion(page, true)
      await goLevel(page, 'transferLeft')
      await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
      await expect(page.getByTestId('l2-situation')).toContainText('x=-100')
      await expect(page.getByTestId('l2-level-transferLeft')).toHaveAttribute('data-done', 'false')
      await goLevel(page, 'solve')
      await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0) // 回来也要重新运行，不沿用旧结果
      await runAndWait(page, info)
      await expectConclusion(page, true)
    })

    test('运行中停止：不判定、脚本保留；停止后重跑结果与首次一致', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, 3, 50)
      const run = runButton(page, info, 'script')
      await run.click()
      await expect(run).toHaveText('停止')
      await run.click() // 同一个按钮切换为停止
      await expect(page.getByTestId('l2-not-judged')).toBeVisible({timeout: 30_000})
      await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
      await expect(run).toHaveText('运行作品')
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('data-done', 'false')
      await runAndWait(page, info)
      await expectConclusion(page, true)
    })

    test('文件菜单：保存、导出、导入、重新开始本关；导入错课节作品被拒绝', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, 3, 50)
      await page.getByTestId('ws-file-menu-button').click()
      // 壳语义：本课不能“新建”（一课一份作品），菜单里不出现“新建”。
      await expect(page.getByTestId('ws-file-new')).toHaveCount(0)
      await page.getByTestId('ws-file-save').click()
      await expect(page.getByTestId('ws-save-chip')).toContainText('已保存')
      await expect(page.getByTestId('ws-file-menu')).toHaveCount(0) // 选后自动关闭
      await page.getByTestId('ws-file-menu-button').click()
      // 壳语义：导出文件名由壳按课程编号命名（旧页面用课程名）；内容是本课的草稿。
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('ws-file-export').click()])
      expect(download.suggestedFilename()).toContain('G2-U3-L02')
      await expect(page.getByTestId('ws-file-menu')).toHaveCount(0) // 选后自动关闭
      // “重新开始本关”：课程自己的按钮，只清空当前这一关（壳的“恢复初始”是整份作品回到起点，见下一个用例的后半段）。
      await openTask(page, info)
      await page.getByTestId('l2-reset-level').click()
      await runAndWait(page, info)
      await expectConclusion(page, false) // 清空后是空程序
      // 导入错课节文件：壳把任意 JSON 交给槽位，槽位拒绝，作品不变，并如实告诉学生
      await page.getByTestId('ws-file-input').setInputFiles({name: 'wrong.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({lessonId: 'A1-U3-L02', script: {}}))})
      await expect(page.getByTestId('l2-import-error')).toContainText('不是“接住掉落水果”')
      // 导入刚导出的文件：脚本回来
      const path = await download.path()
      await page.getByTestId('ws-file-input').setInputFiles(path)
      await expect(page.getByTestId('l2-import-error')).toHaveCount(0)
      await runAndWait(page, info)
      await expectConclusion(page, true)
      // 壳的“恢复初始”：整份作品（所有关卡的脚本、预测）回到课程起点，回到第一关；保存的草稿随之变成起点
      await page.getByTestId('ws-file-menu-button').click()
      await page.getByTestId('ws-file-reset').click()
      await expect(page.getByTestId('l2-level-explore')).toHaveAttribute('aria-current', 'step')
      await goLevel(page, 'solve')
      await expect.poll(async () => (await programAttr(page))).toBe(JSON.stringify({scripts: []}))
      await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    })

    test('角色管理：点选水果只读查看它的下落脚本，篮子脚本不受影响', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, 3, 50)
      await showRoles(page, info)
      await page.getByTestId('l2-role-fruit').click()
      await expect(page.getByTestId('l2-fruit-script')).toContainText('将 y 坐标增加 -10')
      await expect(page.getByTestId('l2-toolbar')).toHaveCount(0)
      await page.getByTestId('l2-role-basket').click()
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
      expect(box!.height).toBeGreaterThanOrEqual(36) // 触摸可点
      const hit = await page.evaluate(({x, y}) => {
        const el = document.elementFromPoint(x, y)
        return el?.closest('[data-testid]')?.getAttribute('data-testid') ?? el?.tagName
      }, {x: box!.x + box!.width / 2, y: box!.y + box!.height / 2})
      expect(hit, '运行按钮中心点不应被别的元素遮挡').toMatch(/^ws-(run-toggle|sticky-run)/)
      await info.attach(`${vpOf(info)}-script.png`, {body: await page.screenshot(), contentType: 'image/png'})
    })

    test('手机默认首屏能看见可操作的积木编辑区；任务折叠成一行但任务、提示、预测一个不少', async ({page}, info) => {
      test.skip(!isPhone(info), '首屏编辑区是手机布局裁定，只在手机视口验证')
      await open(page)
      await goLevel(page, 'solve')
      const vh = page.viewportSize()!.height
      const NAV = 62 // 全局底部导航固定在视口底部（--kc-mobile-nav-height）
      // 工具栏五个控件在同一行、都在首屏，并且不被底部导航遮住
      for (const id of ['l2-add-block', 'l2-move-up', 'l2-move-down', 'l2-delete', 'l2-number']) {
        const b = (await page.getByTestId(id).boundingBox())!
        expect(b.y, `${id} 在首屏`).toBeGreaterThanOrEqual(0)
        expect(b.y + b.height, `${id} 不被底部导航遮住`).toBeLessThanOrEqual(vh - NAV)
        expect(b.height, `${id} 触控高度`).toBeGreaterThanOrEqual(36)
      }
      // 积木编辑区本身露出足够高度（至少 120px 可见、可点）
      const host = (await page.getByTestId('l2-script-host').boundingBox())!
      const visible = Math.min(host.y + host.height, vh - NAV) - Math.max(host.y, 0)
      expect(visible, '编辑区在首屏的可见高度').toBeGreaterThanOrEqual(120)
      // 任务栏只有一行，且仍然写着本关要做什么
      const bar = (await page.getByTestId('l2-task-bar').boundingBox())!
      expect(bar.height).toBeLessThanOrEqual(56)
      await expect(page.getByTestId('l2-task-bar-text')).toContainText('现在要做')
      await expect(page.getByTestId('l2-task-fold-body')).toBeHidden()
      // 展开后任务说明、三级提示按钮都在；第一关的预测输入也在
      await openTask(page, info)
      await expect(page.getByTestId('l2-next-hint')).toBeVisible()
      await page.getByTestId('l2-task-toggle').click() // 收起
      await expect(page.getByTestId('l2-task-fold-body')).toBeHidden()
      await goLevel(page, 'explore')
      await expect(page.getByTestId('l2-task-bar-text')).toHaveAttribute('data-needs-prediction', 'true')
      await expect(page.getByTestId('l2-task-toggle')).toHaveText('写预测')
      await openTask(page, info)
      await expect(page.getByTestId('l2-pred-x')).toBeVisible()
      await expect(page.getByTestId('l2-pred-caught-yes')).toBeVisible()
      await noHorizontalOverflow(page)
    })
  })

  // 证据截图：只有设置了 L02_SHOT_DIR 才执行，用于在 PR 里附三端真实截图（不影响 CI）。
  test.describe('G2-U3-L02 课堂：三端证据截图', () => {
    test.setTimeout(150_000)
    test('通过状态与失败状态截图', async ({page}, info) => {
      const dir = process.env.L02_SHOT_DIR
      test.skip(!dir, '未设置 L02_SHOT_DIR')
      const shot = (name: string) => page.screenshot({path: `${dir}/${vpOf(info)}-${name}.png`, fullPage: true})
      await open(page)
      await shot('1-first-visit')
      await goLevel(page, 'solve')
      await buildLoop(page, 2, 10) // 故意算错：2 × 10 = 20，离 150 太远
      await runAndWait(page, info)
      await shot('2-solve-fail')
      await setSelectedNumber(page, 75) // 选中的是里面的移动：2 × 75 = 150
      await runAndWait(page, info)
      await shot('3-solve-pass')
    })
  })

  test.describe('G2-U3-L02 课堂：桌面真实指针拖放（Blockly）', () => {
    test.setTimeout(150_000)
    test.beforeEach(async ({}, testInfo) => { test.skip(vpOf(testInfo) !== 'desktop', '拖放用鼠标指针，只在桌面视口验证') })

    test('从分类面板拖出积木到工作区并拼接，改参数后运行通过；拖到垃圾桶删除', async ({page}) => {
      await open(page)
      await goLevel(page, 'solve')
      const ws = page.getByTestId('l2-blockly')
      const wsBox = (await ws.boundingBox())!
      /** 从分类面板按住积木，拖到“积木左上角应该到达的位置”（按抓取点相对积木左上角的偏移换算）。 */
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
        await page.waitForTimeout(350) // 等 Blockly 的吸附动画落定再量位置
      }
      // 1) 绿旗：放在工作区中间偏上
      await dragFromToolbox('事件', '当绿旗被点击', {x: wsBox.x + 300, y: wsBox.y + 40})
      const main = '.blocklyWorkspace > .blocklyBlockCanvas'
      // 2) 重复执行：落在绿旗正下方（左边对齐，顶边接在绿旗底边）
      const flag = (await page.locator(`${main} > g.blocklyDraggable`).first().boundingBox())!
      await dragFromToolbox('控制', '重复执行', {x: flag.x, y: flag.y + flag.height})
      // 3) 将 x 坐标增加：落进“重复执行”的开口（开口在重复块左边 +18、顶边 +30 处）
      const rep = (await page.locator(`${main} > g.blocklyDraggable g.blocklyDraggable`).first().boundingBox())!
      await dragFromToolbox('运动', '将 x 坐标增加', {x: rep.x + 18, y: rep.y + 30})
      // 先断言真的拼成了“绿旗 → 重复 → 里面一块移动”，再改参数
      const programOf = async () => JSON.parse((await page.getByTestId('l2-script-host').getAttribute('data-program'))!)
      expect(await programOf()).toMatchObject({scripts: [{hat: 'flag', body: [{t: 'repeat', body: [{t: 'move'}]}]}]})
      // 点积木上的文字来选中它，用数字框改参数（和手机同一个编辑能力）
      const pick = async (label: string) => {
        const t = page.locator(`${main} text.blocklyText`, {hasText: label}).first()
        await t.click()
      }
      await pick('将 x 坐标增加')
      await expect(page.getByTestId('l2-number')).toHaveValue('10') // 选中的是“移动”（默认 10）
      await setSelectedNumber(page, 50)
      await pick('重复执行')
      await expect(page.getByTestId('l2-number')).toHaveValue('2') // 选中的是“重复”（默认 2）
      await setSelectedNumber(page, 3)
      await page.getByTestId('ws-run-toggle').click()
      await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
      // 积木真的拼在了一起：没拼好就是散积木，不会运行，结论必然是未通过
      await expectConclusion(page, true)
      await expect(page.getByTestId('l2-stage')).toHaveAttribute('data-basket-x', '150')

      // 拖到垃圾桶删除：把“将 x 坐标增加”拖进垃圾桶，脚本里不再有这块，重新运行变成未通过
      await page.locator('.blocklyTrash').first().scrollIntoViewIfNeeded() // 壳的布局里垃圾桶可能在首屏之外：先滚到可见，再量坐标
      const trash = (await page.locator('.blocklyTrash').first().boundingBox())!
      const moveText = (await page.locator(`${main} text.blocklyText`, {hasText: '将 x 坐标增加'}).first().boundingBox())!
      await page.mouse.move(moveText.x + 4, moveText.y + moveText.height / 2)
      await page.mouse.down()
      await page.mouse.move(trash.x + trash.width / 2, trash.y + trash.height / 2, {steps: 16})
      await page.mouse.up()
      // 以程序结构为准（工具箱里也有同名积木，按文字数会数错）：移动积木被删掉，重复里面空了
      await expect.poll(async () => JSON.parse((await page.getByTestId('l2-script-host').getAttribute('data-program'))!))
        .toEqual({scripts: [{hat: 'flag', body: [{t: 'repeat', times: 3, body: []}]}]})
      await expectResultCleared(page) // 删除是编辑：旧结果马上清掉
      await page.getByTestId('ws-run-toggle').click()
      await expectConclusion(page, false)
    })
  })

  // ---- 草稿与适配器（原“槽位验证页”的用例迁到正式页面）-----------------------------------------
  test.describe('G2-U3-L02 正式页面：适配器与共享草稿', () => {
    test.setTimeout(150_000)
    test.skip(vp.name === 'tablet', '草稿与适配器用例只在桌面和手机视口验证')

    test('第一关：经壳运行，结论是“观察”，舞台来自真实 VM；草稿由共享 workspace-draft 写入，一课一键、不含运行结果', async ({page}, info) => {
      await open(page)
      await openTask(page, info)
      await page.getByTestId('l2-pred-x').fill('40')
      await page.getByTestId('l2-pred-caught-no').check()
      await runButton(page, info, 'stage').click()
      await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
      await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('这一关是观察：对一对你的预测和真实结果。')
      await expect(page.getByTestId('ws-feedback-conclusion')).not.toContainText('达标')
      await expect(page.getByTestId('l2-stage')).toHaveAttribute('data-basket-x', '40')
      await expect(page.getByTestId('ws-feedback-stage')).toContainText('舞台结果：')
      await expect(page.getByTestId('ws-feedback-task')).toContainText('任务结果：')
      await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('知识证据：')
      await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('需要进一步解释或练习')
      await expect(page.getByTestId('ws-feedback')).not.toContainText(/已(经)?掌握/)
      await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
      expect(await draftKeys(page)).toEqual([DRAFT_KEY])
      const env = JSON.parse((await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY))!)
      expect(env).toMatchObject({lessonId: 'G2-U3-L02', version: 1})
      expect(Object.keys(env.script).sort()).toEqual(['levelId', 'predictions', 'programs', 'version'])
      expect(JSON.stringify(env)).not.toMatch(/landing|passedAt|basketMoves/)
    })

    test('第二关：刷新后关卡与脚本从草稿恢复、旧结果不恢复；走完四关仍然只有一个草稿键', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, 3, 50)
      await runAndWait(page, info)
      await expectConclusion(page, true)
      const before = await programAttr(page)
      await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
      await page.evaluate(() => sessionStorage.setItem('l2-keep', '1'))
      await page.reload()
      await expect(page.getByTestId('l2-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('aria-current', 'step')
      await expect(page.getByTestId('ws-save-message')).toHaveText('已恢复草稿')
      expect(await programAttr(page)).toBe(before)
      await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
      for (const id of ['transferLeft', 'transferFast', 'explore', 'solve']) await goLevel(page, id)
      expect(await draftKeys(page)).toEqual([DRAFT_KEY])
    })

    test('不合法或损坏的草稿：不恢复、从课程起点开始、不覆盖已存的内容', async ({page}) => {
      const bad = JSON.stringify({lessonId: 'G2-U3-L02', savedAt: 'x', script: {version: 2, levelId: 'solve'}})
      await page.addInitScript(([key, value]) => {
        if (!sessionStorage.getItem('l2-seeded')) {
          sessionStorage.setItem('l2-seeded', '1')
          localStorage.setItem(key, value)
        }
      }, [DRAFT_KEY, bad])
      await open(page, {fresh: false})
      await expect(page.getByTestId('l2-level-explore')).toHaveAttribute('aria-current', 'step')
      // 壳语义：不合法的草稿被壳按适配器的 validateDraft 拒绝，不报“已恢复草稿”，也不删除、不覆盖。
      await expect(page.getByTestId('ws-save-message')).toHaveCount(0)
      await page.waitForTimeout(1500) // 没有编辑就没有自动保存（壳防抖 1 秒）：存储里的东西原样不动
      expect(await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY)).toBe(bad)
      // 文件本身损坏
      await page.evaluate(k => localStorage.setItem(k, '{坏的'), DRAFT_KEY)
      await page.reload()
      await expect(page.getByTestId('l2-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
      await expect(page.getByTestId('l2-level-explore')).toHaveAttribute('aria-current', 'step')
      await expect(page.getByTestId('ws-save-message')).toHaveCount(0)
      await page.waitForTimeout(1500)
      expect(await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY)).toBe('{坏的')
    })
  })
  })
}
