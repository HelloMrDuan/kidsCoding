import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

import {
  applyGeneratedLessonCopy,
  hasUnpublishedLessonChanges,
  mergePublishedLessons,
  resolveAdminLessonRecord,
} from './launch-curriculum-records'

describe('resolveAdminLessonRecord', () => {
  it('prefers draft over publication over seed', () => {
    const seed = launchLessons[0]
    const record = resolveAdminLessonRecord({
      lessonId: seed.id,
      seedLessons: [seed],
      draftRows: [
        {
          id: seed.id,
          phase: seed.phase,
          mode: seed.mode,
          sort_order: seed.sortOrder,
          title: '草稿标题',
          goal: seed.goal,
          payload: {
            steps: seed.steps,
            hintLayers: seed.hintLayers,
            templateId: seed.templateId,
          },
        },
      ],
      publicationRows: [
        {
          lesson_id: seed.id,
          phase: seed.phase,
          mode: seed.mode,
          sort_order: seed.sortOrder,
          title: '线上标题',
          goal: seed.goal,
          payload: {
            steps: seed.steps,
            hintLayers: seed.hintLayers,
            templateId: seed.templateId,
          },
          published_at: '2026-03-31T09:00:00.000Z',
          published_by: 'user-1',
        },
      ],
    })

    expect(record.title).toBe('草稿标题')
  })
})

describe('mergePublishedLessons', () => {
  it('overlays publication copy onto the seed lesson', () => {
    const seed = launchLessons[0]
    const lessons = mergePublishedLessons([seed], [
      {
        lesson_id: seed.id,
        phase: seed.phase,
        mode: seed.mode,
        sort_order: seed.sortOrder,
        title: '数据库标题',
        goal: '数据库目标',
        payload: {
          steps: [
            {
              ...seed.steps[0],
              title: '数据库步骤标题',
              instruction: '数据库步骤说明',
            },
            ...seed.steps.slice(1),
          ],
          hintLayers: seed.hintLayers.map((layer, index) =>
            index === 0 ? { ...layer, copy: '数据库提示' } : layer,
          ),
          templateId: seed.templateId,
          parentAdvice: '先让孩子自己试一次。',
        },
        published_at: '2026-03-31T09:00:00.000Z',
        published_by: 'user-1',
      },
    ])

    expect(lessons[0]).toMatchObject({
      title: '数据库标题',
      goal: '数据库目标',
      parentAdvice: '先让孩子自己试一次。',
    })
    expect(lessons[0]?.steps[0]).toMatchObject({
      title: '数据库步骤标题',
      instruction: '数据库步骤说明',
    })
    expect(lessons[0]?.hintLayers[0]?.copy).toBe('数据库提示')
    expect(lessons[0]?.rewardCardId).toBe(seed.rewardCardId)
  })
})

describe('applyGeneratedLessonCopy', () => {
  it('only replaces copy fields and preserves lesson structure', () => {
    const seed = launchLessons[0]
    const next = applyGeneratedLessonCopy(seed, {
      title: '新标题',
      goal: '新目标',
      steps: seed.steps.map((step) => ({
        id: step.id,
        title: `${step.title}-新`,
        instruction: `${step.instruction}-新`,
      })),
      hintLayers: seed.hintLayers.map((layer) => ({
        id: layer.id,
        copy: `${layer.copy}-新`,
      })),
      parentAdvice: '家长先让孩子自己试一次，再听提示。',
    })

    expect(next.title).toBe('新标题')
    expect(next.steps[0]?.allowedBlocks).toEqual(seed.steps[0]?.allowedBlocks)
    expect(next.steps[0]?.requiredBlockTypes).toEqual(
      seed.steps[0]?.requiredBlockTypes,
    )
    expect(next.hintLayers[0]?.mode).toBe(seed.hintLayers[0]?.mode)
    expect(next.rewardCardId).toBe(seed.rewardCardId)
    expect(next.parentAdvice).toBe('家长先让孩子自己试一次，再听提示。')
  })
})

describe('hasUnpublishedLessonChanges', () => {
  it('returns true when there is a draft but no publication yet', () => {
    const seed = launchLessons[0]

    expect(
      hasUnpublishedLessonChanges(
        {
          title: seed.title,
          goal: seed.goal,
          payload: {
            steps: seed.steps,
            hintLayers: seed.hintLayers,
            templateId: seed.templateId,
          },
        },
        null,
      ),
    ).toBe(true)
  })

  it('returns false when draft and publication content are identical', () => {
    const seed = launchLessons[0]

    expect(
      hasUnpublishedLessonChanges(
        {
          title: seed.title,
          goal: seed.goal,
          payload: {
            steps: seed.steps,
            hintLayers: seed.hintLayers,
            templateId: seed.templateId,
          },
        },
        {
          title: seed.title,
          goal: seed.goal,
          payload: {
            steps: seed.steps,
            hintLayers: seed.hintLayers,
            templateId: seed.templateId,
          },
        },
      ),
    ).toBe(false)
  })
})
