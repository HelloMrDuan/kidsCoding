import { expect, test } from '@playwright/test'

// UX-002: Button / StatusTag / FeedbackPanel in real Chrome.
// The React components are covered by Vitest unit tests (states, handlers,
// aria roles, retry failure). This spec verifies what jsdom cannot: real
// browser keyboard activation, focus-visible paint, disabled behavior, and
// computed styles of the shipped CSS at the three frozen viewports.
// Fixture markup mirrors exactly what the React components render
// (same classes, attributes, and DOM shape).
const fixture = `
<button data-testid="primary" class="kc-action-surface">运行程序</button>
<button data-testid="enter" class="kc-action-surface">回车激活</button>
<button data-testid="space" class="kc-action-surface">空格激活</button>
<button data-testid="outline" class="kc-action-surface kc-btn-outline">次要操作</button>
<button data-testid="dark" class="kc-action-surface kc-btn-dark">深色按钮</button>
<button data-testid="invert" class="kc-action-surface kc-btn-invert">反色按钮</button>
<button data-testid="small" class="kc-action-surface kc-btn-sm">小按钮</button>
<button data-testid="disabled" class="kc-action-surface kc-btn-disabled" disabled>不可点</button>
<button data-testid="loading" class="kc-action-surface kc-btn-disabled" disabled aria-busy="true"><span class="kc-btn-spinner" aria-hidden="true"></span>提交中</button>
<span data-testid="chip-info" class="kc-chip kc-chip-info">进行中</span>
<span data-testid="chip-success" class="kc-chip kc-chip-success">已完成</span>
<span data-testid="chip-warning" class="kc-chip kc-chip-warning">待注意</span>
<span data-testid="chip-error" class="kc-chip kc-chip-error">运行失败</span>
<span data-testid="chip-neutral" class="kc-chip kc-chip-neutral">未开始</span>
<div data-testid="feedback-error" class="kc-feedback kc-feedback-error" role="alert"><div class="kc-feedback-title">保存失败</div><div>请检查网络后重试</div></div>
<div data-testid="feedback-info" class="kc-feedback kc-feedback-info" role="status"><div>提示信息</div></div>
<div data-testid="feedback-success" class="kc-feedback kc-feedback-success" role="status"><div>保存成功</div></div>
<div data-testid="feedback-warning" class="kc-feedback kc-feedback-warning" role="status"><div>网络较慢</div></div>
`

for (const [name, width, height] of [
  ['desktop', 1440, 900],
  ['tablet', 768, 1024],
  ['mobile', 375, 812],
] as const) {
  test(`UX-002 components: keyboard, states and frozen styles on ${name}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
      hasTouch: name === 'mobile',
    })
    const page = await context.newPage()
    await page.goto('/learn/map')
    const urls = await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLLinkElement).href))
    expect(urls.length).toBeGreaterThan(0)
    const css = (await Promise.all(urls.map(async (url) => (await page.request.get(url)).text()))).join('\n')

    await page.setContent(`<style>${css}</style>${fixture}`)
    // setAttribute (not dataset): dataset['activated-enter'] would NOT map
    // to the data-activated-enter attribute (dataset keys are camelCase).
    await page.evaluate(() => {
      for (const id of ['enter', 'space', 'disabled', 'loading']) {
        document
          .querySelector(`[data-testid="${id}"]`)!
          .addEventListener('click', () => {
            document.body.setAttribute(`data-activated-${id}`, 'true')
          })
      }
    })

    // Frozen primary button paint (prototype .button).
    await expect(page.getByTestId('primary')).toHaveCSS('background-color', 'rgb(36, 99, 235)')
    await expect(page.getByTestId('primary')).toHaveCSS('border-radius', '8px')
    await expect(page.getByTestId('primary')).toHaveCSS('padding', '10px 16px')
    await expect(page.getByTestId('primary')).toHaveCSS('color', 'rgb(255, 255, 255)')

    // Variants follow the prototype (.button-outline / .button-dark / .button-invert / .button-sm).
    await expect(page.getByTestId('outline')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.getByTestId('outline')).toHaveCSS('color', 'rgb(39, 64, 94)')
    await expect(page.getByTestId('dark')).toHaveCSS('background-color', 'rgb(20, 37, 65)')
    await expect(page.getByTestId('invert')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.getByTestId('invert')).toHaveCSS('color', 'rgb(25, 55, 104)')
    await expect(page.getByTestId('small')).toHaveCSS('font-size', '12px')
    await expect(page.getByTestId('small')).toHaveCSS('padding', '8px 11px')

    // Status tags follow the prototype chip system.
    await expect(page.getByTestId('chip-info')).toHaveCSS('background-color', 'rgb(234, 241, 255)')
    await expect(page.getByTestId('chip-info')).toHaveCSS('color', 'rgb(41, 97, 202)')
    await expect(page.getByTestId('chip-success')).toHaveCSS('background-color', 'rgb(232, 248, 242)')
    await expect(page.getByTestId('chip-warning')).toHaveCSS('background-color', 'rgb(255, 245, 233)')
    await expect(page.getByTestId('chip-error')).toHaveCSS('background-color', 'rgb(253, 238, 238)')
    await expect(page.getByTestId('chip-neutral')).toHaveCSS('background-color', 'rgb(238, 242, 246)')

    // Feedback panels follow the prototype .stage-feedback geometry.
    await expect(page.getByTestId('feedback-info')).toHaveCSS('background-color', 'rgb(245, 248, 254)')
    await expect(page.getByTestId('feedback-info')).toHaveCSS('border-radius', '7px')
    await expect(page.getByTestId('feedback-info')).toHaveCSS('font-size', '12px')
    await expect(page.getByTestId('feedback-error')).toHaveCSS('background-color', 'rgb(253, 238, 238)')
    await expect(page.getByTestId('feedback-success')).toHaveCSS('background-color', 'rgb(232, 248, 242)')
    await expect(page.getByTestId('feedback-warning')).toHaveCSS('background-color', 'rgb(255, 245, 233)')
    await expect(page.getByTestId('feedback-error')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('feedback-info')).toHaveAttribute('role', 'status')

    // Real keyboard activation: Enter and Space on a focused native button.
    await page.getByTestId('enter').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('body')).toHaveAttribute('data-activated-enter', 'true')
    await page.getByTestId('space').focus()
    await page.keyboard.press('Space')
    await expect(page.locator('body')).toHaveAttribute('data-activated-space', 'true')

    // Focus-visible paint stays the frozen V2 focus ring.
    await page.getByTestId('primary').focus()
    await expect(page.getByTestId('primary')).toHaveCSS('outline-color', 'rgb(132, 175, 255)')
    await expect(page.getByTestId('primary')).toHaveCSS('outline-width', '3px')

    // Disabled: no focus, no activation (negative).
    await page.getByTestId('disabled').focus()
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).not.toBe('disabled')
    await page.getByTestId('disabled').click({ force: true })
    await expect(page.locator('body')).not.toHaveAttribute('data-activated-disabled', 'true')
    await expect(page.getByTestId('disabled')).toHaveCSS('opacity', '0.55')

    // Loading: spinner visible, aria-busy, no activation (negative).
    await expect(page.getByTestId('loading').locator('.kc-btn-spinner')).toBeVisible()
    await expect(page.getByTestId('loading')).toHaveAttribute('aria-busy', 'true')
    await page.getByTestId('loading').click({ force: true })
    await expect(page.locator('body')).not.toHaveAttribute('data-activated-loading', 'true')

    // No horizontal overflow at this viewport.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`${name}-ux-002.png`) })
    await context.close()
  })
}

test('UX-002: existing pages still render after the new primitives (regression)', async ({ page }) => {
  await page.goto('/learn/map')
  await expect(page.getByTestId('learning-map-primary-cta')).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 246, 251)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
