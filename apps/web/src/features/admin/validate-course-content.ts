const suspiciousFragments = ['锟', '閳', '閸', '鐠', '娴', '�']

export function validateCourseContent(input: {
  lessonId: string
  title: string
  steps: Array<{ title: string; instruction: string }>
}) {
  const issues: Array<{
    code: 'encoding_suspect'
    lessonId: string
    value: string
  }> = []
  const fields = [
    input.title,
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
