import type {
  AgeBand,
  AssessmentAnswer,
  StartLevel,
} from '@/features/domain/types'

export function recommendStartLevel(
  ageBand: AgeBand,
  answers: AssessmentAnswer[],
): StartLevel {
  const score = answers.reduce((total, answer) => total + answer.score, 0)

  if (ageBand === 'age_6_8' || score <= 3) {
    return 'starter'
  }

  if (ageBand === 'age_13_plus' && score >= 7) {
    return 'advanced'
  }

  if (score >= 6) {
    return 'advanced'
  }

  return 'foundation'
}
