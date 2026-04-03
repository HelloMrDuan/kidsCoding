import { launchLessons } from '@/content/curriculum/launch-lessons'
import type {
  LaunchCurriculumSkeleton,
  LaunchLessonDefinition,
} from '@/features/domain/types'

import { callOpenAiStructuredJson } from './openai-client'

const launchCurriculumSkeletonSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'lessonId',
      'stage',
      'lessonObjective',
      'newConcepts',
      'dependsOn',
      'childOutcome',
      'difficultyLevel',
    ],
    properties: {
      lessonId: { type: 'string' },
      stage: {
        type: 'string',
        enum: ['unit_1', 'unit_2', 'unit_3', 'unit_4'],
      },
      lessonObjective: { type: 'string' },
      newConcepts: {
        type: 'array',
        items: { type: 'string' },
      },
      dependsOn: {
        type: 'array',
        items: { type: 'string' },
      },
      childOutcome: { type: 'string' },
      difficultyLevel: {
        type: 'integer',
        enum: [1, 2, 3, 4],
      },
    },
  },
} as const

function buildSkeletonPrompt(lessons: LaunchLessonDefinition[]) {
  return [
    '请为儿童编程启蒙主线生成 12 节课的课程骨架。',
    '第 1-3 节必须是 unit_1，第 4-6 节必须是 unit_2，第 7-9 节必须是 unit_3，第 10-12 节必须是 unit_4。',
    '每节课最多引入 1 个新核心点，最终目标是完成双角色互动故事。',
    JSON.stringify(
      lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        goal: lesson.goal,
        phase: lesson.phase,
        mode: lesson.mode,
      })),
    ),
  ].join('\n')
}

type SkeletonModelCaller = (input: {
  model: string
  prompt: string
  schemaName: string
  schema: Record<string, unknown>
}) => Promise<LaunchCurriculumSkeleton[]>

export async function generateLaunchCurriculumSkeleton(input: {
  aiConfig: {
    baseUrl: string
    apiKey: string
    model: string
  }
  lessons?: LaunchLessonDefinition[]
  callModel?: SkeletonModelCaller
}) {
  const lessons = input.lessons ?? launchLessons
  const callModel =
    input.callModel ??
    ((modelInput: {
      model: string
      prompt: string
      schemaName: string
      schema: Record<string, unknown>
    }) =>
      callOpenAiStructuredJson<LaunchCurriculumSkeleton[]>({
        baseUrl: input.aiConfig.baseUrl,
        apiKey: input.aiConfig.apiKey,
        model: modelInput.model,
        prompt: modelInput.prompt,
        schemaName: modelInput.schemaName,
        schema: modelInput.schema,
      }))

  const skeleton = await callModel({
    model: input.aiConfig.model,
    prompt: buildSkeletonPrompt(lessons),
    schemaName: 'launch_curriculum_skeleton',
    schema: launchCurriculumSkeletonSchema,
  })

  if (skeleton.length !== lessons.length) {
    throw new Error('skeleton-length-invalid')
  }

  for (const [index, lesson] of lessons.entries()) {
    if (skeleton[index]?.lessonId !== lesson.id) {
      throw new Error('skeleton-order-invalid')
    }
  }

  if (skeleton.slice(0, 3).some((item) => item.stage !== 'unit_1')) {
    throw new Error('skeleton-unit-1-boundary-invalid')
  }

  if (skeleton.slice(3, 6).some((item) => item.stage !== 'unit_2')) {
    throw new Error('skeleton-unit-2-boundary-invalid')
  }

  if (skeleton.slice(6, 9).some((item) => item.stage !== 'unit_3')) {
    throw new Error('skeleton-unit-3-boundary-invalid')
  }

  if (skeleton.slice(9, 12).some((item) => item.stage !== 'unit_4')) {
    throw new Error('skeleton-unit-4-boundary-invalid')
  }

  return skeleton
}
