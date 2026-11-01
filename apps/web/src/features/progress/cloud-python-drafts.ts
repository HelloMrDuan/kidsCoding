import { isMultiPythonLessonId, type MultiPythonLessonId } from '@/features/python-lab/python-multi-grade'

export const MAX_PYTHON_DRAFT_SOURCE_LENGTH = 5000

export type PythonDraftPayload = {
  lessonId: MultiPythonLessonId
  source: string
}

// Never trust a local passed flag as a verified result or accept a userId from clients.
export function validatePythonDraftPayload(raw: unknown): PythonDraftPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Record<string, unknown>
  if (typeof value.lessonId !== 'string' || !isMultiPythonLessonId(value.lessonId)) return null
  if (typeof value.source !== 'string' || value.source.length > MAX_PYTHON_DRAFT_SOURCE_LENGTH) return null
  return { lessonId: value.lessonId, source: value.source }
}

export type CloudPythonDraft = {
  lessonId: PythonDraftPayload['lessonId']
  source: string
  updatedAt: string
}

// Rows are validated again on download before touching a child's browser storage.
export function parseCloudPythonDraft(value: unknown): CloudPythonDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const payload = validatePythonDraftPayload({ lessonId: row.lessonId, source: row.source })
  if (!payload || typeof row.updatedAt !== 'string' || !Number.isFinite(Date.parse(row.updatedAt))) return null
  return { ...payload, updatedAt: row.updatedAt }
}
