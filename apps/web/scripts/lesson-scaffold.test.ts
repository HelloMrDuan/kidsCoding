/**
 * 课程脚手架测试（OPS-030）。
 *
 * 覆盖：生成器（8 文件齐全、拒绝覆盖、参数校验、不生成生产路由与 E2E）
 * 与静态校验器（通过项与失败项）。生成目标为临时目录，不写仓库真实课程目录。
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { checkCourse } from './check-lesson-scaffold.mjs'
import { derivePaths, generate, lessonIdToSlug } from './scaffold-lesson.mjs'

const LESSON_ID = 'A1-U3-L04'
const TITLE = '检索可信资料'

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'scaffold-test-'))
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

function gen() {
  return generate({ lessonId: LESSON_ID, title: TITLE, engine: 'slot', outDir: tmp })
}

describe('scaffold-lesson generator (OPS-030)', () => {
  it('generates 8 files with the right paths', () => {
    const result = gen()
    expect(result.files).toHaveLength(8)
    const slug = lessonIdToSlug(LESSON_ID)
    for (const name of [
      `${slug}.ts`,
      `${slug}-contract.ts`,
      `${slug}-adapter.ts`,
      `${slug}-draft.ts`,
      `${slug}-slot.tsx`,
      `${slug}.test.ts`,
      `${slug}-draft.test.ts`,
      `${slug}-slot.test.tsx`,
    ]) {
      expect(
        result.files.some((f) => f.endsWith(name)),
        `missing ${name}`,
      ).toBe(true)
    }
  })

  it('does not emit a production route or an E2E spec (demo must not enter prod routes)', () => {
    const result = gen()
    expect(result.files.some((f) => f.endsWith('page.tsx'))).toBe(false)
    expect(result.files.some((f) => f.endsWith('.spec.ts'))).toBe(false)
    expect(result.files.some((f) => f.includes('src/app'))).toBe(false)
    expect(result.files.some((f) => f.includes('tests/e2e'))).toBe(false)
  })

  it('generated files land under the derived A1 directories', () => {
    const result = gen()
    expect(result.featureDir).toBe('src/features/ai-python')
    expect(result.routeDir).toBe('src/app/learn/ai-python-lab-u3-l04')
    expect(existsSync(join(tmp, 'src/features/ai-python', `${lessonIdToSlug(LESSON_ID)}-contract.ts`))).toBe(true)
  })

  it('generated contract emits no route constant (no production route yet)', () => {
    gen()
    const contract = readFileSync(
      join(tmp, 'src/features/ai-python', `${lessonIdToSlug(LESSON_ID)}-contract.ts`),
      'utf8',
    )
    expect(contract).not.toContain('_ROUTE')
    expect(contract).not.toContain('/learn/')
  })

  it('refuses to overwrite an existing target', () => {
    gen()
    expect(() => gen()).toThrow(/拒绝覆盖/)
  })

  it('rejects a bad lessonId and a non-slot/summary engine', () => {
    expect(() => generate({ lessonId: 'BAD', title: TITLE, outDir: tmp })).toThrow(/lessonId/)
    expect(() => generate({ lessonId: LESSON_ID, title: TITLE, engine: 'json', outDir: tmp })).toThrow(
      /slot \/ summary/,
    )
    expect(() => generate({ lessonId: LESSON_ID, title: TITLE, engine: 'scratch-vm', outDir: tmp })).toThrow(
      /slot \/ summary/,
    )
  })

  it('derives G2 paths for a G2 lesson', () => {
    const paths = derivePaths('G2-U3-L03')
    expect(paths.featureDir).toBe('src/features/lessons/g2-u3')
    expect(paths.routeDir).toBe('src/app/learn/g2-u3-l03')
    expect(paths.e2ePrefix).toBe('g2-u3')
  })

  it('generated contract uses the slot engine and the per-lesson draft key', () => {
    gen()
    const contract = readFileSync(
      join(tmp, 'src/features/ai-python', `${lessonIdToSlug(LESSON_ID)}-contract.ts`),
      'utf8',
    )
    expect(contract).toContain("engine: 'slot'")
    expect(contract).toContain(`kidscoding-draft:${LESSON_ID}`)
    expect(contract).not.toContain("engine: 'json'")
    expect(contract).not.toContain('已掌握')
  })

  it('generated slot wires onJudgment (null on edit, judgment on check)', () => {
    gen()
    const slot = readFileSync(
      join(tmp, 'src/features/ai-python', `${lessonIdToSlug(LESSON_ID)}-slot.tsx`),
      'utf8',
    )
    expect(slot).toContain('onJudgment?:')
    expect(slot).toContain('onJudgment?.(null)')
    expect(slot).toContain('onJudgment?.(build')
  })

  it('prints a CI snippet and a ledger template (not applied automatically)', () => {
    const result = gen()
    expect(result.ciSnippet).toContain('curriculum-content.yml')
    expect(result.ciSnippet).toContain(`${LESSON_ID.toLowerCase()}-browser-trial`)
    expect(result.ledgerTemplate).toContain(LESSON_ID)
    expect(result.ledgerTemplate).toContain('outline_not_playable')
  })
})

describe('check-lesson-scaffold validator (OPS-030)', () => {
  it('passes a freshly generated course', () => {
    gen()
    // 校验器按 web 根目录搜索课程文件：把生成目录当作 web 根。
    const { results, passed } = checkCourse({ lessonId: LESSON_ID, webRoot: tmp })
    const failed = results.filter((r) => !r.ok)
    expect(failed, JSON.stringify(failed)).toEqual([])
    expect(passed).toBe(true)
  })

  it('fails a bad lessonId', () => {
    const { passed, results } = checkCourse({ lessonId: 'BAD', webRoot: tmp })
    expect(passed).toBe(false)
    expect(results[0].ok).toBe(false)
  })

  it('fails when files are missing', () => {
    const { passed, results } = checkCourse({ lessonId: LESSON_ID, webRoot: tmp })
    expect(passed).toBe(false)
    const missing = results.find((r) => r.name === '文件齐全')
    expect(missing?.ok).toBe(false)
  })

  it('fails a json engine and a wrong draft key', () => {
    gen()
    const slug = lessonIdToSlug(LESSON_ID)
    const contractPath = join(tmp, 'src/features/ai-python', `${slug}-contract.ts`)
    const contract = readFileSync(contractPath, 'utf8')
    // 把 engine 改成 json：应被判失败。
    writeFileSync(contractPath, contract.replace("engine: 'slot'", "engine: 'json'"), 'utf8')
    const { passed, results } = checkCourse({ lessonId: LESSON_ID, webRoot: tmp })
    expect(passed).toBe(false)
    expect(results.find((r) => r.name === '契约引擎值')?.ok).toBe(false)

    // 恢复 engine，把草稿键改错：应被判失败。
    writeFileSync(contractPath, contract, 'utf8')
    const draftPath = join(tmp, 'src/features/ai-python', `${slug}-draft.ts`)
    const draft = readFileSync(draftPath, 'utf8')
    writeFileSync(
      draftPath,
      draft.replace(`kidscoding-draft:${LESSON_ID}`, 'kidscoding-draft:OTHER'),
      'utf8',
    )
    const second = checkCourse({ lessonId: LESSON_ID, webRoot: tmp })
    expect(second.passed).toBe(false)
    expect(second.results.find((r) => r.name === '草稿按课分键')?.ok).toBe(false)
  })

  it('fails when the slot drops the onJudgment channel', () => {
    gen()
    const slug = lessonIdToSlug(LESSON_ID)
    const slotPath = join(tmp, 'src/features/ai-python', `${slug}-slot.tsx`)
    const slot = readFileSync(slotPath, 'utf8')
    writeFileSync(slotPath, slot.replace('onJudgment?.(null)', '// removed'), 'utf8')
    const { passed, results } = checkCourse({ lessonId: LESSON_ID, webRoot: tmp })
    expect(passed).toBe(false)
    expect(results.find((r) => r.name === '插槽 onJudgment 通道')?.ok).toBe(false)
  })
})
