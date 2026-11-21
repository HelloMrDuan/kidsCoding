/** Legacy keys have no owner. Scoped readers intentionally never fall back to them. */
export function scopedLessonDraftKey(owner: string, legacyKey: string) {
  return `kids-lesson-owner-v1:${encodeURIComponent(owner)}:${legacyKey}`
}
