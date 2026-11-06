import { expect, test } from '@playwright/test'

const ROUTE = '/learn/ai-python-lab-u3-l03/A1-U3-L03'

test.describe('A1-U3-L03 lesson page', () => {
  test('renders the schema table and the JSON editor', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByText('结构化JSON输出：水果记录 JSON 校验')).toBeVisible()
    await expect(page.locator('table th').nth(0)).toHaveText('字段')
    await expect(page.locator('table td').first()).toHaveText('名称')
    await expect(page.getByTestId('ai-u3-l03-json-input')).toBeVisible()
    await expect(page.getByTestId('ai-u3-l03-validate')).toBeVisible()
  })

  test('a correct record passes all five checks and shows the work summary', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-good').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-verdict')).toContainText('合格：五项全部通过')
    await expect(page.getByTestId('ai-u3-l03-work')).toContainText('作品总结')
  })

  test('a missing required field names that field', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-missing-required').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    const result = page.getByTestId('ai-u3-l03-result')
    await expect(result).toContainText('未合格')
    await expect(result).toContainText('「颜色」')
    await expect(result).toContainText('字段齐全：失败')
  })

  test('a type error names the weight field', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-type-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    const result = page.getByTestId('ai-u3-l03-result')
    await expect(result).toContainText('「重量」')
    await expect(result).toContainText('类型正确：失败')
  })

  test('an illegal category names the name field', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-enum-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    const result = page.getByTestId('ai-u3-l03-result')
    await expect(result).toContainText('「名称」')
    await expect(result).toContainText('枚举内：失败')
  })

  test('an abnormal weight fails range', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-range-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    const result = page.getByTestId('ai-u3-l03-result')
    await expect(result).toContainText('「重量」')
    await expect(result).toContainText('数值范围：失败')
  })

  test('fix flow: repair the type error and reach pass', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-type-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-result')).toContainText('未合格')
    await page.getByTestId('ai-u3-l03-json-input').fill('{\n  "名称": "苹果",\n  "颜色": "红",\n  "重量": 182,\n  "直径": 7.6\n}')
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-verdict')).toContainText('合格：五项全部通过')
  })

  test('broken JSON shows a format error', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-json-input').fill('{bad')
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-result')).toContainText('JSON 格式错误')
  })

  test('three-level hints reveal progressively', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-hint-1').click()
    await expect(page.getByTestId('ai-u3-l03-hint-text')).toContainText('看字段表')
    await expect(page.getByTestId('ai-u3-l03-hint-text')).not.toContainText('五项全过')
    await page.getByTestId('ai-u3-l03-hint-3').click()
    await expect(page.getByTestId('ai-u3-l03-hint-text')).toContainText('五项全过')
  })

  test('save failure shows 未能保存 and recovery restores saving', async ({ page }) => {
    test.setTimeout(150_000)
    // 在页面脚本之前包一层 setItem：窗口旗标为真时抛 QuotaExceededError。
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem
      const flags = window as unknown as { __l03FailSave?: boolean }
      flags.__l03FailSave = false
      Storage.prototype.setItem = function (key: string, value: string) {
        if (flags.__l03FailSave) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        }
        return original.call(this, key, value)
      }
    })
    await page.goto(ROUTE)
    const setFail = (value: boolean) =>
      page.evaluate((flag) => {
        ;(window as unknown as { __l03FailSave?: boolean }).__l03FailSave = flag
      }, value)
    await setFail(true)
    await page.getByTestId('ai-u3-l03-example-good').click()
    await expect(page.getByTestId('ai-u3-l03-draft-status')).toContainText('未能保存')
    // 失败的一次没有留下半截草稿：关掉旗标再写，保存恢复；刷新后恢复的是
    // 恢复后写的那条（type-error 例子，含字符串 "182"），不是失败的那条。
    await setFail(false)
    await page.getByTestId('ai-u3-l03-example-type-error').click()
    await expect(page.getByTestId('ai-u3-l03-draft-status')).toContainText('已保存到本机草稿')
    await page.reload()
    await expect(page.getByTestId('ai-u3-l03-json-input')).toHaveValue(/"182"/)
  })

  test('draft saves and restores across reload; restore-default clears', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-type-error').click()
    await page.reload()
    await expect(page.getByTestId('ai-u3-l03-json-input')).toHaveValue(/"182"/)
    await page.getByTestId('ai-u3-l03-reset').click()
    await expect(page.getByTestId('ai-u3-l03-json-input')).toHaveValue('')
  })
})

test.describe('A1-U3-L03 narrow screen', () => {
  test('375px: no horizontal overflow before or after interaction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
    await expect.poll(overflow, { timeout: 10_000 }).toBe(false)
    await page.getByTestId('ai-u3-l03-example-enum-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-result')).toBeVisible()
    await expect.poll(overflow, { timeout: 10_000 }).toBe(false)
  })
})
