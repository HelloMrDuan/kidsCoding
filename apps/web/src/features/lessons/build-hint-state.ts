import type { HintLayer } from '@/features/domain/types'

export function buildHintState({
  failedAttempts,
  hintLayers,
}: {
  failedAttempts: number
  hintLayers: HintLayer[]
}) {
  const activeHint =
    hintLayers[Math.min(failedAttempts, hintLayers.length - 1)] ?? null

  return {
    activeHint,
    showRemedialJump: activeHint?.mode === 'offer_remedial',
  }
}
