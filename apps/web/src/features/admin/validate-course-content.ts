import type { CourseContentValidationIssue } from '@/features/domain/types'

const suspiciousFragments = ['閿', '闁', '閻', '濞', '锟', '�']

export function validateCourseContent(input: {
  mode: 'draft' | 'publish'
  lessonId: string
  title: string
  goal: string
  steps: Array<{ title: string; instruction: string }>
}) {
  const issues: CourseContentValidationIssue[] = []

  if (input.mode === 'publish' && !input.title.trim()) {
    issues.push({
      code: 'title_required',
      lessonId: input.lessonId,
      value: input.title,
    })
  }

  if (input.mode === 'publish' && !input.goal.trim()) {
    issues.push({
      code: 'goal_required',
      lessonId: input.lessonId,
      value: input.goal,
    })
  }

  for (const step of input.steps) {
    if (input.mode === 'publish' && !step.title.trim()) {
      issues.push({
        code: 'step_title_required',
        lessonId: input.lessonId,
        value: step.title,
      })
    }

    if (input.mode === 'publish' && !step.instruction.trim()) {
      issues.push({
        code: 'step_instruction_required',
        lessonId: input.lessonId,
        value: step.instruction,
      })
    }
  }

  const fields = [
    input.title,
    input.goal,
    ...input.steps.flatMap((step) => [step.title, step.instruction]),
  ]

  for (const value of fields) {
    if (suspiciousFragments.some((fragment) => value.includes(fragment))) {
      issues.push({
        code: 'encoding_suspect',
        lessonId: input.lessonId,
        value,
      })
    }
  }

  return issues
}
