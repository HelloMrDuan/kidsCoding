import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import type { GuestProgress } from './local-progress'
import type { LocalPractice } from './local-practice'
import type { CloudPythonDraft } from './cloud-python-drafts'
import { pythonPracticeLessons } from '@/features/python-lab/python-multi-grade'

/**
 * UX-301 作品中心: every card is a real saved work (Blockly launch project snapshot or
 * Python practice draft). No sample covers: a Blockly cover is the lesson's own stage
 * scene + characters, a Python cover is the child's own code. Nothing saved -> empty state.
 */
export type WorkSource = 'local' | 'local+cloud' | 'cloud'
export type WorkKind = 'blockly' | 'python' | 'scratch'

export type PortfolioWork = {
  id: string
  kind: WorkKind
  lessonId: string
  title: string
  /** e.g. "积木故事 · 8 块积木" */
  meta: string
  updatedAt: string
  source: WorkSource
  href: string
  cover:
    | { type: 'scene'; scene: 'forest' | 'meadow' | 'garden'; characters: string[] }
    | { type: 'code'; lines: string[] }
  /** Local, editable flag — never an official grade. */
  localPassed: boolean
}

function sceneOf(starter: string | undefined): 'forest' | 'meadow' | 'garden' {
  if (starter === 'meadow' || starter === 'garden') return starter
  return 'forest'
}

function codeLines(source: string) {
  return source.split('\n').filter((line) => line.trim().length > 0).slice(0, 4).map((line) => line.slice(0, 40))
}

export function buildPortfolioWorks(input: {
  progress: Pick<GuestProgress, 'projectSnapshots' | 'completedLessonIds'>
  practices: LocalPractice[]
  cloudDrafts?: CloudPythonDraft[] | null
}): PortfolioWork[] {
  const works: PortfolioWork[] = []

  for (const snapshot of input.progress.projectSnapshots) {
    const lesson = launchLessons.find((item) => item.id === snapshot.lessonId)
    if (!lesson || !Array.isArray(snapshot.blocks) || snapshot.blocks.length === 0) continue
    if (!Number.isFinite(Date.parse(snapshot.updatedAt))) continue
    const template = launchTemplates.find((item) => item.id === lesson.templateId)
    works.push({
      id: `blockly:${lesson.id}`,
      kind: 'blockly',
      lessonId: lesson.id,
      title: lesson.title,
      meta: `积木故事 · ${snapshot.blocks.length} 块积木`,
      updatedAt: snapshot.updatedAt,
      source: 'local',
      href: `/project/${lesson.id}/complete`,
      cover: { type: 'scene', scene: sceneOf(template?.starterScene), characters: template?.starterCharacters ?? ['fox'] },
      localPassed: input.progress.completedLessonIds.includes(lesson.id),
    })
  }

  const cloud = new Map((input.cloudDrafts ?? []).map((draft) => [draft.lessonId, draft]))
  for (const practice of input.practices) {
    const remote = cloud.get(practice.lessonId)
    cloud.delete(practice.lessonId)
    works.push({
      id: `python:${practice.lessonId}`,
      kind: 'python',
      lessonId: practice.lessonId,
      title: practice.title,
      meta: `Python 练习 · ${practice.lessonId}`,
      updatedAt: practice.savedAt,
      source: remote && remote.source === practice.source ? 'local+cloud' : 'local',
      href: `/learn/python-lab/${practice.lessonId}`,
      cover: { type: 'code', lines: codeLines(practice.source) },
      localPassed: practice.passed,
    })
  }
  for (const draft of cloud.values()) {
    works.push({
      id: `python:${draft.lessonId}`,
      kind: 'python',
      lessonId: draft.lessonId,
      title: pythonPracticeLessons[draft.lessonId]?.title ?? draft.lessonId,
      meta: `Python 练习 · ${draft.lessonId}`,
      updatedAt: draft.updatedAt,
      source: 'cloud',
      href: `/learn/python-lab/${draft.lessonId}`,
      cover: { type: 'code', lines: codeLines(draft.source) },
      localPassed: false,
    })
  }

  return works.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export const sourceLabels: Record<WorkSource, string> = {
  local: '本机保存',
  'local+cloud': '本机 + 账号云端',
  cloud: '仅在账号云端',
}
