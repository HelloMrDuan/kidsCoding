import type { HintLayer } from '@/features/domain/types'

/**
 * Hint tiers escalate one failure at a time (TQ-008): no failure → no hint,
 * 1st failure → tier 1, 2nd → tier 2, 3rd and later → tier 3 (remedial offer).
 */
export function buildHintState({
  failedAttempts,
  hintLayers,
}: {
  failedAttempts: number
  hintLayers: HintLayer[]
}) {
  const tier = failedAttempts > 0 && hintLayers.length > 0
    ? Math.min(failedAttempts, hintLayers.length)
    : 0
  const activeHint = tier > 0 ? hintLayers[tier - 1] ?? null : null

  return {
    /** 1-based tier currently shown (0 = no hint yet). */
    tier,
    activeHint,
    showRemedialJump: activeHint?.mode === 'offer_remedial',
  }
}
