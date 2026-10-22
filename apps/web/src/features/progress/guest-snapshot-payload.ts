import type { AgeBand, StartLevel } from '@/features/domain/types'

import {
  normalizeProjectSnapshots,
  sanitizeSnapshotBlocks,
  type ProjectSnapshot,
} from './project-snapshot'

/**
 * TQ-013: the only shape `/api/guest` stores in `guest_snapshots`.
 *
 * Minimal collection: just what bind-account (mergeGuestSnapshot) needs to rebuild
 * the child's start level and learning record after a parent creates an account.
 * - onboarding: age band + recommended start level. Assessment `answers` are NOT
 *   uploaded (they stay in this device's localStorage only).
 * - progress: completed lesson ids, badge ids, card ids, project block snapshots
 *   (block `type` + optional preset `line` id from TQ-012). Stars, streak, current
 *   lesson and any other local-only fields are not uploaded.
 * No names, no free text: every string is an id matching GUEST_ID_PATTERN.
 */
export type GuestSyncOnboarding = {
  ageBand: AgeBand | null
  recommendedLevel: StartLevel | null
}

export type GuestSyncProgress = {
  completedLessonIds: string[]
  badgeIds: string[]
  cardIds: string[]
  projectSnapshots: ProjectSnapshot[]
}

export type GuestSyncPayload = {
  onboarding: GuestSyncOnboarding
  progress: GuestSyncProgress
}

/** 64 KB: a full 12-lesson snapshot is a few KB; anything bigger is rejected with 413. */
export const GUEST_PAYLOAD_MAX_BYTES = 64 * 1024
export const GUEST_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,96}$/
export const GUEST_MAX_LIST_ITEMS = 200
export const GUEST_MAX_SNAPSHOTS = 100
export const GUEST_MAX_BLOCKS_PER_SNAPSHOT = 200

const AGE_BANDS: readonly AgeBand[] = ['age_6_8', 'age_9_12', 'age_13_plus']
const START_LEVELS: readonly StartLevel[] = ['starter', 'foundation', 'advanced']
const ISO_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T[0-9:.]{5,18}(Z|[+-]\d{2}:\d{2})$/

export type GuestPayloadResult =
  | { ok: true; payload: GuestSyncPayload }
  | { ok: false; error: string }

class InvalidPayload extends Error {}

function fail(field: string): never {
  throw new InvalidPayload(`invalid-${field}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !allowed.includes(value as T)) fail(field)
  return value as T
}

function readIdList(value: unknown, field: string): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > GUEST_MAX_LIST_ITEMS) fail(field)
  const ids = value.map((item) => {
    if (typeof item !== 'string' || !GUEST_ID_PATTERN.test(item)) fail(field)
    return item
  })
  return [...new Set(ids)]
}

function readSnapshots(value: unknown): ProjectSnapshot[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > GUEST_MAX_SNAPSHOTS) {
    fail('projectSnapshots')
  }
  const snapshots = value.map((item) => {
    if (!isRecord(item)) fail('projectSnapshots')
    const { lessonId, updatedAt, blocks } = item
    if (typeof lessonId !== 'string' || !GUEST_ID_PATTERN.test(lessonId)) {
      fail('projectSnapshots')
    }
    if (typeof updatedAt !== 'string' || !ISO_TIME_PATTERN.test(updatedAt)) {
      fail('projectSnapshots')
    }
    if (!Array.isArray(blocks) || blocks.length > GUEST_MAX_BLOCKS_PER_SNAPSHOT) {
      fail('projectSnapshots')
    }
    // Keeps block `type` and the TQ-012 preset `line`; then require both to be ids
    // so no free text (e.g. a typed name) can ride along inside a block.
    const clean = sanitizeSnapshotBlocks(blocks).filter(
      (block) =>
        GUEST_ID_PATTERN.test(block.type) &&
        (block.line === undefined || GUEST_ID_PATTERN.test(block.line)),
    )
    return { lessonId, updatedAt, blocks: clean }
  })
  return normalizeProjectSnapshots(snapshots)
}

/**
 * Validate and whitelist an untrusted `/api/guest` body. Unknown fields (including
 * `onboarding.answers`) are dropped; known fields with the wrong type are rejected.
 */
export function parseGuestSnapshotPayload(input: unknown): GuestPayloadResult {
  try {
    if (!isRecord(input)) fail('body')
    if (!isRecord(input.onboarding)) fail('onboarding')
    if (!isRecord(input.progress)) fail('progress')
    const onboarding = input.onboarding
    const progress = input.progress
    return {
      ok: true,
      payload: {
        onboarding: {
          ageBand: readEnum(onboarding.ageBand, AGE_BANDS, 'ageBand'),
          recommendedLevel: readEnum(
            onboarding.recommendedLevel,
            START_LEVELS,
            'recommendedLevel',
          ),
        },
        progress: {
          completedLessonIds: readIdList(
            progress.completedLessonIds,
            'completedLessonIds',
          ),
          badgeIds: readIdList(progress.badgeIds, 'badgeIds'),
          cardIds: readIdList(progress.cardIds, 'cardIds'),
          projectSnapshots: readSnapshots(progress.projectSnapshots),
        },
      },
    }
  } catch (error) {
    if (error instanceof InvalidPayload) return { ok: false, error: error.message }
    throw error
  }
}

/** Client side: build the minimal body before it leaves the device. */
export function toGuestSyncPayload({
  onboarding,
  progress,
}: {
  onboarding: { ageBand?: AgeBand | null; recommendedLevel?: StartLevel | null }
  progress: {
    completedLessonIds?: string[]
    badgeIds?: string[]
    cardIds?: string[]
    projectSnapshots?: ProjectSnapshot[]
  }
}): GuestSyncPayload {
  return {
    onboarding: {
      ageBand: onboarding.ageBand ?? null,
      recommendedLevel: onboarding.recommendedLevel ?? null,
    },
    progress: {
      completedLessonIds: progress.completedLessonIds ?? [],
      badgeIds: progress.badgeIds ?? [],
      cardIds: progress.cardIds ?? [],
      projectSnapshots: (progress.projectSnapshots ?? []).map((snapshot) => ({
        lessonId: snapshot.lessonId,
        updatedAt: snapshot.updatedAt,
        blocks: sanitizeSnapshotBlocks(snapshot.blocks),
      })),
    },
  }
}
