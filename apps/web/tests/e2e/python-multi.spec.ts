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

test('TQ-005 second practice runs self-chosen arguments and ignores copies of fixed cases', async ({page}) => {
  test.setTimeout(180_000)
  await page.goto('/learn/python-lab/P0-U1-L02')
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-source').fill('def introduce(name, hobby):\n    return f"我是{name}，喜欢{hobby}"')
  await page.getByTestId('python-custom-arg-0').fill('小雨')
  await page.getByTestId('python-custom-arg-1').fill('画画')
  await page.getByTestId('python-custom-run').click()
  await expect(page.getByTestId('python-custom-result')).toContainText('我是小雨，喜欢画画', {timeout:70_000})
  await expect(page.getByTestId('python-custom-done')).toHaveCount(0)
  await page.getByTestId('python-custom-arg-1').fill('唱歌')
  await page.getByTestId('python-custom-run').click()
  await expect(page.getByTestId('python-custom-result')).toContainText('我是小雨，喜欢唱歌', {timeout:70_000})
  await expect(page.getByTestId('python-custom-done')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('python-custom-done')).toBeVisible()
})

test('TQ-005 real NameError shows three ordered hint layers instead of a generic failure', async ({page}) => {
  test.setTimeout(150_000)
  await page.goto('/learn/python-lab/P0-U1-L03')
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-source').fill('def weather_line(city, weather):\n    return f"{city}今天{weathr}"')
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-error-hints')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-error-hints')).toContainText('NameError')
  await expect(page.getByTestId('python-error-hints')).toContainText('现象：')
  await expect(page.getByTestId('python-error-hints')).toContainText('可能原因：')
  await expect(page.getByTestId('python-error-hints')).toContainText('动手修复：')
  await expect(page.getByTestId('python-multi-passed')).toHaveCount(0)
})

test('sixth Python capstone executes a real three-input card, rejects bad data, and restores source', async ({page}) => {  test.setTimeout(180_000)
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

// UX-604: the three P3 lessons on the shared page had no browser E2E coverage
// (the 7 tests above only visit P0 lessons). Minimal load / edit / run regression
// for each, same pattern as the P0 tests. Solutions verified locally against
// every case in python-multi-grade.ts with exact string equality (the harness
// compares outputs[index] === expected, no trimming).
test('P3-U1-L02 ledger_row writes a quoted CSV row and rejects bad amounts', async ({page})=>{
  test.setTimeout(150_000)
  await page.goto('/learn/python-lab/P3-U1-L02')
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-count')).toHaveText('0/4',{timeout:70_000})
  const solution = [
    'import csv',
    'import io',
    '',
    'def ledger_row(item, amount, category):',
    '    item = item.strip()',
    '    category = category.strip()',
    '    if not item or not category:',
    '        raise ValueError("项目或类别为空")',
    '    try:',
    '        value = float(amount)',
    '    except (TypeError, ValueError):',
    '        raise ValueError("金额不是数字")',
    '    buf = io.StringIO()',
    '    writer = csv.writer(buf, lineterminator="\\n")',
    '    writer.writerow([item, f"{value:.2f}", category])',
    '    return buf.getvalue().strip()',
  ].join('\n')
  await page.getByTestId('python-multi-source').fill(solution)
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-passed')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-multi-count')).toHaveText('4/4')
  await expect(page.getByTestId('python-case-1')).toContainText('"书,笔记本",30.00,学习')
  await expect(page.getByTestId('python-local-save')).toContainText('已在本机保存')
})

test('P3-U1-L03 contact_card finds a contact and rejects bad JSON', async ({page})=>{
  test.setTimeout(150_000)
  await page.goto('/learn/python-lab/P3-U1-L03')
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-count')).toHaveText('0/4',{timeout:70_000})
  const solution = [
    'import json',
    '',
    'def contact_card(json_text, name):',
    '    name = name.strip()',
    '    if not name:',
    '        raise ValueError("姓名为空")',
    '    try:',
    '        contacts = json.loads(json_text)',
    '    except Exception:',
    '        raise ValueError("JSON 解析失败")',
    '    if not isinstance(contacts, list):',
    '        raise ValueError("通讯录不是列表")',
    '    for person in contacts:',
    '        if person.get("姓名") == name:',
    '            return f"姓名：{name}；电话：{person.get(\'电话\', \'\')}"',
    '    raise ValueError("找不到姓名")',
  ].join('\n')
  await page.getByTestId('python-multi-source').fill(solution)
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-passed')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-multi-count')).toHaveText('4/4')
  await expect(page.getByTestId('python-case-0')).toContainText('姓名：小雨；电话：分机101')
  await expect(page.getByTestId('python-local-save')).toContainText('已在本机保存')
})

test('P3-U2-L02 line_chart draws a text line chart and rejects bad data', async ({page})=>{
  test.setTimeout(150_000)
  await page.goto('/learn/python-lab/P3-U2-L02')
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-count')).toHaveText('0/5',{timeout:70_000})
  const solution = [
    'import csv',
    'import io',
    '',
    'def line_chart(csv_text, height):',
    '    h = int(height)',
    '    if h < 2:',
    '        raise ValueError("高度须大于 1")',
    '    reader = csv.DictReader(io.StringIO(csv_text))',
    '    rows = list(reader)',
    '    if len(rows) < 2:',
    '        raise ValueError("记录少于 2 条")',
    '    temps = []',
    '    for row in rows:',
    '        raw = (row.get("温度") or "").strip()',
    '        if raw == "":',
    '            raise ValueError("温度为空")',
    '        try:',
    '            temps.append(float(raw))',
    '        except ValueError:',
    '            raise ValueError("温度不是数字")',
    '    lo, hi = min(temps), max(temps)',
    '    if lo == hi:',
    '        raise ValueError("所有温度相同")',
    '    grid = [[" "] * len(temps) for _ in range(h)]',
    '    for j, t in enumerate(temps):',
    '        r = round((t - lo) / (hi - lo) * (h - 1))',
    '        grid[(h - 1) - r][j] = "*"',
    '    return "\\n".join("".join(row).rstrip() for row in grid)',
  ].join('\n')
  await page.getByTestId('python-multi-source').fill(solution)
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-passed')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-multi-count')).toHaveText('5/5')
  await expect(page.getByTestId('python-case-0')).toContainText('*')
  await expect(page.getByTestId('python-case-4')).toContainText('ERROR:ValueError')
  await expect(page.getByTestId('python-local-save')).toContainText('已在本机保存')
})
// OPS-031: P3-U1-L01 dedicated 3-viewport CI. Every L01 test runs once per
// viewport with a [viewport] tag in its title, so the p3-u1-l01-browser-trial
// job can shard with --grep "P3-U1-L01.*\\[<viewport>\\]". Per viewport:
// main-run + practice-B + viewport-fit = 3 tests, 0 skipped.
// The test bodies are byte-identical to #243 (only titles + setViewportSize
// changed); grading logic, cases, assertions and the solution string are
// untouched.
const L01_VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 375, height: 812 },
] as const

for (const vp of L01_VIEWPORTS) {
  test(`P3-U1-L01 [${vp.name}] diary CSV round-trip runs five real cases and restores the draft after reload`, async ({page})=>{
    test.setTimeout(180_000)
    await page.setViewportSize({width:vp.width,height:vp.height})
    await page.goto('/learn/python-lab/P3-U1-L01')
    await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
    await page.getByTestId('python-multi-run').click()
    await expect(page.getByTestId('python-multi-count')).toHaveText('0/5',{timeout:70_000})
    const solution='import csv\nimport io\n\ndef diary_entry(csv_text, date):\n    reader = csv.DictReader(io.StringIO(csv_text))\n    if not reader.fieldnames:\n        raise ValueError("没有找到这一天的日记")\n    for row in reader:\n        if row.get("日期") == date:\n            buf = io.StringIO()\n            writer = csv.DictWriter(buf, fieldnames=reader.fieldnames, lineterminator="\\n")\n            writer.writeheader()\n            writer.writerow(row)\n            return buf.getvalue()\n    raise ValueError("没有找到这一天的日记")'
    await page.getByTestId('python-multi-source').fill(solution)
    await page.getByTestId('python-multi-run').click()
    await expect(page.getByTestId('python-multi-passed')).toBeVisible({timeout:70_000})
    await expect(page.getByTestId('python-multi-count')).toHaveText('5/5')
    await expect(page.getByTestId('python-case-1')).toContainText('复习了昨天的笔记, 还画了图')
    await expect(page.getByTestId('python-case-4')).toContainText('ERROR:ValueError')
    await expect(page.getByTestId('python-local-save')).toContainText('已在本机保存')
    await page.reload()
    await expect(page.getByTestId('python-multi-source')).toHaveValue(solution)
    await expect(page.getByTestId('python-multi-passed')).toBeVisible()
    await page.getByTestId('python-portfolio-link').click()
    await expect(page.getByTestId('practice-item-P3-U1-L01')).toBeVisible()
    await expect(page.getByText('不是正式课程成绩', { exact: true })).toBeVisible()
    await page.getByRole('link',{name:'继续编辑作品 →'}).click()
    await expect(page.getByTestId('python-multi-source')).toHaveValue(solution)
  })
}

for (const vp of L01_VIEWPORTS) {
  test(`P3-U1-L01 [${vp.name}] second practice runs a new diary date and reports a missing date as a real error`, async ({page})=>{
    test.setTimeout(180_000)
    await page.setViewportSize({width:vp.width,height:vp.height})
    await page.goto('/learn/python-lab/P3-U1-L01')
    await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
    const solution='import csv\nimport io\n\ndef diary_entry(csv_text, date):\n    reader = csv.DictReader(io.StringIO(csv_text))\n    if not reader.fieldnames:\n        raise ValueError("没有找到这一天的日记")\n    for row in reader:\n        if row.get("日期") == date:\n            buf = io.StringIO()\n            writer = csv.DictWriter(buf, fieldnames=reader.fieldnames, lineterminator="\\n")\n            writer.writeheader()\n            writer.writerow(row)\n            return buf.getvalue()\n    raise ValueError("没有找到这一天的日记")'
    await page.getByTestId('python-multi-source').fill(solution)
    await page.getByTestId('python-custom-arg-0').fill('日期,心情,日记\n2026-10-04,兴奋,今天跑了步\n')
    await page.getByTestId('python-custom-arg-1').fill('2026-10-04')
    await page.getByTestId('python-custom-run').click()
    await expect(page.getByTestId('python-custom-result')).toContainText('2026-10-04,兴奋,今天跑了步', {timeout:70_000})
    await expect(page.getByTestId('python-custom-done')).toBeVisible()
    await page.getByTestId('python-custom-arg-1').fill('2026-10-09')
    await page.getByTestId('python-custom-run').click()
    await expect(page.getByTestId('python-custom-result')).toContainText('ERROR:ValueError', {timeout:70_000})
    await page.reload()
    await expect(page.getByTestId('python-custom-done')).toBeVisible()
  })
}

for (const vp of L01_VIEWPORTS) {
  test(`P3-U1-L01 [${vp.name}] viewport fits without horizontal overflow`, async ({page})=>{
    test.setTimeout(120_000)
    await page.setViewportSize({width:vp.width,height:vp.height})
    await page.goto('/learn/python-lab/P3-U1-L01')
    await expect(page.getByTestId('python-multi-run')).toBeEnabled({timeout:15_000})
    await expect(page.getByTestId('python-multi-run')).toBeVisible()
    await expect(page.getByTestId('python-custom-arg-0')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBe(0)
  })
}
