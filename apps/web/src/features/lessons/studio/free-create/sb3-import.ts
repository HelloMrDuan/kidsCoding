/**
 * 导入 .sb3 时的用户可读校验。
 *
 * `parseSb3` 会先把文件当 zip 打开；不是 zip 时 JSZip 抛的是英文底层错误
 * （"Can't find end of central directory..."），孩子看不懂。这里统一转成
 * 中文提示，同时保留 parseSb3 自己给出的中文原因（例如缺少 project.json）。
 */

import { parseSb3 } from '@/features/lessons/dance-show/evaluate-project'

const FALLBACK = '不是有效的 .sb3 作品：文件可能已损坏，或不是 Scratch 导出的文件'

export async function validateSb3Buffer(sb3: ArrayBuffer): Promise<void> {
  try {
    await parseSb3(sb3)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : ''
    if (message.includes('不是有效') || message.includes('project.json')) throw new Error(message)
    throw new Error(FALLBACK)
  }
}
