import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { hasCompletedFlight, hasRegularBursts, observeMeteorShower } from './meteor-runtime'

const start = 'public/scratch-samples/g3-u1-l02-golden-starter.sb3'

async function loadArchive(path: string) {
  const bytes = await readFile(path)
  return Uint8Array.from(bytes).buffer
}

describe('Golden meteor assessment with the Scratch VM', () => {
  it('counts the incomplete starter and observes the stranded clones', async () => {
    const run = await observeMeteorShower(await loadArchive(start))
    expect(run.finished).toBe(true)
    expect(run.clones).toHaveLength(6)
    expect(run.remaining).toBe(6)
    expect(run.clones.every(hasCompletedFlight)).toBe(false)
  }, 20_000)

  it('observes a repaired project with ten full flights and removal of each clone', async () => {
    const run = await observeMeteorShower(await loadArchive('public/scratch-samples/meteor-clones.sb3'))
    expect(run).toMatchObject({ finished: true, remaining: 0, originalHidden: true, usedCustomBlock: false })
    expect(hasRegularBursts(run.clones)).toBe(true)
    expect(run.clones.every(hasCompletedFlight)).toBe(true)
  }, 20_000)

  it('rejects deletion before individual meteors reach the bottom', async () => {
    const zip = await JSZip.loadAsync(await loadArchive('public/scratch-samples/meteor-clones.sb3'))
    const project = JSON.parse(await zip.file('project.json')!.async('string'))
    const meteor = project.targets.find((target: { name: string }) => target.name === '流星')
    meteor.blocks.down.inputs.TIMES[1][1] = '2'
    zip.file('project.json', JSON.stringify(project))
    const run = await observeMeteorShower(await zip.generateAsync({ type: 'arraybuffer' }))
    expect(run.remaining).toBe(0)
    expect(run.clones.every(hasCompletedFlight)).toBe(false)
  }, 20_000)

  it('observes every clone descending through a real custom procedure call', async () => {
    const zip = await JSZip.loadAsync(await loadArchive('public/scratch-samples/meteor-clones.sb3'))
    const project = JSON.parse(await zip.file('project.json')!.async('string'))
    const meteor = project.targets.find((target: { name: string }) => target.name === '流星')
    const blocks = meteor.blocks
    const mutation = { tagName: 'mutation', children: [], proccode: '下落', argumentids: '[]', argumentnames: '[]', argumentdefaults: '[]', warp: 'false' }
    blocks.set_y.next = 'fall_call'
    blocks.down.parent = 'fall_definition'
    blocks.down.next = null
    blocks.delete.parent = 'fall_call'
    blocks.fall_call = {
      opcode: 'procedures_call', next: 'delete', parent: 'set_y', inputs: {}, fields: {},
      shadow: false, topLevel: false, mutation,
    }
    blocks.fall_definition = {
      opcode: 'procedures_definition', next: 'down', parent: null, inputs: { custom_block: [1, 'fall_prototype'] }, fields: {},
      shadow: false, topLevel: true, x: 55, y: 320,
    }
    blocks.fall_prototype = {
      opcode: 'procedures_prototype', next: null, parent: 'fall_definition', inputs: {}, fields: {},
      shadow: true, topLevel: false, mutation,
    }
    zip.file('project.json', JSON.stringify(project))
    const run = await observeMeteorShower(await zip.generateAsync({ type: 'arraybuffer' }))
    expect(run.usedCustomBlock).toBe(true)
    expect(run.clones.every(hasCompletedFlight)).toBe(true)
  }, 20_000)
})
