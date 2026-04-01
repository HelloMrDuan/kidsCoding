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

export type LessonPhase = 'trial' | 'course'

export type LessonMode = 'guided' | 'template'

export type HintLayer = {
  id: string
  mode: 'repeat_goal' | 'show_block' | 'offer_remedial'
  copy: string
  remedialLessonId?: string
}

export type RemedialLessonDefinition = {
  id: string
  title: string
  focus: string
  returnToLessonId: string
  returnToStepId: string
  steps: LessonStep[]
}

export type LaunchLessonDefinition = LessonDefinition & {
  phase: LessonPhase
  mode: LessonMode
  sortOrder: number
  hintLayers: HintLayer[]
  templateId?: string
  parentAdvice?: string
}

export type ProjectTemplateDefinition = {
  id: string
  name: string
  starterScene: string
  starterCharacters: string[]
}

export type LaunchLessonPayload = {
  steps: LessonStep[]
  hintLayers: HintLayer[]
  templateId?: string
  parentAdvice?: string
}

export type LessonConfigRow = {
  id: string
  phase: LessonPhase
  mode: LessonMode
  sort_order: number
  title: string
  goal: string
  payload: LaunchLessonPayload
  updated_at?: string | null
  updated_by?: string | null
}

export type LessonPublicationRow = {
  lesson_id: string
  phase: LessonPhase
  mode: LessonMode
  sort_order: number
  title: string
  goal: string
  payload: LaunchLessonPayload
  published_at: string
  published_by: string | null
}

export type LessonPublicationBackupRow = {
  lesson_id: string
  phase: LessonPhase
  mode: LessonMode
  sort_order: number
  title: string
  goal: string
  payload: LaunchLessonPayload
  source_published_at?: string | null
  backed_up_at?: string | null
  backed_up_by?: string | null
}

export type GeneratedLessonCopy = {
  title: string
  goal: string
  steps: Array<{
    id: string
    title: string
    instruction: string
  }>
  hintLayers: Array<{
    id: string
    copy: string
  }>
  parentAdvice?: string
}

export type CourseContentValidationIssue = {
  code:
    | 'encoding_suspect'
    | 'title_required'
    | 'goal_required'
    | 'step_title_required'
    | 'step_instruction_required'
  lessonId: string
  value: string
}

export type EditableLaunchLesson = Pick<
  LaunchLessonDefinition,
  | 'id'
  | 'phase'
  | 'mode'
  | 'sortOrder'
  | 'title'
  | 'goal'
  | 'steps'
  | 'hintLayers'
  | 'templateId'
  | 'parentAdvice'
>
