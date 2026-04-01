import type { SupabaseClient } from '@supabase/supabase-js'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import type {
  LaunchCurriculumSkeleton,
  LessonConfigRow,
  LessonPublicationBackupRow,
  LessonPublicationRow,
} from '@/features/domain/types'

import { resolveAdminLessonRecord } from './launch-curriculum-records'

type AdminClient = SupabaseClient

export function createLaunchCurriculumRepository(admin: AdminClient) {
  const loadDraftLessons = async () => {
      const { data, error } = await admin
        .from('lesson_configs')
        .select('*')
        .order('sort_order')

      if (error) {
        throw error
      }

      return (data ?? []) as LessonConfigRow[]
    }

  const loadDraftLesson = async (lessonId: string) => {
      const { data, error } = await admin
        .from('lesson_configs')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle()

      if (error) {
        throw error
      }

      return (data ?? null) as LessonConfigRow | null
    }

  const loadPublishedLessons = async () => {
      const { data, error } = await admin
        .from('lesson_publications')
        .select('*')
        .order('sort_order')

      if (error) {
        throw error
      }

      return (data ?? []) as LessonPublicationRow[]
    }

  const loadPublishedLesson = async (lessonId: string) => {
      const { data, error } = await admin
        .from('lesson_publications')
        .select('*')
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (error) {
        throw error
      }

      return (data ?? null) as LessonPublicationRow | null
    }

  const loadPublicationBackup = async (lessonId: string) => {
      const { data, error } = await admin
        .from('lesson_publication_backups')
        .select('*')
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (error) {
        throw error
      }

      return (data ?? null) as LessonPublicationBackupRow | null
    }

  const loadCurriculumSkeletons = async () => {
      const { data, error } = await admin
        .from('launch_curriculum_skeletons')
        .select('*')
        .order('lesson_id')

      if (error) {
        throw error
      }

      return ((data ?? []) as Array<{
        lesson_id: string
        stage: LaunchCurriculumSkeleton['stage']
        lesson_objective: string
        new_concepts: string[]
        depends_on: string[]
        child_outcome: string
        difficulty_level: LaunchCurriculumSkeleton['difficultyLevel']
      }>).map((row) => ({
        lessonId: row.lesson_id,
        stage: row.stage,
        lessonObjective: row.lesson_objective,
        newConcepts: row.new_concepts,
        dependsOn: row.depends_on,
        childOutcome: row.child_outcome,
        difficultyLevel: row.difficulty_level,
      }))
    }

  const loadCurriculumSkeleton = async (lessonId: string) => {
      const { data, error } = await admin
        .from('launch_curriculum_skeletons')
        .select('*')
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        return null
      }

      const row = data as {
        lesson_id: string
        stage: LaunchCurriculumSkeleton['stage']
        lesson_objective: string
        new_concepts: string[]
        depends_on: string[]
        child_outcome: string
        difficulty_level: LaunchCurriculumSkeleton['difficultyLevel']
      }

      return {
        lessonId: row.lesson_id,
        stage: row.stage,
        lessonObjective: row.lesson_objective,
        newConcepts: row.new_concepts,
        dependsOn: row.depends_on,
        childOutcome: row.child_outcome,
        difficultyLevel: row.difficulty_level,
      } satisfies LaunchCurriculumSkeleton
    }

  const loadAdminLesson = async (lessonId: string) => {
    const [draftRows, publicationRows] = await Promise.all([
      loadDraftLessons(),
      loadPublishedLessons(),
    ])

    return resolveAdminLessonRecord({
      lessonId,
      seedLessons: launchLessons,
      draftRows,
      publicationRows,
    })
  }

  const upsertDraftLesson = async (row: LessonConfigRow) => {
      const { error } = await admin.from('lesson_configs').upsert(row, {
        onConflict: 'id',
      })

      if (error) {
        throw error
      }
    }

  const upsertPublication = async (row: LessonPublicationRow) => {
      const { error } = await admin.from('lesson_publications').upsert(row, {
        onConflict: 'lesson_id',
      })

      if (error) {
        throw error
      }
    }

  const upsertPublicationBackup = async (row: LessonPublicationBackupRow) => {
      const { error } = await admin
        .from('lesson_publication_backups')
        .upsert(row, {
          onConflict: 'lesson_id',
        })

      if (error) {
        throw error
      }
    }

  const upsertCurriculumSkeleton = async (row: LaunchCurriculumSkeleton) => {
      const { error } = await admin.from('launch_curriculum_skeletons').upsert(
        {
          lesson_id: row.lessonId,
          stage: row.stage,
          lesson_objective: row.lessonObjective,
          new_concepts: row.newConcepts,
          depends_on: row.dependsOn,
          child_outcome: row.childOutcome,
          difficulty_level: row.difficultyLevel,
        },
        {
          onConflict: 'lesson_id',
        },
      )

      if (error) {
        throw error
      }
    }

  return {
    loadDraftLessons,
    loadDraftLesson,
    loadPublishedLessons,
    loadPublishedLesson,
    loadPublicationBackup,
    loadCurriculumSkeletons,
    loadCurriculumSkeleton,
    loadAdminLesson,
    upsertDraftLesson,
    upsertPublication,
    upsertPublicationBackup,
    upsertCurriculumSkeleton,
  }
}
