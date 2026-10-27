import {describe, expect, it} from 'vitest'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {BIRD_NEST_ZONE, emptyG2Observations, evaluateG2U1L01, g2u1L01, g2u1ScratchLessons, inBirdNest, observedPrediction} from './g2-u1-scratch-lessons'
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
})
