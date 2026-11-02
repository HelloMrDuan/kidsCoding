/**
 * A1-U1-L06 local draft persistence (browser localStorage only, no server).
 *
 * What is saved: the two editable rule texts, the per-sample predictions,
 * and the per-rule contamination flags. Run results (matrices) are NOT saved:
 * after a refresh the student re-runs to get fresh results.
 *
 * Anti-contamination rule (the point of this module): once a rule has been
 * edited for this batch, its clean re-verification eligibility is spent.
 * Refreshing the page must restore that spent state, and restoring the
 * default rule text must NOT clear it — seeing the batch results cannot be
 * unseen, and an edit shows the rule was already worked on for this batch.
 * The only thing that clears eligibility loss is outside this lesson's
 * control (the student clearing browser storage entirely), which the page
 * states plainly instead of pretending otherwise.
 */

import { RULE_V1_PYTHON, RULE_V2_PYTHON, type FruitName, type RuleId } from './fruit-classifier'

export const L06_DRAFT_STORAGE_KEY = 'a1-u1-l06-draft-v1'

export type L06Draft = {
  version: 1
  ruleV1: string
  ruleV2: string
  predictions: Record<string, FruitName | undefined>
  /** True once the rule was edited for this batch; refresh and restore-default must preserve it. */
  contaminated: Record<RuleId, boolean>
}

export function emptyDraft(ruleV1: string, ruleV2: string): L06Draft {
  return { version: 1, ruleV1, ruleV2, predictions: {}, contaminated: { v1: false, v2: false } }
}

export function serializeDraft(draft: L06Draft): string {
  return JSON.stringify(draft)
}

/** Parse stored text defensively: anything unrecognized falls back to clean defaults. */
export function parseDraft(raw: string | null, fallbackV1: string, fallbackV2: string): L06Draft {
  if (!raw) return emptyDraft(fallbackV1, fallbackV2)
  try {
    const parsed = JSON.parse(raw) as Partial<L06Draft>
    if (parsed.version !== 1) return emptyDraft(fallbackV1, fallbackV2)
    const contaminated = parsed.contaminated ?? { v1: false, v2: false }
    // A damaged draft must degrade safely: drop prediction values that are
    // not real fruits instead of letting an illegal value reach the UI.
    const rawPredictions = (parsed.predictions ?? {}) as Record<string, unknown>
    const predictions: Record<string, FruitName | undefined> = {}
    for (const [key, value] of Object.entries(rawPredictions)) {
      if (value === '苹果' || value === '香蕉' || value === '橙子') predictions[key] = value
    }
    return {
      version: 1,
      ruleV1: typeof parsed.ruleV1 === 'string' ? parsed.ruleV1 : fallbackV1,
      ruleV2: typeof parsed.ruleV2 === 'string' ? parsed.ruleV2 : fallbackV2,
      predictions,
      contaminated: { v1: contaminated.v1 === true, v2: contaminated.v2 === true },
    }
  } catch {
    return emptyDraft(fallbackV1, fallbackV2)
  }
}

/**
 * Restoring default code text resets the text only. Contamination is
 * deliberately untouched: restoring defaults must not restore eligibility.
 */
export function restoreDefaultCode(draft: L06Draft, rule: RuleId, defaultCode: string): L06Draft {
  return { ...draft, ...(rule === 'v1' ? { ruleV1: defaultCode } : { ruleV2: defaultCode }) }
}

/** Mark a rule edited for this batch: its eligibility is spent from now on. */
export function markEdited(draft: L06Draft, rule: RuleId): L06Draft {
  return { ...draft, contaminated: { ...draft.contaminated, [rule]: true } }
}

/**
 * React store wiring (useSyncExternalStore): the stored draft is the single
 * source of truth, so the page never calls setState synchronously inside an
 * effect to load it. Edits write through saveDraft, which notifies local
 * subscribers immediately (the 'storage' event only fires across tabs, so the
 * same tab needs the manual notification).
 */
type DraftListener = () => void

const draftListeners = new Set<DraftListener>()

export function subscribeDraft(listener: DraftListener): () => void {
  draftListeners.add(listener)
  if (typeof window !== 'undefined') window.addEventListener('storage', listener)
  return () => {
    draftListeners.delete(listener)
    if (typeof window !== 'undefined') window.removeEventListener('storage', listener)
  }
}

export function readStoredRaw(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(L06_DRAFT_STORAGE_KEY)
  } catch {
    return null
  }
}

let cachedRaw: string | null | undefined
let cachedDraft: L06Draft | null = null

/** Cached parse: the same stored text returns the same object, as useSyncExternalStore requires. */
export function getCachedDraft(raw: string | null, fallbackV1: string, fallbackV2: string): L06Draft {
  if (cachedDraft && cachedRaw === raw) return cachedDraft
  cachedRaw = raw
  cachedDraft = parseDraft(raw, fallbackV1, fallbackV2)
  return cachedDraft
}

export function getDraftSnapshot(): L06Draft {
  return getCachedDraft(readStoredRaw(), RULE_V1_PYTHON, RULE_V2_PYTHON)
}

export function getServerDraftSnapshot(): L06Draft {
  return emptyDraft(RULE_V1_PYTHON, RULE_V2_PYTHON)
}

/** Persist and notify. Returns false when storage is unavailable; the lesson still works. */
export function saveDraft(draft: L06Draft): boolean {
  try {
    if (typeof window === 'undefined') return false
    window.localStorage.setItem(L06_DRAFT_STORAGE_KEY, serializeDraft(draft))
    draftListeners.forEach((listener) => listener())
    return true
  } catch {
    return false
  }
}
