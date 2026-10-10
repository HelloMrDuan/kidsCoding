import catalog from '@/content/curriculum/full-catalog-v1.json'
import detailed from '@/content/curriculum/track-g0-detailed-lessons-v1.json'
import foundation from '@/content/curriculum/foundation-guides-v1.json'
import capstones from '@/content/curriculum/unit-capstone-blueprints-v1.json'
import { launchLessons } from '@/content/curriculum/launch-lessons'

// Content assets are separate from the published seed lessons and Supabase publications.
// Never infer that "detailed" means the learning engine supports or has published a lesson.
export type CatalogTrack = (typeof catalog.tracks)[number]
export type CatalogUnit = CatalogTrack['units'][number]
export type CatalogLesson = CatalogUnit['lessons'][number]

export const curriculumTracks = catalog.tracks

export function getCatalogStatistics() {
  return {
    tracks: catalog.tracks.length,
    units: catalog.tracks.reduce((sum, track) => sum + track.units.length, 0),
    lessons: catalog.tracks.reduce(
      (sum, track) => sum + track.units.reduce((count, unit) => count + unit.lessons.length, 0),
      0,
    ),
    detailedNewLessons: detailed.lessons.length,
    existingFoundationGuides: foundation.lessons.length,
    unitProjectBlueprints: capstones.projects.length,
    existingLaunchLessonEntries: launchLessons.length,
  }
}

export function getCatalogTrack(id: string) {
  return catalog.tracks.find((track) => track.id === id) ?? null
}

export function getCatalogLesson(id: string) {
  for (const track of catalog.tracks) {
    for (const unit of track.units) {
      const lesson = unit.lessons.find((entry) => entry.id === id)
      if (lesson) return { lesson, track, unit }
    }
  }
  return null
}

export function getLessonContentStage(id: string) {
  if (detailed.lessons.some((lesson) => lesson.id === id)) return 'detailed'
  if (foundation.lessons.some((lesson) => lesson.id === id)) return 'foundation'
  return 'outline'
}

export function getUnitProject(unitId: string) {
  return capstones.projects.find((project) => project.unitId === unitId) ?? null
}

export function getLessonGuide(id: string) {
  const draft = detailed.lessons.find((lesson) => lesson.id === id)
  if (draft) {
    return {
      id: draft.id,
      title: draft.lessonTitle,
      story: draft.story,
      goals: draft.learningObjectives,
      steps: draft.teachingSteps.map((step) => ({
        order: step.order,
        prompt: step.teacherPrompt,
        action: step.childAction,
        check: step.observableCheck,
        voiceover: step.voiceover,
      })),
      errors: draft.commonMistakes.map((item) => ({
        symptom: item.symptom,
        suggestion: item.recovery,
      })),
      hints: draft.hints,
      rubric: draft.assessment.rubric,
      acceptance: draft.assessment.mustPass,
      extension: draft.extension.prompt,
      capabilities: draft.requiredEngineCapabilities,
      status: draft.review.publicationStatus,
      isPlayable: false,
    }
  }
  const prior = foundation.lessons.find((lesson) => lesson.id === id)
  if (!prior) return null
  return {
    id: prior.id,
    title: prior.title,
    story: prior.story,
    goals: [prior.learningOutcome],
    steps: prior.instructionSequence.map((step) => ({
      order: step.step,
      prompt: step.teacherPrompt,
      action: step.childAction,
      check: step.check,
      voiceover: step.voiceover,
    })),
    errors: prior.commonErrors.map((symptom, index) => ({
      symptom,
      suggestion: prior.tieredHints[index] ?? '',
    })),
    hints: prior.tieredHints,
    rubric: [
      { criterion: '完成核心任务', weight: 60, evidence: prior.learningOutcome },
      { criterion: '解释与自测', weight: 40, evidence: prior.assessment.pass.join('；') },
    ],
    acceptance: prior.assessment.pass,
    extension: prior.extension,
    capabilities: [] as string[],
    status: prior.publicationStatus,
    isPlayable: false,
  }
}

export function getPublicCatalogTracks() {
  return catalog.tracks.map((track) => ({
    id: track.id,
    title: track.title,
    ageRange: track.ageRange,
    engine: track.engine,
    prerequisites: track.prerequisites,
    unitCount: track.units.length,
    lessonCount: track.units.reduce((sum, unit) => sum + unit.lessons.length, 0),
  }))
}

export function getPublicCatalogUnit(unit: CatalogUnit) {
  return {
    id: unit.id,
    title: unit.title,
    concepts: unit.concepts,
    lessons: unit.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      phase: lesson.phase,
      focusConcept: lesson.focusConcept,
      learningOutcome: lesson.learningOutcome,
      contentStage: getLessonContentStage(lesson.id),
      playable: false,
    })),
    finalProject: unit.lessons.at(-1)?.title ?? '',
  }
}
