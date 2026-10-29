import {describe, expect, it} from 'vitest'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {BIRD_NEST_ZONE, emptyG2Observations, evaluateG2Lesson, evaluateG2U1L01, evaluateG2U1L02, evaluateG2U1L03, g2u1L01, g2u1L02, g2u1L03, L03_WELCOME, g2u1ScratchLessons, evaluateG2U1L04, g2u1L04, L04_ARRIVAL, inFishZone, evaluateG2U1L05, g2u1L05, L05_BIRD_LINE, inCenterZone, evaluateG2U1L06, g2u1L06, L06_CAT_LINE, inRibbonZone, inBirdNest, observedPrediction, g2ScratchLessons, getG2ScratchLesson} from './g2-u1-scratch-lessons'
import {atDoor, evaluateG2U2L01, g2u2L01, L07_CAT_LINE} from './g2-u2-scratch-lessons'
import fullCatalog from './full-catalog-v1.json'

const web = path.resolve(__dirname, '../../..')
const catalogIds = new Set(fullCatalog.tracks.flatMap(t => t.units.flatMap(u => u.lessons.map(l => l.id))))

describe('G2-U1 Scratch VM lessons: teaching contract', () => {
  it('every lesson is a real catalog lesson with its own sample .sb3 on disk', () => {
    for (const lesson of Object.values(g2ScratchLessons)) {
      expect(catalogIds.has(lesson.id)).toBe(true)
      expect(existsSync(path.join(web, 'public', lesson.sample))).toBe(true)
    }
  })

  it('has two hands-on practices with different skills, one debug case, three hint layers and a creative task', () => {
    for (const lesson of Object.values(g2ScratchLessons)) {
      const a = lesson.tasks.find(t => t.id === 'practiceA')!
      const b = lesson.tasks.find(t => t.id === 'practiceB')!
      expect(a.skill).not.toEqual(b.skill)
      expect(a.goal).not.toEqual(b.goal)
      expect(lesson.tasks.some(t => t.id === 'debug')).toBe(true)
      expect(lesson.tasks.some(t => t.id === 'create')).toBe(true)
      expect(lesson.hints).toHaveLength(3)
      expect(new Set(lesson.hints).size).toBe(3)
      expect(lesson.predict.options).toContain(lesson.predict.correct)
      for (const step of lesson.steps) {
        expect(step.solutions.length).toBeGreaterThan(0)
        expect(step.counterExamples.length).toBeGreaterThan(0)
      }
    }
  })

  it('L01 tasks complete only from VM observations, not from editing alone', () => {
    const none = evaluateG2U1L01(emptyG2Observations())
    expect(Object.values(none).every(v => v === false)).toBe(true)
    const obs = emptyG2Observations()
    obs.clickedSpeakers = ['小橘猫']
    expect(evaluateG2U1L01(obs).practiceA).toBe(false)
    obs.clickedSpeakers = ['小橘猫', '小鸟']
    expect(evaluateG2U1L01(obs).practiceA).toBe(true)
    expect(observedPrediction(g2u1L01.id, obs)).toBe('小鸟说话')
    obs.positionsAfterRun = {小鸟: {x: -150, y: 110}}
    expect(evaluateG2U1L01(obs).practiceB).toBe(false)
    obs.positionsAfterRun = {小鸟: {x: 110, y: 60}}
    expect(evaluateG2U1L01(obs).practiceB).toBe(true)
    expect(evaluateG2U1L01({...obs, stageMoveRejected: true}).debug).toBe(true)
    obs.lastSaid = {小橘猫: '你好！我是小橘猫。'}
    expect(evaluateG2U1L01(obs).create).toBe(false)
    obs.lastSaid = {小橘猫: '一起去放风筝吧'}
    expect(evaluateG2U1L01(obs).create).toBe(true)
  })

  it('accepts more than one correct nest position (equivalent solutions) and rejects the edges outside', () => {
    expect(inBirdNest({x: BIRD_NEST_ZONE.minX, y: BIRD_NEST_ZONE.minY})).toBe(true)
    expect(inBirdNest({x: 90, y: 80})).toBe(true)
    expect(inBirdNest({x: 151, y: 60})).toBe(false)
    expect(inBirdNest({x: 110, y: 44})).toBe(false)
    expect(inBirdNest({x: Number.NaN, y: 60})).toBe(false)
  })

  it('L02 tasks complete only from VM costume observations', () => {
    const obs = emptyG2Observations()
    expect(Object.values(evaluateG2U1L02(obs)).every(v => v === false)).toBe(true)
    expect(evaluateG2Lesson(g2u1L02.id, obs)).toEqual(evaluateG2U1L02(obs))
    obs.costumesAfterRun = {小橘猫: '站立', 小鸟: '收翅'}
    expect(evaluateG2U1L02(obs).practiceA).toBe(false)
    obs.costumesAfterRun = {小橘猫: '挥手', 小鸟: '收翅'}
    expect(evaluateG2U1L02(obs).practiceA).toBe(true)
    expect(evaluateG2U1L02(obs).create).toBe(false)
    obs.costumesAfterRun = {小橘猫: '挥手', 小鸟: '展翅'}
    expect(evaluateG2U1L02(obs).create).toBe(true)
    obs.clickCostumeChanges = {小橘猫: 2, 小鸟: 5}
    expect(evaluateG2U1L02(obs).practiceB).toBe(false)
    obs.clickCostumeChanges = {小橘猫: 3}
    expect(evaluateG2U1L02(obs).practiceB).toBe(true)
    expect(evaluateG2U1L02(obs).debug).toBe(false)
    expect(evaluateG2U1L02({...obs, stageCostumeRejected: true}).debug).toBe(true)
  })

  it('L02 prediction is read from the first costume change the VM showed after a click', () => {
    const obs = emptyG2Observations()
    expect(observedPrediction(g2u1L02.id, obs)).toBeNull()
    obs.firstClickTransition = {小橘猫: {from: '挥手', to: '站立'}}
    expect(observedPrediction(g2u1L02.id, obs)).toBeNull()
    obs.firstClickTransition = {小橘猫: {from: '站立', to: '挥手'}}
    expect(observedPrediction(g2u1L02.id, obs)).toBe(g2u1L02.predict.correct)
  })

  it('L02 offers each sprite only its own costumes and gives the stage none of the sprite costumes as its own', () => {
    const cat = g2u1L02.targets.find(t => t.name === '小橘猫')!
    const bird = g2u1L02.targets.find(t => t.name === '小鸟')!
    const stage = g2u1L02.targets.find(t => t.kind === 'stage')!
    expect(cat.costumes).toEqual(['站立', '挥手'])
    expect(bird.costumes).toEqual(['收翅', '展翅'])
    expect(stage.extraToolbox).toEqual(['kc2_switch_costume'])
    expect(stage.scripts[0].body).toEqual([])
    expect(g2u1L02.concept).not.toEqual(g2u1L01.concept)
    expect(g2u1L02.sample).not.toEqual(g2u1L01.sample)
  })

  it('L03 tasks come from VM green-flag runs (backdrop + stage sound count) and VM click sounds', () => {
    const obs = emptyG2Observations()
    expect(Object.values(evaluateG2U1L03(obs)).every(v => v === false)).toBe(true)
    expect(observedPrediction(g2u1L03.id, obs)).toBeNull()
    obs.flagRuns = [{backdrop: '夜晚森林', stagePlays: 3}]
    expect(observedPrediction(g2u1L03.id, obs)).toBe(g2u1L03.predict.correct)
    expect(evaluateG2U1L03(obs).practiceA).toBe(false)
    expect(evaluateG2U1L03(obs).debug).toBe(false)
    obs.flagRuns.push({backdrop: '绿色草地', stagePlays: 3})
    expect(evaluateG2U1L03(obs).practiceA).toBe(true)
    expect(evaluateG2U1L03(obs).debug).toBe(false)
    obs.flagRuns.push({backdrop: '绿色草地', stagePlays: 1})
    expect(evaluateG2U1L03(obs).debug).toBe(true)
    // A single quiet run without first seeing the repeat bug is not the debug task.
    expect(evaluateG2U1L03({...obs, flagRuns: [{backdrop: '绿色草地', stagePlays: 1}]}).debug).toBe(false)
    expect(observedPrediction(g2u1L03.id, {...obs, flagRuns: [{backdrop: '夜晚森林', stagePlays: 2}]})).toBeNull()
    obs.clickSounds = {小鸟: ['叽叽']}
    expect(evaluateG2U1L03(obs).practiceB).toBe(false)
    obs.clickSounds = {小鸟: ['叽叽', '啾啾']}
    expect(evaluateG2U1L03(obs).practiceB).toBe(true)
    obs.lastSaid = {小橘猫: L03_WELCOME}
    expect(evaluateG2U1L03(obs).create).toBe(false)
    obs.lastSaid = {小橘猫: '音乐会开始啦'}
    expect(evaluateG2U1L03(obs).create).toBe(true)
    expect(evaluateG2U1L03({...obs, flagRuns: [{backdrop: '夜晚森林', stagePlays: 1}]}).create).toBe(false)
  })

  it('L03 gives the stage its backdrops and sound and the bird only its own sounds', () => {
    const stage = g2u1L03.targets.find(t => t.kind === 'stage')!
    const bird = g2u1L03.targets.find(t => t.name === '小鸟')!
    expect(stage.costumes).toEqual(['夜晚森林', '绿色草地'])
    expect(stage.sounds).toEqual(['开幕铃'])
    expect(stage.scripts[0].body.length).toBeGreaterThan(0)
    expect(bird.sounds).toEqual(['叽叽', '啾啾'])
    expect(new Set(Object.values(g2ScratchLessons).map(l => l.concept)).size).toBe(Object.keys(g2ScratchLessons).length)
  })

  it('L04 tasks come from VM flag-run positions (which way the cat walked) and VM-counted pinwheel turns', () => {
    const obs = emptyG2Observations()
    const run = (x: number) => ({backdrop: '小河边', stagePlays: 0, positions: {小橘猫: {x, y: -70}, 风车: {x: 0, y: 82}}})
    expect(Object.values(evaluateG2U1L04(obs)).every(v => v === false)).toBe(true)
    expect(observedPrediction(g2u1L04.id, obs)).toBeNull()
    obs.flagRuns = [run(-200)]
    expect(observedPrediction(g2u1L04.id, obs)).toBe(g2u1L04.predict.correct)
    expect(evaluateG2U1L04(obs).debug).toBe(false)
    obs.flagRuns.push(run(0))
    expect(evaluateG2U1L04(obs).debug).toBe(true)
    expect(evaluateG2U1L04(obs).practiceA).toBe(false)
    obs.flagRuns.push(run(140))
    expect(evaluateG2U1L04(obs).practiceA).toBe(true)
    // Walking right without first seeing the left-walk bug is not the debug task.
    expect(evaluateG2U1L04({...obs, flagRuns: [run(140)]}).debug).toBe(false)
    expect(observedPrediction(g2u1L04.id, {...obs, flagRuns: [run(140)]})).toBe('向右走')
    expect(inFishZone({x: 99, y: -70})).toBe(false)
    expect(inFishZone({x: 170, y: -70})).toBe(true)
    expect(inFishZone({x: 140, y: 30})).toBe(false)
    obs.clickTurns = {风车: [15]}
    expect(evaluateG2U1L04(obs).practiceB).toBe(false)
    obs.clickTurns = {风车: [15, 90]}
    expect(evaluateG2U1L04(obs).practiceB).toBe(true)
    obs.lastSaid = {小橘猫: L04_ARRIVAL}
    obs.clickTurns = {风车: [90, 360]}
    expect(evaluateG2U1L04(obs).create).toBe(false)
    obs.lastSaid = {小橘猫: '小鱼我来啦'}
    expect(evaluateG2U1L04(obs).create).toBe(true)
    expect(evaluateG2U1L04({...obs, clickTurns: {风车: [90]}}).create).toBe(false)
    expect(evaluateG2U1L04({...obs, flagRuns: [run(-200), run(0)]}).create).toBe(false)
  })

  it('L04 lets the cat change direction, steps and line, and the pinwheel only its turn loop', () => {
    const cat = g2u1L04.targets.find(t => t.name === '小橘猫')!
    const wheel = g2u1L04.targets.find(t => t.name === '风车')!
    expect(cat.scripts[0].body.map(b => b.type)).toEqual(['kc2_goto_start', 'kc2_point_direction', 'kc2_move_steps', 'kc2_say'])
    expect(cat.scripts[0].body[0].slots).toEqual([])
    expect(wheel.scripts[0].body[0].children?.map(b => b.type)).toEqual(['kc2_turn_right', 'kc2_wait'])
    expect(g2u1L04.showDirection).toBe(true)
  })

  it('L05 tasks come from VM broadcast runs: the message sent, who spoke after it, backdrop and rabbit position', () => {
    const obs = emptyG2Observations()
    const run = (speakers: string[], backdrop = '幕布舞台', rabbitX = 110, message = '开场') =>
      ({message, speakers, backdrop, positions: {小白兔: {x: rabbitX, y: -40}}})
    expect(Object.values(evaluateG2U1L05(obs)).every(v => v === false)).toBe(true)
    expect(observedPrediction(g2u1L05.id, obs)).toBeNull()
    obs.broadcastRuns = [run([])]
    expect(observedPrediction(g2u1L05.id, obs)).toBe(g2u1L05.predict.correct)
    expect(evaluateG2U1L05(obs).debug).toBe(false)
    obs.broadcastRuns.push(run(['小鸟']))
    expect(evaluateG2U1L05(obs).debug).toBe(true)
    // A bird that speaks without first being seen silent is not the debug task; other messages do not count.
    expect(evaluateG2U1L05({...obs, broadcastRuns: [run(['小鸟'])]}).debug).toBe(false)
    expect(evaluateG2U1L05({...obs, broadcastRuns: [run([]), run(['小鸟'], '幕布舞台', 110, '谢幕')]}).debug).toBe(false)
    expect(evaluateG2U1L05(obs).practiceA).toBe(false)
    obs.broadcastRuns.push(run([], '灯光舞台'))
    expect(evaluateG2U1L05(obs).practiceA).toBe(true)
    expect(evaluateG2U1L05(obs).practiceB).toBe(false)
    obs.broadcastRuns.push(run([], '幕布舞台', 30))
    expect(evaluateG2U1L05(obs).practiceB).toBe(true)
    expect(inCenterZone({x: -41, y: 0})).toBe(false)
    expect(inCenterZone({x: 40, y: 0})).toBe(true)
    obs.lastSaid = {小鸟: L05_BIRD_LINE}
    obs.broadcastRuns.push(run(['小鸟'], '灯光舞台', 0))
    expect(evaluateG2U1L05(obs).create).toBe(false)
    obs.lastSaid = {小鸟: '欢迎来看表演'}
    expect(evaluateG2U1L05(obs).create).toBe(true)
    expect(evaluateG2U1L05({...obs, broadcastRuns: [run(['小鸟'], '灯光舞台', 110)]}).create).toBe(false)
  })

  it('L05 keeps the cat broadcast fixed and lets the bird choose which message it listens for', () => {
    const cat = g2u1L05.targets.find(t => t.name === '小橘猫')!
    const bird = g2u1L05.targets.find(t => t.name === '小鸟')!
    const stage = g2u1L05.targets.find(t => t.kind === 'stage')!
    expect(cat.scripts[0].body.map(b => b.type)).toEqual(['kc2_say', 'kc2_broadcast'])
    expect(cat.scripts[0].body[1]).toMatchObject({slots: [], fixed: {BROADCAST_OPTION: '开场'}})
    expect(bird.scripts[0].hat).toBe('kc2_when_receive')
    expect(bird.scripts[0].hatSlots?.[0].options).toEqual(['开场', '谢幕'])
    expect(stage.scripts.map(s => s.hat)).toEqual(['kc2_flag', 'kc2_when_receive'])
  })
  it('L06 tasks come from VM green-flag speech runs (order + talking over) and the costume the cake wore when its song started', () => {
    const obs = emptyG2Observations()
    const run = (speakers: string[], overlaps: number, balloonY = -70) => ({speakers, overlaps, positions: {气球: {x: 160, y: balloonY}}})
    expect(Object.values(evaluateG2U1L06(obs)).every(v => v === false)).toBe(true)
    expect(observedPrediction(g2u1L06.id, obs)).toBeNull()
    obs.speechRuns = [run(['小橘猫', '气球'], 1)]
    expect(observedPrediction(g2u1L06.id, obs)).toBe(g2u1L06.predict.correct)
    expect(evaluateG2U1L06(obs).debug).toBe(false)
    obs.speechRuns.push(run(['小橘猫', '气球'], 0))
    expect(evaluateG2U1L06(obs).debug).toBe(true)
    // Turn-taking without first seeing the overlap is not the debug task; a run where only one sprite spoke does not count.
    expect(evaluateG2U1L06({...obs, speechRuns: [run(['小橘猫', '气球'], 0)]}).debug).toBe(false)
    expect(evaluateG2U1L06({...obs, speechRuns: [run(['小橘猫', '气球'], 2), run(['小橘猫'], 0)]}).debug).toBe(false)
    expect(evaluateG2U1L06(obs).practiceB).toBe(false)
    obs.speechRuns.push(run(['小橘猫', '气球'], 1, -30))
    expect(evaluateG2U1L06(obs).practiceB).toBe(true)
    expect(inRibbonZone({x: 0, y: -41})).toBe(false)
    expect(inRibbonZone({x: 0, y: -20})).toBe(true)
    expect(evaluateG2U1L06(obs).practiceA).toBe(false)
    obs.soundCostumes = [{target: '蛋糕', sound: '生日歌', costume: '蜡烛熄灭'}]
    expect(evaluateG2U1L06(obs).practiceA).toBe(false)
    obs.soundCostumes.push({target: '蛋糕', sound: '生日歌', costume: '蜡烛点亮'})
    expect(evaluateG2U1L06(obs).practiceA).toBe(true)
    obs.lastSaid = {小橘猫: L06_CAT_LINE}
    expect(evaluateG2U1L06(obs).create).toBe(false)
    obs.lastSaid = {小橘猫: '祝你天天开心'}
    // The ribbon run above still had an overlap, so the card is not finished yet.
    expect(evaluateG2U1L06(obs).create).toBe(false)
    obs.speechRuns.push(run(['小橘猫', '气球'], 0, -40))
    expect(evaluateG2U1L06(obs).create).toBe(true)
    expect(evaluateG2U1L06({...obs, soundCostumes: [{target: '蛋糕', sound: '生日歌', costume: '蜡烛熄灭'}]}).create).toBe(false)
  })

  it('L06 combines say, costume, sound, wait and repeat + change y; only the balloon wait, rise and lines are lesson values', () => {
    const cake = g2u1L06.targets.find(t => t.name === '蛋糕')!
    const balloon = g2u1L06.targets.find(t => t.name === '气球')!
    expect(cake.scripts.map(s => s.hat)).toEqual(['kc2_flag', 'kc2_clicked'])
    expect(cake.scripts[1].body.map(b => b.type)).toEqual(['kc2_switch_costume', 'kc2_play_sound'])
    expect(cake.scripts[1].body[1]).toMatchObject({slots: [], fixed: {SOUND_MENU: '生日歌'}})
    expect(balloon.scripts[0].body.map(b => b.type)).toEqual(['kc2_goto_start', 'kc2_wait_whole', 'kc2_say', 'kc2_repeat'])
    expect(balloon.scripts[0].body[1].slots[0]).toMatchObject({min: 0, max: 5})
    expect(balloon.scripts[0].body[1].slots[0].tenths).toBeUndefined()
    expect(balloon.scripts[0].body[3].children?.map(b => b.type)).toEqual(['kc2_change_y'])
    expect(g2u1L06.showSpeechOrder).toBe(true)
  })

  it('U2-L01 is registered with U1 and its tasks come from VM-measured frame runs (count, end frame, time per frame) and position', () => {
    expect(Object.keys(g2u1ScratchLessons)).not.toContain(g2u2L01.id)
    expect(getG2ScratchLesson(g2u2L01.id)).toBe(g2u2L01)
    const obs = emptyG2Observations()
    const run = (count: number, avgMs: number | null, end: string, x = -40) =>
      ({frames: {小橘猫: {count, avgMs, end}, 小鸟: {count: 8, avgMs: 300, end: '收翅'}}, positions: {小橘猫: {x, y: -80}}})
    expect(Object.values(evaluateG2U2L01(obs)).every(v => v === false)).toBe(true)
    expect(observedPrediction(g2u2L01.id, obs)).toBeNull()
    obs.frameRuns = [run(6, 34, '走路3')]
    expect(observedPrediction(g2u2L01.id, obs)).toBe(g2u2L01.predict.correct)
    expect(evaluateG2U2L01(obs).practiceA).toBe(false)
    expect(evaluateG2U2L01(obs).debug).toBe(false)
    // A visible run without first seeing the blur is not the debug task; 120 ms is neither blur nor visible.
    expect(evaluateG2U2L01({...obs, frameRuns: [run(6, 200, '走路3')]}).debug).toBe(false)
    expect(evaluateG2U2L01({...obs, frameRuns: [run(6, 34, '走路3'), run(6, 120, '走路3')]}).debug).toBe(false)
    obs.frameRuns.push(run(8, 205, '走路1'))
    expect(evaluateG2U2L01(obs)).toMatchObject({practiceA: true, practiceB: false, debug: true, create: false})
    // Only the bird's frames (cat never stepped) do not count for the cat.
    expect(evaluateG2U2L01({...obs, frameRuns: [{frames: {小鸟: {count: 8, avgMs: 300, end: '收翅'}}, positions: {}}]}).practiceA).toBe(false)
    expect(atDoor({x: 99, y: 0})).toBe(false)
    expect(atDoor({x: 170, y: 0})).toBe(true)
    obs.frameRuns.push(run(12, 40, '走路1', 140))
    expect(evaluateG2U2L01(obs).practiceB).toBe(true)
    obs.lastSaid = {小橘猫: L07_CAT_LINE}
    expect(evaluateG2U2L01(obs).create).toBe(false)
    obs.lastSaid = {小橘猫: '回家吃鱼啦'}
    // The door run was still a blur, so the walk home is not finished yet.
    expect(evaluateG2U2L01(obs).create).toBe(false)
    obs.frameRuns.push(run(12, 210, '走路1', 140))
    expect(evaluateG2U2L01(obs).create).toBe(true)
    expect(evaluateG2U2L01({...obs, frameRuns: [run(12, 34, '走路1'), run(10, 210, '走路3', 140)]}).create).toBe(false)
  })

  it('U2-L01 loops move + next costume + a 0-allowed tenths wait; the bird is a fixed demo without lesson values', () => {
    const cat = g2u2L01.targets.find(t => t.name === '小橘猫')!
    const bird = g2u2L01.targets.find(t => t.name === '小鸟')!
    expect(cat.costumes).toEqual(['走路1', '走路2', '走路3', '走路4'])
    expect(cat.scripts[0].body.map(b => b.type)).toEqual(['kc2_goto_start', 'kc2_switch_costume', 'kc2_repeat', 'kc2_say'])
    expect(cat.scripts[0].body[2].children?.map(b => b.type)).toEqual(['kc2_move_steps', 'kc2_next_costume', 'kc2_wait_free'])
    expect(cat.scripts[0].body[2].children?.[2].slots[0]).toMatchObject({min: 0, max: 1, tenths: true})
    const birdSlots = (specs: typeof bird.scripts[0]['body']): number => specs.reduce((n, b) => n + b.slots.length + (b.children ? birdSlots(b.children) : 0), 0)
    expect(birdSlots(bird.scripts[0].body)).toBe(0)
    expect(g2u2L01.showFrames).toBe(true)
  })
})
