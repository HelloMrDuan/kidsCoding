import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

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
  const assist = page.getByTestId('lesson-blockly-workspace').locator('details').first()
  await assist.locator('summary').click()
  await page.getByTestId('lesson-add-when_start').click()
  await assist.locator('summary').click()
  await page.locator('svg.blocklySvg .blocklyBlockCanvas .when_start').waitFor({ state: 'visible' })
}

mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const report = { referenceSha, browser: browser.version(), state: 'First gate with the start block in the real editor', comparisons: [] }
  for (const viewport of sizes) {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 768, isMobile: viewport.width === 375 })
    try {
      const product = await context.newPage()
      await product.goto(`${origin}/studio/blockly/${lessonId}`)
      await product.locator('.kc-v3-engine .blocklyFlyout .when_start').waitFor({ state: 'visible' })
      await addStartThroughEditor(product)

      const design = await context.newPage()
      await design.setContent(reference)
      // Use the approved HTML's own category interaction. On step one the
      // prototype initially shows the example motion category, which the lesson locks.
      await design.locator('#categories button').first().click()
      await design.locator('#paletteBlocks svg').first().waitFor({ state: 'visible' })
      const label = `${viewport.width}x${viewport.height}`
      for (const [name, page] of [['reference', design], ['product', product]]) {
        await page.evaluate(() => document.fonts.ready.then(() => undefined))
        await page.screenshot({ path: resolve(output, `${label}-${name}.png`), animations: 'disabled' })
      }
      report.comparisons.push({
        viewport,
        reference: await bounds(design, { mission: '.mission', stage: '.stagepanel', material: '.palette', script: '.script', tile: '#paletteBlocks .scratch-svg' }),
        product: await bounds(product, {
          mission: '.kc-v3-mission', stage: '.kc-v3-stage-region', roles: '.kc-v3-roles',
          materialHeading: '.kc-v3-material-heading', scriptHeading: '.kc-v3-script-heading',
          categories: '.kc-v3-categories', flyout: '.kc-v3-engine .blocklyFlyoutBackground',
          canvas: '.kc-v3-engine .blocklySvg', tile: '.kc-v3-engine .blocklyFlyout .when_start',
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
