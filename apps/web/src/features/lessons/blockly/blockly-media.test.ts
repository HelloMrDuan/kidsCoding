import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { BLOCKLY_MEDIA_PATH } from './blockly-media'

const webRoot = path.resolve(__dirname, '../../../..')
const injectSites = [
  'src/features/lessons/blockly/blockly-workspace.tsx',
  'src/features/scratch-g2/scratch-g2-blocks.tsx',
  'src/features/scratch-vm/scratch-meteor-blocks.tsx',
]

describe('Blockly media is self-hosted', () => {
  it('points at a same-origin path, never the appspot demo host', () => {
    expect(BLOCKLY_MEDIA_PATH).toBe('/blockly-media/')
    expect(BLOCKLY_MEDIA_PATH.startsWith('/')).toBe(true)
    expect(BLOCKLY_MEDIA_PATH).not.toMatch(/appspot|https?:/)
  })

  it.each(injectSites)('%s passes media: BLOCKLY_MEDIA_PATH to Blockly.inject', (file) => {
    const src = readFileSync(path.join(webRoot, file), 'utf8')
    expect(src).toMatch(/media:\s*BLOCKLY_MEDIA_PATH/)
    expect(src).not.toMatch(/blockly-demo\.appspot\.com/)
  })

  it('every file Blockly needs exists in the installed package to copy', () => {
    const media = path.join(webRoot, 'node_modules/blockly/media')
    for (const f of ['sprites.png', 'delete.mp3', 'click.mp3', 'disconnect.mp3', 'handdelete.cur']) {
      expect(existsSync(path.join(media, f)), f).toBe(true)
    }
  })

  it('copy script runs before dev and build', () => {
    const pkg = JSON.parse(readFileSync(path.join(webRoot, 'package.json'), 'utf8'))
    expect(pkg.scripts.predev).toContain('copy-blockly-media')
    expect(pkg.scripts.prebuild).toContain('copy-blockly-media')
  })
})
