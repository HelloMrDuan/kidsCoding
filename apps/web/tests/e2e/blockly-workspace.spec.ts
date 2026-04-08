import { expect, test } from '@playwright/test'

test('blockly workspace fills the lesson workbench', async ({ page }) => {
  await page.goto('/learn/lesson/lesson-01-forest-hello')

  await page.waitForSelector('[data-testid="lesson-blockly-workspace"]')

  const debugInfo = await page.evaluate(() => {
    const mount = document.querySelector(
      '[data-testid="lesson-blockly-workspace"] > div:nth-of-type(2) > div',
    ) as HTMLElement | null
    const workspace = document.querySelector('.blocklySvg')
    const flyout = document.querySelector('.blocklyFlyout')
    const toolbox = document.querySelector('.blocklyToolboxDiv')
    const insertedSvgs = Array.from(document.querySelectorAll('svg')).map((node) => ({
      className: node.getAttribute('class'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height'),
      style: node.getAttribute('style'),
      rect: {
        width: (node as SVGElement).getBoundingClientRect().width,
        height: (node as SVGElement).getBoundingClientRect().height,
      },
    }))

    return {
      mountHeight: mount?.clientHeight ?? null,
      mountWidth: mount?.clientWidth ?? null,
      mountRect: mount
        ? {
            width: mount.getBoundingClientRect().width,
            height: mount.getBoundingClientRect().height,
          }
        : null,
      workspaceExists: Boolean(workspace),
      flyoutExists: Boolean(flyout),
      toolboxExists: Boolean(toolbox),
      svgCount: document.querySelectorAll('svg').length,
      insertedSvgs,
    }
  })

  expect(debugInfo.workspaceExists).toBe(true)
  expect(debugInfo.flyoutExists).toBe(true)
  expect(debugInfo.mountHeight).toBeGreaterThanOrEqual(400)
  expect(debugInfo.insertedSvgs[0]?.rect.height).toBeGreaterThanOrEqual(350)
  expect(
    debugInfo.insertedSvgs.find((item) => item.className === 'blocklyFlyout')?.rect.height,
  ).toBeGreaterThanOrEqual(300)
})
