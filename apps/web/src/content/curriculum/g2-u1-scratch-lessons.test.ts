import {describe, expect, it} from 'vitest'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {BIRD_NEST_ZONE, emptyG2Observations, evaluateG2Lesson, evaluateG2U1L01, evaluateG2U1L02, evaluateG2U1L03, g2u1L01, g2u1L02, g2u1L03, L03_WELCOME, g2u1ScratchLessons, evaluateG2U1L04, g2u1L04, L04_ARRIVAL, inFishZone, evaluateG2U1L05, g2u1L05, L05_BIRD_LINE, inCenterZone, inBirdNest, observedPrediction} from './g2-u1-scratch-lessons'
import fullCatalog from './full-catalog-v1.json'

const web = path.resolve(__dirname, '../../..')
const catalogIds = new Set(fullCatalog.tracks.flatMap(t => t.units.flatMap(u => u.lessons.map(l => l.id))))

describe('G2-U1 Scratch VM lessons: teaching contract', () => {
  it('every lesson is a real catalog lesson with its own sample .sb3 on disk', () => {
    for (const lesson of Object.values(g2u1ScratchLessons)) {
      expect(catalogIds.has(lesson.id)).toBe(true)
      expect(existsSync(path.join(web, 'public', lesson.sample))).toBe(true)
    }
  })

  it('has two hands-on practices with different skills, one debug case, three hint layers and a creative task', () => {
    for (const lesson of Object.values(g2u1ScratchLessons)) {
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
    expect(new Set(Object.values(g2u1ScratchLessons).map(l => l.concept)).size).toBe(Object.keys(g2u1ScratchLessons).length)
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
})
