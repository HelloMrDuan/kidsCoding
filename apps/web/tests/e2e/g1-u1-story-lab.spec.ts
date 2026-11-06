import { expect, test, type Page } from '@playwright/test'

import { showLessonPane } from './lesson-pane-helpers'

/**
 * G1-U1-L01《给狐狸一个开场》完整课堂 E2E（实验课，非正式课程）：
 * 桌面 1440x900 与手机 375x812 两个断点；加载、触摸切页签、真实拖拽落位、
 * 运行通过、错误反馈、保存刷新恢复、每断点截图。
 * 创意拓展的第二句对白（移动后追加提问）由单元测试覆盖：工作区现有的
 * “选一句对白”按钮会改写全部说话积木的台词，浏览器里无法用它给两块
 * 说话积木各配一句（共享文件，不在本任务内改动），故 E2E 创意关只验
 * 基础通过与完成流转，不冒充已在浏览器里配好两句。
 */
const KEY = 'kids-story-lesson-v1:G1-U1-L01'

async function add(page: Page, type: string) {
  await page.getByTestId(`lesson-add-${type}`).click()
}

async function runAndExpect(page: Page, tone: 'success' | 'error', text?: string) {
  await page.getByTestId('story-run').click()
  const feedback = page.getByTestId('story-feedback')
  await expect(feedback).toHaveAttribute('data-tone', tone, { timeout: 20_000 })
  if (text) await expect(feedback).toContainText(text)
}

async function next(page: Page) {
  await page.getByTestId('lesson-complete-step').click()
}

async function draftProgramLength(page: Page, stepId: string) {
  return page.evaluate(
    ({ key, stepId: id }) => {
      const raw = window.localStorage.getItem(key)
      if (!raw) return -1
      const parsed = JSON.parse(raw) as { programs?: Record<string, unknown[]> }
      return parsed.programs?.[id]?.length ?? -1
    },
    { key: KEY, stepId },
  )
}

test('G1-U1-L01 desktop 1440x900: build, real drag, run, error lab, save and reopen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/learn/story-lab/G1-U1-L01')
  await expect(page.getByTestId('story-lab-title-row')).toContainText('给狐狸一个开场')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.getByTestId('story-lab-stage')).toBeVisible()
  // Real illustrated fox, never a coloured-circle placeholder.
  await expect(page.locator('[data-character-art="fox"]')).toBeVisible()
  await expect(page.getByTestId('story-bubble-empty')).toContainText('狐狸还没说话')
  await page.screenshot({ path: '/tmp/g1-u1-l01-desktop-start.png' })

  // Guided + design are thinking stages: completing them needs no run.
  await next(page)
  await next(page)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')

  // Build stage: the starter already holds when_start; add say + move.
  await showLessonPane(page, 'code')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(1)
  await add(page, 'say_line')
  await add(page, 'move_right')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)

  // Real drag: drag the whole when_start stack inside the main workspace
  // (scoped to svg.blocklySvg so the flyout's own when_start block is never
  // the drag source — dragging that would drop a second, loose when_start
  // stack) and drop it; the program (3 blocks, one stack) must survive.
  const block = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable.when_start')
  await block.scrollIntoViewIfNeeded()
  const box = await block.boundingBox()
  expect(box).not.toBeNull()
  // The when_start group's box spans the whole nested stack, so its centre
  // is the say block, not the hat: dragging from the centre would tear the
  // say block out of the stack. Start the drag in the hat itself (top 12px).
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 12)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 60, box!.y + 12 + 40, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  await expect.poll(() => page.locator('svg.blocklySvg .blocklyBlockCanvas > g').count()).toBe(1)

  await showLessonPane(page, 'stage')
  await runAndExpect(page, 'success', '先打招呼再移动')
  await expect(page.getByTestId('story-fox')).toHaveAttribute('data-fox-position', '100', { timeout: 20_000 })
  await expect(page.getByTestId('story-bubble')).toContainText('欢迎来到森林剧场')
  await page.screenshot({ path: '/tmp/g1-u1-l01-desktop-pass.png' })
  await next(page)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')

  // Run-verify stage: rebuild from empty, run, then reload and re-run the
  // restored program without rebuilding (save + reopen proof).
  await showLessonPane(page, 'code')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await showLessonPane(page, 'stage')
  await runAndExpect(page, 'success')
  await page.reload()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')
  await showLessonPane(page, 'stage')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('story-fox')).toHaveAttribute('data-fox-position', '100', { timeout: 20_000 })
  await next(page)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 5 关')

  // Error lab: the starter is move-only; run it, see the real failure and
  // the tiered hints, then fix it and pass.
  await showLessonPane(page, 'stage')
  await runAndExpect(page, 'error', '只有移动没有对白')
  await expect(page.getByText(/第 1 层/)).toBeVisible()
  await page.getByTestId('story-more-hint').click()
  await expect(page.getByText(/第 2 层/)).toBeVisible()
  await showLessonPane(page, 'code')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await showLessonPane(page, 'stage')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 6 关')

  // Creative stage: the starter is already a passing program; run and complete.
  await showLessonPane(page, 'stage')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 7 关')

  // Review: the correct reflection answer, then finish; finish survives reload.
  await showLessonPane(page, 'stage')
  await page.getByTestId('story-reflection-option-0').click()
  await expect(page.getByTestId('story-reflection-result')).toHaveAttribute('data-correct', 'true')
  await next(page)
  await expect(page.getByTestId('story-lesson-finished')).toBeVisible()
  await expect(page.getByTestId('story-lesson-finished')).toContainText('只保存在本机')
  await page.reload()
  await expect(page.getByTestId('story-lesson-finished')).toBeVisible()
  await page.screenshot({ path: '/tmp/g1-u1-l01-desktop-finished.png' })
})

test('G1-U1-L01 mobile 375x812: touch tabs, build, run, save and reopen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'tap() needs a touch project')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/learn/story-lab/G1-U1-L01')
  // On phones the task pane is shown first; the code pane (workspace) only
  // becomes visible after a real touch on the 积木 tab.
  await page.getByTestId('lesson-mobile-tab-code').tap()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible({ timeout: 20_000 })

  async function tapPane(pane: 'task' | 'code' | 'stage') {
    const tab = page.getByTestId(`lesson-mobile-tab-${pane}`)
    if (await tab.isVisible()) {
      await tab.tap()
      await expect(page.getByTestId(`lesson-${pane}-column`)).toBeVisible()
    }
  }
  async function tap(id: string) {
    await page.getByTestId(id).tap()
  }
  async function tapAdd(type: string) {
    await tapPane('code')
    await tap(`lesson-add-${type}`)
  }

  await tap('lesson-complete-step')
  await tap('lesson-complete-step')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')

  // Touch tab switching: code tab by real touch, then build the program.
  await tapAdd('say_line')
  await tapAdd('move_right')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)

  // Stage tab by real touch, then run to a real pass.
  await tapPane('stage')
  await tap('story-run')
  await expect(page.getByTestId('story-feedback')).toHaveAttribute('data-tone', 'success', { timeout: 20_000 })
  await expect(page.getByTestId('story-fox')).toHaveAttribute('data-fox-position', '100', { timeout: 20_000 })
  await page.screenshot({ path: '/tmp/g1-u1-l01-mobile-pass.png' })

  // Save + reopen: reload on the same stage and re-run without rebuilding.
  await page.reload()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')
  await tapPane('stage')
  await tap('story-run')
  await expect(page.getByTestId('story-feedback')).toHaveAttribute('data-tone', 'success', { timeout: 20_000 })
  await page.screenshot({ path: '/tmp/g1-u1-l01-mobile-stage.png' })
})
