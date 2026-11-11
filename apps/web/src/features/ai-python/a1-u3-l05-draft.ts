/**
 * A1-U3-L05 本机草稿：只存学生的 verdict 选择，不存判定结果。
 *
 * 存：八项每项选的 verdict（可信 / 编造数字 / 编造来源 / 证据不足，
 * 未选为 null）。
 * 不存：八项核对结果——刷新后须重新点“检查八项”才出结果。
 * 损坏草稿：字段级过滤（未知项号、非法 verdict 值一律丢弃），其余保留；
 * 整体损坏回空草稿，不崩溃。
 * 本课没有污染资格标志：资格规则是教学口径（旧题重复做是练习记录，
 * 最终核验须用新资料新回答），不是草稿里的一个布尔值；草稿只记学生
 * 做了什么，资格判断由核对函数与作品总结实时算出。
 *
 * 草稿键已改为规范格式 kidscoding-draft:A1-U3-L05（与契约一致）。
 * 外壳信封草稿 kidscoding-draft:A1-U3-L05 接管保存与恢复：本文件只留
 * 草稿形状与整形（isValidDraftShape / coerceDraft / emptyDraft），
 * 供外壳与适配器使用。
 */

import {
  CHECK_ITEM_IDS,
  VERDICTS,
  type CheckItemId,
  type L05Draft,
  type Verdict,
} from './a1-u3-l05'
import { L05_DRAFT_KEY } from './a1-u3-l05-contract'

export { L05_DRAFT_KEY }
export type { L05Draft }

export function emptyDraft(): L05Draft {
  const verdicts = {} as Record<CheckItemId, Verdict | null>
  for (const id of CHECK_ITEM_IDS) verdicts[id] = null
  return { version: 1, lessonId: 'A1-U3-L05', verdicts }
}

function isKnownItemId(value: unknown): value is CheckItemId {
  return typeof value === 'string' && (CHECK_ITEM_IDS as readonly string[]).includes(value)
}

function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && (VERDICTS as readonly string[]).includes(value)
}

/**
 * 严格形状（不降级）：任一字段不对即 false。
 * - version 必须为 1，lessonId 必须为本课；
 * - verdicts 必须为对象，键只能是八项已知项号，值只能是四种 verdict 或 null。
 */
export function isValidDraftShape(value: unknown): value is L05Draft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<L05Draft>
  if (draft.version !== 1) return false
  if (draft.lessonId !== 'A1-U3-L05') return false
  if (!draft.verdicts || typeof draft.verdicts !== 'object') return false
  for (const [key, verdict] of Object.entries(draft.verdicts)) {
    if (!isKnownItemId(key)) return false
    if (verdict !== null && !isVerdict(verdict)) return false
  }
  return true
}

/**
 * 外壳信封解包后的草稿整形（字段级过滤，与 L06 的 coerceDraft 同款）：
 * - 整体损坏（非对象 / version 非 1 / lessonId 非本课）→ 空草稿；
 * - verdicts 只留已知项号与合法 verdict，未选项补 null，未知项号与
 *   非法值一律丢弃。
 */
export function coerceDraft(value: unknown): L05Draft {
  if (!value || typeof value !== 'object') return emptyDraft()
  const raw = value as Partial<L05Draft>
  if (raw.version !== 1) return emptyDraft()
  if (raw.lessonId !== 'A1-U3-L05') return emptyDraft()
  const verdicts = {} as Record<CheckItemId, Verdict | null>
  for (const id of CHECK_ITEM_IDS) verdicts[id] = null
  if (raw.verdicts && typeof raw.verdicts === 'object') {
    for (const [key, verdict] of Object.entries(raw.verdicts)) {
      if (isKnownItemId(key) && (verdict === null || isVerdict(verdict))) {
        verdicts[key] = verdict
      }
    }
  }
  return { version: 1, lessonId: 'A1-U3-L05', verdicts }
}
