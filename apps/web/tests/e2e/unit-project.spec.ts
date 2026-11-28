import { expect, test, type Page } from '@playwright/test'

/**
 * OPS-057：课程完成页只保留完成总结与只读作品回放。
 * 所有编辑（改积木、运行、保存）统一进入 V3 作品编辑模式；
 * 完成页不再渲染旧 UnitProject / DuoProject 编辑器。
 */
type Block = { type: string; line?: string }

const L03 = 'lesson-03-forest-story'

async function seed(page: Page, lessonId: string, blocks: Block[] | null) {
  await page.goto(`/project/${lessonId}/complete`)
  await page.evaluate(
    ({ lessonId, blocks }) => {
      localStorage.setItem(
        'kc-progress',
        JSON.stringify({
          completedLessonIds: blocks ? [lessonId] : [],
          currentLessonId: lessonId,
          stars: 3,
          badgeIds: [],
          cardIds: [],
          streakDays: 1,
          completedProjectIds: [],
          projectSnapshots: blocks ? [{ lessonId, updatedAt: '2026-10-01T00:00:00.000Z', blocks }] : [],
        }),
      )
    },
    { lessonId, blocks },
  )
  await page.reload()
}

test('locked: no saved program on this device → no playable project, a way back to the lesson', async ({ page }) => {
  await seed(page, L03, null)
  await expect(page.getByTestId('unit-project-locked')).toBeVisible()
  await expect(page.getByTestId('unit-project-locked')).toContainText('回课堂完成这节课')
  await expect(page.getByTestId('project-work-replay')).toHaveCount(0)
  // Completed but the saved program is empty: still locked.
  await page.evaluate((id) => {
    localStorage.setItem('kc-progress', JSON.stringify({
      completedLessonIds: [id], currentLessonId: id, stars: 3, badgeIds: [], cardIds: [], streakDays: 1,
      completedProjectIds: [], projectSnapshots: [{ lessonId: id, updatedAt: '2026-10-01T00:00:00.000Z', blocks: [] }],
    }))
  }, L03)
  await page.reload()
  await expect(page.getByTestId('unit-project-locked')).toBeVisible()
})

test('L03 completion: the saved work replays read-only; all editing goes to the V3 work mode', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await seed(page, L03, [{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }, { type: 'say_line', line: 'hello' }])

  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
  await expect(page.getByTestId('project-work-replay')).toBeVisible()
  await expect(page.getByTestId('project-replay-again')).toBeVisible()
  // 旧编辑器与保存按钮不再出现在完成页。
  await expect(page.getByTestId('unit-project')).toHaveCount(0)
  await expect(page.getByTestId('unit-save-project')).toHaveCount(0)
  await expect(page.getByTestId('lesson-add-when_start')).toHaveCount(0)
  await expect(page.getByTestId('lesson-clear-program')).toHaveCount(0)

  const v3 = page.getByTestId('project-open-v3')
  await expect(v3).toBeVisible()
  await expect(v3).toHaveAttribute('href', `/studio/blockly/project/${L03}`)

  // 只读回放自动播放，状态如实报告结果。
  await expect(page.getByRole('status').filter({ hasText: '回放完成' })).toBeVisible({ timeout: 25_000 })
  await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
  await page.getByTestId('project-replay-again').click()
  await expect(page.getByRole('status').filter({ hasText: '回放完成' })).toBeVisible({ timeout: 25_000 })
  expect(errors).toEqual([])
})

test('375 wide: the read-only replay and the V3 entry never scroll sideways', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page, L03, [{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }, { type: 'say_line', line: 'hello' }])
  await expect(page.getByTestId('project-work-replay')).toBeVisible()
  await expect(page.getByTestId('project-open-v3')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
