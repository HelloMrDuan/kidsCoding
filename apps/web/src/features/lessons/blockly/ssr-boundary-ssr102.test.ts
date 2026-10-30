/**
 * SSR-102: the /project complete page must never statically import a
 * module that executes browser-only code (navigator / window / document)
 * at module scope during server rendering.
 *
 * Same root cause as SSR-101: DuoProject / UnitProject statically imported
 * BlocklyWorkspace, which imports @blockly/keyboard-navigation, which reads
 * navigator.platform at module scope. The complete page short-circuits
 * invalid IDs ("没有找到这个作品"), so only a valid projectId reaches the
 * DuoProject / UnitProject render — and no valid projectId has been
 * obtained yet, so a live 500 on this page has NOT been reproduced. This
 * test guards the static chain regardless of that: it would have failed
 * before the fix and passes after it.
 *
 * The fix (same pattern as SSR-101) moves the BlocklyWorkspace import
 * inside DuoProject / UnitProject to next/dynamic with ssr: false, so the
 * static walker below — which skips dynamic() imports, the same boundary
 * Next.js uses for ssr: false — can no longer reach blockly-workspace or
 * @blockly/keyboard-navigation from the complete page. The page itself
 * still statically imports DuoProject / UnitProject; only the Blockly
 * part is deferred, and BlocklyWorkspace initialization timing inside
 * the workspace component is untouched.
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

describe('SSR-102: complete page must not statically reach browser-only Blockly modules', () => {
  it('app/project/[projectId]/complete/page.tsx has no static chain to blockly-workspace or @blockly/keyboard-navigation', () => {
    const entry = path.join(srcRoot, 'app/project/[projectId]/complete/page.tsx')
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
