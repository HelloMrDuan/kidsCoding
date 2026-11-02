/**
 * A1-U3-L03 结构化 JSON 输出：把 U3 本地试点里的水果记录校验演示变成一节完整课堂。
 *
 * 复用（不重新实现）：试点已发表的水果记录模式 FRUIT_SCHEMA_FIELDS 与校验器
 * validateFruitRecord（见 u3-local-engines.ts，4 字段、5 项检查）。本课不改
 * 试点引擎，不调用外部模型，不接网关：学生改的是合成水果记录，不是真实数据。
 *
 * 本课新增的只是课堂交互层：可编辑的 JSON 文本区、真实执行校验、字段级
 * 错误（错在哪里、为什么错、如何修改）、正反例、分层提示、作品总结。
 * 校验器本身只给“哪几项检查没过”，不点名是哪个字段；把检查名翻译成
 * 字段级错误是本课的课堂层做的，规则与校验器一致，不另立规则。
 *
 * 诚实边界（课堂上明说）：
 * - 本校验器不检查多余字段：多写的键会被忽略，不算错。
 * - 直径是可选字段：缺直径仍可通过；名称、颜色、重量缺一不可。
 * - 校验只管格式与范围，不管水果真不真实：写“苹果 / 红 / 182 / 7.6”通过，
 *   不代表这条记录真的称过。
 */

import {
  FRUIT_SCHEMA_FIELDS,
  validateFruitRecord,
  type FruitRecord,
  type ValidationCheckName,
} from './u3-local-engines'

export const L03_LESSON_ID = 'A1-U3-L03'
export const L03_LESSON_TITLE = '结构化JSON输出'
export const L03_ROUTE = '/learn/ai-python-lab-u3-l03/A1-U3-L03'

export { FRUIT_SCHEMA_FIELDS, validateFruitRecord }
export type { FruitRecord, ValidationCheckName }

export const REQUIRED_FIELDS = ['名称', '颜色', '重量'] as const
export const ALL_FIELDS = ['名称', '颜色', '重量', '直径'] as const

/** 一条字段级错误：错在哪个字段、为什么错、如何修改。 */
export type FieldError = { field: string; why: string; fix: string }

/** 校验一次编辑文本的完整结果：先过 JSON 格式，再过记录规则。 */
export type RecordValidation = {
  parseOk: boolean
  parseError: string | null
  record: FruitRecord | null
  passed: boolean
  failedChecks: ValidationCheckName[]
  fieldErrors: FieldError[]
}

const ENUM_VALUES: Record<string, string[]> = {
  名称: ['苹果', '香蕉', '橙子'],
  颜色: ['红', '黄', '绿', '橙'],
}

function jsonPreview(value: unknown): string {
  const text = JSON.stringify(value)
  return text === undefined ? '（空值）' : text
}

function typeName(value: unknown): string {
  if (value === null) return '空值'
  if (Array.isArray(value)) return '数组'
  switch (typeof value) {
    case 'string':
      return '字符串'
    case 'number':
      return '数字'
    case 'boolean':
      return '布尔值'
    case 'object':
      return '对象'
    default:
      return '未定义'
  }
}

/**
 * 把校验器的检查名翻译成字段级错误。翻译规则与校验器一一对应：
 * - 字段齐全：逐个点名缺失的必填字段。
 * - 必填非空：逐个点名 present 但为 null 或空串的必填字段。
 * - 类型正确：逐个点名类型不对的字段（名称/颜色应为字符串，重量/直径应为数字）。
 * - 枚举内：逐个点名值不在允许范围的字符串字段。
 * - 数值范围：逐个点名不大于 0 的数字字段。
 * 校验器“一个根因只算一项失败”的设计使这里不会把同一根因翻译两次。
 */
export function fieldErrorsFor(record: FruitRecord, failed: ValidationCheckName[]): FieldError[] {
  const errors: FieldError[] = []
  const present = (key: string): boolean => key in record && (record as Record<string, unknown>)[key] !== undefined
  const value = (key: string): unknown => (record as Record<string, unknown>)[key]
  if (failed.includes('字段齐全')) {
    for (const key of REQUIRED_FIELDS) {
      if (!present(key)) {
        errors.push({
          field: key,
          why: `记录里没有「${key}」这个键，而它是必填字段。`,
          fix: `加上「${key}」：${key === '重量' ? '写一个大于 0 的数字' : `从 ${ENUM_VALUES[key].join(' / ')} 里选一个`}。`,
        })
      }
    }
  }
  if (failed.includes('必填非空')) {
    for (const key of REQUIRED_FIELDS) {
      if (present(key) && (value(key) === null || value(key) === '')) {
        errors.push({
          field: key,
          why: `「${key}」写了，但值是空的（${value(key) === null ? 'null' : '空字符串'}），必填字段不能为空。`,
          fix: `给「${key}」一个真实的值${key === '重量' ? '（大于 0 的数字）' : `（${ENUM_VALUES[key].join(' / ')} 之一）`}。`,
        })
      }
    }
  }
  if (failed.includes('类型正确')) {
    const expected: Record<string, string> = { 名称: '字符串', 颜色: '字符串', 重量: '数字', 直径: '数字' }
    for (const key of ALL_FIELDS) {
      if (!present(key)) continue
      const v = value(key)
      const ok =
        (key === '名称' || key === '颜色' ? typeof v === 'string' : typeof v === 'number')
      if (!ok) {
        errors.push({
          field: key,
          why: `「${key}」应为${expected[key]}，当前是${typeName(v)} ${jsonPreview(v)}。`,
          fix: key === '重量' || key === '直径' ? `把「${key}」的引号去掉，写成数字。` : `把「${key}」写成用引号包起来的文字，例如「苹果」。`,
        })
      }
    }
  }
  if (failed.includes('枚举内')) {
    for (const key of ['名称', '颜色'] as const) {
      const v = value(key)
      if (typeof v === 'string' && v !== '' && !ENUM_VALUES[key].includes(v)) {
        errors.push({
          field: key,
          why: `「${key}」的值 ${jsonPreview(v)} 不在允许范围（${ENUM_VALUES[key].join(' / ')}）内。`,
          fix: `把「${key}」改成 ${ENUM_VALUES[key].join(' / ')} 之一。`,
        })
      }
    }
  }
  if (failed.includes('数值范围')) {
    for (const key of ['重量', '直径'] as const) {
      const v = value(key)
      if (typeof v === 'number' && !(v > 0)) {
        errors.push({
          field: key,
          why: `「${key}」必须大于 0，当前是 ${v}。`,
          fix: `把「${key}」改成一个大于 0 的数字。`,
        })
      }
    }
  }
  return errors
}

/**
 * 校验一段学生编辑的 JSON 文本。顺序：JSON 格式 → 必须是对象 → 校验器 5 项检查。
 * 非对象（数组、数字、字符串、null）直接判为格式类错误，不进校验器。
 */
export function validateRecordText(text: string): RecordValidation {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return {
      parseOk: false,
      parseError: `JSON 格式错误：${error instanceof Error ? error.message : '无法解析'}。请检查括号、引号、逗号是否成对、是否多写或少写。`,
      record: null,
      passed: false,
      failedChecks: [],
      fieldErrors: [],
    }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      parseOk: false,
      parseError: `记录必须是一个 JSON 对象（用 { } 包起来），当前是${Array.isArray(parsed) ? '数组' : parsed === null ? 'null' : typeof parsed}。`,
      record: null,
      passed: false,
      failedChecks: [],
      fieldErrors: [],
    }
  }
  const record = parsed as FruitRecord
  const result = validateFruitRecord(record)
  return {
    parseOk: true,
    parseError: null,
    record,
    passed: result.passed,
    failedChecks: result.failedChecks,
    fieldErrors: fieldErrorsFor(record, result.failedChecks),
  }
}

/* ------------------------------------------------------------------ */
/* 正反例：点按钮把例子填进编辑区，学生改它、校验它、修它               */
/* ------------------------------------------------------------------ */

export type RecordExample = { id: string; label: string; json: string }

function pretty(record: FruitRecord): string {
  return JSON.stringify(record, null, 2)
}

export const RECORD_EXAMPLES: RecordExample[] = [
  { id: 'good', label: '正确记录', json: pretty({ 名称: '苹果', 颜色: '红', 重量: 182, 直径: 7.6 }) },
  { id: 'missing-required', label: '缺必填字段（缺颜色）', json: pretty({ 名称: '苹果', 重量: 182, 直径: 7.6 }) },
  { id: 'missing-optional', label: '缺可选字段（缺直径，仍通过）', json: pretty({ 名称: '苹果', 颜色: '红', 重量: 182 }) },
  { id: 'type-error', label: '类型错误（重量写成字符串）', json: pretty({ 名称: '苹果', 颜色: '红', 重量: '182', 直径: 7.6 }) },
  { id: 'enum-error', label: '非法类别（名称写成梨）', json: pretty({ 名称: '梨', 颜色: '红', 重量: 182, 直径: 7.6 }) },
  { id: 'range-error', label: '重量异常（重量为负数）', json: pretty({ 名称: '香蕉', 颜色: '黄', 重量: -5, 直径: 3.4 }) },
]

/* ------------------------------------------------------------------ */
/* 三级提示：逐级揭示，不一次全给                                       */
/* ------------------------------------------------------------------ */

export const HINTS: { level: 1 | 2 | 3; title: string; text: string }[] = [
  { level: 1, title: '一级提示：看字段表', text: '先看字段表：哪个必填、哪种类型、哪个范围，再对照你的记录。' },
  { level: 2, title: '二级提示：按报错修', text: '报错会点名是哪个字段：按“为什么错 → 如何修改”逐条修，一次修一条再校验。' },
  { level: 3, title: '三级提示：五项全过', text: '修完点校验：五项全过才是合格；缺可选字段不算错，多余字段校验器也不管。' },
]

export const LESSON_STEPS: string[] = [
  '第一步：读字段表——4 个字段，哪个必填、哪种类型、哪个范围。',
  '第二步：改记录、点校验——看字段级报错，知道错在哪里、为什么错。',
  '第三步：修到五项全过——修完的记录就是你的作品。',
]
