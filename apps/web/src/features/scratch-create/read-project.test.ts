// @vitest-environment node
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { createBlankScratchProject } from './blank-project'
import { readScratchImport } from './read-project'

describe('Scratch .sb3 import limits', () => {
  it('round-trips a blank stage with its real backdrop in the archive', async () => {
    const blank = await createBlankScratchProject()
    const bytes = await readScratchImport(new File([blank], 'blank.sb3'))
    const zip = await JSZip.loadAsync(bytes)
    const project = JSON.parse(await zip.file('project.json')!.async('string'))
    expect(project.targets).toHaveLength(1)
    expect(project.targets[0].blocks).toEqual({})
    expect(zip.file(project.targets[0].costumes[0].md5ext)).not.toBeNull()
  })

  it('rejects malformed archives and separately rejects external extension URLs', async () => {
    await expect(readScratchImport(new File(['broken zip'], 'bad.sb3'))).rejects.toThrow()
    const zip = new JSZip()
    zip.file('project.json', JSON.stringify({
      targets: [{ isStage: true }],
      extensionURLs: { external: 'https://example.test/extension.js' },
    }))
    const bytes = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(readScratchImport(new File([bytes], 'external.sb3'))).rejects.toThrow('外部扩展')
  })

  it('bounds expanded project.json before passing the archive to Scratch', async () => {
    const zip = new JSZip()
    zip.file('project.json', JSON.stringify({ targets: [{ isStage: true }], comment: 'x'.repeat(1024 * 1024) }))
    const bytes = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
    expect(bytes.byteLength).toBeLessThan(4096)
    await expect(readScratchImport(new File([bytes], 'large.sb3'))).rejects.toThrow('解压后')
  })
})
