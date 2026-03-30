export type AgeBand = 'age_6_8' | 'age_9_12' | 'age_13_plus'

export type StartLevel = 'starter' | 'foundation' | 'advanced'

export type AssessmentAnswer = {
  questionId: string
  optionId: string
  score: number
}

export type AssessmentQuestion = {
  id: string
  prompt: string
  options: Array<{
    id: string
    label: string
    score: number
  }>
}

export type CardCategory = 'theme' | 'growth' | 'commemorative'

export type CardRarity = 'common' | 'fine' | 'rare' | 'limited'

export type CardDefinition = {
  id: string
  name: string
  category: CardCategory
  rarity: CardRarity
  series: string
  rewardTags: string[]
}

export type LessonStep = {
  id: string
  title: string
  instruction: string
  allowedBlocks: string[]
  requiredBlockTypes: string[]
}

export type LessonDefinition = {
  id: string
  title: string
  goal: string
  recommendedLevel: StartLevel
  steps: LessonStep[]
  rewardCardId: string
}
