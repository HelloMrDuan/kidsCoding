/**
 * Unified creation entry regression (P0 integration ruling, 2026-11-22).
 *
 * OPS-050 `/create` is the ONLY creation centre and `kidscoding-create` the
 * only work library. The retired /studio/scratch/free workshop must not come
 * back as a second product entry, but its old URLs and old local works must
 * keep working without data loss.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const CREATE_HUB = '/create'
const LEGACY_HUB = '/studio/scratch/free'
const SAMPLE_PATH = resolve(process.cwd(), 'public/scratch-samples/meteor-clones.sb3')

async function putLegacyWork(page: Page, id: string, name: string, bytes: Buffer) {
  await page.evaluate(
    async ({ id, name, data }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('kidscoding-free-create', 1)
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' })
          if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
        }
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('projects', 'readwrite')
          tx.objectStore('projects').put({
            id,
            name,
            sb3: new Uint8Array(data).buffer,
            savedAt: Date.now(),
            byteLength: data.length,
          })
          tx.oncomplete = () => { db.close(); resolve() }
          tx.onerror = () => reject(tx.error)
        }
      })
    },
    { id, name, data: [...bytes] },
  )
}

async function seedLegacyWork(page: Page, id: string, name: string, bytes: Buffer) {
  await page.goto('/')
  await putLegacyWork(page, id, name, bytes)
}

test.describe('统一创作入口', () => {
  test('旧工坊地址直接进入 /create，不再出现第二套工作台', async ({ page }) => {
    await page.goto(LEGACY_HUB)
    await page.waitForURL(`${CREATE_HUB}`)
    await expect(page.getByRole('heading', { name: '创作中心' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Scratch 图形化创作' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Python 代码创作' })).toBeVisible()
    await expect(page.getByTestId('free-create-hub')).toHaveCount(0)
  })

  test('主导航与学习中心的 Scratch 入口都指向统一创作中心', async ({ page }, testInfo) => {
    await page.goto('/learn/catalog')
    const nav = page.getByTestId('kc-nav-scratch')
    await expect(nav).toHaveAttribute('href', CREATE_HUB)
    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: '展开导航' }).click()
    }
    await expect(nav).toBeVisible()
    await nav.click()
    await page.waitForURL(`${CREATE_HUB}`)
    await expect(page.getByRole('heading', { name: '创作中心' })).toBeVisible()

    await page.goto('/')
    const card = page.getByTestId('home-track-scratch')
    await expect(card.getByRole('link', { name: /查看工作台/ })).toHaveAttribute('href', CREATE_HUB)
  })

  test('旧工作台的本机作品无损迁移进统一作品库，旧库保留', async ({ page }) => {
    const sample = await readFile(SAMPLE_PATH)
    const legacyId = 'legacy-free-create-001'
    await seedLegacyWork(page, legacyId, '以前的接星星', sample)

    await page.goto(CREATE_HUB)
    const row = page.getByTestId('scratch-work-row').filter({ hasText: '以前的接星星' })
    await expect(row).toBeVisible()
    // The migrated work keeps its identity and opens in the unified editor
    // under the same id (the GUI itself may be unconfigured in this harness,
    // so the title/status — not the iframe — is the portable assertion).
    await page.goto(`/create/scratch/${legacyId}`)
    await expect(page.getByTestId('studio-title')).toHaveText('以前的接星星')

    // 旧数据库仍在，原记录没有被删除或改写。
    const legacyCount = await page.evaluate(
      () =>
        new Promise<number>((resolve, reject) => {
          const request = indexedDB.open('kidscoding-free-create')
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const db = request.result
            const tx = db.transaction('projects', 'readonly')
            const count = tx.objectStore('projects').count()
            count.onsuccess = () => { db.close(); resolve(count.result) }
            count.onerror = () => reject(count.error)
          }
        }),
    )
    expect(legacyCount).toBe(1)
  })

  test('旧深链 /studio/scratch/free/<id> 迁移后继续打开同一份作品', async ({ page }) => {
    const sample = await readFile(SAMPLE_PATH)
    const legacyId = 'legacy-free-create-002'
    await seedLegacyWork(page, legacyId, '旧的流星作品', sample)

    await page.goto(`${LEGACY_HUB}/${legacyId}`)
    await page.waitForURL(`**/create/scratch/${legacyId}`)
    // 未配置 Scratch 编辑服务时如实说明，且作品本身已经可取回。
    await expect(page.getByTestId('scratch-create-status')).toContainText('Scratch 编辑服务尚未配置')
    await expect(page.getByTestId('studio-title')).toHaveText('旧的流星作品')
  })

  test('旧的 /studio 列表也指向统一创作中心', async ({ page }) => {
    await page.goto('/studio')
    await expect(
      page.getByRole('link', { name: /创作中心（统一入口/ }),
    ).toHaveAttribute('href', CREATE_HUB)
  })

  test('旧库先为空、第一份作品稍后出现时，同一次访问内仍会同步', async ({ page }) => {
    const sample = await readFile(SAMPLE_PATH)
    // The retired library exists but has no works yet.
    await page.goto('/')
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open('kidscoding-free-create', 1)
          request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' })
          }
          request.onerror = () => reject(request.error)
          request.onsuccess = () => { request.result.close(); resolve() }
        }),
    )
    await page.goto(CREATE_HUB)
    await expect(page.getByText('这里还没有作品。')).toBeVisible()

    // The old tab saves its first work without reloading /create.
    await putLegacyWork(page, 'legacy-free-create-003', '同一次访问里出现的作品', sample)
    // The hub re-lists on focus, in the same document and IndexedDB session.
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(
      page.getByTestId('scratch-work-row').filter({ hasText: '同一次访问里出现的作品' }),
    ).toBeVisible()
  })

  test('旧库不存在时，迁移检查不会创建旧数据库，也不会写迁移标记', async ({ page }) => {
    await page.goto(CREATE_HUB)
    await expect(page.getByRole('heading', { name: '创作中心' })).toBeVisible()
    await expect(page.getByText('这里还没有作品。')).toBeVisible()
    const state = await page.evaluate(async () => {
      const names = (await indexedDB.databases()).map((database) => database.name)
      const markers = await new Promise<string[]>((resolve, reject) => {
        const request = indexedDB.open('kidscoding-create')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const keys = db.transaction('meta', 'readonly').objectStore('meta').getAllKeys()
          keys.onsuccess = () => { db.close(); resolve(keys.result.map(String)) }
          keys.onerror = () => reject(keys.error)
        }
      })
      return { names, markers }
    })
    expect(state.names).not.toContain('kidscoding-free-create')
    expect(state.names).not.toContain('kidscoding-scratch-create')
    expect(state.markers).not.toContain('free-create-v1')
    expect(state.markers).not.toContain('scratch-library-v1')
  })

  test('768px 与 375px 下创作中心不横向溢出', async ({ page }) => {
    for (const width of [768, 375]) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 1024 })
      await page.goto(CREATE_HUB)
      await expect(page.getByRole('heading', { name: '创作中心' })).toBeVisible()
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth)
    }
  })
})
