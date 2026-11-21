import { sanitizeProgram, type ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { GRID_MAX_ACTIONS } from './grid-engine'

export const GRID_PROGRAM_MAX_BYTES = 48 * 1024

export function serializeGridProgram(lessonId: string, stepId: string, blocks: ProgramBlock[]) {
  return JSON.stringify({ schema: 1, lessonId, stepId, blocks }, null, 2)
}

function sameProgram(raw: unknown[], clean: ProgramBlock[]): boolean {
  return raw.length === clean.length && clean.every((block, index) => {
    const source = raw[index]
    if (!source || typeof source !== 'object') return false
    const entries = Object.entries(source)
    if (entries.length !== Object.keys(block).length) return false
    const normalized = block as Record<string, unknown>
    return entries.every(([key, value]) => key === 'body'
      ? Array.isArray(value) && !!block.body && sameProgram(value, block.body)
      : Object.hasOwn(normalized, key) && normalized[key] === value)
  })
}

export function parseGridProgram(raw: string, lessonId: string, stepId: string, allowedBlocks: string[]) {
  if (new TextEncoder().encode(raw).byteLength > GRID_PROGRAM_MAX_BYTES) throw new Error('积木文件太大。')
  let file: { schema?: unknown; lessonId?: unknown; stepId?: unknown; blocks?: unknown }
  try {
    file = JSON.parse(raw)
  } catch {
    throw new Error('无法读取这份积木文件。')
  }
  if (file?.schema !== 1 || file.lessonId !== lessonId || file.stepId !== stepId || !Array.isArray(file.blocks)) {
    throw new Error('请选择从本课、这一关导出的积木文件。')
  }
  const blocks = sanitizeProgram(file.blocks, new Set(allowedBlocks), GRID_MAX_ACTIONS + 1)
  if (!sameProgram(file.blocks, blocks)) {
    throw new Error('文件含有这一关无法使用的积木或循环。')
  }
  return blocks
}
