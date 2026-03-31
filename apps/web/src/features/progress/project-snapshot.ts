export type ProjectSnapshot = {
  lessonId: string
  updatedAt: string
  blocks: Array<{ type: string }>
}

export function buildProjectSnapshotKey(lessonId: string) {
  return `project:${lessonId}`
}

export function normalizeProjectSnapshots(input: ProjectSnapshot[]) {
  const newestByLesson = new Map<string, ProjectSnapshot>()

  for (const snapshot of input) {
    const existing = newestByLesson.get(snapshot.lessonId)

    if (!existing || existing.updatedAt < snapshot.updatedAt) {
      newestByLesson.set(snapshot.lessonId, snapshot)
    }
  }

  return [...newestByLesson.values()]
}
