#!/usr/bin/env node
/**
 * G2-U3-L04 方案 A 的 SPIKE 专用：把 npm 包里固定版本的 scratch-render（dist/web/scratch-render.js，原样复制，不再压缩）
 * 复制到 public/scratch-vm/，供 scratch-render-spike-sandbox.html 使用。
 *
 * 刻意**不**并入 copy-scratch-vm.mjs：那个脚本被每个课程的 predev / prebuild 使用，
 * 首席要求「不将未经验证的渲染器全局推广」。spike 通过后是否并入，由首席在正式接课程时裁定。
 * 版本核对：包版本必须与 package-lock.json 里固定的版本一致，否则失败（不静默使用别的版本）。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(webRoot, 'node_modules', 'scratch-render', 'package.json'), 'utf8'))
const lock = JSON.parse(readFileSync(path.join(webRoot, 'package-lock.json'), 'utf8'))
const locked = lock.packages?.['node_modules/scratch-render']?.version
const EXPECTED = '2.2.84'
if (pkg.version !== EXPECTED || locked !== EXPECTED) {
  console.error(`scratch-render 版本不符：安装 ${pkg.version}，锁文件 ${locked}，期望 ${EXPECTED}`)
  process.exit(1)
}
const source = path.join(webRoot, 'node_modules', 'scratch-render', 'dist', 'web', 'scratch-render.js')
if (!existsSync(source)) {
  console.error(`缺少 ${source}`)
  process.exit(1)
}
const target = path.join(webRoot, 'public', 'scratch-vm')
mkdirSync(target, { recursive: true })
copyFileSync(source, path.join(target, 'scratch-render.js'))
console.log(`copied scratch-render@${pkg.version} -> public/scratch-vm/scratch-render.js`)
