#!/usr/bin/env node
/**
 * Self-host Blockly's UI media (trash can / zoom sprites, cursors, click and
 * delete sounds). Blockly defaults to https://blockly-demo.appspot.com/static/media/,
 * which is unreachable from mainland China and from offline classrooms, so
 * the trash can icon and sounds fail to load. This copies the exact files that
 * ship with the installed `blockly` package into public/blockly-media/ so the
 * app serves them from its own origin. Runs before `dev` and `build`.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(webRoot, 'node_modules', 'blockly', 'media')
const target = path.join(webRoot, 'public', 'blockly-media')

if (!existsSync(source)) {
  console.error(`[copy-blockly-media] missing ${source}; run npm ci first`)
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true })
const count = readdirSync(target).length
console.log(`[copy-blockly-media] copied ${count} files to public/blockly-media/`)
