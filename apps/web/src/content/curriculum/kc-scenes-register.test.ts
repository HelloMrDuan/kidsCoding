import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

// UX-004: the kc-scenes asset set and its license ledger must stay in sync.
const SCENES_DIR = path.resolve(__dirname, '../../../../../apps/web/public/kc-scenes')
const REGISTER = path.resolve(__dirname, '../../../../../docs/roadmap/assets-register.md')

// Low-bandwidth budget: every scene SVG must stay small enough to fetch in
// one go on a slow connection; no multi-size variants are needed (vector).
const SIZE_BUDGET_BYTES = 15000

const ACCEPTANCE_SET = [
  'fox.svg',
  'bear.svg',
  'butterfly.svg',
  'forest.svg',
  'meadow.svg',
  'garden.svg',
  'graduation-island.svg',
]

describe('kc-scenes asset register (UX-004)', () => {
  it('covers the acceptance set: fox, bear, butterfly, forest, meadow, garden, graduation island', () => {
    const files = readdirSync(SCENES_DIR).filter((f) => f.endsWith('.svg')).sort()
    expect(files).toEqual([...ACCEPTANCE_SET].sort())
  })

  it('register lists exactly the files on disk, each with an original license', () => {
    const md = readFileSync(REGISTER, 'utf8')
    const listed = [...md.matchAll(/kc-scenes\/([a-z-]+\.svg)/g)].map((m) => m[1])
    const files = readdirSync(SCENES_DIR).filter((f) => f.endsWith('.svg')).sort()
    expect([...new Set(listed)].sort()).toEqual(files)
    for (const file of files) {
      const row = md.split('\n').find((line) => line.includes(`kc-scenes/${file}`))
      expect(row).toBeDefined()
      expect(row).toContain('original')
    }
  })

  it('every SVG parses, carries a viewBox, and stays within the size budget', () => {
    for (const file of ACCEPTANCE_SET) {
      const full = path.join(SCENES_DIR, file)
      expect(statSync(full).size).toBeLessThan(SIZE_BUDGET_BYTES)
      const text = readFileSync(full, 'utf8')
      expect(text).toContain('<svg ')
      expect(text).toContain('viewBox=')
      expect(text.trimEnd().endsWith('</svg>')).toBe(true)
    }
  })

  it('register documents the low-bandwidth fallback', () => {
    const md = readFileSync(REGISTER, 'utf8')
    expect(md).toContain('低带宽降级')
    expect(md).toContain('15000')
  })
})
