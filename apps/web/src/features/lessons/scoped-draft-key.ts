/** Legacy keys have no owner. Scoped readers intentionally never fall back to them. */
export function scopedLessonDraftKey(owner: string, legacyKey: string) {
  return `kids-lesson-owner-v1:${encodeURIComponent(owner)}:${legacyKey}`
}

/**
 * Claimant stamp for the ownerless `kidscoding-draft:<lessonId>` keys written
 * before owner isolation existed. Those keys stay where they are (old data is
 * never deleted), but only the guest that claimed them may read them.
 */
export const LESSON_DRAFT_OWNER_STORAGE_KEY = 'kc-lesson-draft-owner-v1'
