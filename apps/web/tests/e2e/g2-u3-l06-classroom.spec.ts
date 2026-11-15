// G2-U3-L06《水果接力挑战》正式页面（共享 LessonWorkspace + 本课适配器与槽位）真实浏览器测试。
// 桌面 1440 / 平板 768 / 手机 375，三个视口都在本文件里设置（不依赖 Playwright project 的个数）。
// 页面里是真实 scratch-vm@5.0.300 + 真实 scratch-render：水果落点由真实 operator_random 求值，
// 碰撞由渲染器判定，篮子跟随真实指针。判定读 VM 的真实运行轨迹（三层：舞台 / 任务 / 知识）。
// “用指针追着水果接满 5 颗获胜”的完整路径在 g2-u3-l06-vm.spec.ts 里对同一沙箱验证；
// 本文件验证课堂页本身：搭积木、运行、判定反馈、停止、草稿，以及三端可见可操作与手机几何。
// 确定性：沙箱每次运行重置带种子的 PRNG，同一程序轨迹可复现。
import {readFileSync} from 'node:fs'
import {expect, test, type Page, type TestInfo} from '@playwright/test'

const URL = '/learn/g2-u3-l06'
const DRAFT_KEY = 'kidscoding-draft:G2-U3-L06'

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
  if (opts.fresh !== false) await page.addInitScript(() => { if (!sessionStorage.getItem('l6-keep')) localStorage.removeItem('kidscoding-draft:G2-U3-L06') })
  await page.goto(URL)
  await expect(page.getByTestId('l6-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
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
  if (isPhone(info) && !(await page.getByTestId('l6-task-fold-body').isVisible())) await page.getByTestId('l6-task-toggle').click()
  await expect(page.getByTestId('l6-task-content')).toBeVisible()
}

/** 角色栏：手机上收在壳的折叠开关后面，要看先展开（与 L05 同一壳行为）。 */
async function openRoles(page: Page, info: TestInfo) {
  if (isPhone(info) && !(await page.getByTestId('l6-role-fruit').locator('img').isVisible().catch(() => false))) {
    await page.getByTestId('ws-roles-toggle').click()
  }
  await expect(page.getByTestId('l6-role-fruit').locator('img')).toBeVisible()
}

/** 共享壳的运行按钮：手机在脚本区上方有粘性运行行，其余视口用舞台下方的运行条。 */
function runButton(page: Page, info: TestInfo) {
  return page.getByTestId(isPhone(info) ? 'ws-sticky-run' : 'ws-run-toggle')
}

async function ensurePalette(page: Page) {
  if (!(await page.getByTestId('l6-add-flag').isVisible().catch(() => false))) await page.getByTestId('l6-add-block').click()
  await expect(page.getByTestId('l6-add-flag')).toBeVisible()
}

const add = async (page: Page, kind: string) => { await page.getByTestId(`l6-add-${kind}`).click(); await page.waitForTimeout(120) }

/** 在自己搭关里按参考做法的顺序点按调色板：绿旗→一直重复→出生→重复→下落→如果→记分→隐藏→（回选一直重复）→隐藏。 */
async function buildReference(page: Page) {
  await ensurePalette(page)
  for (const kind of ['flag', 'forever', 'spawn', 'repeat', 'fall', 'iftouch', 'score', 'hide']) await add(page, kind)
  // 最后一块“隐藏”属于“一直重复”：在画布上点中“一直重复”再加。
  const forever = page.locator('[data-testid="l6-blockly"] g.blocklyDraggable', {hasText: '一直重复'}).first()
  await forever.click()
  await page.waitForTimeout(150)
  await add(page, 'hide')
}

async function fillPredictions(page: Page, info: TestInfo) {
  await openTask(page, info)
  await page.getByTestId('l6-pred-count').fill('12')
  await page.getByTestId('l6-pred-same-no').click()
}

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}]`, () => {
    test.use({viewport: vp.viewport, hasTouch: vp.hasTouch, isMobile: vp.isMobile})

    test('打开：首屏五要素、真实舞台画布与三张角色图都在，没有横向溢出', async ({page}, info) => {
      await open(page)
      await openTask(page, info)
      // 舞台：沙箱 iframe 已被移进舞台框，里面有渲染器的 canvas
      const stageFrame = page.frameLocator('[data-testid="l6-stage"] iframe')
      await expect(stageFrame.locator('canvas')).toBeVisible({timeout: 30_000})
      await expect(page.getByTestId('l6-stage-hud')).toBeVisible()
      await expect(page.getByTestId('l6-hud-score')).toContainText('得分')
      await expect(page.getByTestId('l6-hud-time')).toContainText('时间')
      // 角色栏三张原创缩略图都真的解码出来了
      await openRoles(page, info)
      for (const role of ['fruit', 'basket', 'backdrop']) {
        const img = page.getByTestId(`l6-role-${role}`).locator('img')
        await expect(img).toBeVisible()
        expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
      }
      // 调色板在“自己搭”关（探索关只读，没有调色板）：八种积木齐全
      await page.getByTestId('l6-level-solve').click()
      await ensurePalette(page)
      for (const kind of ['flag', 'forever', 'spawn', 'repeat', 'fall', 'iftouch', 'score', 'hide']) {
        await expect(page.getByTestId(`l6-add-${kind}`)).toBeVisible()
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
    })

    test('探索关：没写预测不能运行；写了预测运行演示，判定与预测对照都出现', async ({page}, info) => {
      test.setTimeout(300_000)
      await open(page)
      // 没写预测点运行：壳如实报错，不启动运行（与 L05 同一门禁方式；课程自己在编辑区也有禁用的运行按钮）
      await runButton(page, info).click()
      await expect(page.getByTestId('ws-run-error')).toContainText('预测')
      await fillPredictions(page, info)
      await runButton(page, info).click()
      await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 240_000})
      await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('这一关是观察')
      await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('随机')
      await openTask(page, info)
      await expect(page.getByTestId('l6-pred-compare')).toBeVisible()
      await expect(page.getByTestId('l6-pred-compare')).toContainText('真实运行')
    })

    test('自己搭：点按搭出参考做法，运行出三层判定；再改一块积木，旧判定立刻作废', async ({page}, info) => {
      test.setTimeout(300_000)
      await open(page)
      await page.getByTestId('l6-level-solve').click()
      await buildReference(page)
      await runButton(page, info).click()
      await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 240_000})
      await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('用上了随机')
      await expect(page.getByTestId('ws-feedback-task')).toContainText('任务结果')
      // 改程序后旧判定作废
      await add(page, 'hide')
      await expect(page.getByTestId('ws-judgment-stale')).toBeVisible()
      await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    })

    test('找毛病关：预置的毛病程序运行后任务层明确失败（没碰到也记分）', async ({page}, info) => {
      test.setTimeout(300_000)
      await open(page)
      await page.getByTestId('l6-level-transferFix').click()
      await runButton(page, info).click()
      await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 240_000})
      await expect(page.getByTestId('ws-feedback-task')).toContainText('未达标')
      await expect(page.getByTestId('ws-feedback-task')).toContainText('碰到篮子')
      await expect(page.getByTestId('ws-feedback-conclusion')).not.toContainText('任务达标，也用对了随机')
    })

    test('运行中停止：如实显示“没有判定”，不冒充通过', async ({page}, info) => {
      test.setTimeout(180_000)
      await open(page)
      await fillPredictions(page, info)
      await runButton(page, info).click()
      await page.waitForTimeout(1500)
      await runButton(page, info).click() // 运行中再点是停止
      await expect(page.getByTestId('l6-not-judged')).toContainText('停止', {timeout: 60_000})
      await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    })

    test('草稿：保存后刷新能恢复；草稿损坏时干净重开不崩溃', async ({page}) => {
      await open(page)
      await page.getByTestId('l6-level-solve').click()
      await ensurePalette(page)
      for (const kind of ['flag', 'forever', 'spawn']) await add(page, kind)
      const fp = await page.getByTestId('l6-script-host').getAttribute('data-program')
      expect(fp).toBeTruthy()
      // 保存走共享壳的自动保存（手机上编辑区自带的保存钮按壳的规范隐藏，统一看壳的保存状态片）
      await expect(page.getByTestId('ws-save-chip')).toContainText('已保存', {timeout: 15_000})
      await page.evaluate(() => sessionStorage.setItem('l6-keep', '1'))
      await page.reload()
      await expect(page.getByTestId('l6-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
      await page.getByTestId('l6-level-solve').click()
      await expect(page.getByTestId('l6-script-host')).toHaveAttribute('data-program', fp!)
      // 损坏的草稿：fail-closed，干净重开
      await page.evaluate(key => localStorage.setItem(key, '{"levelId":"solve","program":{"scripts":"垃圾"}}'), DRAFT_KEY)
      await page.reload()
      await expect(page.getByTestId('l6-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
      // 页面骨架完好：舞台 HUD 与关卡导航都在（损坏草稿被拒，课程干净重开）
      await expect(page.getByTestId('l6-stage-hud')).toBeVisible()
      await expect(page.getByTestId('l6-level-solve')).toBeVisible()
    })

    test('三级提示：逐级展开，第三级是调试提示', async ({page}, info) => {
      await open(page)
      await openTask(page, info)
      await expect(page.getByTestId('l6-hint-1')).toHaveCount(0)
      await page.getByTestId('l6-next-hint').click()
      await expect(page.getByTestId('l6-hint-1')).toBeVisible()
      await page.getByTestId('l6-next-hint').click()
      await page.getByTestId('l6-next-hint').click()
      await expect(page.getByTestId('l6-hint-3')).toBeVisible()
    })
  })
}

test.describe('[phone] 几何专查', () => {
  test.use({viewport: {width: 375, height: 812}, hasTouch: true, isMobile: true})

  test('手机首屏：舞台框与粘性运行按钮完整落在视口内，中心点命中按钮，底部导航不遮挡', async ({page}) => {
    await open(page)
    const stage = await page.getByTestId('l6-stage').boundingBox()
    expect(stage).not.toBeNull()
    expect(stage!.x).toBeGreaterThanOrEqual(0)
    expect(stage!.x + stage!.width).toBeLessThanOrEqual(375)
    expect(stage!.y + stage!.height).toBeLessThanOrEqual(812)
    const btn = page.getByTestId('ws-sticky-run')
    await expect(btn).toBeVisible()
    const box = await btn.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y + box!.height).toBeLessThanOrEqual(812)
    const hit = await page.evaluate(({cx, cy}) => {
      const el = document.elementFromPoint(cx, cy)
      return el ? (el.closest('[data-testid="ws-sticky-run"]') ? 'run' : el.tagName) : 'none'
    }, {cx: box!.x + box!.width / 2, cy: box!.y + box!.height / 2})
    expect(hit).toBe('run')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
