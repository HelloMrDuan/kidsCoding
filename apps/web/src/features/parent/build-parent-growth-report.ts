import { getLessonKnowledge } from './lesson-knowledge'

export type GrowthReportCourse = {
  lessonId: string
  lessonTitle: string
  stars?: number
  hasWork: boolean
}

export type GrowthKnowledgeGroup = {
  concept: string
  courses: Array<GrowthReportCourse>
}

export type ParentGrowthReport = {
  completedCourseCount: number
  knowledgeGroups: Array<GrowthKnowledgeGroup>
  unregisteredLessons: Array<GrowthReportCourse>
}

type CompletedProgressRecord = {
  lesson_id: string
  status: string
  stars?: number
}

// Pure report builder. It only ever sees the records the caller passes in
// (the parent page passes exactly the logged-in parent's own rows, already
// filtered by session user_id / owner_user_id server-side). Only records
// with status 'completed' contribute knowledge; anything else —
// in-progress, unknown lesson ids, lessons without registered concepts —
// is excluded from the knowledge groups, never fabricated.
export function buildParentGrowthReport({
  progressRecords,
  snapshotLessonIds,
  lessonTitles,
}: {
  progressRecords: Array<CompletedProgressRecord>
  snapshotLessonIds: ReadonlySet<string>
  lessonTitles: ReadonlyMap<string, string>
}): ParentGrowthReport {
  const seenLessons = new Set<string>()
  const groups = new Map<string, Array<GrowthReportCourse>>()
  const unregistered: Array<GrowthReportCourse> = []
  let completedCourseCount = 0
  for (const record of progressRecords) {
    if (record.status !== 'completed') continue
    if (seenLessons.has(record.lesson_id)) continue
    seenLessons.add(record.lesson_id)
    completedCourseCount += 1
    const knowledge = getLessonKnowledge(record.lesson_id)
    const course: GrowthReportCourse = {
      lessonId: record.lesson_id,
      lessonTitle:
        lessonTitles.get(record.lesson_id) ?? knowledge?.lessonTitle ?? record.lesson_id,
      ...(typeof record.stars === 'number' ? { stars: record.stars } : {}),
      hasWork: snapshotLessonIds.has(record.lesson_id),
    }
    const concepts = knowledge?.concepts ?? []
    if (concepts.length === 0) {
      unregistered.push(course)
      continue
    }
    for (const concept of concepts) {
      const courses = groups.get(concept) ?? []
      courses.push(course)
      groups.set(concept, courses)
    }
  }
  return {
    completedCourseCount,
    knowledgeGroups: [...groups.entries()].map(([concept, courses]) => ({
      concept,
      courses,
    })),
    unregisteredLessons: unregistered,
  }
}
