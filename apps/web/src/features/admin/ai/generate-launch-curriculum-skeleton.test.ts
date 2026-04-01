import { describe, expect, it, vi } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

import { generateLaunchCurriculumSkeleton } from './generate-launch-curriculum-skeleton'

describe('generateLaunchCurriculumSkeleton', () => {
  it('returns 15 lessons and keeps stage boundaries intact', async () => {
    const callModel = vi.fn().mockResolvedValue(
      launchLessons.map((lesson, index) => ({
        lessonId: lesson.id,
        stage:
          index < 3
            ? 'trial'
            : index < 8
              ? 'guided'
              : index < 12
                ? 'story'
                : 'template',
        lessonObjective: `${lesson.title} 的教学目标`,
        newConcepts: [lesson.goal],
        dependsOn: index === 0 ? [] : [launchLessons[index - 1].id],
        childOutcome: `${lesson.title} 完成后的结果`,
        difficultyLevel:
          index < 3 ? 1 : index < 8 ? 2 : index < 12 ? 3 : 4,
      })),
    )

    const result = await generateLaunchCurriculumSkeleton({
      lessons: launchLessons,
      callModel,
    })

    expect(result).toHaveLength(15)
    expect(result[0]?.stage).toBe('trial')
    expect(result[14]?.stage).toBe('template')
  })

  it('rejects skeletons that break the required stage boundaries', async () => {
    const callModel = vi.fn().mockResolvedValue(
      launchLessons.map((lesson, index) => ({
        lessonId: lesson.id,
        stage: index === 0 ? 'guided' : 'trial',
        lessonObjective: `${lesson.title} 的教学目标`,
        newConcepts: [lesson.goal],
        dependsOn: [],
        childOutcome: `${lesson.title} 完成后的结果`,
        difficultyLevel: 1,
      })),
    )

    await expect(
      generateLaunchCurriculumSkeleton({
        lessons: launchLessons,
        callModel,
      }),
    ).rejects.toThrow('skeleton-trial-boundary-invalid')
  })
})
