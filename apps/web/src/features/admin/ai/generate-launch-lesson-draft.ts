import type {
  GeneratedLessonCopy,
  LaunchCurriculumSkeleton,
  LaunchLessonDefinition,
} from '@/features/domain/types'

import { applyGeneratedLessonCopy } from '../launch-curriculum-records'
import { callOpenAiStructuredJson } from './openai-client'

const generatedLessonCopySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'goal', 'steps', 'hintLayers', 'parentAdvice'],
  properties: {
    title: { type: 'string' },
    goal: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'instruction'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          instruction: { type: 'string' },
        },
      },
    },
    hintLayers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'copy'],
        properties: {
          id: { type: 'string' },
          copy: { type: 'string' },
        },
      },
    },
    parentAdvice: { type: 'string' },
  },
} as const

function buildLessonDraftPrompt(input: {
  lesson: LaunchLessonDefinition
  skeleton: LaunchCurriculumSkeleton
  previousSkeleton?: LaunchCurriculumSkeleton
  nextSkeleton?: LaunchCurriculumSkeleton
}) {
  return [
    `课节: ${input.lesson.id}`,
    `当前标题: ${input.lesson.title}`,
    `当前目标: ${input.lesson.goal}`,
    `本节教学目标: ${input.skeleton.lessonObjective}`,
    `本节新增知识点: ${input.skeleton.newConcepts.join('、')}`,
    `依赖前置: ${input.skeleton.dependsOn.join('、') || '无'}`,
    `孩子完成后结果: ${input.skeleton.childOutcome}`,
    `上一节骨架: ${input.previousSkeleton?.lessonObjective ?? '无'}`,
    `下一节骨架: ${input.nextSkeleton?.lessonObjective ?? '无'}`,
    `步骤结构: ${JSON.stringify(
      input.lesson.steps.map((step) => ({
        id: step.id,
        title: step.title,
        instruction: step.instruction,
      })),
    )}`,
    `提示层结构: ${JSON.stringify(
      input.lesson.hintLayers.map((layer) => ({
        id: layer.id,
        copy: layer.copy,
      })),
    )}`,
    '只允许输出标题、目标、步骤标题/说明、提示文案和家长建议，不要改任何结构字段。',
  ].join('\n')
}

type LessonDraftModelCaller = (input: {
  prompt: string
  schemaName: string
  schema: Record<string, unknown>
}) => Promise<GeneratedLessonCopy>

export async function generateLaunchLessonDraft(input: {
  lesson: LaunchLessonDefinition
  skeleton: LaunchCurriculumSkeleton
  previousSkeleton?: LaunchCurriculumSkeleton
  nextSkeleton?: LaunchCurriculumSkeleton
  callModel?: LessonDraftModelCaller
}) {
  const callModel =
    input.callModel ??
    ((modelInput: {
      prompt: string
      schemaName: string
      schema: Record<string, unknown>
    }) =>
      callOpenAiStructuredJson<GeneratedLessonCopy>({
        model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
        prompt: modelInput.prompt,
        schemaName: modelInput.schemaName,
        schema: modelInput.schema,
      }))

  const generated = await callModel({
    prompt: buildLessonDraftPrompt(input),
    schemaName: 'launch_lesson_copy',
    schema: generatedLessonCopySchema,
  })

  return applyGeneratedLessonCopy(input.lesson, generated)
}
