import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test'

export async function pickBlock(gui: FrameLocator, category: RegExp, pattern: RegExp) {
  await gui.getByRole('treeitem', { name: category }).click()
  const block = gui.locator('.blocklyFlyout .blocklyDraggable').filter({ hasText: pattern }).first()
  await expect(block).toBeVisible()
  await block.scrollIntoViewIfNeeded()
  return block
}

export async function drag(page: Page, block: Locator, x: number, y: number, touch = false) {
  // Grip the coloured block body. On Linux the text fallback can put the
  // editable number field at the bounding-box centre, which starts editing.
  // Wait until the category scroll has stopped and the grip is visible; an
  // SVG block may exist while it is still clipped by the flyout.
  const origin: { offset?: { left: number; top: number } } = {}
  let previousPosition = ''
  await expect.poll(async () => {
    const grip = await block.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const outline = element.matches('path.blocklyPath')
      const draggable = outline ? element.closest('.blocklyDraggable') : element
      for (const yFraction of [0.5, 0.4, 0.6]) {
        for (const left of [8, 12, 16, 20]) {
          const top = bounds.height * yFraction
          const hit = document.elementFromPoint(bounds.left + left, bounds.top + top)
          const hitWanted = outline ? hit?.closest('.blocklyDraggable') === draggable : element.contains(hit)
          if (hit && hitWanted && !hit.closest('.blocklyEditableText')) {
            return { left, top, position: `${bounds.left},${bounds.top},${bounds.width},${bounds.height}` }
          }
        }
      }
      return null
    })
    const stable = grip?.position === previousPosition
    previousPosition = grip?.position ?? ''
    if (grip && stable) origin.offset = grip
    return Boolean(origin.offset)
  }, { intervals: [100, 150, 200], message: 'Wait for a stable visible block body' }).toBe(true)
  const offset = origin.offset!
  const bounds = (await block.boundingBox())!
  const start = { x: bounds.x + offset.left, y: bounds.y + offset.top }
  const end = { x: x + offset.left, y: y + offset.top - bounds.height / 2 }
  if (!touch) {
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 24 })
    await page.mouse.up()
    return
  }
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    for (let n = 1; n <= 24; n++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
        x: start.x + (end.x - start.x) * n / 24, y: start.y + (end.y - start.y) * n / 24,
      }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
}
