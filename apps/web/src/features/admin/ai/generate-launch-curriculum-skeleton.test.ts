import { describe, expect, it, vi } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

import { generateLaunchCurriculumSkeleton } from './generate-launch-curriculum-skeleton'

describe('generateLaunchCurriculumSkeleton', () => {
  it('passes the selected model into the AI caller and keeps stage boundaries intact', async () => {
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
        dependsOn: index === 0 ? [] : [launchLessons[index - 1]!.id],
        childOutcome: `${lesson.title} 完成后的结果`,
        difficultyLevel: index < 3 ? 1 : index < 8 ? 2 : index < 12 ? 3 : 4,
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

    expect(result).toHaveLength(15)
    expect(result[0]?.stage).toBe('trial')
    expect(result[14]?.stage).toBe('template')
    expect(callModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'qwen2.5-coder:7b',
      }),
    )
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
        aiConfig: {
          baseUrl: 'http://127.0.0.1:11434/v1',
          apiKey: 'ollama-local',
          model: 'qwen2.5-coder:7b',
        },
        lessons: launchLessons,
        callModel,
      }),
    ).rejects.toThrow('skeleton-trial-boundary-invalid')
  })
})
