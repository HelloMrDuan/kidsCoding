'use client'

/**
 * Demo summary editor (OPS-020 example adapter, NOT a formal summary course).
 *
 * A plain React textarea + sentence counter. It proves the shell can mount a
 * real React editor component through the editor slot: the shell renders it
 * (no createRoot, no imperative DOM inside any adapter). Judging, summary
 * checks, and method evidence belong to the course adapter — 4号's
 * SummaryAdapter scope — and this demo intentionally does none of them:
 * typing here never produces a pass, a check, or a conclusion.
 */

import { useState } from 'react'

import type { EditorSlotProps } from './workspace-slots'

export function DemoSummaryEditor({ initial, onChange }: EditorSlotProps) {
  const initialText =
    typeof initial === 'object' && initial !== null && typeof (initial as { text?: unknown }).text === 'string'
      ? (initial as { text: string }).text
      : ''
  const [text, setText] = useState(initialText)
  const sentences = text
    .split(/[。！？.!?]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return (
    <div data-testid="ws-demo-summary-editor">
      <label>
        我的总结
        <textarea
          data-testid="ws-summary-textarea"
          value={text}
          rows={6}
          onChange={(event) => {
            setText(event.target.value)
            onChange({ text: event.target.value })
          }}
          placeholder="用自己的话写一写今天学到了什么（演示，不作判定）"
        />
      </label>
      <p data-testid="ws-summary-count">
        已写 {sentences.length} 句，共 {text.length} 字。
      </p>
      <p>演示说明：摘要判定、要点检查与方法证据由课程适配器负责，本演示不作判定。</p>
    </div>
  )
}
