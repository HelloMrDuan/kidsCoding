import { describe, expect, it, vi } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import type { LaunchCurriculumSkeleton } from '@/features/domain/types'

import { generateLaunchLessonDraft } from './generate-launch-lesson-draft'

describe('generateLaunchLessonDraft', () => {
  it('keeps allowedBlocks and requiredBlockTypes unchanged after AI generation', async () => {
    const lesson = launchLessons[0]
    const skeleton = {
      lessonId: lesson.id,
      stage: 'trial',
      lessonObjective: lesson.goal,
      newConcepts: [lesson.goal],
      dependsOn: [],
      childOutcome: '完成第一个小作品',
      difficultyLevel: 1,
    } satisfies LaunchCurriculumSkeleton
    const callModel = vi.fn().mockResolvedValue({
      title: 'AI 标题',
      goal: 'AI 目标',
      steps: lesson.steps.map((step) => ({
        id: step.id,
        title: `AI-${step.title}`,
        instruction: `AI-${step.instruction}`,
      })),
      hintLayers: lesson.hintLayers.map((layer) => ({
        id: layer.id,
        copy: `AI-${layer.copy}`,
      })),
      parentAdvice: '先让孩子自己点一次，再听语音提示。',
    })

    const result = await generateLaunchLessonDraft({
      aiConfig: {
        baseUrl: 'http://127.0.0.1:11434/v1',
        apiKey: 'ollama-local',
        model: 'qwen2.5-coder:7b',
      },
      lesson,
      skeleton,
      callModel,
    })

    expect(result.title).toBe('AI 标题')
    expect(result.steps[0]?.allowedBlocks).toEqual(lesson.steps[0]?.allowedBlocks)
    expect(result.steps[0]?.requiredBlockTypes).toEqual(
      lesson.steps[0]?.requiredBlockTypes,
    )
  })
})
