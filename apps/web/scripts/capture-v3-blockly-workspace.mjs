import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

const repo = fileURLToPath(new URL('../../../', import.meta.url))
const output = resolve(process.argv[2] ?? 'test-results/v3-blockly-visual')
const origin = process.env.KC_VISUAL_ORIGIN ?? 'http://127.0.0.1:3100'
const designRef = process.env.KC_V3_DESIGN_REF ?? 'origin/review/kitten-forest-v3-reference'
const prototype = 'docs/product/p0-kitten-workspace/PROTOTYPE-FOREST-v3.html'
const reference = execFileSync('git', ['show', `${designRef}:${prototype}`], { cwd: repo, encoding: 'utf8' })
const referenceSha = execFileSync('git', ['rev-parse', designRef], { cwd: repo, encoding: 'utf8' }).trim()
const lessonId = 'lesson-01-forest-hello'
const sizes = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]

function bounds(page, selectors) {
  return page.evaluate((entries) => Object.fromEntries(Object.entries(entries).map(([key, selector]) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect()
    if (!rect) throw new Error(`Missing measured region: ${selector}`)
    return [key, Object.fromEntries(['left', 'top', 'right', 'bottom', 'width', 'height'].map((property) => [property, Math.round(rect[property] * 10) / 10]))]
  })), selectors)
}

async function addStartThroughEditor(page) {
  const start = page.locator('svg.blocklySvg .blocklyBlockCanvas .when_start')
  if (await start.count()) return
  const assist = page.getByTestId('lesson-blockly-workspace').locator('details').first()
  await assist.locator('summary').click()
  await page.getByTestId('lesson-add-when_start').click()
  await assist.locator('summary').click()
  await start.waitFor({ state: 'visible' })
}

async function scrollToWorkspaceStart(page) {
  await page.evaluate(() => {
    for (const scroller of document.querySelectorAll('.kc-v3-regions, .kc-v3-editor-region, .ws-script, .ws-editor-slot, .kc-v3-slot-editor')) {
      scroller.scrollTop = 0
    }
  })
}

async function captureMoveDrag(page, filename, useTouch) {
  const source = page.locator('.kc-v3-engine .blocklyFlyout .move_right')
  const start = page.locator('svg.blocklySvg .blocklyBlockCanvas .when_start')
  await expect(source).toBeInViewport({ ratio: 1 })
  await expect(start).toBeInViewport({ ratio: 1 })
  const [tile, anchor] = await Promise.all([source.boundingBox(), start.boundingBox()])
  const scale = await start.evaluate((element) => element.getScreenCTM().a)
  const from = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }
  const to = { x: anchor.x + tile.width / 2, y: anchor.y + anchor.height - 8 * scale + tile.height / 2 }
  const cdp = useTouch ? await page.context().newCDPSession(page) : null
  try {
    if (cdp) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
      for (let step = 1; step <= 20; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
          x: from.x + (to.x - from.x) * step / 20,
          y: from.y + (to.y - from.y) * step / 20,
        }] })
      }
    } else {
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(to.x, to.y, { steps: 20 })
    }
    await expect(page.locator('.blocklyDragging.move_right')).toBeVisible()
    await page.screenshot({ path: filename })
  } finally {
    if (cdp) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await cdp.detach()
    } else {
      await page.mouse.up()
    }
  }
  const script = page.locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(script.locator('.move_right')).toHaveCount(1)
  await expect.poll(() => page.evaluate((id) =>
    JSON.parse(localStorage.getItem(`kidscoding-draft:${id}`) ?? 'null')?.script.programs['step-2'], lessonId,
  )).toEqual([{ type: 'when_start' }, { type: 'move_right' }])
  return { input: useTouch ? 'touch' : 'mouse', horizontalDistance: Math.round(to.x - from.x), verticalDistance: Math.round(to.y - from.y) }
}

mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const report = { referenceSha, browser: browser.version(), state: 'Second gate after a real drag, snap and run to 100 steps', comparisons: [] }
  for (const viewport of sizes) {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 768, isMobile: viewport.width === 375 })
    try {
      const product = await context.newPage()
      await product.goto(`${origin}/studio/blockly/${lessonId}`)
      await product.locator('.kc-v3-engine .blocklyFlyout .when_start').waitFor({ state: 'visible' })
      await addStartThroughEditor(product)
      await product.getByTestId('ws-run-toggle').click()
      await expect(product.getByTestId('ws-feedback-conclusion')).toContainText('已完成')
      await product.getByTestId('forest-hello-complete-step').click()
      await expect(product.getByTestId('forest-hello-step-progress')).toContainText('2 / 4')
      await addStartThroughEditor(product)
      await scrollToWorkspaceStart(product)

      const design = await context.newPage()
      await design.setContent(reference)
      await design.locator('#runBtn').click()
      const next = design.locator('#steps button:nth-child(2)')
      if (viewport.width <= 768) {
        // The narrow prototype hides the step buttons. Request its built-in
        // review transition without changing the reference CSS or screenshot scroll.
        await next.evaluate((button) => button.click())
      } else {
        await next.click()
      }
      await design.locator('#paletteBlocks svg').first().waitFor({ state: 'visible' })
      const label = `${viewport.width}x${viewport.height}`
      const drag = await captureMoveDrag(product, resolve(output, `${label}-drag.png`), viewport.width <= 768)
      await product.getByTestId('ws-run-toggle').click()
      await expect(product.getByTestId('ws-feedback-conclusion')).toContainText('已完成')
      await expect(product.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
      await scrollToWorkspaceStart(product)
      for (const [name, page] of [['reference', design], ['product', product]]) {
        await page.evaluate(() => document.fonts.ready.then(() => undefined))
        await page.screenshot({ path: resolve(output, `${label}-${name}.png`), animations: 'disabled' })
      }
      report.comparisons.push({
        viewport,
        drag,
        reference: await bounds(design, { mission: '.mission', stage: '.stagepanel', material: '.palette', script: '.script', tile: '#paletteBlocks .scratch-svg' }),
        product: await bounds(product, {
          mission: '.kc-v3-mission', stage: '.kc-v3-stage-region', roles: '.kc-v3-roles',
          materialHeading: '.kc-v3-material-heading', scriptHeading: '.kc-v3-script-heading',
          categories: '.kc-v3-categories', flyout: '.kc-v3-engine .blocklyFlyoutBackground',
          canvas: '.kc-v3-engine .blocklySvg', tile: '.kc-v3-engine .blocklyFlyout .move_right',
          scene: '.kc-v3-stage-region .kc-stage-scene', fox: '[data-testid="stage-character-main"]',
          rabbit: '[data-testid="stage-character-friend"]', run: '[data-testid="ws-run-toggle"]',
        }),
      })
    } finally {
      await context.close()
    }
  }
  writeFileSync(resolve(output, 'bounds.json'), JSON.stringify(report, null, 2) + '\n')
} finally {
  await browser.close()
}
