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
        enum: ['trial', 'guided', 'story', 'template'],
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
    '请为儿童编程首发主线课程生成 15 节课的课程骨架。',
    '必须保持第 1-3 节为试听阶段，第 4-8 节为 guided，第 9-12 节为 story，第 13-15 节为 template。',
    '每节课最多引入 1 个新核心点，难度递进必须平缓。',
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
  prompt: string
  schemaName: string
  schema: Record<string, unknown>
}) => Promise<LaunchCurriculumSkeleton[]>

export async function generateLaunchCurriculumSkeleton(input?: {
  lessons?: LaunchLessonDefinition[]
  callModel?: SkeletonModelCaller
}) {
  const lessons = input?.lessons ?? launchLessons
  const callModel =
    input?.callModel ??
    ((modelInput: {
      prompt: string
      schemaName: string
      schema: Record<string, unknown>
    }) =>
      callOpenAiStructuredJson<LaunchCurriculumSkeleton[]>({
        model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
        prompt: modelInput.prompt,
        schemaName: modelInput.schemaName,
        schema: modelInput.schema,
      }))

  const skeleton = await callModel({
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

  if (skeleton.slice(0, 3).some((item) => item.stage !== 'trial')) {
    throw new Error('skeleton-trial-boundary-invalid')
  }

  if (skeleton.slice(3, 8).some((item) => item.stage !== 'guided')) {
    throw new Error('skeleton-guided-boundary-invalid')
  }

  if (skeleton.slice(8, 12).some((item) => item.stage !== 'story')) {
    throw new Error('skeleton-story-boundary-invalid')
  }

  if (skeleton.slice(12).some((item) => item.stage !== 'template')) {
    throw new Error('skeleton-template-boundary-invalid')
  }

  return skeleton
}
