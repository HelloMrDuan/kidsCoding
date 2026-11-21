import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { expect, test, type Page } from '@playwright/test'
import JSZip from 'jszip'

const HUB = '/studio/scratch/free'
const SAMPLE_PATH = resolve(process.cwd(), 'public/scratch-samples/meteor-clones.sb3')

function projectIdFromUrl(url: string): string {
  const match = /\/studio\/scratch\/free\/([^/?#]+)/.exec(url)
  if (!match) throw new Error(`不是作品编辑页 URL：${url}`)
  return match[1]
}

async function createBlankProject(page: Page): Promise<string> {
  await page.goto(HUB)
  await expect(page.getByTestId('free-create-hub')).toBeVisible()
  await page.getByTestId('free-create-new').click()
  await page.waitForURL(/\/studio\/scratch\/free\/[^/]+$/)
  await expect(page.getByTestId('free-create-editor')).toBeVisible()
  return projectIdFromUrl(page.url())
}

test.describe('Scratch 自由创作工坊', () => {
  test('新建空白作品、导出、重命名、删除的完整本机闭环', async ({ page }) => {
    test.setTimeout(90_000)

    // 1. 新建：真实派生空白 .sb3（只含舞台）并跳到这份作品的创作页。
    const projectId = await createBlankProject(page)
    await expect(page.getByTestId('free-create-name')).toHaveText('我的作品')

    // 2. 未配置 Scratch GUI 时 fail-closed：不渲染 iframe，明确说明未配置。
    await expect(page.getByTestId('free-create-gui-not-configured')).toBeVisible()
    await expect(page.getByTestId('free-create-gui')).toHaveCount(0)
    await expect(page.getByTestId('free-create-save')).toBeDisabled()
    await expect(page.getByTestId('free-create-canvas').locator('iframe')).toHaveCount(0)

    // 3. 导出的 .sb3 是真实可解析的工程：只有舞台、没有脚本。
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('free-create-export').click(),
    ])
    expect(download.suggestedFilename()).toBe('我的作品.sb3')
    const exported = await download.path()
    const zip = await JSZip.loadAsync(await readFile(exported))
    const project = JSON.parse(await zip.file('project.json')!.async('string')) as {
      targets: Array<{ isStage?: boolean; blocks?: Record<string, unknown> }>
    }
    expect(project.targets).toHaveLength(1)
    expect(project.targets[0].isStage).toBe(true)
    expect(project.targets[0].blocks).toEqual({})

    // 4. 作品库列表能重新打开同一份作品（刷新后仍在），并提供“继续上次”。
    await page.goto(HUB)
    const row = page.getByTestId(`free-create-project-${projectId}`)
    await expect(row).toBeVisible()
    await expect(page.getByTestId(`free-create-open-${projectId}`)).toHaveText('我的作品')
    await expect(page.getByTestId('free-create-resume')).toHaveText('继续上次：我的作品')
    await page.reload()
    await expect(page.getByTestId(`free-create-project-${projectId}`)).toBeVisible()
    await expect(page.getByTestId('free-create-resume')).toHaveAttribute(
      'href',
      `/studio/scratch/free/${projectId}`,
    )

    // 5. 重命名 + 持久化。
    await page.getByTestId(`free-create-rename-${projectId}`).click()
    const input = page.getByTestId(`free-create-rename-input-${projectId}`)
    await input.fill('接住星星')
    await page.getByTestId(`free-create-rename-save-${projectId}`).click()
    await expect(page.getByTestId(`free-create-open-${projectId}`)).toHaveText('接住星星')
    await page.reload()
    await expect(page.getByTestId(`free-create-open-${projectId}`)).toHaveText('接住星星')

    // 6. 编辑器里改名字也写回同一份作品，不新建副本。
    await page.getByTestId(`free-create-open-${projectId}`).click()
    await page.waitForURL(new RegExp(`${projectId}$`))
    await page.getByTestId('free-create-rename').click()
    await page.getByTestId('free-create-name-input').fill('我的星星游戏')
    await page.getByRole('button', { name: '保存名字' }).click()
    await expect(page.getByTestId('free-create-name')).toHaveText('我的星星游戏')
    await page.goto(HUB)
    await expect(page.getByTestId('free-create-list').locator('li')).toHaveCount(1)
    await expect(page.getByTestId(`free-create-open-${projectId}`)).toHaveText('我的星星游戏')

    // 7. 删除是两步确认，删完回到空状态。
    await page.getByTestId(`free-create-delete-${projectId}`).click()
    await page.getByTestId(`free-create-delete-confirm-${projectId}`).click()
    await expect(page.getByTestId('free-create-empty')).toBeVisible()
    await expect(page.getByTestId(`free-create-project-${projectId}`)).toHaveCount(0)
  })

  test('导入真实 .sb3 成功，坏文件被拒绝且不入库', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto(HUB)
    await expect(page.getByTestId('free-create-empty')).toBeVisible()

    // 坏文件：不是合法 .sb3，明确报错，作品库保持为空。
    await page.getByTestId('free-create-import').setInputFiles({
      name: 'broken.sb3',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('this is not a scratch project'),
    })
    await expect(page.getByTestId('free-create-error')).toBeVisible()
    await expect(page.getByTestId('free-create-error')).toContainText('不是有效的 .sb3 作品')
    await expect(page.getByTestId('free-create-empty')).toBeVisible()

    // 真实样例：导入后带上文件名作为作品名。
    const sample = await readFile(SAMPLE_PATH)
    await page.getByTestId('free-create-import').setInputFiles({
      name: 'meteor-clones.sb3',
      mimeType: 'application/octet-stream',
      buffer: sample,
    })
    const list = page.getByTestId('free-create-list')
    await expect(list.locator('li')).toHaveCount(1)
    await expect(list.locator('li')).toContainText('meteor-clones')

    // 打开导入的作品：创作页能读到它（GUI 未配置时仍然是 fail-closed 面板）。
    await list.locator('li a').first().click()
    await page.waitForURL(/\/studio\/scratch\/free\/[^/]+$/)
    await expect(page.getByTestId('free-create-name')).toHaveText('meteor-clones')
    await expect(page.getByTestId('free-create-gui-not-configured')).toBeVisible()
  })

  test('作品不存在时给出明确提示，而不是空白页', async ({ page }) => {
    await page.goto(`${HUB}/no-such-project`)
    await expect(page.getByTestId('free-create-missing')).toBeVisible()
    await expect(page.getByRole('link', { name: '回到创作工坊' })).toHaveAttribute('href', HUB)
  })

  test('平板 768×1024：作品库与创作页可用且不横向溢出', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '平板断点只需跑一次')
    test.setTimeout(90_000)
    const context = await browser.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true })
    const page = await context.newPage()
    try {
      await page.goto(HUB)
      await expect(page.getByTestId('free-create-hub')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

      await page.getByTestId('free-create-new').tap()
      await page.waitForURL(/\/studio\/scratch\/free\/[^/]+$/)
      await expect(page.getByTestId('free-create-editor')).toBeVisible()
      await expect(page.getByTestId('free-create-gui-not-configured')).toBeVisible()
      await expect(page.getByTestId('free-create-export')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByTestId('free-create-export').tap(),
      ])
      expect(download.suggestedFilename()).toBe('我的作品.sb3')
    } finally {
      await context.close()
    }
  })

  test('从主导航可以直达自由创作工坊', async ({ page }, testInfo) => {
    await page.goto('/learn/catalog')
    const nav = page.getByTestId('kc-nav-scratch')
    await expect(nav).toHaveAttribute('href', HUB)
    // 手机上侧栏收在抽屉里：先展开导航再点，仍然是真实用户路径。
    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: '展开导航' }).click()
    }
    await expect(nav).toBeVisible()
    await nav.click()
    await page.waitForURL(`${HUB}`)
    await expect(page.getByTestId('free-create-hub')).toBeVisible()
  })
})
