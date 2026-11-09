/**
 * A1-U3-L04 课程数据骨架（脚手架 OPS-030 生成，课程作者填写 TODO）。
 *
 * 本文件只放本课独有的数据模型与校验入口，不放通用判定。
 * 判定规则、字段表、文案一律由课程作者按本课教研填写，脚手架不硬编码。
 * 校验未实现前，validateRecordText 返回“未实现”——不伪造通过。
 */

export const L04_LESSON_ID = 'A1-U3-L04'
export const L04_TITLE = '检索可信资料'

/** 本课数据字段表（TODO：按本课教研填写字段名、类型、必填与范围）。 */
export const L04_FIELDS = [
  // 例：{ name: 'name', label: '名称', type: 'string', required: true },
]

export type L04Record = Record<string, unknown>

export type L04Validation = {
  /** 是否通过全部检查。 */
  passed: boolean
  /** 未通过的检查名（空数组表示全过）。 */
  failed: string[]
  /** 字段级报错（字段名 -> 原因），供插槽展示。 */
  errors: Record<string, string>
}

/**
 * 校验一条记录（TODO：按本课字段表实现真实校验）。
 * 未实现前返回 failed: ['未实现']，不伪造通过。
 */
export function validateRecordText(text: string): L04Validation {
  // TODO(课程作者)：按 L04_FIELDS 实现真实校验（字段齐全、类型、范围）。
  void text
  return { passed: false, failed: ['未实现'], errors: {} }
}

/** 本课方法步骤（TODO：按本课教研填写，与契约 methodSteps 一致）。 */
export const LESSON_STEPS = [
  // TODO(课程作者)：填写本课方法步骤（至少 1 条）。
  '第一步：TODO。',
  '第二步：TODO。',
  '第三步：TODO。',
]

/** 本课三级提示（TODO：按本课教研填写，与契约 hints 一致）。 */
export const HINTS = [
  // TODO(课程作者)：填写三级提示（恰好 3 条，level 1/2/3 各一）。
  { level: 1 as const, title: '一级提示：方向', text: 'TODO。' },
  { level: 2 as const, title: '二级提示：方法', text: 'TODO。' },
  { level: 3 as const, title: '三级提示：对照', text: 'TODO。' },
]
