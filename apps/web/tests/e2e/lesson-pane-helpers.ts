import { expect, type Page } from '@playwright/test'

/**
 * UX-202: on phones (<=600px) the classroom shows one zone at a time
 * behind the 任务 / 积木 / 舞台 tabs. On larger viewports all zones are
 * visible and the tabs are display:none, so this is a no-op there.
 * Call it before interacting with elements that live in a zone.
 */
export async function showLessonPane(
  page: Page,
  pane: 'task' | 'code' | 'stage',
) {
  if (await page.getByTestId('lesson-mobile-tabs').isVisible()) {
    await page.getByTestId(`lesson-mobile-tab-${pane}`).click()
  }
}

type Box = { x: number; y: number; width: number; height: number }
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/**
 * TQ-009: lessons 01–09 stage. Steps are story distance: the walker’s track is the actor row
 * minus both actors and a meeting gap, and 200 steps (or more) ends right BESIDE the friend.
 * Asserts the real step count, the scaled position, and that the two characters and their
 * name tags never overlap — so a child always sees the friend they travelled to.
 */
export async function expectStageWalk(page: Page, steps: number) {
  const main = page.getByTestId('stage-character-main')
  const friend = page.getByTestId('stage-character-friend')
  await expect(main).toHaveAttribute('data-steps', String(steps))
  await expect(friend).toBeVisible()
  const progress = Math.min(Math.max(steps, 0), 200) / 200
  await expect
    .poll(async () => {
      const row = await main.locator('xpath=..').boundingBox()
      const box = await main.boundingBox()
      const friendBox = await friend.boundingBox()
      if (!row || !box || !friendBox) return 'missing'
      const track = Math.max(0, row.width - box.width - friendBox.width - 14)
      return Math.abs(box.x - (row.x + track * progress)) <= 2 ? 'ok' : `x=${box.x} want ${row.x + track * progress}`
    })
    .toBe('ok')
  const [mainArt, friendArt, mainTag, friendTag] = await Promise.all([
    main.locator('.kc-stage-actor-art').boundingBox(),
    friend.locator('.kc-stage-actor-art').boundingBox(),
    main.locator('.kc-stage-nametag').boundingBox(),
    friend.locator('.kc-stage-nametag').boundingBox(),
  ])
  expect(mainArt && friendArt && mainTag && friendTag).toBeTruthy()
  expect(overlaps(mainArt!, friendArt!), 'walker must not cover the friend').toBe(false)
  expect(overlaps(mainTag!, friendTag!), 'name tags must not overlap').toBe(false)
  expect(mainArt!.x + mainArt!.width).toBeLessThan(friendArt!.x)
  if (progress === 1) expect(friendArt!.x - (mainArt!.x + mainArt!.width)).toBeLessThanOrEqual(30)
}
