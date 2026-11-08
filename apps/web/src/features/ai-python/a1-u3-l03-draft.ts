/**
 * A1-U3-L03 本机草稿：只存学生实际编辑的 JSON 文本与提示级数。
 *
 * 存：编辑区里的 JSON 文本、已揭示到的提示级数。
 * 不存：校验结果与作品总结——刷新后须重新点校验才出结果。
 * 损坏草稿：解析失败或结构不对 → 默认空编辑区，不崩溃。
 * 本课没有污染资格概念；刷新恢复的是编辑文本本身。
 *
 * 草稿键已改为规范格式 kidscoding-draft:A1-U3-L03（与契约一致）；
 * 旧键 a1-u3-l03-draft-v1 不再读写（#464 未合并，无真实学生草稿可迁移）。
 * hintLevel 只为旧草稿兼容保留：外壳抽屉揭示态不回写草稿，插槽不显示它。
 * 旧独立课堂的 localStorage store 机器已删除（路由切到统一工作区，
 * 外壳信封草稿 kidscoding-draft:A1-U3-L03 接管保存与恢复）：
 * 本文件只留草稿形状与整形（isValidDraftShape / coerceDraft /
 * emptyDraft），供外壳与适配器使用。
 */

import { L03_DRAFT_KEY } from './a1-u3-l03-contract'

export { L03_DRAFT_KEY }

export type L03Draft = {
  version: 1
  jsonText: string
  hintLevel: 0 | 1 | 2 | 3
}

export function emptyDraft(): L03Draft {
  return { version: 1, jsonText: '', hintLevel: 0 }
}

/**
 * 外壳信封解包后的草稿整形（与 L02 同款）：
 * - 有效草稿原样返回（hintLevel 缺失补 0，非法值回落 0）；
 * - 无效草稿（非对象 / version 非 1 / jsonText 非字符串 / hintLevel 非法）
 *   回落为空草稿，不抛错。
 */
export function isValidDraftShape(value: unknown): value is L03Draft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<L03Draft>
  if (draft.version !== 1) return false
  if (typeof draft.jsonText !== 'string') return false
  if (
    draft.hintLevel !== undefined &&
    (typeof draft.hintLevel !== 'number' || ![0, 1, 2, 3].includes(draft.hintLevel))
  ) {
    return false
  }
  return true
}

export function coerceDraft(value: unknown): L03Draft {
  if (!isValidDraftShape(value)) return emptyDraft()
  const draft = value as Partial<L03Draft>
  return {
    version: 1,
    jsonText: draft.jsonText ?? '',
    hintLevel: ([0, 1, 2, 3].includes(draft.hintLevel as number)
      ? draft.hintLevel
      : 0) as L03Draft['hintLevel'],
  }
}
