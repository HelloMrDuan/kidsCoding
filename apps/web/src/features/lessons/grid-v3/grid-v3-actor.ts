/**
 * OPS-054：grid-v3 文案里的“舞台角色名”和“本关目标说法”都按课程数据生成，
 * 使教学文案与舞台上真实画出的角色、真实判定口径一致。
 *
 * - 角色：`level.actor ?? 'fox'`（与 `CharacterArt` 的渲染口径相同）。
 *   G0-U1 全部是小狐狸，生成的文案与迁移前逐字一致。
 * - 目标：网格引擎在“走到目标格”之外，对 G0-U3 还真实检查脚印规律（footprints）、
 *   浇花（pots）与围栏路线（route），文案据此如实描述，不夸大也不遗漏。
 */
import type { GridLesson, GridLessonStep } from '@/content/curriculum/g0-u1-grid-lessons'
import type { GridLevel } from '../grid/grid-engine'

export type GridActorId = NonNullable<GridLevel['actor']>

const ACTOR_NAME: Record<GridActorId, string> = {
  fox: '小狐狸',
  rabbit: '小兔子',
  robot: '浇水机器人',
}

export function gridActorName(level: Pick<GridLevel, 'actor'> | null | undefined): string {
  return ACTOR_NAME[level?.actor ?? 'fox']
}

/** 整课统一的角色名；各关角色不同时用中性的“角色”，不张冠李戴。 */
export function gridLessonActorName(lesson: GridLesson): string {
  const names = new Set(lesson.steps.map((step) => gridActorName(step.level)))
  return names.size === 1 ? [...names][0] : '角色'
}

/** 本关通过的真实口径（与 grid-engine 的检查一致）。 */
export function gridStepGoalPhrase(step: Pick<GridLessonStep, 'level' | 'creative'>): string {
  const level = step.level
  if (level.route?.length) return '沿虚线围栏走完一圈，最后朝对方向'
  if (level.pots?.length || step.creative?.pots) return '给每盆花各浇一次水，并走到目标格'
  if (level.footprints?.length || step.creative?.patterns) return '按规律留下脚印，并走到目标格'
  return '走到目标格'
}

/** 整课的目标说法：各关一致时用具体说法，否则用“完成本关目标”。 */
export function gridLessonGoalPhrase(lesson: GridLesson): string {
  const phrases = new Set(lesson.steps.map((step) => gridStepGoalPhrase(step)))
  return phrases.size === 1 ? [...phrases][0] : '完成本关目标'
}

/**
 * 网格引擎的提示文案里写的是“小狐狸”（旧页面共用，引擎不改）；
 * V3 展示时替换成本关真实角色名。小狐狸课节原样返回。
 */
export function withGridActorName(text: string, level: Pick<GridLevel, 'actor'> | null | undefined): string {
  const name = gridActorName(level)
  return name === '小狐狸' ? text : text.replaceAll('小狐狸', name)
}

const FACING_LABEL = { up: '上', right: '右', down: '下', left: '左' } as const

/**
 * 舞台 aria-label：与 `GridStage` 默认文案同一格式，只把角色名换成本关真实角色
 * （GridStage 旧页面共用，不改它的默认值）。小狐狸课节与默认文案逐字一致。
 */
export function gridStageLabel(
  level: Pick<GridLevel, 'actor' | 'cols' | 'rows'>,
  state: { x: number; y: number; facing: keyof typeof FACING_LABEL },
): string {
  return `森林网格 ${level.cols}×${level.rows}，${gridActorName(level)}在第 ${state.x + 1} 列第 ${state.y + 1} 行，面朝${FACING_LABEL[state.facing]}`
}
