import type { SupabaseClient } from '@supabase/supabase-js'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import type {
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

  return {
    loadDraftLessons,
    loadDraftLesson,
    loadPublishedLessons,
    loadPublishedLesson,
    loadPublicationBackup,
    loadAdminLesson,
    upsertDraftLesson,
    upsertPublication,
    upsertPublicationBackup,
  }
}
