import type { CloudPythonDraft } from './cloud-python-drafts'
import type { LocalPractice } from './local-practice'

export type UploadConflict = {
  lessonId: string
  localSavedAt: string
  cloudUpdatedAt: string
}

/**
 * UX-302: uploading must never silently overwrite a newer cloud draft.
 * Mirrors the restore direction (which only overwrites local when cloud is newer):
 * a conflict exists exactly when the cloud copy is strictly newer than local.
 * Equal timestamps are not conflicts — the restore side treats >= as "keep local".
 */
export function findUploadConflicts(
  local: LocalPractice[],
  cloud: CloudPythonDraft[],
): UploadConflict[] {
  const cloudMap = new Map(cloud.map((draft) => [draft.lessonId, draft]))
  const conflicts: UploadConflict[] = []
  for (const item of local) {
    const remote = cloudMap.get(item.lessonId)
    if (remote && Date.parse(remote.updatedAt) > Date.parse(item.savedAt)) {
      conflicts.push({
        lessonId: item.lessonId,
        localSavedAt: item.savedAt,
        cloudUpdatedAt: remote.updatedAt,
      })
    }
  }
  return conflicts
}
