#!/usr/bin/env node
/**
 * KidsCoding 课程脚手架静态校验器（OPS-030）。
 *
 * 用法：
 *   node apps/web/scripts/check-lesson-scaffold.mjs --dir apps/web/src/features/ai-python
 *   node apps/web/scripts/check-lesson-scaffold.mjs --lessonId A1-U3-L04
 *
 * 校验项（静态，不编译 TS；深层校验由生成的骨架测试经 vitest 完成）：
 *  1. 课程 10 个文件齐全（数据/契约/适配器/草稿/插槽/路由/3 测试/E2E）。
 *  2. 课程 ID 格式合法（X0-U0-L00），且各文件内的 lessonId 一致。
 *  3. 契约引擎值为 slot 或 summary（不得为 json，不得冒充）。
 *  4. 草稿键为 kidscoding-draft:{lessonId}（按课分键，不串课）。
 *  5. 插槽含 onJudgment 上报通道（编辑报 null、校验报判定）。
 *  6. 适配器实现 EngineAdapter 关键方法（mount / validateDraft /
 *     getJudgmentResult / run / stop / getState）。
 *  7. 路由把契约、适配器、插槽交给统一 LessonWorkspace（不自造外壳）。
 *  8. E2E 骨架含三端视口（1440 / 768 / 375）与反馈卡断言。
 *  9. 无“已掌握”“本演示”等虚假文案。
 * 10. 无 TODO 残留统计（只报告数量，不判定失败——TODO 是课程作者的待填项）。
 *
 * 退出码：0 = 全部通过；1 = 有失败项。
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// vitest 下 import.meta.url 可能不是 file: URL，做防御：失败时退回 cwd。
let HERE = process.cwd()
try {
  HERE = dirname(fileURLToPath(import.meta.url))
} catch {
  HERE = process.cwd()
}
const WEB_ROOT = resolve(HERE, '..')

export function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = value
      i += 1
    }
  }
  return out
}

function lessonIdToSlug(lessonId) {
  return lessonId.toLowerCase().replace(/_/g, '-')
}

function findCourseFiles(webRoot, lessonId) {
  const slug = lessonIdToSlug(lessonId)
  const unit = lessonId.split('-').slice(0, 2).join('-').toLowerCase()
  const found = []
  const searchRoots = [
    join(webRoot, 'src', 'features'),
    join(webRoot, 'src', 'app', 'learn'),
    join(webRoot, 'tests', 'e2e'),
  ]
  const wanted = new Set([
    `${slug}.ts`,
    `${slug}-contract.ts`,
    `${slug}-adapter.ts`,
    `${slug}-draft.ts`,
    `${slug}-slot.tsx`,
    `${slug}.test.ts`,
    `${slug}-draft.test.ts`,
    `${slug}-slot.test.tsx`,
  ])
  function walk(dir) {
    let entries = []
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue
        walk(full)
      } else if (wanted.has(entry.name)) {
        found.push(full)
      } else if (
        entry.name.endsWith('.spec.ts') &&
        entry.name.includes(slug)
      ) {
        // E2E 骨架带前缀，如 ai-python-a1-u3-l04.spec.ts
        found.push(full)
      } else if (entry.name === 'page.tsx' && (full.includes(slug) || full.includes(unit))) {
        // 路由 page.tsx 在含单元名的目录下，如 ai-python-lab-a1-u3
        found.push(full)
      }
    }
  }
  for (const root of searchRoots) walk(root)
  return found
}

export function checkCourse({ lessonId, webRoot = WEB_ROOT }) {
  const results = []
  const fail = (name, detail) => results.push({ name, ok: false, detail })
  const pass = (name, detail) => results.push({ name, ok: true, detail })
  const slug = lessonIdToSlug(lessonId)

  if (!/^[A-Z0-9]+-U[0-9]+-L[0-9]+$/.test(lessonId)) {
    fail('课程 ID 格式', `lessonId 须为 X0-U0-L00 格式，收到：${lessonId}`)
    return { lessonId, results, todos: 0, passed: false }
  }
  pass('课程 ID 格式', lessonId)

  const files = findCourseFiles(webRoot, lessonId)
  const byName = new Map()
  for (const f of files) {
    const base = f.split('/').pop()
    if (!byName.has(base)) byName.set(base, f)
  }
  const required = [
    `${slug}.ts`,
    `${slug}-contract.ts`,
    `${slug}-adapter.ts`,
    `${slug}-draft.ts`,
    `${slug}-slot.tsx`,
    `${slug}.test.ts`,
    `${slug}-draft.test.ts`,
    `${slug}-slot.test.tsx`,
  ]
  const missing = required.filter((name) => !byName.has(name))
  // E2E 骨架带前缀（如 ai-python-a1-u3-l04.spec.ts），按“含 slug 的 .spec.ts”认。
  const hasSpec = files.some((f) => f.endsWith('.spec.ts') && f.includes(slug))
  if (!hasSpec) missing.push(`${slug}.spec.ts（或带前缀的同名 spec）`)
  // 路由 page.tsx 在含单元名的目录下。
  const hasPage = files.some((f) => f.endsWith('page.tsx'))
  if (!hasPage) missing.push('page.tsx（路由）')
  if (missing.length > 0) {
    fail('文件齐全', `缺失：${missing.join('、')}`)
  } else {
    pass('文件齐全', '10 个文件齐全（8 课程文件 + 路由 + E2E）')
  }

  const read = (name) => {
    const f = byName.get(name)
    if (!f) return ''
    try {
      return readFileSync(f, 'utf8')
    } catch {
      return ''
    }
  }
  const contract = read(`${slug}-contract.ts`)
  const adapter = read(`${slug}-adapter.ts`)
  const draft = read(`${slug}-draft.ts`)
  const slot = read(`${slug}-slot.tsx`)
  const route = read('page.tsx')
  const e2eFile = files.find((f) => f.endsWith('.spec.ts') && f.includes(slug))
  const e2e = e2eFile ? readFileSync(e2eFile, 'utf8') : ''
  // 虚假文案只查课程源码（契约/适配器/草稿/插槽/路由），不查测试与 E2E
  //（E2E 含 not.toContainText('本演示') 这类反向断言，属合法）。
  const sourceText = [contract, adapter, draft, slot, route].join('\n')
  const allText = [sourceText, e2e].join('\n')

  // 3. 引擎值
  const engineMatch = contract.match(/engine:\s*'(slot|summary|blockly|scratch-vm|json)'/)
  if (!engineMatch) {
    fail('契约引擎值', '契约内未找到 engine 值')
  } else if (engineMatch[1] === 'json') {
    fail('契约引擎值', "engine 不得为 'json'（JSON 课程用 'slot'，不得冒充）")
  } else {
    pass('契约引擎值', `engine: '${engineMatch[1]}'`)
  }

  // 4. 草稿键按课分键
  const draftKey = `kidscoding-draft:${lessonId}`
  if (!contract.includes(draftKey) || !draft.includes(draftKey)) {
    fail('草稿按课分键', `契约与草稿内均须出现 ${draftKey}`)
  } else {
    pass('草稿按课分键', draftKey)
  }

  // 5. 插槽 onJudgment 通道
  const hasOnJudgmentProp = /onJudgment\?:/.test(slot)
  const hasNullReport = /onJudgment\?\.\(null\)/.test(slot)
  const hasJudgmentReport = /onJudgment\?\.\(build\w*Judgment\(/.test(slot)
  if (!hasOnJudgmentProp || !hasNullReport || !hasJudgmentReport) {
    fail(
      '插槽 onJudgment 通道',
      `onJudgment 声明:${hasOnJudgmentProp} 编辑报 null:${hasNullReport} 校验报判定:${hasJudgmentReport}`,
    )
  } else {
    pass('插槽 onJudgment 通道', '编辑报 null、校验报判定')
  }

  // 6. 适配器关键方法
  const methods = ['mount', 'validateDraft', 'getJudgmentResult', 'run', 'stop', 'getState']
  const missingMethods = methods.filter((m) => !new RegExp(`\\b${m}\\s*\\(`).test(adapter))
  if (missingMethods.length > 0) {
    fail('适配器接口', `缺失方法：${missingMethods.join('、')}`)
  } else {
    pass('适配器接口', 'mount / validateDraft / getJudgmentResult / run / stop / getState 齐全')
  }

  // 7. 路由交给统一 LessonWorkspace
  if (!/LessonWorkspace/.test(route) || !/contract=/.test(route) || !/editorSlot=/.test(route)) {
    fail('路由接线', '路由须把契约、适配器、插槽交给统一 LessonWorkspace')
  } else {
    pass('路由接线', '契约 + 适配器 + 插槽交统一 LessonWorkspace')
  }

  // 8. E2E 三端 + 反馈卡
  const viewports = ['1440', '768', '375'].filter((v) => e2e.includes(v))
  const hasFeedback = /ws-feedback/.test(e2e)
  if (viewports.length < 3 || !hasFeedback) {
    fail('E2E 覆盖', `视口:${viewports.join('/')}（须 1440/768/375）反馈卡:${hasFeedback}`)
  } else {
    pass('E2E 覆盖', '三端视口 + 反馈卡断言')
  }

  // 9. 无虚假文案（只查课程源码，不查测试与 E2E 的反向断言）
  const badPhrases = ['已掌握', '本演示']
  const foundBad = badPhrases.filter((p) => sourceText.includes(p))
  if (foundBad.length > 0) {
    fail('无虚假文案', `出现：${foundBad.join('、')}`)
  } else {
    pass('无虚假文案', '无“已掌握”“本演示”')
  }

  // 10. TODO 统计（只报告，不判定）
  const todos = (allText.match(/TODO/g) || []).length

  const passed = results.every((r) => r.ok)
  return { lessonId, results, todos, passed }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const lessonId = args.lessonId
  if (!lessonId) {
    console.error('用法：node apps/web/scripts/check-lesson-scaffold.mjs --lessonId A1-U3-L04 [--dir <web 根目录>]')
    process.exit(1)
  }
  const webRoot = args.dir ? resolve(args.dir) : WEB_ROOT
  const { results, todos, passed } = checkCourse({ lessonId, webRoot })
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}：${r.detail}`)
  }
  console.log(`TODO 残留：${todos} 处（课程作者待填项，不计入失败）`)
  console.log(passed ? `校验通过：${lessonId}` : `校验失败：${lessonId}`)
  process.exit(passed ? 0 : 1)
}

let isMain = false
try {
  isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
} catch {
  isMain = false
}
if (isMain) main()
