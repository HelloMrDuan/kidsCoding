import { copyFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const source = dirname(require.resolve('pyodide'))
const target = new URL('../public/python-create-runtime/', import.meta.url)
await mkdir(target, { recursive: true })
for (const name of ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
  await copyFile(join(source, name), new URL(name, target))
}
await copyFile(new URL('../src/features/create/python-create-worker.js', import.meta.url), new URL('worker.js', target))
