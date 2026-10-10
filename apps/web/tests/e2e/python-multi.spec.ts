import { expect, test } from '@playwright/test'

test('second Python lesson executes three independent cases and restores the real draft after reload', async ({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/catalog/P0-U1-L02')
  await page.getByTestId('python-multi-trial-entry').click()
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-count')).toHaveText('0/3',{timeout:70_000})
  const correct='def introduce(name, hobby):\n    return f"我是{name}，喜欢{hobby}"'
  await page.getByTestId('python-multi-source').fill(correct)
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-passed')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-multi-count')).toHaveText('3/3')
  await expect(page.getByTestId('python-case-2')).toContainText('我是阿星，喜欢编程')
  await expect(page.getByTestId('python-local-save')).toContainText('已在本机保存')
  await page.reload()
  await expect(page.getByTestId('python-multi-source')).toHaveValue(correct)
  await expect(page.getByTestId('python-multi-passed')).toBeVisible()
})

test('third Python lesson must satisfy different city/weather combinations',async({page})=>{
  test.setTimeout(150_000)
  await page.goto('/learn/python-lab/P0-U1-L03')
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-source').fill('def weather_line(city, weather):\n    return "北京今天晴"')
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-count')).toHaveText('1/3',{timeout:70_000})
  await expect(page.getByTestId('python-multi-passed')).toHaveCount(0)
  await page.getByTestId('python-multi-source').fill('def weather_line(city, weather):\n    return f"{city}今天{weather}"')
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-passed')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-multi-count')).toHaveText('3/3')
})
