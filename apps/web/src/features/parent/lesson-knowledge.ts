import foundation from '@/content/curriculum/foundation-guides-v1.json'
import { getCatalogLesson } from '@/features/curriculum/full-catalog-access'

export type LessonKnowledge = {
  lessonId: string
  lessonTitle: string
  concepts: Array<string>
  focusConcept: string | null
  source: 'catalog' | 'foundation'
}

// Adjudicated rule (UX-503): concepts are the registered knowledge list.
// focusConcept only fills the gap when a lesson registers no concepts at
// all. When neither exists, the lesson is unregistered — never inferred
// from its title, its works, or any model guess.
export function resolveLessonConcepts(
  concepts: ReadonlyArray<string> | undefined,
  focusConcept: string | null | undefined,
): Array<string> {
  const seen = new Set<string>()
  const result: Array<string> = []
  for (const value of concepts ?? []) {
    if (typeof value !== 'string') continue
    const concept = value.trim()
    if (concept.length === 0 || seen.has(concept)) continue
    seen.add(concept)
    result.push(concept)
  }
  if (result.length > 0) return result
  if (typeof focusConcept === 'string' && focusConcept.trim().length > 0) {
    return [focusConcept.trim()]
  }
  return []
}

export function getLessonKnowledge(lessonId: string): LessonKnowledge | null {
  const catalogHit = getCatalogLesson(lessonId)
  if (catalogHit) {
    const focusConcept =
      typeof catalogHit.lesson.focusConcept === 'string' &&
      catalogHit.lesson.focusConcept.trim().length > 0
        ? catalogHit.lesson.focusConcept.trim()
        : null
    return {
      lessonId,
      lessonTitle: catalogHit.lesson.title,
      concepts: resolveLessonConcepts(catalogHit.lesson.concepts, focusConcept),
      focusConcept,
      source: 'catalog',
    }
  }
  const foundationHit = (
    foundation.lessons as Array<{
      id: string
      title: string
      concepts?: Array<string>
    }>
  ).find((lesson) => lesson.id === lessonId)
  if (foundationHit) {
    return {
      lessonId,
      lessonTitle: foundationHit.title,
      concepts: resolveLessonConcepts(foundationHit.concepts, null),
      focusConcept: null,
      source: 'foundation',
    }
  }
  return null
}
