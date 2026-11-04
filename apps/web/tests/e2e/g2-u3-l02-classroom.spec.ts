// G2-U3-L02《接住掉落水果》课堂页真实浏览器测试（桌面 1440 / 平板 768 / 手机 375，三个 Playwright project）。
// 页面里的 Scratch VM 是真实的 scratch-vm@5.0.300（CI 走 jsDelivr；本地用 SCRATCH_VM_LOCAL_CDN=1 + 本地副本）。
// 积木由真实 Blockly 工作区编辑（桌面用真实指针拖放），运行走真实 VM 沙箱，判定读 VM 的运行轨迹。
import {readFileSync} from 'node:fs'
import {expect, test, type Page, type TestInfo} from '@playwright/test'
import {routeLocalScratchVm} from './scratch-g2-helpers'

const URL = '/learn/g2-u3-l02'

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

/** 手机上要先切到对应工作区才能操作；桌面、平板上这些面板本来就可见。 */
async function showTab(page: Page, info: TestInfo, tab: 'stage' | 'blocks' | 'script' | 'task') {
  if (isPhone(info)) await page.getByTestId(`l2-tab-${tab}`).click()
}

/** 当前视口里可见的运行按钮（手机在脚本区内有自己的运行按钮，不依赖切回舞台）。 */
function runButton(page: Page, info: TestInfo, where: 'stage' | 'script') {
  return page.getByTestId(where === 'script' && isPhone(info) ? 'l2-run-script' : 'l2-run')
}

async function goLevel(page: Page, level: string) {
  await page.getByTestId(`l2-level-${level}`).click()
  await expect(page.getByTestId('l2-root')).toHaveAttribute('data-level', level)
}

/** 通过抽屉点击添加积木（手机、平板、桌面通用的真实操作）。 */
async function addByClick(page: Page, info: TestInfo, type: 'flag' | 'move' | 'repeat') {
  await showTab(page, info, 'script')
  if (!(await page.getByTestId('l2-palette').isVisible())) await page.getByTestId('l2-add-block').click()
  await page.getByTestId(`l2-add-${type}`).click()
}

async function setSelectedNumber(page: Page, value: number) {
  const box = page.getByTestId('l2-number')
  await expect(box).toBeEnabled()
  await box.fill(String(value))
}

/** 搭：绿旗 → 重复 times 次 → 里面一块“将 x 坐标增加 dx”。全部通过抽屉点击和数字框完成。 */
async function buildLoop(page: Page, info: TestInfo, times: number, dx: number) {
  await addByClick(page, info, 'flag')
  await addByClick(page, info, 'repeat')
  await setSelectedNumber(page, times)
  await addByClick(page, info, 'move') // 选中的是重复 → 加进重复里面
  await setSelectedNumber(page, dx)
}

async function runAndWait(page: Page, info: TestInfo, where: 'stage' | 'script' = 'script') {
  await runButton(page, info, where).click()
  await expect(page.getByTestId('l2-conclusion').or(page.getByTestId('l2-not-judged'))).toBeVisible({timeout: 30_000})
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, '页面不应出现横向溢出').toBeLessThanOrEqual(1)
}

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}]`, () => {
    test.use({viewport: {...vp.viewport}, hasTouch: vp.hasTouch, isMobile: vp.isMobile})
  test.describe('G2-U3-L02 课堂：三端真实操作', () => {
    test.setTimeout(150_000)

    test('首屏五要素与任务：本课名称、学什么、解决什么、学完能做什么、与上节课联系、当前步骤', async ({page}, info) => {
      await open(page)
      await expect(page.getByTestId('l2-title')).toHaveText('接住掉落水果')
      await expect(page.getByTestId('l2-goal-1')).toContainText('今天学')
      await expect(page.getByTestId('l2-goal-2')).toContainText('要解决的问题')
      await expect(page.getByTestId('l2-goal-5')).toContainText('现在要做')
      if (!isPhone(info)) {
        await expect(page.getByTestId('l2-goal-3')).toContainText('学完你能')
        await expect(page.getByTestId('l2-goal-4')).toContainText('上节课')
      } else {
        // 手机第一次进课堂先落在“任务”工作区，五要素齐全可见。
        await expect(page.getByTestId('l2-tab-task')).toHaveAttribute('aria-selected', 'true')
        await page.getByTestId('l2-task-button').click()
        await expect(page.getByTestId('l2-task-content')).toContainText('先猜一猜')
      }
      await expect(page.getByTestId('l2-goalbar')).toBeVisible()
      await noHorizontalOverflow(page)
    })

    test('完整答案不在开始操作前出现；提示按 1→2→3 逐级揭示', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      if (isPhone(info)) await page.getByTestId('l2-tab-task').click()
      else await page.getByTestId('l2-task-button').click()
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
      await expect(runButton(page, info, 'stage')).toBeDisabled()
      await showTab(page, info, 'task')
      if (!isPhone(info)) await page.getByTestId('l2-task-button').click()
      await page.getByTestId('l2-pred-x').fill('40')
      await page.getByTestId('l2-pred-caught-no').check()
      await showTab(page, info, 'stage')
      await expect(runButton(page, info, 'stage')).toBeEnabled()
      await runButton(page, info, 'stage').click()
      await expect(page.getByTestId('l2-layer-stage')).toBeVisible({timeout: 30_000})
      await expect(page.getByTestId('l2-layer-stage')).toContainText('相差 60')
      await expect(page.getByTestId('l2-layer-stage')).toContainText('没接到水果')
      await showTab(page, info, 'task')
      await expect(page.getByTestId('l2-pred-compare')).toContainText('你预测篮子停在 x=40')
      await expect(page.getByTestId('l2-pred-compare')).toContainText('真实结果是篮子停在 x=40')
    })

    test('第二层：空脚本 / 只有绿旗 不能判通过；循环版通过；改脚本后结果立即清除', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      // 空程序
      await showTab(page, info, 'script')
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-layer-task')).toHaveAttribute('data-passed', 'false')
      await expect(page.getByTestId('l2-layer-knowledge')).toHaveAttribute('data-passed', 'false')
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'false')
      // 只有绿旗
      await addByClick(page, info, 'flag')
      await expect(page.getByTestId('l2-feedback-empty')).toBeVisible() // 加了积木：旧结果马上清掉
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'false')
      // 加循环，参数先故意错
      await addByClick(page, info, 'repeat')
      await setSelectedNumber(page, 3)
      await addByClick(page, info, 'move')
      await setSelectedNumber(page, 10)
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-layer-stage')).toHaveAttribute('data-passed', 'false')
      await expect(page.getByTestId('l2-layer-knowledge')).toHaveAttribute('data-passed', 'true') // 循环确实在动
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'false')
      // 改参数后旧结果立即消失
      await setSelectedNumber(page, 50)
      await expect(page.getByTestId('l2-feedback-empty')).toBeVisible()
      await expect(page.getByTestId('l2-conclusion')).toHaveCount(0)
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-layer-stage')).toHaveAttribute('data-passed', 'true')
      await expect(page.getByTestId('l2-layer-task')).toHaveAttribute('data-passed', 'true')
      await expect(page.getByTestId('l2-layer-knowledge')).toHaveAttribute('data-passed', 'true')
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
      // 统一措辞：舞台结果 / 任务结果 / 知识证据；通过时也不写“已掌握”，并明确“需要进一步解释或练习”
      await expect(page.getByTestId('l2-layer-stage')).toContainText('舞台结果：')
      await expect(page.getByTestId('l2-layer-stage')).toContainText('接到了水果')
      await expect(page.getByTestId('l2-layer-task')).toContainText('任务结果：本次任务达标')
      await expect(page.getByTestId('l2-layer-knowledge')).toContainText('知识证据：本次程序满足循环应用要求')
      await expect(page.getByTestId('l2-understanding')).toContainText('需要进一步解释或练习')
      await expect(page.getByTestId('l2-feedback')).not.toContainText(/已(经)?掌握|学会了/)
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('data-done', 'true')
      // 通过后才出现“你的做法 / 别的做法”
      await showTab(page, info, 'task')
      if (!isPhone(info)) await page.getByTestId('l2-task-button').click()
      await expect(page.getByTestId('l2-own-solution')).toContainText('重复执行 3 次')
      await expect(page.getByTestId('l2-alternatives')).toBeVisible()
      // 再改脚本：这一关不再算通过
      await showTab(page, info, 'script')
      if (!isPhone(info)) await page.getByTestId('l2-drawer-close').click()
      await setSelectedNumber(page, 20)
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('data-done', 'false')
    })

    test('只有舞台读 VM 状态：运行时篮子和水果真的在移动，停止后重跑不叠加', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, info, 3, 50)
      await showTab(page, info, 'stage')
      const stage = page.getByTestId('l2-stage')
      await expect(stage).toHaveAttribute('data-basket-x', '0')
      await expect(stage).toHaveAttribute('data-fruit-y', '150')
      await runButton(page, info, 'stage').click()
      await expect(stage).toHaveAttribute('data-basket-x', '150', {timeout: 30_000})
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
      const y = Number(await stage.getAttribute('data-fruit-y'))
      expect(y).toBeLessThanOrEqual(-130)
      // 再跑一次：从头开始，结果一样
      await runButton(page, info, 'stage').click()
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true', {timeout: 30_000})
      await expect(stage).toHaveAttribute('data-basket-x', '150')
    })

    test('保存与刷新恢复：脚本、关卡、预测都在；通过状态需要重新运行', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, info, 3, 50)
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-save-chip')).toContainText('已保存', {timeout: 10_000})
      await page.evaluate(() => sessionStorage.setItem('l2-keep', '1'))
      await page.reload()
      await expect(page.getByTestId('l2-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
      await expect(page.getByTestId('l2-root')).toHaveAttribute('data-level', 'solve')
      await expect(page.getByTestId('l2-save-chip')).toContainText('已恢复')
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('data-done', 'false') // 旧通过不被信任
      await showTab(page, info, 'script')
      await expect(page.getByTestId('l2-feedback-empty')).toBeVisible()
      // 恢复出来的脚本是真实的：直接运行就通过
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
      const stored = await page.evaluate(() => localStorage.getItem('kidscoding-draft:G2-U3-L02'))
      expect(stored).toContain('"lessonId":"G2-U3-L02"')
      expect(stored).not.toContain('landing')
    })

    test('保存失败必须显示“未能保存”，不显示“已保存”', async ({page}, info) => {
      await page.addInitScript(() => {
        Storage.prototype.setItem = () => { throw new Error('quota') }
      })
      await open(page)
      await goLevel(page, 'solve')
      await addByClick(page, info, 'flag')
      await expect(page.getByTestId('l2-save-chip')).toContainText('未能保存', {timeout: 10_000})
      await expect(page.getByTestId('l2-save-chip')).not.toContainText('已保存')
      await expect(page.getByTestId('l2-save-chip')).toHaveAttribute('data-state', 'failed')
    })

    test('第三层迁移：水果在左边，复制第二关的数字会漏接，改成负数才接住', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'transferLeft')
      await buildLoop(page, info, 3, 50) // 照抄上一关
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-layer-stage')).toHaveAttribute('data-passed', 'false')
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'false')
      await setSelectedNumber(page, -40) // 选中的是里面的 move
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
      await expect(page.getByTestId('l2-stage')).toHaveAttribute('data-basket-x', '-120')
    })

    test('第三层迁移：水果更快，慢慢走来不及，大步才接得住', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'transferFast')
      await buildLoop(page, info, 15, 10)
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-layer-stage')).toHaveAttribute('data-passed', 'false')
      await expect(page.getByTestId('l2-layer-stage')).toContainText('第 10 帧')
      // 水果第 10 帧落地：重复最多只有 10 圈算数。每次改成 15，10 圈走到 150，接得住。
      await setSelectedNumber(page, 15)
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
      await expect(page.getByTestId('l2-stage')).toHaveAttribute('data-basket-x', '150')
    })

    test('关卡与课程切换不污染：切关清掉结果；每关脚本独立；返回后原脚本还在', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, info, 3, 50)
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
      await goLevel(page, 'transferLeft')
      await expect(page.getByTestId('l2-conclusion')).toHaveCount(0)
      await expect(page.getByTestId('l2-situation')).toContainText('x=-100')
      await expect(page.getByTestId('l2-level-transferLeft')).toHaveAttribute('data-done', 'false')
      await goLevel(page, 'solve')
      await expect(page.getByTestId('l2-conclusion')).toHaveCount(0) // 回来也要重新运行，不沿用旧结果
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
    })

    test('运行中停止：不判定、脚本保留；停止后重跑结果与首次一致', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, info, 3, 50)
      await showTab(page, info, 'script')
      await runButton(page, info, 'script').click()
      await expect(runButton(page, info, 'script')).toHaveAttribute('data-running', 'true')
      await runButton(page, info, 'script').click() // 同一个按钮切换为停止
      await expect(page.getByTestId('l2-not-judged')).toBeVisible({timeout: 30_000})
      await expect(page.getByTestId('l2-conclusion')).toHaveCount(0)
      await expect(runButton(page, info, 'script')).toHaveAttribute('data-running', 'false')
      await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('data-done', 'false')
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
    })

    test('文件菜单：保存、导出、导入、重新开始本关；导入错课节作品被拒绝', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, info, 3, 50)
      await page.getByTestId('l2-file-menu-button').click()
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('l2-file-export').click()])
      expect(download.suggestedFilename()).toContain('接住掉落水果')
      await expect(page.getByTestId('l2-file-menu')).toHaveCount(0) // 选后自动关闭
      await page.getByTestId('l2-file-menu-button').click()
      await page.getByTestId('l2-file-reset').click()
      await expect(page.getByTestId('l2-file-menu')).toHaveCount(0)
      await showTab(page, info, 'script')
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'false') // 清空后是空程序
      // 导入错课节文件
      await page.getByTestId('l2-file-input').setInputFiles({name: 'wrong.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({lessonId: 'A1-U3-L02', script: {}}))})
      await expect(page.getByTestId('l2-import-error')).toContainText('不是“接住掉落水果”')
      // 导入刚导出的文件：脚本回来
      const path = await download.path()
      await page.getByTestId('l2-file-input').setInputFiles(path)
      await expect(page.getByTestId('l2-import-error')).toHaveCount(0)
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
    })

    test('角色管理：点选水果只读查看它的下落脚本，篮子脚本不受影响', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await buildLoop(page, info, 3, 50)
      await showTab(page, info, 'stage')
      await page.getByTestId('l2-role-fruit').click()
      await showTab(page, info, 'script')
      await expect(page.getByTestId('l2-fruit-script')).toContainText('将 y 坐标增加 -10')
      await expect(page.getByTestId('l2-toolbar')).toHaveCount(0)
      await showTab(page, info, 'stage')
      await page.getByTestId('l2-role-basket').click()
      await showTab(page, info, 'script')
      await runAndWait(page, info)
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
    })

    test('没有严重溢出、按钮不被遮挡、运行按钮在视口内可点', async ({page}, info) => {
      await open(page)
      await goLevel(page, 'solve')
      await showTab(page, info, 'script')
      await noHorizontalOverflow(page)
      const run = runButton(page, info, 'script')
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
      expect(hit, '运行按钮中心点不应被别的元素遮挡').toMatch(/^l2-run/)
      await info.attach(`${vpOf(info)}-script.png`, {body: await page.screenshot(), contentType: 'image/png'})
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
      await buildLoop(page, info, 2, 10) // 故意算错：2 × 10 = 20，离 150 太远
      await runAndWait(page, info)
      await shot('2-solve-fail')
      await showTab(page, info, 'script')
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
      await page.getByTestId('l2-run').click()
      await expect(page.getByTestId('l2-conclusion')).toBeVisible({timeout: 30_000})
      // 积木真的拼在了一起：没拼好就是散积木，不会运行，结论必然是未通过
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'true')
      await expect(page.getByTestId('l2-stage')).toHaveAttribute('data-basket-x', '150')

      // 拖到垃圾桶删除：把“将 x 坐标增加”拖进垃圾桶，脚本里不再有这块，重新运行变成未通过
      const trash = (await page.locator('.blocklyTrash').first().boundingBox())!
      const moveText = (await page.locator(`${main} text.blocklyText`, {hasText: '将 x 坐标增加'}).first().boundingBox())!
      await page.mouse.move(moveText.x + 4, moveText.y + moveText.height / 2)
      await page.mouse.down()
      await page.mouse.move(trash.x + trash.width / 2, trash.y + trash.height / 2, {steps: 16})
      await page.mouse.up()
      // 以程序结构为准（工具箱里也有同名积木，按文字数会数错）：移动积木被删掉，重复里面空了
      await expect.poll(async () => JSON.parse((await page.getByTestId('l2-script-host').getAttribute('data-program'))!))
        .toEqual({scripts: [{hat: 'flag', body: [{t: 'repeat', times: 3, body: []}]}]})
      await expect(page.getByTestId('l2-feedback-empty')).toBeVisible() // 删除是编辑：旧结果马上清掉
      await page.getByTestId('l2-run').click()
      await expect(page.getByTestId('l2-conclusion')).toHaveAttribute('data-passed', 'false', {timeout: 30_000})
    })
  })
  })
}

