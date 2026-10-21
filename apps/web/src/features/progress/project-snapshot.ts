/**
 * TQ-012: a saved block may carry the preset line id its say block chose (`line`).
 * Optional, so snapshots written before TQ-012 (`{ type }` only) stay valid, and the
 * bind-account sync keeps storing `snapshot: { blocks }` unchanged in shape.
 */
export type SnapshotBlock = { type: string; line?: string }

export type ProjectSnapshot = {
  lessonId: string
  updatedAt: string
  blocks: SnapshotBlock[]
}

export function buildProjectSnapshotKey(lessonId: string) {
  return `project:${lessonId}`
}

/**
 * TQ-012: read blocks from storage defensively. Keeps `type` strings, keeps `line` only
 * when it is a non-empty string, drops anything else; non-arrays become []. Whether the line
 * id is allowed in a given project is the judge's call (JudgeOptions.allowedLineIds).
 */
export function sanitizeSnapshotBlocks(input: unknown): SnapshotBlock[] {
  if (!Array.isArray(input)) return []
  const blocks: SnapshotBlock[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const { type, line } = item as { type?: unknown; line?: unknown }
    if (typeof type !== 'string' || type === '') continue
    blocks.push(typeof line === 'string' && line !== '' ? { type, line } : { type })
  }
  return blocks
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
