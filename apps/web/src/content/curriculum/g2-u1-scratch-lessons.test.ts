import {describe, expect, it} from 'vitest'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {BIRD_NEST_ZONE, emptyG2Observations, evaluateG2Lesson, evaluateG2U1L01, evaluateG2U1L02, evaluateG2U1L03, g2u1L01, g2u1L02, g2u1L03, L03_WELCOME, g2u1ScratchLessons, evaluateG2U1L04, g2u1L04, L04_ARRIVAL, inFishZone, evaluateG2U1L05, g2u1L05, L05_BIRD_LINE, inCenterZone, evaluateG2U1L06, g2u1L06, L06_CAT_LINE, inRibbonZone, inBirdNest, observedPrediction, g2ScratchLessons, getG2ScratchLesson} from './g2-u1-scratch-lessons'
import {atDoor, beatSummary, evaluateG2U2L01, evaluateG2U2L02, evaluateG2U2L03, evaluateG2U2L04, flightSummary, g2u2L01, g2u2L02, g2u2L03, g2u2L04, L07_CAT_LINE, L08_OWL_LINE, L09_CAT_LINE, L10_FLY_LINE} from './g2-u2-scratch-lessons'
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

  it('U2-L02 tasks come from VM day/night runs (switch count, time per phase, stop) and the backdrop showing when each sprite spoke', () => {
    const obs = emptyG2Observations()
    type Line = {target: string; backdrop: string}
    const run = (switches: number, avgMs: number | null, speech: Line[], finished = false, stopped = false) => ({switches, avgMs, speech, finished, stopped})
    const owl = (backdrop: string): Line => ({target: '猫头鹰', backdrop})
    const cat = (backdrop: string): Line => ({target: '小橘猫', backdrop})
    expect(Object.values(evaluateG2U2L02(obs)).every(v => v === false)).toBe(true)
    expect(observedPrediction(g2u2L02.id, obs)).toBeNull()
    obs.cycleRuns = [run(1, null, [owl('白天')])]
    expect(observedPrediction(g2u2L02.id, obs)).toBeNull()
    obs.cycleRuns = [run(4, 1010, [owl('白天'), cat('夜晚')])]
    expect(observedPrediction(g2u2L02.id, obs)).toBe(g2u2L02.predict.correct)
    expect(evaluateG2U2L02(obs)).toMatchObject({practiceA: false, practiceB: false, debug: false})
    // Long phases still running, or ended by applying blocks rather than the stop button, are not practice A.
    expect(evaluateG2U2L02({...obs, cycleRuns: [run(3, 3020, [])]}).practiceA).toBe(false)
    expect(evaluateG2U2L02({...obs, cycleRuns: [run(3, 3020, [], true, false)]}).practiceA).toBe(false)
    expect(evaluateG2U2L02({...obs, cycleRuns: [run(2, 1500, [], true, true)]}).practiceA).toBe(false)
    expect(evaluateG2U2L02({...obs, cycleRuns: [run(2, 3010, [], true, true)]}).practiceA).toBe(true)
    // Owl at night only after first hooting in the day is the debug fix; a night-only run alone is not.
    expect(evaluateG2U2L02({...obs, cycleRuns: [run(2, 1000, [owl('夜晚')])]}).debug).toBe(false)
    expect(evaluateG2U2L02({...obs, cycleRuns: [run(4, 1000, [owl('白天')]), run(4, 1000, [owl('夜晚'), owl('白天')])]}).debug).toBe(false)
    obs.cycleRuns.push(run(4, 1000, [owl('夜晚'), cat('白天')]))
    expect(evaluateG2U2L02(obs)).toMatchObject({practiceB: true, debug: true, create: false})
    obs.lastSaid = {猫头鹰: L08_OWL_LINE}
    obs.cycleRuns.push(run(3, 3005, [owl('夜晚'), cat('白天')]))
    expect(evaluateG2U2L02(obs).create).toBe(false)
    obs.lastSaid = {猫头鹰: '月亮出来啦'}
    expect(evaluateG2U2L02(obs).create).toBe(true)
    expect(evaluateG2U2L02({...obs, cycleRuns: [run(3, 3005, [owl('夜晚'), cat('夜晚')])]}).create).toBe(false)
  })

  it('U2-L02 puts a forever loop on the stage and lets each sprite pick the backdrop its hat listens for', () => {
    const stage = g2u2L02.targets.find(t => t.kind === 'stage')!
    const owlT = g2u2L02.targets.find(t => t.name === '猫头鹰')!
    expect(stage.scripts[0].body.map(b => b.type)).toEqual(['kc2_switch_backdrop', 'kc2_forever'])
    expect(stage.scripts[0].body[1].children?.map(b => b.type)).toEqual(['kc2_wait_whole', 'kc2_next_backdrop'])
    expect(owlT.scripts.map(s => s.hat)).toEqual(['kc2_flag', 'kc2_when_backdrop'])
    expect(owlT.scripts[1].hatSlots?.[0]).toMatchObject({field: 'BACKDROP', options: ['白天', '夜晚']})
    expect(owlT.backdrops).toEqual(['白天', '夜晚'])
    expect(g2u2L02.showCycle).toBe(true)
  })
  it('U2-L03 reads bars, beats per bar and VM beat gaps from the drum\'s own sound starts (nested loops)', () => {
    // A VM-timed drum run: `bars` × (`dongs` 咚 + accent), `w1` ms after each 咚 and `w2` ms after each accent (+ jitter).
    const drum = (bars: number, dongs: number, w1: number, w2: number, accent = '嗒', finished = true) => {
      const hits: Array<{target: string; sound: string; ms: number}> = []
      let t = 0
      for (let b = 0; b < bars; b += 1) {
        for (let i = 0; i < dongs; i += 1) { hits.push({target: '小鼓', sound: '咚', ms: t}); t += w1 + ((i * 7) % 20) }
        hits.push({target: '小鼓', sound: accent, ms: t}); t += w2 + ((b * 11) % 20)
      }
      return {hits, finished}
    }
    const first = beatSummary(drum(2, 4, 300, 600))
    expect(first).toMatchObject({bars: 2, dongs: 8, beats: 10, beatsPerBar: [5, 5], steady: false, accents: ['嗒', '嗒']})
    expect(Math.round(first.innerMs!)).toBeGreaterThanOrEqual(300)
    expect(first.gapMs! - first.innerMs!).toBeGreaterThan(200)
    expect(beatSummary(drum(4, 3, 500, 500)).steady).toBe(true)
    expect(beatSummary(drum(4, 3, 400, 500)).steady).toBe(false)
    expect(beatSummary(undefined)).toMatchObject({bars: 0, beats: 0, steady: false})
    // Hits from other sprites never count as drum beats.
    expect(beatSummary({hits: [{target: '小橘猫', sound: '咚', ms: 0}], finished: true}).beats).toBe(0)

    const obs = emptyG2Observations()
    expect(Object.values(evaluateG2U2L03(obs)).every(v => v === false)).toBe(true)
    expect(observedPrediction(g2u2L03.id, obs)).toBeNull()
    obs.beatRuns = [drum(2, 4, 300, 600, '嗒', false)]
    expect(observedPrediction(g2u2L03.id, obs)).toBeNull()
    expect(evaluateG2U2L03(obs).practiceB).toBe(false)
    obs.beatRuns = [drum(2, 4, 300, 600)]
    expect(observedPrediction(g2u2L03.id, obs)).toBe(g2u2L03.predict.correct)
    expect(evaluateG2U2L03(obs)).toMatchObject({practiceA: false, practiceB: false, debug: false, create: false})
    // 4 bars (4 accents) is practice A whatever the beats per bar; equal waits are practice B.
    expect(evaluateG2U2L03({...obs, beatRuns: [drum(4, 4, 300, 600)]}).practiceA).toBe(true)
    expect(evaluateG2U2L03({...obs, beatRuns: [drum(3, 3, 300, 600)]}).practiceA).toBe(false)
    expect(evaluateG2U2L03({...obs, beatRuns: [drum(2, 4, 500, 500)]}).practiceB).toBe(true)
    // Debug: a 4/4 run counts only after first seeing 5-beat bars.
    expect(evaluateG2U2L03({...obs, beatRuns: [drum(2, 3, 300, 600)]}).debug).toBe(false)
    expect(evaluateG2U2L03({...obs, beatRuns: [drum(2, 4, 300, 600), drum(2, 2, 300, 600)]}).debug).toBe(false)
    obs.beatRuns.push(drum(2, 3, 300, 600))
    expect(evaluateG2U2L03(obs).debug).toBe(true)
    // Create: own cat line + 啪 accents + 4 bars of 4 beats + steady.
    obs.beatRuns.push(drum(4, 3, 400, 400, '啪'))
    obs.lastSaid = {小橘猫: L09_CAT_LINE}
    expect(evaluateG2U2L03(obs).create).toBe(false)
    obs.lastSaid = {小橘猫: '节奏表演开始'}
    expect(evaluateG2U2L03(obs).create).toBe(true)
    expect(evaluateG2U2L03({...obs, beatRuns: [drum(4, 3, 400, 400, '嗒')]}).create).toBe(false)
    expect(evaluateG2U2L03({...obs, beatRuns: [drum(4, 3, 300, 600, '啪')]}).create).toBe(false)
  })

  it('U2-L03 nests the beat loop inside the bar loop; only counts, waits and the accent are editable', () => {
    const drumT = g2u2L03.targets.find(t => t.name === '小鼓')!
    const outer = drumT.scripts[0].body[0]
    expect(outer.type).toBe('kc2_repeat')
    expect(outer.children?.map(b => b.type)).toEqual(['kc2_repeat', 'kc2_play_sound', 'kc2_wait_free'])
    expect(outer.children?.[0].children?.map(b => b.type)).toEqual(['kc2_play_sound', 'kc2_wait_free'])
    expect(outer.children?.[0].children?.[0].fixed).toEqual({SOUND_MENU: '咚'})
    expect(outer.children?.[1].slots[0]).toMatchObject({field: 'SOUND_MENU', options: ['嗒', '啪']})
    expect(drumT.sounds).toEqual(['咚', '嗒', '啪'])
    expect(g2u2L03.showBeats).toBe(true)
  })
  it('U2-L04 reads the flight from VM turn totals and end state: whole turns that end at the start ring close the loop', () => {
    // A finished flag run of the butterfly: `times` × right turn `deg`, ending at `end`.
    const flight = (times: number, deg: number, end: {x: number; y: number}, direction = 90) => ({
      frames: {蝴蝶: {count: times, avgMs: 200, end: times % 2 ? '合翅' : '展翅'}}, positions: {蝴蝶: end, 花朵: {x: -110, y: 30}},
      turns: {蝴蝶: times * deg}, directions: {蝴蝶: direction},
    })
    const start = {x: -60, y: 60}
    const away = {x: -2, y: 2}
    expect(flightSummary(undefined)).toBeNull()
    expect(flightSummary(flight(6, 45, away, 0))).toMatchObject({turn: 270, laps: 0, closed: false, direction: 0, frames: 6})
    expect(flightSummary(flight(8, 45, {x: -60.000001, y: 59.99999}))).toMatchObject({turn: 360, laps: 1, closed: true})
    // A whole turn that still ends far away (e.g. a stale run position) is not closed; nor is a near miss of 350°.
    expect(flightSummary(flight(8, 45, away))!.closed).toBe(false)
    expect(flightSummary(flight(7, 50, start))!.closed).toBe(false)

    const obs = emptyG2Observations()
    expect(Object.values(evaluateG2U2L04(obs)).every(v => v === false)).toBe(true)
    expect(observedPrediction(g2u2L04.id, obs)).toBeNull()
    obs.frameRuns = [flight(6, 45, away, 0)]
    expect(observedPrediction(g2u2L04.id, obs)).toBe(g2u2L04.predict.correct)
    expect(evaluateG2U2L04(obs)).toMatchObject({practiceA: false, practiceB: false, debug: false, create: false})
    expect(evaluateG2U2L04({...obs, frameRuns: [flight(6, 60, start)]})).toMatchObject({practiceA: true, practiceB: false, debug: false})
    expect(evaluateG2U2L04({...obs, frameRuns: [flight(8, 90, start)]})).toMatchObject({practiceA: true, practiceB: true})
    // Runs without any turn (other lessons' frame runs) are ignored.
    expect(evaluateG2U2L04({...obs, frameRuns: [{frames: {}, positions: {}}]}).practiceA).toBe(false)
    obs.frameRuns.push(flight(8, 45, start))
    expect(evaluateG2U2L04(obs).debug).toBe(true)
    obs.lastSaid = {蝴蝶: L10_FLY_LINE}
    obs.frameRuns.push(flight(12, 30, start))
    expect(evaluateG2U2L04(obs).create).toBe(false)
    obs.lastSaid = {蝴蝶: '花园真美'}
    expect(evaluateG2U2L04(obs).create).toBe(true)
    expect(evaluateG2U2L04({...obs, frameRuns: [flight(8, 45, start)]}).create).toBe(false)
  })

  it('U2-L04 loops move + turn right + next costume with a fixed start, direction and wait; the flower is decoration', () => {
    const fly = g2u2L04.targets.find(t => t.name === '蝴蝶')!
    const body = fly.scripts[0].body
    expect(body.map(b => b.type)).toEqual(['kc2_goto_start', 'kc2_point_direction', 'kc2_switch_costume', 'kc2_repeat', 'kc2_say'])
    expect(body[3].children?.map(b => b.type)).toEqual(['kc2_move_steps', 'kc2_turn_right', 'kc2_next_costume', 'kc2_wait'])
    expect(body[3].children?.[3].fixed).toEqual({DURATION: '0.2'})
    const flower = g2u2L04.targets.find(t => t.name === '花朵')!
    expect(flower.scripts[0].body.every(b => b.slots.length === 0)).toBe(true)
    expect(g2u2L04.showFlight).toBe(true)
  })
})
