import { quoteBlock, type MotionVerb } from '@/features/lessons/blockly/block-labels'
import {
  evaluateAcceptedPrograms,
  simulateProgram,
  type JudgeOptions,
  type ObservableVerdict,
  type ProgramBlock,
} from '@/features/lessons/blockly/observable-run'
import {
  FOREST_GREETING_LINES,
  GARDEN_REPLY_LINES,
  MEADOW_TRAVEL_LINES,
  type SayLinePreset,
} from '@/features/lessons/blockly/say-line-presets'
import { sanitizeSnapshotBlocks, type SnapshotBlock } from '@/features/progress/project-snapshot'

import { launchLessons } from './launch-lessons'

/**
 * TQ-012 (= TQ-002f): the unit project on the completion page of lessons 01–09.
 * The child reopens the program they finished with, runs it, changes it and saves it again.
 *
 * - allowedBlocks: every block the lesson's classroom offered (union of its steps).
 * - starterProgram: what the editor opens with when there is no saved snapshot yet
 *   (= the lesson's main build). A saved snapshot always wins (getUnitProjectStartBlocks).
 * - acceptedPrograms: reference programs; a program passes when its OBSERVABLE result
 *   matches ANY of them (observable-run.ts evaluateAcceptedPrograms), not a block-for-block match.
 * - sayLineChoices (L03/L06/L09): the child picks the line; with acceptedPrograms the child
 *   also picks WHERE it is said. Both choices are judged correct.
 *
 * Kept in code (not the lesson payload) so a database copy of the curriculum cannot drop it.
 * Copy is short for 5–7 year olds and quotes block names from block-labels.ts.
 */
export type UnitProject = {
  lessonId: string
  /** Kid-facing project name. */
  title: string
  /** One short sentence: what to make. */
  prompt: string
  /** One short sentence about the choice (L03/L06/L09 only). */
  choiceHint?: string
  /** Character on stage, for feedback copy (explainRunFailure actor). */
  actor: '小狐狸' | '蝴蝶'
  verb: MotionVerb
  allowedBlocks: readonly string[]
  starterProgram: readonly string[]
  acceptedPrograms: readonly (readonly string[])[]
  sayLineChoices?: readonly SayLinePreset[]
}

const MOVE = quoteBlock('move_right')
const REPEAT = quoteBlock('repeat_twice')
const FLY = quoteBlock('move_right', 'fly')
const FLY_REPEAT = quoteBlock('repeat_twice', 'fly')

function lessonBlocks(lessonId: string) {
  const lesson = launchLessons.find((item) => item.id === lessonId)
  if (!lesson) throw new Error(`unit-projects: unknown lesson ${lessonId}`)
  return [...new Set(lesson.steps.flatMap((step) => step.allowedBlocks))]
}

function mainBuild(lessonId: string) {
  const lesson = launchLessons.find((item) => item.id === lessonId)
  const step2 = lesson?.steps.find((step) => step.id === 'step-2')
  if (!step2) throw new Error(`unit-projects: ${lessonId} has no main build step`)
  return [...step2.requiredBlockTypes]
}

type Seed = Omit<UnitProject, 'allowedBlocks' | 'starterProgram' | 'acceptedPrograms'> & {
  acceptedPrograms?: readonly (readonly string[])[]
}

const SEEDS: Seed[] = [
  {
    lessonId: 'lesson-01-forest-hello',
    title: '小狐狸出场',
    prompt: `用“开始时”和${MOVE}，让小狐狸走上舞台。`,
    actor: '小狐狸',
    verb: 'walk',
  },
  {
    lessonId: 'lesson-02-forest-greeting',
    title: '小狐狸打招呼',
    prompt: '小狐狸先出场，再说一句话。',
    actor: '小狐狸',
    verb: 'walk',
    sayLineChoices: FOREST_GREETING_LINES,
  },
  {
    lessonId: 'lesson-03-forest-story',
    title: '森林里的第一次见面',
    prompt: '小狐狸走向小兔子，一共走 200 步，还要打招呼。',
    choiceHint: '选一句对白，再想想：走到了再说，还是走到一半就说？',
    actor: '小狐狸',
    verb: 'walk',
    sayLineChoices: FOREST_GREETING_LINES,
    acceptedPrograms: [
      ['when_start', 'move_right', 'move_right', 'say_line'],
      ['when_start', 'move_right', 'say_line', 'move_right'],
    ],
  },
  {
    lessonId: 'lesson-04-meadow-scene',
    title: '从森林走到草地',
    prompt: '小狐狸在森林走 100 步，再换到草地。',
    actor: '小狐狸',
    verb: 'walk',
  },
  {
    lessonId: 'lesson-05-meadow-order',
    title: '按顺序去旅行',
    prompt: `先在森林走，再换到草地，用${REPEAT}再走 100 步。`,
    actor: '小狐狸',
    verb: 'walk',
  },
  {
    lessonId: 'lesson-06-meadow-story',
    title: '小动物旅行记',
    prompt: '小狐狸去草地旅行，走完 200 步，还要说一句话。',
    choiceHint: '选一句对白，再想想：在森林说，还是到草地再说？',
    actor: '小狐狸',
    verb: 'walk',
    sayLineChoices: MEADOW_TRAVEL_LINES,
    acceptedPrograms: [
      ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'],
      ['when_start', 'move_right', 'say_line', 'switch_scene', 'repeat_twice'],
    ],
  },
  {
    lessonId: 'lesson-07-garden-click',
    title: '点一下，蝴蝶飞起来',
    prompt: `用“被点击时”和${FLY}：点一下蝴蝶，它才飞。`,
    actor: '蝴蝶',
    verb: 'fly',
  },
  {
    lessonId: 'lesson-08-garden-dialogue',
    title: '点一下，再说一句话',
    prompt: '点一下蝴蝶，它先飞，再说一句话。',
    actor: '蝴蝶',
    verb: 'fly',
  },
  {
    lessonId: 'lesson-09-garden-story',
    title: '花园里的互动表演',
    prompt: `点一下蝴蝶，用${FLY_REPEAT}让它一共飞 200 步，还要回应你。`,
    choiceHint: '选一句回应，再想想：飞完一段就说，还是飞完两段再说？',
    actor: '蝴蝶',
    verb: 'fly',
    sayLineChoices: GARDEN_REPLY_LINES,
    acceptedPrograms: [
      ['when_clicked', 'move_right', 'say_line', 'repeat_twice'],
      ['when_clicked', 'move_right', 'repeat_twice', 'say_line'],
    ],
  },
]

export const unitProjects: readonly UnitProject[] = SEEDS.map((seed) => {
  const starterProgram = mainBuild(seed.lessonId)
  return {
    ...seed,
    allowedBlocks: lessonBlocks(seed.lessonId),
    starterProgram,
    acceptedPrograms: seed.acceptedPrograms ?? [starterProgram],
  }
})

export const UNIT_PROJECT_LESSON_IDS: readonly string[] = unitProjects.map((project) => project.lessonId)

const BY_LESSON = new Map(unitProjects.map((project) => [project.lessonId, project]))

export function getUnitProject(lessonId: string): UnitProject | undefined {
  return BY_LESSON.get(lessonId)
}

/** Program the editor opens with: the saved snapshot (sanitized) if it has blocks, else the main build. */
export function getUnitProjectStartBlocks(lessonId: string, snapshotBlocks?: unknown): SnapshotBlock[] {
  const project = BY_LESSON.get(lessonId)
  if (!project) return []
  const saved = sanitizeSnapshotBlocks(snapshotBlocks)
  return saved.length > 0 ? saved : project.starterProgram.map((type) => ({ type }))
}

const optionsCache = new Map<string, JudgeOptions>()

/**
 * Stable judge options per project. acceptedLines = the project's preset lines plus the
 * default line each reference program speaks (so a say block with no choice still passes);
 * allowedLineIds = only this project's preset ids (anything else is `unknown-line`).
 */
export function getUnitProjectJudgeOptions(lessonId: string): JudgeOptions {
  const cached = optionsCache.get(lessonId)
  if (cached) return cached
  const project = BY_LESSON.get(lessonId)
  const options: JudgeOptions = {}
  if (project) {
    const choices = project.sayLineChoices ?? []
    const defaults = project.acceptedPrograms.flatMap((program) => {
      const run = simulateProgram(program.map((type) => ({ type })))
      // No preset chosen, so the reference speaks the default line of the scene it is in when it talks.
      return run.ok && run.observed.message !== null ? [run.observed.message] : []
    })
    const lines = [...new Set([...choices.map((line) => line.text), ...defaults])]
    if (lines.length > 0) options.acceptedLines = lines
    options.allowedLineIds = choices.map((line) => line.id)
  }
  optionsCache.set(lessonId, options)
  return options
}

/** Judge a unit project program: passes when it observably matches ANY accepted program. */
export function evaluateUnitProject(lessonId: string, blocks: ProgramBlock[]): ObservableVerdict {
  const project = BY_LESSON.get(lessonId)
  if (!project) return { passed: false, goal: null, actual: null, reason: '这个作品还没有准备好。', code: 'goal-misconfigured' }
  const verdict = evaluateAcceptedPrograms(project.acceptedPrograms, blocks, getUnitProjectJudgeOptions(lessonId))
  // A block the lesson never offered cannot sneak in through an observably equivalent program.
  if (verdict.passed && blocks.some((block) => !project.allowedBlocks.includes(block.type))) {
    return { ...verdict, passed: false, reason: '这块积木这节课还用不上，先把它拿走吧。', code: 'unsupported-block' }
  }
  return verdict
}
