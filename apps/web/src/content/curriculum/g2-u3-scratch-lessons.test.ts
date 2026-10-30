import {describe, expect, it} from 'vitest'
import {emptyG2Observations, evaluateG2Lesson, getG2ScratchLesson, observedPrediction} from './g2-u1-scratch-lessons'
import {evaluateG2U3Lesson, g2u3L01, observedPredictionG2U3} from './g2-u3-scratch-lessons'

describe('G2-U3-L01 键盘控制小船: tasks complete only from VM key observations', () => {
  it('starts with no task done and the lesson is registered for the lab', () => {
    expect(Object.values(evaluateG2U3Lesson(g2u3L01.id, emptyG2Observations())).every(v => v === false)).toBe(true)
    expect(getG2ScratchLesson('G2-U3-L01')).toBe(g2u3L01)
    expect(g2u3L01.showKeys).toBe(true)
    expect(g2u3L01.targets.find(t => t.name === '巡逻小船')?.scripts.map(s => s.hat)).toEqual(['kc2_flag', 'kc2_when_key_right', 'kc2_when_key_left'])
  })

  it('practice A is three right presses to x 30, practice B is right then left back to 0', () => {
    const obs = emptyG2Observations()
    obs.keyPresses = [
      {key: 'right arrow', x: 10},
      {key: 'right arrow', x: 20},
    ]
    expect(evaluateG2Lesson(g2u3L01.id, obs)?.practiceA).toBe(false)
    obs.keyPresses.push({key: 'right arrow', x: 30})
    expect(evaluateG2Lesson(g2u3L01.id, obs)?.practiceA).toBe(true)
    expect(evaluateG2Lesson(g2u3L01.id, obs)?.practiceB).toBe(false)
    obs.keyPresses.push({key: 'left arrow', x: 20}, {key: 'left arrow', x: 10}, {key: 'left arrow', x: 0})
    expect(evaluateG2Lesson(g2u3L01.id, obs)?.practiceB).toBe(true)
  })

  it('debug needs a left press that moves right first, then a left press that moves left', () => {
    const obs = emptyG2Observations()
    obs.keyPresses = [{key: 'left arrow', x: 10}]
    expect(evaluateG2U3Lesson(g2u3L01.id, obs).debug).toBe(false)
    obs.keyPresses.push({key: 'left arrow', x: 0})
    expect(evaluateG2U3Lesson(g2u3L01.id, obs).debug).toBe(true)
    // A left press that already moves left, with no bug seen first, is not the debug task.
    const clean = emptyG2Observations()
    clean.keyPresses = [{key: 'right arrow', x: 10}, {key: 'left arrow', x: 0}]
    expect(evaluateG2U3Lesson(g2u3L01.id, clean).debug).toBe(false)
  })

  it('prediction is read from the first right key press the VM really ran', () => {
    const obs = emptyG2Observations()
    expect(observedPredictionG2U3(g2u3L01.id, obs)).toBeNull()
    expect(observedPrediction(g2u3L01.id, obs)).toBeNull()
    obs.keyPresses = [{key: 'right arrow', x: 10}]
    expect(observedPrediction(g2u3L01.id, obs)).toBe(g2u3L01.predict.correct)
  })

  it('create needs a non-default step and a return to zero', () => {
    const obs = emptyG2Observations()
    obs.keyPresses = [
      {key: 'right arrow', x: 20},
      {key: 'left arrow', x: 0},
    ]
    expect(evaluateG2U3Lesson(g2u3L01.id, obs).create).toBe(true)
    const plain = emptyG2Observations()
    plain.keyPresses = [
      {key: 'right arrow', x: 10},
      {key: 'left arrow', x: 0},
    ]
    expect(evaluateG2U3Lesson(g2u3L01.id, plain).create).toBe(false)
  })
})
