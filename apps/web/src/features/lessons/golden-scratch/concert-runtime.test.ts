import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { decodeSampleArchive } from '@/features/scratch-g2/scratch-g2-draft'
import { observeForestConcert } from './concert-runtime'

function starter() {
  return decodeSampleArchive(readFileSync(resolve('public/scratch-samples/g2-u1-l03-forest-concert.sb3.b64'), 'utf8'))
}

describe('forest concert runs the current Scratch project', () => {
  it('observes the unfinished starter in the real VM', async () => {
    const result = await observeForestConcert(starter())
    expect(result).toMatchObject({ backdrop: '夜晚森林', bellCount: 3, birdSounds: ['叽叽'] })
  }, 30_000)

  it('observes the changed backdrop, bird song, bell count and host line from the .sb3', async () => {
    const zip = await JSZip.loadAsync(starter())
    const json = JSON.parse(await zip.file('project.json')!.async('string'))
    const stage = json.targets.find((target: { isStage: boolean }) => target.isStage)
    const cat = json.targets.find((target: { name: string }) => target.name === '小橘猫')
    const bird = json.targets.find((target: { name: string }) => target.name === '小鸟')
    stage.blocks.stage_backdrop_menu.fields.BACKDROP[0] = '绿色草地'
    stage.blocks.stage_repeat.inputs.TIMES[1][1] = '1'
    bird.blocks.bird_sound_menu.fields.SOUND_MENU[0] = '啾啾'
    cat.blocks.cat_say.inputs.MESSAGE[1][1] = '森林音乐会开始！'
    zip.file('project.json', JSON.stringify(json))
    const result = await observeForestConcert(await zip.generateAsync({ type: 'arraybuffer' }))
    expect(result).toMatchObject({
      backdrop: '绿色草地', bellCount: 1, birdSounds: ['啾啾'], catLine: '森林音乐会开始！', reachedFrameCap: false,
    })
  }, 30_000)
})
