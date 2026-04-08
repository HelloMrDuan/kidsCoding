import { describe, expect, it } from 'vitest'

import { foundationUnits } from './foundation-units'
import { launchLessons } from './launch-lessons'

describe('foundation curriculum seed', () => {
  it('defines four units and twelve ordered lessons', () => {
    expect(foundationUnits).toHaveLength(4)
    expect(launchLessons).toHaveLength(12)
    expect(launchLessons[0]?.id).toBe('lesson-01-forest-hello')
    expect(launchLessons[11]?.id).toBe('lesson-12-graduation-show')
  })

  it('expands the first three lessons into polished five-step scripts', () => {
    const lessons = launchLessons.slice(0, 3)

    expect(lessons[0]?.steps).toHaveLength(5)
    expect(lessons[1]?.steps).toHaveLength(5)
    expect(lessons[2]?.steps).toHaveLength(5)
    expect(lessons[2]?.goal).toContain('完整小故事')
  })

  it('builds a visible staircase across the first three lessons', () => {
    const [lesson1, lesson2, lesson3] = launchLessons.slice(0, 3)
    const longestChain = (lesson = lesson1) =>
      Math.max(...lesson.steps.map((step) => step.requiredBlockTypes.length))

    expect(longestChain(lesson1)).toBe(2)
    expect(longestChain(lesson2)).toBe(3)
    expect(longestChain(lesson3)).toBe(3)
    expect(lesson2?.goal).toContain('出场后说一句欢迎的话')
    expect(lesson2?.steps[0]?.requiredBlockTypes).toEqual([
      'when_start',
      'move_right',
    ])
  })

  it('expands lessons 4 to 6 into the second unit five-step scripts', () => {
    const lessons = launchLessons.slice(3, 6)

    expect(lessons[0]?.steps).toHaveLength(5)
    expect(lessons[1]?.steps).toHaveLength(5)
    expect(lessons[2]?.steps).toHaveLength(5)
    expect(lessons[0]?.goal).toContain('场景')
    expect(lessons[1]?.goal).toContain('顺序')
    expect(lessons[2]?.goal).toContain('完整小故事')
  })

  it('builds a visible staircase across lessons 4 to 6', () => {
    const [lesson4, lesson5, lesson6] = launchLessons.slice(3, 6)
    const longestChain = (lesson = lesson4) =>
      Math.max(...lesson.steps.map((step) => step.requiredBlockTypes.length))

    expect(longestChain(lesson4)).toBe(3)
    expect(longestChain(lesson5)).toBe(4)
    expect(longestChain(lesson6)).toBe(4)
    expect(lesson5?.steps[3]?.requiredBlockTypes).toEqual([
      'when_start',
      'move_right',
      'switch_scene',
      'say_line',
    ])
  })

  it('expands lessons 7 to 9 into the third unit five-step scripts', () => {
    const lessons = launchLessons.slice(6, 9)

    expect(lessons[0]?.steps).toHaveLength(5)
    expect(lessons[1]?.steps).toHaveLength(5)
    expect(lessons[2]?.steps).toHaveLength(5)
    expect(lessons[0]?.goal).toContain('点击')
    expect(lessons[1]?.goal).toContain('先动')
    expect(lessons[2]?.goal).toContain('互动故事')
  })

  it('builds a visible staircase across lessons 7 to 9', () => {
    const [lesson7, lesson8, lesson9] = launchLessons.slice(6, 9)
    const longestChain = (lesson = lesson7) =>
      Math.max(...lesson.steps.map((step) => step.requiredBlockTypes.length))

    expect(longestChain(lesson7)).toBe(2)
    expect(longestChain(lesson8)).toBe(3)
    expect(longestChain(lesson9)).toBe(3)
    expect(lesson8?.steps[4]?.requiredBlockTypes).toEqual([
      'when_clicked',
      'move_right',
      'say_line',
    ])
  })

  it('expands lessons 10 to 12 into the graduation unit five-step scripts', () => {
    const lessons = launchLessons.slice(9, 12)

    expect(lessons[0]?.steps).toHaveLength(5)
    expect(lessons[1]?.steps).toHaveLength(5)
    expect(lessons[2]?.steps).toHaveLength(5)
    expect(lessons[0]?.goal).toContain('第二位')
    expect(lessons[1]?.goal).toContain('顺序')
    expect(lessons[2]?.goal).toContain('启蒙毕业')
  })

  it('builds a visible staircase across lessons 10 to 12', () => {
    const [lesson10, lesson11, lesson12] = launchLessons.slice(9, 12)
    const longestChain = (lesson = lesson10) =>
      Math.max(...lesson.steps.map((step) => step.requiredBlockTypes.length))

    expect(longestChain(lesson10)).toBe(3)
    expect(longestChain(lesson11)).toBe(4)
    expect(longestChain(lesson12)).toBe(4)
    expect(lesson12?.steps[4]?.requiredBlockTypes).toEqual([
      'when_start',
      'move_right',
      'switch_character',
      'say_line',
    ])
  })

  it('adds voiceover to every foundation lesson step', () => {
    const allSteps = launchLessons.flatMap((lesson) => lesson.steps)

    expect(allSteps.length).toBeGreaterThan(0)
    for (const step of allSteps) {
      expect(step.voiceover).toBeTruthy()
    }
  })

  it('adds one remedial micro script to every foundation unit', () => {
    expect(foundationUnits).toHaveLength(4)

    for (const unit of foundationUnits) {
      expect(unit.remedialMicroScript.title).toBeTruthy()
      expect(unit.remedialMicroScript.lines.length).toBeGreaterThanOrEqual(2)
      expect(unit.remedialMicroScript.lines.length).toBeLessThanOrEqual(3)
      expect(unit.remedialMicroScript.demo).toBeTruthy()
    }
  })
})
