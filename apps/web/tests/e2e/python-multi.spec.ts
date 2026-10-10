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
  await page.getByTestId('python-portfolio-link').click()
  await expect(page.getByTestId('practice-item-P0-U1-L02')).toBeVisible()
  await expect(page.getByText('不是正式课程成绩', { exact: true })).toBeVisible()
  await page.getByRole('link',{name:'继续编辑作品 →'}).click()
  await expect(page.getByTestId('python-multi-source')).toHaveValue(correct)
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

test('fourth Python lesson distinguishes integer addition and string concatenation with a leading-zero case',async({page})=>{
  test.setTimeout(150_000)
  await page.goto('/learn/catalog/P0-U1-L04')
  await page.getByTestId('python-multi-trial-entry').click()
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-count')).toHaveText('0/3',{timeout:70_000})
  await page.getByTestId('python-multi-source').fill('def number_or_text(left, right):\n    return f"相加={int(left)+int(right)}；拼接={left+right}"')
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-passed')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-multi-count')).toHaveText('3/3')
  await expect(page.getByTestId('python-case-2')).toContainText('相加=8；拼接=08')
})

test('fifth Python lesson strips whitespace and handles blank input rather than treating it as a name',async({page})=>{
  test.setTimeout(150_000)
  await page.goto('/learn/python-lab/P0-U1-L05')
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-source').fill('def greet_name(name, prefix):\n    return f"{prefix}，{name.strip()}"')
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-count')).toHaveText('2/3',{timeout:70_000})
  await page.getByTestId('python-multi-source').fill('def greet_name(name, prefix):\n    clean = name.strip()\n    if not clean:\n        return "请输入名字"\n    return f"{prefix}，{clean}"')
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-passed')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-multi-count')).toHaveText('3/3')
  await expect(page.getByTestId('python-case-2')).toContainText('请输入名字')
})

test('sixth Python capstone executes a real three-input card, rejects bad data, and restores source', async ({page}) => {
  test.setTimeout(180_000)
  await page.goto('/learn/catalog/P0-U1-L06')
  await page.getByTestId('python-multi-trial-entry').click()
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-count')).toHaveText('0/6',{timeout:70_000})
  await page.getByTestId('python-multi-source').fill('def make_profile(nickname, hobby, color):\n    return "任意内容"')
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-count')).toHaveText('0/6',{timeout:70_000})
  await expect(page.getByTestId('python-card-preview')).toHaveCount(0)

  const solution = [
    'def make_profile(nickname, hobby, color):',
    '    fields = (("昵称", nickname), ("爱好", hobby), ("喜欢的颜色", color))',
    '    cleaned = []',
    '    for label, value in fields:',
    '        clean = value.strip()',
    '        if not clean or len(clean) > 20 or any(c in clean for c in "\\r\\n\\t"):',
    '            raise ValueError("应填写1至20字且不含换行")',
    '        cleaned.append(f"{label}：{clean}")',
    '    return "\\n".join(cleaned)',
  ].join('\n')
  await page.getByTestId('python-multi-source').fill(solution)
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-passed')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-multi-count')).toHaveText('6/6')
  await expect(page.getByTestId('python-card-preview')).toContainText('昵称：小雨')
  await expect(page.getByTestId('python-card-preview')).toContainText('喜欢的颜色：蓝')
  await expect(page.getByTestId('python-case-5')).toContainText('ERROR:ValueError')
  await expect(page.getByTestId('python-local-save')).toContainText('已在本机保存')
  await page.reload()
  await expect(page.getByTestId('python-multi-source')).toHaveValue(solution)
  await page.getByTestId('python-portfolio-link').click()
  await expect(page.getByTestId('practice-item-P0-U1-L06')).toBeVisible()
  await page.getByTestId('practice-item-P0-U1-L06').getByRole('link',{name:'继续编辑作品 →'}).click()
  await expect(page.getByTestId('python-multi-source')).toHaveValue(solution)
})
