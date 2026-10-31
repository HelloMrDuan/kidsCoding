/**
 * SSR-101: the lesson / event-lab / grid-lab pages must never statically
 * import a module that executes browser-only code (navigator / window /
 * document) at module scope during server rendering.
 *
 * Root cause: TemplateStoryBuilder / EventLab / GridLab statically imported
 * BlocklyWorkspace, which imports @blockly/keyboard-navigation, which reads
 * navigator.platform at module scope. The lesson page's own
 * dynamic(..., { ssr: false }) for BlocklyWorkspace did not help, because
 * the static chain through TemplateStoryBuilder still pulled the same
 * module into the SSR bundle, and every /learn/lesson URL returned 500
 * (ReferenceError: navigator is not defined, digest 2491557641).
 *
 * This test walks the static import graph (dynamic() imports excluded, the
 * same boundary Next.js uses for ssr: false) from each classroom page and
 * asserts it cannot reach blockly-workspace or @blockly/keyboard-navigation.
 * It would have failed before the fix and passes after it.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(here, '../../..')

function resolveImport(fromFile: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) {
    base = path.join(srcRoot, spec.slice(2))
  } else if (spec.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), spec)
  } else {
    return null
  }
  const candidates = [
    base + '.ts',
    base + '.tsx',
    base + '/index.ts',
    base + '/index.tsx',
    base,
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }
  return null
}

function staticImports(file: string): string[] {
  const text = fs.readFileSync(file, 'utf8')
  const specs: string[] = []
  // Static imports only: `import ... from 'spec'` (possibly multi-line) and
  // side-effect `import 'spec'`. `import type ...` is erased at build time
  // and cannot pull runtime code into SSR, so it is skipped. dynamic()
  // imports have no `from` clause and are skipped by construction.
  const fromRe = /import\s+(?!type\b)[^;'"]*?from\s*['"]([^'"]+)['"]/g
  const sideRe = /import\s*['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = fromRe.exec(text)) !== null) {
    specs.push(match[1])
  }
  while ((match = sideRe.exec(text)) !== null) {
    specs.push(match[1])
  }
  return specs
}

function reachable(entry: string): Set<string> {
  const seen = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop() as string
    if (seen.has(file)) {
      continue
    }
    seen.add(file)
    if (!fs.existsSync(file)) {
      continue
    }
    for (const spec of staticImports(file)) {
      const resolved = resolveImport(file, spec)
      if (resolved && !seen.has(resolved)) {
        queue.push(resolved)
      }
    }
  }
  return seen
}

const pages = [
  'app/learn/lesson/[lessonId]/page.tsx',
  'app/learn/event-lab/[lessonId]/page.tsx',
  'app/learn/grid-lab/[lessonId]/page.tsx',
]

describe('SSR-101: classroom pages must not statically reach browser-only Blockly modules', () => {
  it.each(pages)('%s has no static chain to blockly-workspace or @blockly/keyboard-navigation', (page) => {
    const entry = path.join(srcRoot, page)
    const files = reachable(entry)
    // Sanity: the walker must actually traverse the page graph, otherwise
    // this test would pass vacuously.
    expect(files.size).toBeGreaterThan(10)
    expect([...files].some((f) => f.endsWith('page.tsx'))).toBe(true)
    const workspaceOffenders = [...files].filter((f) =>
      f.endsWith('blockly-workspace.tsx') || f.endsWith('blockly-workspace.ts'),
    )
    expect(workspaceOffenders).toEqual([])
    const keyboardOffenders: string[] = []
    for (const file of files) {
      for (const spec of staticImports(file)) {
        if (spec === '@blockly/keyboard-navigation') {
          keyboardOffenders.push(`${file} -> ${spec}`)
        }
      }
    }
    expect(keyboardOffenders).toEqual([])
  })
})
