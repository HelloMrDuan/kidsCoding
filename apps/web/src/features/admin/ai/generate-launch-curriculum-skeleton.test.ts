import { describe, expect, it, vi } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

import { generateLaunchCurriculumSkeleton } from './generate-launch-curriculum-skeleton'

describe('generateLaunchCurriculumSkeleton', () => {
  it('passes the selected model into the AI caller and keeps unit boundaries intact', async () => {
    const callModel = vi.fn().mockResolvedValue(
      launchLessons.map((lesson, index) => ({
        lessonId: lesson.id,
        stage:
          index < 3
            ? 'unit_1'
            : index < 6
              ? 'unit_2'
              : index < 9
                ? 'unit_3'
                : 'unit_4',
        lessonObjective: `${lesson.title} 的教学目标`,
        newConcepts: [lesson.goal],
        dependsOn: index === 0 ? [] : [launchLessons[index - 1]!.id],
        childOutcome: `${lesson.title} 完成后的结果`,
        difficultyLevel: index < 3 ? 1 : index < 6 ? 2 : index < 9 ? 3 : 4,
      })),
    )

    const result = await generateLaunchCurriculumSkeleton({
      aiConfig: {
        baseUrl: 'http://127.0.0.1:11434/v1',
        apiKey: 'ollama-local',
        model: 'qwen2.5-coder:7b',
      },
      lessons: launchLessons,
      callModel,
    })

    expect(result).toHaveLength(12)
    expect(result[0]?.stage).toBe('unit_1')
    expect(result[11]?.stage).toBe('unit_4')
    expect(callModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'qwen2.5-coder:7b',
      }),
    )
  })

  it('rejects skeletons that break the required unit boundaries', async () => {
    const callModel = vi.fn().mockResolvedValue(
      launchLessons.map((lesson, index) => ({
        lessonId: lesson.id,
        stage: index === 0 ? 'unit_2' : 'unit_1',
        lessonObjective: `${lesson.title} 的教学目标`,
        newConcepts: [lesson.goal],
        dependsOn: [],
        childOutcome: `${lesson.title} 完成后的结果`,
        difficultyLevel: 1,
      })),
    )

    await expect(
      generateLaunchCurriculumSkeleton({
        aiConfig: {
          baseUrl: 'http://127.0.0.1:11434/v1',
          apiKey: 'ollama-local',
          model: 'qwen2.5-coder:7b',
        },
        lessons: launchLessons,
        callModel,
      }),
    ).rejects.toThrow('skeleton-unit-1-boundary-invalid')
  })
})
