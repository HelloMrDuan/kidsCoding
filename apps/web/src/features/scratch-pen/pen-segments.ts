// Pure helpers for the G3-U1-L01 pen trial stage (PR #260 web-classroom
// access). The sandbox reports the VM's own penLine output in VM stage
// coordinates (x in [-240, 240], y in [-180, 180]); this module turns those
// segments into SVG lines on the 480x360 stage. It invents nothing: a
// segment that is not finite is dropped, never repaired.

export type PenSegment = {
  x0: number
  y0: number
  x1: number
  y1: number
  /** VM pen color as [red, green, blue, alpha], each 0..1. */
  color: [number, number, number, number]
  diameter: number
}

export type PenSvgLine = {
  x1: number
  y1: number
  x2: number
  y2: number
  stroke: string
  strokeWidth: number
}

export const PEN_STAGE_WIDTH = 480
export const PEN_STAGE_HEIGHT = 360

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isValidPenSegment(value: unknown): value is PenSegment {
  if (!value || typeof value !== 'object') return false
  const s = value as PenSegment
  if (!isFiniteNumber(s.x0) || !isFiniteNumber(s.y0) || !isFiniteNumber(s.x1) || !isFiniteNumber(s.y1)) return false
  if (!Array.isArray(s.color) || s.color.length !== 4 || !s.color.every(c => isFiniteNumber(c) && c >= 0 && c <= 1)) return false
  if (!isFiniteNumber(s.diameter) || s.diameter <= 0) return false
  return true
}

/** VM stage coordinates -> SVG coordinates (y axis flips). */
export function penSegmentsToSvgLines(segments: PenSegment[]): PenSvgLine[] {
  return segments.filter(isValidPenSegment).map(s => {
    const [r, g, b, a] = s.color
    return {
      x1: s.x0 + PEN_STAGE_WIDTH / 2,
      y1: PEN_STAGE_HEIGHT / 2 - s.y0,
      x2: s.x1 + PEN_STAGE_WIDTH / 2,
      y2: PEN_STAGE_HEIGHT / 2 - s.y1,
      stroke: `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`,
      strokeWidth: Math.max(1, s.diameter),
    }
  })
}

/** One honest run summary, built only from VM-reported values. */
export function summarizePenRun(
  segments: PenSegment[],
  final: { x: number; sizeVar: number | null } | null,
): string {
  if (!final) return `画线 ${segments.length} 段。`
  const size = final.sizeVar === null ? '—' : String(final.sizeVar)
  return `画线 ${segments.length} 段，终点 x=${Math.round(final.x)}，size 变量=${size}。`
}
