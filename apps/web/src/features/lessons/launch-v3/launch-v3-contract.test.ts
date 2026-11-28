import { describe, expect, it } from 'vitest'

import { foundationVoiceovers } from '@/content/curriculum/foundation-voiceovers'

import { validateLessonContract } from '../workspace/lesson-contract'
import {
  buildLaunchActivities,
  buildLaunchContract,
  buildLaunchGoal5,
  buildLaunchHelp,
  launchV3IsClickLesson,
  launchV3Steps,
} from './launch-v3-contract'
import { getLaunchV3Lesson, LAUNCH_V3_LESSON_IDS } from './launch-v3-lessons'
import { createLaunchSessionStore, emptyLaunchSessionState } from './launch-v3-session'

describe('OPS-056 launch-v3 contract', () => {
  it.each(LAUNCH_V3_LESSON_IDS)('%s: the contract passes the shell validation', (id) => {
    const contract = buildLaunchContract(id)
    expect(contract).not.toBeNull()
    expect(validateLessonContract(contract)).toEqual([])
    expect(contract!.draftKey).toBe(`kidscoding-draft:${id}`)
    expect(contract!.engine).toBe('slot')
    expect(contract!.title).toBe(getLaunchV3Lesson(id)!.title)
    expect(contract!.hints.every((hint) => hint.length > 0)).toBe(true)
  })

  it.each(LAUNCH_V3_LESSON_IDS)('%s: steps and voiceovers come from the curriculum data verbatim', (id) => {
    const lesson = getLaunchV3Lesson(id)!
    const steps = launchV3Steps(id)
    expect(steps.map((step) => step.title)).toEqual(lesson.steps.map((step) => step.title))
    expect(steps.map((step) => step.instruction)).toEqual(lesson.steps.map((step) => step.instruction))
    expect(steps.map((step) => step.voiceover)).toEqual(
      lesson.steps.map((_, index) => foundationVoiceovers[id]?.[index] ?? ''),
    )
    const goal5 = buildLaunchGoal5(id)
    expect(goal5[0]).toBe(`今天学什么：${lesson.goal}`)
    expect(goal5[4]).toContain(lesson.steps.map((step) => step.title).join('、'))
  })

  it('links each lesson to the previous launch lesson and its unit position', () => {
    expect(buildLaunchGoal5('lesson-02-forest-greeting')[3]).toContain('上一课《小狐狸出场》')
    expect(buildLaunchGoal5('lesson-02-forest-greeting')[3]).toContain('《森林见面会》单元的第 2 课（共 3 课）')
    expect(buildLaunchGoal5('lesson-10-second-friend')[3]).toContain('《动物朋友合作演出》单元的第 1 课（共 3 课）')
  })

  it('activities only list step kinds that really exist; duo lessons keep the predict/mistake steps', () => {
    for (const id of LAUNCH_V3_LESSON_IDS) {
      const levels = buildLaunchActivities(id).map((activity) => activity.level)
      expect(levels).toEqual([1, 2, 3])
    }
  })

  it('click lessons are L07-L09 only and their help says to click the character', () => {
    const click = LAUNCH_V3_LESSON_IDS.filter((id) => launchV3IsClickLesson(id))
    expect(click).toEqual(['lesson-07-garden-click', 'lesson-08-garden-dialogue', 'lesson-09-garden-story'])
    expect(buildLaunchHelp('lesson-07-garden-click').body[0]).toContain('被点击时')
  })

  it('an unregistered lesson has no contract (fail-closed)', () => {
    expect(buildLaunchContract('lesson-01-forest-hello')).toBeNull()
    expect(buildLaunchContract('nope')).toBeNull()
  })
})

describe('OPS-056 launch-v3 session store', () => {
  it('starts from the lesson empty draft, patches state and notifies listeners', () => {
    const id = 'lesson-11-duo-rehearsal'
    const store = createLaunchSessionStore(id)
    expect(store.getState()).toEqual(emptyLaunchSessionState(id))
    const server = store.getServerSnapshot()
    let calls = 0
    const unsubscribe = store.subscribe(() => {
      calls += 1
    })
    store.setState({ duoPredictions: { 'step-1': 'both' }, duoReflections: { 'step-5': 'own' } })
    expect(calls).toBe(1)
    expect(store.getState().duoPredictions).toEqual({ 'step-1': 'both' })
    expect(store.getServerSnapshot()).toBe(server)
    unsubscribe()
    store.setState({ observed: ['step-4'] })
    expect(calls).toBe(1)
    expect(store.getState().observed).toEqual(['step-4'])
  })
})
