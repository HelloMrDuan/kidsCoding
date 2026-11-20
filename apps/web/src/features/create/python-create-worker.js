/* global loadPyodide */
'use strict'

const send = self.postMessage.bind(self)
let inputAnswer
let started = false
let remaining = 64000
const output = []
let timer

function flush() {
  clearTimeout(timer)
  timer = undefined
  if (output.length) send({ kind: 'output', entries: output.splice(0) })
}

function write(channel, text) {
  if (!text || remaining <= 0) return
  const value = text.slice(0, remaining)
  remaining -= value.length
  const last = output.at(-1)
  if (last?.channel === channel) last.text += value
  else output.push({ channel, text: value })
  if (remaining === 0) output.push({ channel: 'stderr', text: '\n[输出达到上限，后续输出已省略]\n' })
  timer ??= setTimeout(flush, 80)
}

function stream(channel) {
  const decoder = new TextDecoder()
  return { write(bytes) { write(channel, decoder.decode(bytes, { stream: true })); return bytes.length } }
}

function promptFromPython(prompt) {
  flush()
  return new Promise((resolve) => {
    inputAnswer = resolve
    send({ kind: 'prompt', prompt: String(prompt).slice(0, 2000) })
  })
}

function importAsset(bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }))
  try { importScripts(url) } finally { URL.revokeObjectURL(url) }
}

async function initialize(assets) {
  // Pyodide resolves its five bootstrap filenames as URLs. Supply those
  // responses from transferred bytes. The sandbox CSP denies real requests.
  const indexURL = 'https://python-runtime.invalid/'
  self.fetch = async (resource) => {
    const url = typeof resource === 'string' ? resource : resource.url ?? resource.href
    if (typeof url !== 'string' || !url.startsWith(indexURL)) throw new Error('工作台禁止网络访问')
    const name = url.slice(indexURL.length)
    if (!Object.hasOwn(assets, name)) throw new Error('无法载入 Python 运行资源')
    return new Response(assets[name], { headers: { 'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' } })
  }
  importAsset(assets['pyodide.js'])
  importAsset(assets['pyodide.asm.js'])
  const Memory = WebAssembly.Memory
  WebAssembly.Memory = new Proxy(Memory, {
    construct(target, [options]) {
      return new target({ ...options, maximum: Math.min(options.maximum ?? 4096, 4096) })
    },
  })
  try {
    return await loadPyodide({ indexURL, jsglobals: Object.create(null) })
  } finally {
    WebAssembly.Memory = Memory
    self.fetch = async () => { throw new Error('工作台禁止网络访问') }
  }
}

const interactiveInput = [
  'import builtins as _builtins',
  'from pyodide.ffi import run_sync as _wait',
  'from _kc_input import read as _read',
  "def _input(prompt=''):",
  '    return _wait(_read(str(prompt)))',
  '_builtins.input = _input',
].join('\n')

const unsupportedInput = [
  'import builtins as _builtins',
  "def _input(prompt=''):",
  "    raise RuntimeError('当前浏览器不支持交互输入，请使用最新版 Chrome 或 Edge。')",
  '_builtins.input = _input',
].join('\n')

async function run(source, assets) {
  let python
  try { python = await initialize(assets) }
  catch {
    send({ kind: 'failed', reason: 'Python 引擎初始化失败。请重置环境后重试。' })
    return
  }
  python.setStdout(stream('stdout'))
  python.setStderr(stream('stderr'))
  python.setStdin({ error: true })
  python.registerJsModule('_kc_input', { read: promptFromPython })
  const namespace = python.toPy({ __name__: '__main__', __file__: 'main.py' })
  const interactive = typeof WebAssembly.Suspending === 'function' && typeof WebAssembly.promising === 'function'
  send({ kind: 'running' })
  try {
    python.runPython(interactive ? interactiveInput : unsupportedInput)
    await python.runPythonAsync(source, { globals: namespace, filename: 'main.py' })
    flush()
    send({ kind: 'done' })
  } catch (error) {
    flush()
    const message = String(error)
    const lines = Array.from(message.matchAll(/File "main\.py", line (\d+)/g))
    const line = Number(lines.at(-1)?.[1]) || undefined
    const traceback = message.indexOf('  File "main.py"')
    const text = (traceback < 0 ? message : message.slice(traceback)).slice(0, 5000).trim()
    send({ kind: 'failed', reason: text || 'Python 程序执行失败。', line })
  } finally { namespace.destroy() }
}

self.onmessage = (event) => {
  const data = event.data
  if (data?.kind === 'input' && inputAnswer && typeof data.value === 'string') {
    const answer = inputAnswer
    inputAnswer = undefined
    answer(data.value.slice(0, 4000))
    return
  }
  if (started || typeof data?.source !== 'string' || !data.assets) return
  started = true
  void run(data.source, data.assets).catch(() => send({ kind: 'failed', reason: 'Python 执行环境异常。请重置环境后重试。' }))
}
