/**
 * A1-U3-L04 本机草稿骨架（脚手架 OPS-030 生成）。
 *
 * 只存学生的课堂编辑内容，不存判定结果：刷新后须重新检查才出结果。
 * 草稿键（P0 契约格式）：kidscoding-draft:A1-U3-L04，按课节分键。
 * 损坏草稿 fail-closed：解析失败或结构不对 → 默认空草稿，不崩溃，
 * 不报“已恢复”，不覆盖已存草稿。
 * 写入方为共享 LessonWorkspace（信封写同一键），本模块不再直接碰
 * localStorage。
 */

import { L04_DRAFT_KEY } from './a1-u3-l04-contract'

export { L04_DRAFT_KEY }

/** 单课草稿上限（与共享规范一致，不得擅自提高）。 */
export const MAX_DRAFT_BYTES = 64 * 1024

export type L04Draft = {
  /** 编辑区文本（TODO：按本课数据模型调整字段）。 */
  text: string
  /** 已揭示到的提示级数（0 = 未揭示）。 */
  hintLevel: number
}

export function emptyDraft(): L04Draft {
  return { text: '', hintLevel: 0 }
}

function isDraftShape(value: unknown): value is L04Draft {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record['text'] === 'string' &&
    typeof record['hintLevel'] === 'number'
  )
}

/**
 * 整形草稿：非法字段丢弃、超长截断，返回可用草稿；无法整形返回空草稿。
 * 绝不抛错（fail-closed 调用方）。
 */
export function coerceDraft(script: unknown): L04Draft {
  if (!isDraftShape(script)) return emptyDraft()
  const draft = script as L04Draft
  return {
    text: draft.text.slice(0, MAX_DRAFT_BYTES),
    hintLevel: Math.max(0, Math.min(3, Math.floor(draft.hintLevel))),
  }
}

/**
 * 解析存储的草稿 JSON：解析失败或结构不对返回空草稿（不抛错）。
 */
export function parseDraft(raw: string | null): L04Draft {
  if (raw === null) return emptyDraft()
  try {
    return coerceDraft(JSON.parse(raw))
  } catch {
    return emptyDraft()
  }
}
