import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const reference = readFileSync(resolve(process.cwd(), '../../docs/design/kidscoding-v2/prototype.html'), 'utf8')
const referenceCss = reference.match(/<style>([\s\S]*?)<\/style>/)![1]
// Component-only test fixture, not a new product page or simulated course.
// Use the approved open drawer state on mobile: this fixture compares paint,
// not the later page-shell migration or closed navigation visibility.
const fixture = (approved: boolean) => `<div data-testid="nav" class="${approved ? 'sidebar show' : 'kc-nav-surface'}" style="position:static;height:auto;padding:23px 13px;width:222px">导航</div>
<div data-testid="panel" class="${approved ? 'panel' : 'kc-panel'}" style="margin:16px;padding:16px">
<p>真实任务说明</p><p data-testid="muted" class="${approved ? 'muted' : 'kc-text-muted'}">次级说明（冻结颜色，AA 缺口已记录）</p>
<button data-testid="action" class="${approved ? 'button' : 'kc-action-surface'}">运行程序</button></div>`

for (const [name, width, height] of [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 375, 812]] as const) {
  test(`V2 production tokens match approved CSS on ${name}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100', viewport: { width, height }, hasTouch: name === 'mobile' })
    const page = await context.newPage()
    await page.goto('/learn/map')
    const urls = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(n => (n as HTMLLinkElement).href))
    expect(urls.length).toBeGreaterThan(0)
    const css = (await Promise.all(urls.map(async url => (await page.request.get(url)).text()))).join('\n')
    const approved = await context.newPage()
    await approved.setContent(`<style>${referenceCss}</style>${fixture(true)}`)
    const actual = await context.newPage()
    await actual.setContent(`<style>${css}</style>${fixture(false)}`)
    const measure = async (p: typeof page) => p.locator('[data-testid]').evaluateAll(nodes => nodes.map(n => {
      const s = getComputedStyle(n), r = n.getBoundingClientRect()
      return { id: n.getAttribute('data-testid'), color: s.color, background: s.background,
        radius: s.borderRadius, border: s.borderWidth, shadow: s.boxShadow, font: s.font,
        padding: s.padding, width: r.width, height: r.height, x: r.x, y: r.y }
    }))
    expect(await measure(actual)).toEqual(await measure(approved))
    await approved.screenshot({ path: testInfo.outputPath(`${name}-tokens-reference.png`) })
    await actual.screenshot({ path: testInfo.outputPath(`${name}-tokens-actual.png`) })
    expect(await actual.screenshot()).toEqual(await approved.screenshot())
    await actual.getByTestId('action').focus()
    await expect(actual.getByTestId('action')).toHaveCSS('outline-color', 'rgb(132, 175, 255)')
    await expect(actual.getByTestId('action')).toHaveCSS('outline-width', '3px')
    await actual.evaluate(() => {
      document.querySelector('button')!.addEventListener('click', () => { document.body.dataset.activated = 'true' })
    })
    if (name === 'mobile') await actual.getByTestId('action').tap()
    else await actual.keyboard.press('Enter')
    await expect(actual.locator('body')).toHaveAttribute('data-activated', 'true')
    await expect(actual.getByTestId('muted')).toHaveCSS('color', 'rgb(111, 125, 146)')
    expect(await actual.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await context.close()
  })
}

test('real pages consume V2 foundation and reduced motion without changing stored progress', async ({ page }) => {
  await page.goto('/learn/map')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 246, 251)')
  // UX-106: the map hero is the kid-friendly rounded card (24px), still on the V2 canvas.
  await expect(page.locator('.kc-surface-3d').first()).toHaveCSS('border-radius', '24px')
  await expect(page.getByTestId('learning-map-primary-cta')).toHaveCSS('background-color', 'rgb(36, 99, 235)')
  const before = await page.evaluate(() => JSON.stringify(localStorage))
  await page.reload()
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByTestId('learning-map-primary-cta')).toHaveCSS('transition-duration', '0s')
  await page.getByTestId('learning-map-primary-cta').focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/learn\/lesson\//)
  await expect(page.getByTestId('lesson-blockly-workspace').locator('.blocklySvg')).toBeVisible()
})
