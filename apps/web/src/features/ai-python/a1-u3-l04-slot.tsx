/**
 * A1-U3-L04 编辑器插槽骨架（脚手架 OPS-030 生成）。
 *
 * 插槽拥有编辑面与数据；判定由插槽算出后经 onJudgment 上报外壳，
 * 外壳反馈卡只展示上报的判定，不自算、不伪造。
 * 编辑后上报 null 使旧判定失效（外壳显示“旧判定已失效”）。
 */

import { useState } from 'react'

import type {
  EditorSlotProps,
  JudgmentResult,
} from '../lessons/workspace/workspace-slots'
import { buildA1U3L04Judgment } from './a1-u3-l04-adapter'
import { validateRecordText } from './a1-u3-l04'

export type A1U3L04SlotProps = EditorSlotProps & {
  /**
   * 判定上报通道（外壳 onJudgment，#490 OPS-025）。
   * 编辑后上报 null 使旧判定失效；校验后上报本次判定。
   * 外壳尚未接 onJudgment 时该回调恒为 undefined，插槽照常显示自有结果。
   */
  onJudgment?: (judgment: JudgmentResult | null) => void
}

export function A1U3L04EditorSlot({
  initial,
  onChange,
  editable,
  onJudgment,
}: A1U3L04SlotProps) {
  const [text, setText] = useState(() => {
    const draft = initial as { text?: unknown } | null
    return typeof draft?.text === 'string' ? draft.text : ''
  })
  const [result, setResult] = useState<ReturnType<
    typeof validateRecordText
  > | null>(null)

  function handleEdit(next: string) {
    setText(next)
    setResult(null)
    // 编辑后旧判定失效：上报 null，外壳清除已显示的判定。
    onJudgment?.(null)
    onChange?.({ text: next })
  }

  function handleCheck() {
    const validation = validateRecordText(text)
    setResult(validation)
    onJudgment?.(buildA1U3L04Judgment(validation))
  }

  return (
    <div data-testid="ws-a1-u3-l04-editor">
      <label htmlFor="ws-a1-u3-l04-input">编辑区（TODO：按本课数据模型替换为真实编辑器）</label>
      <textarea
        id="ws-a1-u3-l04-input"
        data-testid="ws-a1-u3-l04-input"
        value={text}
        disabled={!editable}
        onChange={(event) => handleEdit(event.target.value)}
      />
      <button
        type="button"
        data-testid="ws-a1-u3-l04-check"
        onClick={handleCheck}
      >
        检查
      </button>
      {result !== null && (
        <p data-testid="ws-a1-u3-l04-check-result">
          {result.passed ? '全部通过。' : `还有 ${result.failed.length} 项未通过。`}
        </p>
      )}
    </div>
  )
}
