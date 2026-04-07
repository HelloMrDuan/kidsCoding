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
  voiceover?: string
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

export type FoundationRemedialMicroScript = {
  title: string
  lines: string[]
  demo: string
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

export type LaunchCurriculum = {
  lessons: LaunchLessonDefinition[]
  remedials: RemedialLessonDefinition[]
  templates: ProjectTemplateDefinition[]
  audioAssets: Array<{
    id: string
    lessonId: string
    usageType: string
    provider: string
  }>
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
    voiceover?: string
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

export type AdminLessonSummary = {
  id: string
  title: string
  phase: LessonPhase
  sortOrder: number
  draftUpdatedAt?: string | null
  publishedAt?: string | null
  hasUnpublishedChanges: boolean
}

export type LaunchCurriculumSkeletonStage =
  | 'unit_1'
  | 'unit_2'
  | 'unit_3'
  | 'unit_4'

export type LaunchCurriculumSkeleton = {
  lessonId: string
  stage: LaunchCurriculumSkeletonStage
  lessonObjective: string
  newConcepts: string[]
  dependsOn: string[]
  childOutcome: string
  difficultyLevel: 1 | 2 | 3 | 4
}

export type AiProviderSlot = 'primary' | 'secondary'

export type AiProviderConfig = {
  slot: AiProviderSlot
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
}

export type AiRuntimeSettingRow = {
  setting_key: string
  default_provider_slot: AiProviderSlot
  default_model: string
  updated_at?: string | null
  updated_by?: string | null
}

export type ResolvedAiProviderSelection = {
  provider: AiProviderConfig
  model: string
  usedFallback: boolean
}

export type ResolvedAiClientConfig = {
  providerName: string
  baseUrl: string
  apiKey: string
  model: string
  usedFallback: boolean
}

export type FirstAdminBootstrapState =
  | { status: 'not_logged_in' }
  | { status: 'invalid_token' }
  | { status: 'closed' }
  | { status: 'ready'; identityLabel: string }

export type AdminBootstrapEventRow = {
  user_id: string
  email: string | null
  event_type: 'first_admin_granted'
  created_at: string
}

export type PaymentProviderName = 'stripe' | 'aggregated_cn'

export type PaymentOrderStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
