import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// npm pack @scratch/scratch-gui@15.3.0
const packageFile = resolve(process.argv[2] ?? 'scratch-scratch-gui-15.3.0.tgz')
const expected = 'Iaa4Su+CA8pnZiGmBuN6ezLwNK06cfnH9zmVVKdPxRbGWbOTHGcIZ92C2gsvi51ArbKfPwcHboTQC4N3vs+maQ=='
const sha = createHash('sha512').update(readFileSync(packageFile)).digest('base64')
if (sha !== expected) throw new Error('Scratch package does not match the pinned npm integrity')
const site = fileURLToPath(new URL('./site/', import.meta.url))
mkdirSync(site, { recursive: true })
execFileSync('tar', ['-xf', packageFile, '-C', site, '--strip-components', '1', 'package/dist', 'package/LICENSE', 'package/TRADEMARK'])
for (const name of ['host.html', 'host.js', 'host.css']) {
  copyFileSync(fileURLToPath(new URL(name, import.meta.url)), resolve(site, name))
}
