import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

// UX-302: open -> continue editing -> save -> reopen -> export, plus delete,
// upload-conflict and corrupt-data recovery. Seeds are local-only (localStorage
// and IndexedDB); no real Supabase account is needed. The Scratch lab restore
// test reuses the UX-401/402/403 local-CDN pattern: CI never sets
// SCRATCH_VM_LOCAL_CDN and always exercises the real CDN path.
test.beforeEach(async ({ page }) => {
  if (process.env.SCRATCH_VM_LOCAL_CDN !== '1') return
  const vmCode = readFileSync(process.env.SCRATCH_VM_LOCAL_FILE ?? '/tmp/scratch-local/scratch-vm.min.js')
  await page.route('https://cdn.jsdelivr.net/**', (route) =>
    route.fulfill({ body: vmCode, contentType: 'application/javascript' }),
  )
})

const PYTHON_DRAFT_KEY = 'kids-python-local-practice-v1:P0-U1-L02'
const PYTHON_CODE = 'def greet(name):\n    return "你好，" + name'
const PYTHON_EDITED = 'def greet(name):\n    return "你好呀，" + name'

async function seedScratchDraft(page: import('@playwright/test').Page, archive: Buffer) {
  await page.evaluate(async (bytes) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kidscoding-scratch-local-v1', 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('projects')) request.result.createObjectStore('projects')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('projects', 'readwrite')
        tx.objectStore('projects').put(
          { archive: bytes.buffer, savedAt: '2026-10-27T09:00:00.000Z' },
          'G3-U1-L02',
        )
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }, new Uint8Array(archive))
}

test('Python work: open from portfolio, edit, save, reopen, export real .py', async ({ page }) => {
  // Seed via evaluate, not addInitScript: addInitScript re-applies on every
  // navigation, so it would overwrite the edit on the reload below.
  await page.goto('/learn/portfolio')
  await page.evaluate(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, { key: PYTHON_DRAFT_KEY, value: { source: PYTHON_CODE, passed: false, savedAt: '2026-10-27T09:00:00.000Z' } })
  await page.reload()
  await expect(page.getByTestId('practice-item-P0-U1-L02')).toBeVisible()
  await expect(page.getByTestId('practice-item-P0-U1-L02')).toContainText('Python 源码')
  await page.getByTestId('practice-item-P0-U1-L02').getByRole('link', { name: '继续编辑作品' }).click()
  await expect(page.getByTestId('python-multi-source')).toHaveValue(PYTHON_CODE)
  await page.getByTestId('python-multi-source').fill(PYTHON_EDITED)
  // The save line already reads "saved" from the seeded draft, so it cannot
  // prove the edit persisted: poll storage itself before reloading.
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), PYTHON_DRAFT_KEY)).toContain('你好呀')
  await page.reload()
  await expect(page.getByTestId('python-multi-source')).toHaveValue(PYTHON_EDITED)
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('python-multi-download').click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  const content = await readFile(path!, 'utf-8')
  expect(content).toBe(PYTHON_EDITED)
})

test('Scratch work: seeded IndexedDB draft becomes a card and restores in the lab', async ({ page }) => {
  test.setTimeout(180_000)
  const archive = readFileSync('tests/e2e/fixtures/scratch-single-character.sb3')
  await page.goto('/learn/portfolio')
  await seedScratchDraft(page, archive)
  await page.reload()
  await expect(page.getByTestId('portfolio-work-G3-U1-L02')).toBeVisible()
  await expect(page.getByTestId('portfolio-work-G3-U1-L02')).toContainText('Scratch .sb3')
  await page.getByTestId('portfolio-work-G3-U1-L02').getByRole('link', { name: '继续编辑作品' }).click()
  await expect(page.getByRole('heading', { name: '流星分身雨' })).toBeVisible()
  await expect(page.getByTestId('scratch-local-save-status')).toContainText('已恢复本机保存的真实 Scratch .sb3 作品', { timeout: 120_000 })
})

test('Delete with confirmation removes the card; cancelling keeps it', async ({ page }) => {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, { key: PYTHON_DRAFT_KEY, value: { source: PYTHON_CODE, passed: false, savedAt: '2026-10-27T09:00:00.000Z' } })
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId('practice-item-P0-U1-L02')).toBeVisible()
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByTestId('portfolio-delete-P0-U1-L02').click()
  await expect(page.getByTestId('practice-item-P0-U1-L02')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByTestId('portfolio-delete-P0-U1-L02').click()
  await expect(page.getByTestId('practice-item-P0-U1-L02')).toHaveCount(0)
  await expect(page.getByTestId('portfolio-delete-status')).toContainText('已删除')
})

test('Upload conflict: newer cloud draft is never silently overwritten', async ({ page }) => {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, { key: PYTHON_DRAFT_KEY, value: { source: PYTHON_CODE, passed: false, savedAt: '2026-10-27T08:00:00.000Z' } })
  let putCount = 0
  await page.route('**/api/practice/drafts', async (route, request) => {
    if (request.method() === 'GET') {
      // Real GET shape is camelCase (lessonId/updatedAt); snake_case rows are
      // dropped by parseCloudPythonDraft, which would hide the conflict.
      await route.fulfill({
        json: { drafts: [{ lessonId: 'P0-U1-L02', source: 'def greet(name):\n    return "云端更新版"', updatedAt: '2026-10-27T09:00:00.000Z' }] },
      })
    } else {
      putCount += 1
      await route.fulfill({ json: { ok: true } })
    }
  })
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId('practice-item-P0-U1-L02')).toBeVisible()
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByTestId('cloud-upload-drafts').click()
  await expect(page.getByTestId('cloud-drafts-status')).toContainText('未上传')
  expect(putCount).toBe(0)
  const localAfterCancel = await page.evaluate((key) => window.localStorage.getItem(key), PYTHON_DRAFT_KEY)
  expect(localAfterCancel).toContain('你好，')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByTestId('cloud-upload-drafts').click()
  await expect(page.getByTestId('cloud-drafts-status')).toContainText('已把 1 份代码草稿保存到当前账号')
  expect(putCount).toBe(1)
})

test('Unknown work ids and corrupt drafts fail gracefully, never as a fake editor', async ({ page }) => {
  await page.goto('/project/nope-not-a-work/complete')
  await expect(page.getByText('没有找到这个作品。')).toBeVisible()
  await page.goto('/learn/python-lab/NOPE-NOT-A-LESSON')
  await expect(page.locator('body')).toContainText('404')
  await page.addInitScript(() => {
    window.localStorage.setItem('kids-python-local-practice-v1:P0-U1-L03', '{not json')
  })
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId('practice-item-P0-U1-L03')).toHaveCount(0)
  await page.goto('/learn/portfolio')
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kidscoding-scratch-local-v1', 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('projects')) request.result.createObjectStore('projects')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('projects', 'readwrite')
        tx.objectStore('projects').put(
          { archive: new Uint8Array([1, 2, 3]).buffer, savedAt: '2026-10-27T09:00:00.000Z' },
          'G3-U1-L02',
        )
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  })
  await page.reload()
  await expect(page.getByTestId('portfolio-work-G3-U1-L02')).toHaveCount(0)
})

test('Portfolio holds at 1440, 768 and 375 with no horizontal overflow', async ({ page }, testInfo) => {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, { key: PYTHON_DRAFT_KEY, value: { source: PYTHON_CODE, passed: false, savedAt: '2026-10-27T09:00:00.000Z' } })
  await page.goto('/learn/portfolio')
  for (const [width, height] of [[1440, 900], [768, 1024], [375, 812]] as const) {
    await page.setViewportSize({ width, height })
    await expect(page.getByTestId('practice-item-P0-U1-L02')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
    await page.screenshot({ path: testInfo.outputPath(`portfolio-${width}x${height}.png`) })
  }
})
