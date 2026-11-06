'use client'

/**
 * Demo slot editor (OPS-026 example slot, NOT a formal slot course).
 *
 * A three-item demo checklist. It proves the shell can mount a real React
 * editor slot for a slot-engine course: the slot owns its data, its own
 * check button, and its own check result. The result is computed here
 * from the real checkbox states and shown ONLY inside the slot — it is
 * never reported to the shell's feedback card (no onJudgment channel on
 * this branch), so the shell keeps its neutral placeholder and nothing
 * here can fabricate a shell-level pass. Editing after a check clears
 * the displayed result, mirroring the shell's edit-invalidates-judgment
 * rule: no stale pass is ever shown.
 */

import { useState } from 'react'

import { emptySlotDemoData, isValidSlotDemoData, type SlotDemoData } from './demo-slot-adapter'
import type { EditorSlotProps } from './workspace-slots'

const ITEM_LABELS = ['演示项一', '演示项二', '演示项三'] as const

export function DemoSlotEditor({ initial, onChange }: EditorSlotProps) {
  const start: SlotDemoData = isValidSlotDemoData(initial) ? initial : emptySlotDemoData()
  const [items, setItems] = useState<[boolean, boolean, boolean]>(start.items)
  const [result, setResult] = useState<{ lines: string[]; conclusion: string } | null>(null)

  const toggle = (index: number) => {
    const next: [boolean, boolean, boolean] = [...items] as [boolean, boolean, boolean]
    next[index] = !next[index]
    setItems(next)
    // Editing invalidates the displayed check result; it never stays stale.
    setResult(null)
    onChange({ version: 1, items: next })
  }

  const check = () => {
    const lines = items.map((checked, index) =>
      checked ? `${ITEM_LABELS[index]}：已勾选。` : `${ITEM_LABELS[index]}：未勾选。`,
    )
    const failed = items.filter((checked) => !checked).length
    setResult({
      lines,
      conclusion: failed === 0 ? '三项全部通过。' : `还有 ${failed} 项未通过。`,
    })
  }

  return (
    <div data-testid="ws-demo-slot-editor">
      <p>演示说明：勾选状态即检查输入；检查结果由插槽内实时计算，只显示在这里，不上报外壳反馈区。</p>
      {ITEM_LABELS.map((label, index) => (
        <label key={label} style={{ display: 'block', margin: '8px 0' }}>
          <input
            type="checkbox"
            checked={items[index]}
            onChange={() => toggle(index)}
            data-testid={`ws-demo-slot-item-${index}`}
          />{' '}
          {label}
        </label>
      ))}
      <button
        type="button"
        className="kc-action-surface kc-btn-dark"
        onClick={check}
        data-testid="ws-demo-slot-check"
      >
        检查
      </button>
      {result && (
        <div data-testid="ws-demo-slot-check-result">
          {result.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p data-testid="ws-demo-slot-conclusion">{result.conclusion}</p>
        </div>
      )}
    </div>
  )
}
