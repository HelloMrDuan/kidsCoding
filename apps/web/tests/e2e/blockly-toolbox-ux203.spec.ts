import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, test, type Page } from '@playwright/test'
import { clickLessonControl, showLessonPane } from './lesson-pane-helpers'

/**
 * UX-203: Blockly toolbox categories, zoom, delete and keyboard.
 * Lesson 02 step 1 allows when_start + move_right + say_line, so the
 * toolbox shows exactly the 开始 / 移动 / 说话 categories without
 * progressing through steps first.
 */
test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000)
  // Blockly's zoom/trash icons come from its CDN sprite sheet, which the
  // sandbox cannot reach. Serve the exact same file from the installed
  // blockly package so the controls paint (and receive clicks) locally.
  await page.route('https://blockly-demo.appspot.com/static/media/sprites.png', async (route) => {
    const body = await readFile(path.join(process.cwd(), 'node_modules/blockly/media/sprites.png'))
    await route.fulfill({ contentType: 'image/png', body })
  })
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await showLessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
})

async function workspaceBlockCount(page: Page) {
  // Connected blocks nest inside their parent's <g>, so top-level groups
  // count stacks, not blocks. Every block root carries .blocklyDraggable.
  return page.locator('.blocklyBlockCanvas .blocklyDraggable').count()
}

/** Screen center of a zoom widget button's visible 32x32 sprite cell. */
async function zoomButtonPoint(page: Page, cls: string) {
  return page.evaluate((clsName) => {
    const g = document.querySelector(`.blocklyZoom.${clsName}`) as SVGGraphicsElement | null
    const img = g?.querySelector('image')
    const clipAttr = img?.getAttribute('clip-path')
    const clipId = clipAttr ? (clipAttr.match(/#([^)]+)/) || [])[1] : null
    const rect = clipId ? document.getElementById(clipId)?.querySelector('rect') : null
    const ctm = g?.getScreenCTM()
    if (!rect || !ctm) return null
    const x = Number(rect.getAttribute('x') || 0)
    const y = Number(rect.getAttribute('y') || 0)
    const w = Number(rect.getAttribute('width'))
    const h = Number(rect.getAttribute('height'))
    return {
      x: ctm.a * (x + w / 2) + ctm.c * (y + h / 2) + ctm.e,
      y: ctm.b * (x + w / 2) + ctm.d * (y + h / 2) + ctm.f,
    }
  }, cls)
}

async function workspaceScale(page: Page) {
  return page.evaluate(() => {
    // Scope to the main workspace svg: the flyout has its own canvas
    // without a scale transform.
    const canvas = document.querySelector('svg.blocklySvg .blocklyBlockCanvas')
    const m = (canvas?.getAttribute('transform') || '').match(/scale\(([0-9.]+)\)/)
    return m ? Number(m[1]) : -1
  })
}

test('toolbox shows 开始 / 移动 / 说话 categories and the category flyout lists its blocks', async ({ page }) => {
  await expect(page.locator('.blocklyToolboxCategoryLabel')).toHaveText(['开始', '移动', '说话'])
  await page.locator('.blocklyToolboxCategory', { hasText: '移动' }).click()
  // The trashcan has its own .blocklyFlyout; scope to the category flyout.
  await expect(page.locator('.blocklyFlyout:not(.blocklyTrashcanFlyout)')).toContainText('向右走 100 步')
})

test('zoom controls and trashcan are present and zoom-in changes the workspace scale', async ({ page }) => {
  await expect(page.locator('.blocklyZoomIn')).toBeVisible()
  await expect(page.locator('.blocklyZoomOut')).toBeVisible()
  await expect(page.locator('.blocklyZoomReset')).toBeVisible()
  await expect(page.locator('.blocklyTrash')).toBeVisible()
  const before = await workspaceScale(page)
  expect(before).toBeGreaterThan(0)
  const point = await zoomButtonPoint(page, 'blocklyZoomIn')
  expect(point).toBeTruthy()
  await page.mouse.click(point!.x, point!.y)
  await expect.poll(() => workspaceScale(page)).toBeGreaterThan(before)
})

test('删除选中积木 removes the selected block', async ({ page }) => {
  await clickLessonControl(page, 'lesson-add-when_start')
  await expect.poll(() => workspaceBlockCount(page)).toBe(1)
  await page.locator('.blocklyBlockCanvas .blocklyDraggable').first().click()
  await clickLessonControl(page, 'lesson-delete-selected')
  await expect.poll(() => workspaceBlockCount(page)).toBe(0)
})

test('keyboard Delete removes the selected block', async ({ page }) => {
  await clickLessonControl(page, 'lesson-add-when_start')
  await expect.poll(() => workspaceBlockCount(page)).toBe(1)
  await page.locator('.blocklyBlockCanvas .blocklyDraggable').first().click()
  await page.keyboard.press('Delete')
  await expect.poll(() => workspaceBlockCount(page)).toBe(0)
})

test('dragging a block moves it in the workspace', async ({ page }) => {
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-add-move_right')
  await expect.poll(() => workspaceBlockCount(page)).toBe(2)
  // The two blocks start as one connected stack (one top-level group).
  await expect.poll(() => page.locator('.blocklyBlockCanvas > g').count()).toBe(1)
  // Block type is a class on the block group, so this tracks move_right
  // even if the DOM order changes when it is dragged out of its stack.
  const block = page.locator('.blocklyBlockCanvas .blocklyDraggable.move_right')
  // On short viewports the palette clicks scroll the block partly out of
  // view (or under the sticky bar), so a raw mousedown would miss it.
  await block.scrollIntoViewIfNeeded()
  // scrollIntoViewIfNeeded can still leave the block under the sticky bar
  // (it only guarantees viewport intersection); nudge it to y=160 so the
  // drag start point is genuinely hittable on every viewport.
  await page.evaluate(() => {
    const el = document.querySelector('.blocklyBlockCanvas .blocklyDraggable.move_right')
    const r = el?.getBoundingClientRect()
    if (r && r.y + r.height / 2 < 120) window.scrollBy(0, r.y + r.height / 2 - 160)
  })
  const before = await block.boundingBox()
  const center = before ? { x: before.x + before.width / 2, y: before.y + before.height / 2 } : null
  expect(center).toBeTruthy()
  await page.mouse.move(center!.x, center!.y)
  await page.mouse.down()
  await page.mouse.move(center!.x + 80, center!.y + 40, { steps: 10 })
  await page.mouse.up()
  // Dragging move_right out of the stack leaves two top-level stacks.
  // (Screen x is not asserted: the workspace auto-fit scrolls a dragged
  // stack back into view, so screen position alone cannot prove a drag.)
  await expect.poll(() => page.locator('.blocklyBlockCanvas > g').count()).toBe(2)
  await expect.poll(() => workspaceBlockCount(page)).toBe(2)
})

test('running an empty program is not reported as success', async ({ page }) => {
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('运行成功')
})
