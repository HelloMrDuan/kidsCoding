import { expect, test } from '@playwright/test'

test('blockly workspace fills the lesson workbench', async ({ page }) => {
  await page.goto('/learn/lesson/lesson-01-forest-hello')

  await page.waitForSelector('[data-testid="lesson-blockly-workspace"]')
  // V3 injects the Blockly SVG asynchronously inside .kc-v3-engine-mount;
  // measuring the mount before the engine lands would only test the skeleton.
  await page.waitForSelector('.blocklySvg')

  const debugInfo = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="lesson-blockly-workspace"]')
    // lesson-01 now renders the V3 studio, whose engine mount is marked with
    // .kc-v3-engine-mount; lessons 02–12 keep the old classroom's second child.
    const mount = (root?.querySelector('.kc-v3-engine-mount') ??
      root?.querySelector(':scope > div:nth-of-type(2) > div')) as HTMLElement | null
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
