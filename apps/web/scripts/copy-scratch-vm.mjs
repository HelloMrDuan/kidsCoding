#!/usr/bin/env node
/**
 * Self-host the pinned Scratch VM runtime (scratch-vm@5.0.300 and
 * scratch-storage@4.0.0) so the Scratch labs no longer load it from
 * jsDelivr at runtime. The CDN download failed in CI (run 41983605834,
 * scratch-real-vm-shard-s2) and left the VM uninitialised after the 60 s
 * test gate, even though the lesson code itself was fine. This copies the
 * exact files that ship with the installed npm packages into
 * public/scratch-vm/ so the app serves them from its own origin.
 * Runs before `dev` and `build`, next to copy-blockly-media.mjs.
 *
 * Notes:
 * - The npm package ships scratch-vm as unminified `dist/web/scratch-vm.js`
 *   (jsDelivr serves a Terser-minified rendering of the same file, which is
 *   generated on the fly and not reproducible from the package). We copy the
 *   package file as-is: same version, same code, no extra minify step.
 * - scratch-storage ships its own `dist/web/scratch-storage.min.js`, copied
 *   as-is; it is byte-identical to the file jsDelivr served.
 * - extension-worker.js is NOT copied: the VM only spawns it for
 *   externally-hosted extensions (loadExtensionURL), which no lesson uses;
 *   built-in extensions (pen, music, ...) load synchronously. The worker URL
 *   resolves document-relative either way, so behaviour is unchanged.
 * - scratch-render@2.2.84 (G2-U3-L04 only) is copied in the SAME clean-and-copy pass, so the
 *   prebuild's rmSync can never delete it. Only the L04 sandbox page loads it; the L02 / L03
 *   sandboxes and every other page do not reference it. It is a direct, exactly pinned
 *   dependency, and this script fails if the installed version differs from the pin.
 * - All three packages are AGPL-3.0-only; the licence is declared in
 *   package.json / package-lock.json, and the copies are build artefacts
 *   (public/scratch-vm/ is gitignored, like public/blockly-media/).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(webRoot, 'public', 'scratch-vm')

const files = [
  {
    source: path.join(webRoot, 'node_modules', 'scratch-vm', 'dist', 'web', 'scratch-vm.js'),
    name: 'scratch-vm.js',
  },
  {
    source: path.join(webRoot, 'node_modules', 'scratch-storage', 'dist', 'web', 'scratch-storage.min.js'),
    name: 'scratch-storage.min.js',
  },
  {
    source: path.join(webRoot, 'node_modules', 'scratch-render', 'dist', 'web', 'scratch-render.js'),
    name: 'scratch-render.js',
  },
]

// scratch-render must be exactly the pinned version: installed copy, package.json and lockfile all agree.
const SCRATCH_RENDER_PINNED = '2.2.84'
{
  const installed = existsSync(path.join(webRoot, 'node_modules', 'scratch-render', 'package.json'))
    ? JSON.parse(readFileSync(path.join(webRoot, 'node_modules', 'scratch-render', 'package.json'), 'utf8')).version
    : null
  const declared = JSON.parse(readFileSync(path.join(webRoot, 'package.json'), 'utf8')).dependencies?.['scratch-render']
  const locked = JSON.parse(readFileSync(path.join(webRoot, 'package-lock.json'), 'utf8')).packages?.['node_modules/scratch-render']?.version
  if (installed !== SCRATCH_RENDER_PINNED || declared !== SCRATCH_RENDER_PINNED || locked !== SCRATCH_RENDER_PINNED) {
    console.error(
      `[copy-scratch-vm] scratch-render must be exactly ${SCRATCH_RENDER_PINNED}: installed=${installed}, package.json=${declared}, lockfile=${locked}`,
    )
    process.exit(1)
  }
}

for (const { source } of files) {
  if (!existsSync(source)) {
    console.error(`[copy-scratch-vm] missing ${source}; run npm ci first`)
    process.exit(1)
  }
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
for (const { source, name } of files) {
  copyFileSync(source, path.join(target, name))
}
console.log(`[copy-scratch-vm] copied ${files.length} files to public/scratch-vm/`)
