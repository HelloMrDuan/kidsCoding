/**
 * OPS-056：启蒙课 V3 草稿（按课程 ID 参数化，形状与 OPS-041 forest-hello 一致）。
 *
 * - 每关初始程序：设计错误关预置 mistake-steps.ts 的错误程序，其余为空。
 * - 严格校验（isValidLaunchDraft）：任一字段不对即 false；对白 id 未知即 false（#554 同口径）。
 * - 整形（coerceLaunchDraft）：未知积木丢弃；未知对白只剥 line、不丢积木；越界关号钳制。
 */
import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'
import { isKnownSayLine } from '@/features/lessons/blockly/say-line-presets'

import { launchV3KnownBlockTypes, launchV3StepIds } from './launch-v3-lessons'

export type LaunchSlotData = {
  version: 1
  lessonId: string
  stepIndex: number
  programs: Record<string, ProgramBlock[]>
  passed: string[]
  failures: number
  finished?: boolean
}

export function launchV3DraftKey(lessonId: string): string {
  return `kidscoding-draft:${lessonId}`
}

function cleanBlock(block: ProgramBlock): ProgramBlock {
  const clean: ProgramBlock = { type: block.type }
  if (typeof block.line === 'string') clean.line = block.line
  if (block.disconnected === true) clean.disconnected = true
  return clean
}

export function launchStarterProgram(lessonId: string, stepId: string): ProgramBlock[] {
  return getMistakeStep(lessonId, stepId)?.wrongProgram.map(cleanBlock) ?? []
}

export function emptyLaunchDraft(lessonId: string): LaunchSlotData {
  return {
    version: 1,
    lessonId,
    stepIndex: 0,
    programs: Object.fromEntries(
      launchV3StepIds(lessonId).map((id) => [id, launchStarterProgram(lessonId, id)]),
    ),
    passed: [],
    failures: 0,
  }
}

export function isEmptyLaunchDraft(data: LaunchSlotData): boolean {
  return JSON.stringify(data) === JSON.stringify(emptyLaunchDraft(data.lessonId))
}

function isValidBlock(known: readonly string[], value: unknown): value is ProgramBlock {
  if (!value || typeof value !== 'object') return false
  const block = value as Partial<ProgramBlock>
  if (typeof block.type !== 'string' || !known.includes(block.type)) return false
  if (block.line !== undefined && (typeof block.line !== 'string' || !isKnownSayLine(block.line))) return false
  if (block.disconnected !== undefined && typeof block.disconnected !== 'boolean') return false
  return true
}

export function isValidLaunchDraft(lessonId: string, value: unknown): value is LaunchSlotData {
  const stepIds = launchV3StepIds(lessonId)
  if (stepIds.length === 0) return false
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<LaunchSlotData>
  if (draft.version !== 1 || draft.lessonId !== lessonId) return false
  if (
    typeof draft.stepIndex !== 'number' ||
    !Number.isInteger(draft.stepIndex) ||
    draft.stepIndex < 0 ||
    draft.stepIndex >= stepIds.length
  ) {
    return false
  }
  if (!draft.programs || typeof draft.programs !== 'object') return false
  const known = launchV3KnownBlockTypes(lessonId)
  for (const [key, program] of Object.entries(draft.programs)) {
    if (!stepIds.includes(key)) return false
    if (!Array.isArray(program) || !program.every((block) => isValidBlock(known, block))) return false
  }
  if (!Array.isArray(draft.passed) || !draft.passed.every((id) => stepIds.includes(id))) return false
  if (typeof draft.failures !== 'number' || !Number.isInteger(draft.failures) || draft.failures < 0) return false
  if (draft.finished !== undefined && typeof draft.finished !== 'boolean') return false
  return true
}

function coerceProgram(known: readonly string[], value: unknown, fallback: ProgramBlock[]): ProgramBlock[] {
  if (!Array.isArray(value)) return fallback.map(cleanBlock)
  const out: ProgramBlock[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const block = item as Partial<ProgramBlock>
    if (typeof block.type !== 'string' || !known.includes(block.type)) continue
    const clean: ProgramBlock = { type: block.type }
    if (typeof block.line === 'string' && isKnownSayLine(block.line)) clean.line = block.line
    if (block.disconnected === true) clean.disconnected = true
    out.push(clean)
  }
  return out
}

export function coerceLaunchDraft(lessonId: string, value: unknown): LaunchSlotData {
  const stepIds = launchV3StepIds(lessonId)
  if (!value || typeof value !== 'object') return emptyLaunchDraft(lessonId)
  const raw = value as Partial<LaunchSlotData>
  if (raw.version !== 1 || raw.lessonId !== lessonId || stepIds.length === 0) return emptyLaunchDraft(lessonId)
  const known = launchV3KnownBlockTypes(lessonId)
  const programs: Record<string, ProgramBlock[]> = {}
  for (const stepId of stepIds) {
    const program = (raw.programs as Record<string, unknown> | undefined)?.[stepId]
    programs[stepId] = coerceProgram(known, program, launchStarterProgram(lessonId, stepId))
  }
  const next: LaunchSlotData = {
    version: 1,
    lessonId,
    stepIndex:
      typeof raw.stepIndex === 'number' && Number.isFinite(raw.stepIndex)
        ? Math.min(Math.max(Math.floor(raw.stepIndex), 0), stepIds.length - 1)
        : 0,
    programs,
    passed: Array.isArray(raw.passed)
      ? raw.passed.filter((id): id is string => typeof id === 'string' && stepIds.includes(id))
      : [],
    failures:
      typeof raw.failures === 'number' && Number.isInteger(raw.failures) && raw.failures >= 0
        ? raw.failures
        : 0,
  }
  if (raw.finished === true) next.finished = true
  return next
}
