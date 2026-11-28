import { expect, test, type Page } from '@playwright/test'
import { clickLessonControl, showLessonPane } from './lesson-pane-helpers'

/**
 * OPS-056 复审 HOLD P0: owner safety of the launch V3 one-click legacy import.
 *
 * Real pages on the real build, no mocks. The old classroom wrote ownerless per-step drafts to
 * sessionStorage (`kc-lesson-draft:<lessonId>:<step>`); the launch V3 studio may only read them
 * when the browser's claim stamp (`kc-lesson-draft-owner-v1`) equals the current owner exactly.
 * The owner is resolved on the server: no `kc_guest_id` cookie -> bare `guest`, with the cookie
 * -> `guest:<id>` (same mechanism as the accepted OPS-052 / OPS-055 grid-lab specs).
 *
 * Pages are opened at /studio/blockly/launch/<id> directly: the /learn/lesson entry
 * (classroom-entry.ts) is the only writer of the claim stamp, so going around it keeps the
 * "unclaimed" cases honest.
 */
const LESSON = 'lesson-02-forest-greeting'
const STUDIO_PATH = `/studio/blockly/launch/${LESSON}`
const LEGACY_KEY = `kc-lesson-draft:${LESSON}:0`
const CLAIM_KEY = 'kc-lesson-draft-owner-v1'
const LEGACY_BLOCKS = [{ type: 'when_start' }, { type: 'move_right' }]
const LEGACY_RAW = JSON.stringify({
  schemaVersion: 1,
  lessonId: LESSON,
  stepIndex: 0,
  blocks: LEGACY_BLOCKS,
  updatedAt: '2026-10-01T08:00:00.000Z',
})

function v3Key(owner = 'guest') {
  // scoped-draft-key.ts encodes the owner: `guest:ops056-a` is stored as `guest%3Aops056-a`.
  return `kids-lesson-owner-v1:${encodeURIComponent(owner)}:kidscoding-draft:${LESSON}`
}

async function waitStudio(page: Page) {
  await expect(page.getByTestId('launch-v3-slot')).toBeAttached({ timeout: 30_000 })
}

async function openStudio(page: Page) {
  await page.goto(STUDIO_PATH)
  await waitStudio(page)
}

/** Switch the server-resolved guest identity (null = bare `guest`) and reload. */
async function switchGuest(page: Page, id: string | null) {
  if (id === null) await page.context().clearCookies({ name: 'kc_guest_id' })
  else await page.context().addCookies([{ name: 'kc_guest_id', value: id, url: new URL(page.url()).origin }])
  await page.reload()
  await waitStudio(page)
}

/** Seed the old classroom draft and the claim stamp, drop the owner's V3 draft, then reload. */
async function seedLegacy(page: Page, claim: string | null, v3Owner = 'guest') {
  await page.evaluate(
    ({ legacyKey, legacyRaw, claimKey, claim, v3 }) => {
      window.sessionStorage.setItem(legacyKey, legacyRaw)
      if (claim === null) window.localStorage.removeItem(claimKey)
      else window.localStorage.setItem(claimKey, claim)
      window.localStorage.removeItem(v3)
    },
    { legacyKey: LEGACY_KEY, legacyRaw: LEGACY_RAW, claimKey: CLAIM_KEY, claim, v3: v3Key(v3Owner) },
  )
  await page.reload()
  await waitStudio(page)
}

async function storage(page: Page, owner = 'guest') {
  return page.evaluate(
    ({ legacyKey, claimKey, v3 }) => ({
      legacy: window.sessionStorage.getItem(legacyKey),
      claim: window.localStorage.getItem(claimKey),
      v3: window.localStorage.getItem(v3),
    }),
    { legacyKey: LEGACY_KEY, claimKey: CLAIM_KEY, v3: v3Key(owner) },
  )
}

async function v3Program(page: Page, owner = 'guest', stepId = 'step-1') {
  const raw = (await storage(page, owner)).v3
  if (!raw) return null
  return (JSON.parse(raw).script?.programs?.[stepId] ?? null) as Array<{ type: string }> | null
}

test.describe('OPS-056 P0: launch V3 legacy import is owner-safe', () => {
  test.afterEach(async ({ page }) => {
    await page.context().clearCookies({ name: 'kc_guest_id' })
  })

  test('matching claim: the banner imports the old draft; the old key and the stamp stay untouched', async ({ page }) => {
    test.setTimeout(120_000)
    await openStudio(page)
    await seedLegacy(page, 'guest')
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-legacy-import')).toBeVisible()
    await page.getByTestId('launch-v3-import-legacy').click()
    await expect(page.getByTestId('launch-v3-notice')).toContainText('已导入旧课堂的草稿')
    await expect(page.getByTestId('launch-v3-legacy-import')).toHaveCount(0)
    await expect.poll(() => v3Program(page), { timeout: 10_000 }).toEqual(LEGACY_BLOCKS)
    const after = await storage(page)
    expect(after.legacy).toBe(LEGACY_RAW)
    expect(after.claim).toBe('guest')
  })

  test('no claim stamp: nothing is read, shown or imported; the stamp is not written', async ({ page }) => {
    test.setTimeout(120_000)
    await openStudio(page)
    await seedLegacy(page, null)
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-notice')).toContainText('无法确认属于当前账号')
    await expect(page.getByTestId('launch-v3-legacy-import')).toHaveCount(0)
    const after = await storage(page)
    expect(after.legacy).toBe(LEGACY_RAW)
    expect(after.claim).toBeNull()
    expect(await v3Program(page)).not.toEqual(LEGACY_BLOCKS)
  })

  test('same tab A -> B: A may import, B cannot; switching back to A keeps A\'s work', async ({ page }) => {
    test.setTimeout(150_000)
    const A = 'guest:ops056-a'
    const B = 'guest:ops056-b'
    await openStudio(page)
    await switchGuest(page, 'ops056-a')
    await seedLegacy(page, A, A)
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-legacy-import')).toBeVisible()
    await page.getByTestId('launch-v3-import-legacy').click()
    await expect.poll(() => v3Program(page, A), { timeout: 10_000 }).toEqual(LEGACY_BLOCKS)
    const savedA = (await storage(page, A)).v3
    expect(savedA).not.toBeNull()

    // B on the same tab: the stamp belongs to A, so B sees only the honest notice.
    await switchGuest(page, 'ops056-b')
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-notice')).toContainText('无法确认属于当前账号')
    await expect(page.getByTestId('launch-v3-legacy-import')).toHaveCount(0)
    expect(await v3Program(page, B)).not.toEqual(LEGACY_BLOCKS)
    const seenByB = await storage(page, A)
    expect(seenByB.v3).toBe(savedA)
    expect(seenByB.claim).toBe(A)
    expect(seenByB.legacy).toBe(LEGACY_RAW)

    // Back to A: A's imported work is still there and unchanged.
    await switchGuest(page, 'ops056-a')
    expect((await storage(page, A)).v3).toBe(savedA)
  })

  test('an existing V3 draft is never overwritten: no banner even with a matching claim', async ({ page }) => {
    test.setTimeout(120_000)
    await openStudio(page)
    await showLessonPane(page, 'code')
    await clickLessonControl(page, 'lesson-add-when_start')
    await expect.poll(() => v3Program(page), { timeout: 10_000 }).toEqual([{ type: 'when_start' }])
    await page.evaluate(
      ({ legacyKey, legacyRaw, claimKey }) => {
        window.sessionStorage.setItem(legacyKey, legacyRaw)
        window.localStorage.setItem(claimKey, 'guest')
      },
      { legacyKey: LEGACY_KEY, legacyRaw: LEGACY_RAW, claimKey: CLAIM_KEY },
    )
    await page.reload()
    await waitStudio(page)
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
    await expect(page.getByTestId('launch-v3-legacy-import')).toHaveCount(0)
    expect(await v3Program(page)).toEqual([{ type: 'when_start' }])
    expect((await storage(page)).legacy).toBe(LEGACY_RAW)
  })

  test('editing first revokes the import: the banner goes away and the new work stays', async ({ page }) => {
    test.setTimeout(120_000)
    await openStudio(page)
    await seedLegacy(page, 'guest')
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-legacy-import')).toBeVisible()
    await clickLessonControl(page, 'lesson-add-when_start')
    await expect(page.getByTestId('launch-v3-legacy-import')).toHaveCount(0)
    await expect.poll(() => v3Program(page), { timeout: 10_000 }).toEqual([{ type: 'when_start' }])
    expect((await storage(page)).legacy).toBe(LEGACY_RAW)
  })

  test('the click re-checks ownership: a claim that changed after the banner appeared imports nothing', async ({ page }) => {
    test.setTimeout(120_000)
    await openStudio(page)
    await seedLegacy(page, 'guest')
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-legacy-import')).toBeVisible()
    await page.evaluate((claimKey) => window.localStorage.setItem(claimKey, 'guest:someone-else'), CLAIM_KEY)
    await page.getByTestId('launch-v3-import-legacy').click()
    await expect(page.getByTestId('launch-v3-notice')).toContainText('无法再确认旧草稿属于当前账号')
    await expect(page.getByTestId('launch-v3-legacy-import')).toHaveCount(0)
    expect(await v3Program(page)).not.toEqual(LEGACY_BLOCKS)
    expect((await storage(page)).legacy).toBe(LEGACY_RAW)
  })
})
