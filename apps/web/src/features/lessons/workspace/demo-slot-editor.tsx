'use client'

/**
 * Demo slot editor (OPS-026 example slot, NOT a formal slot course).
 *
 * A three-item demo checklist. It proves the shell can mount a real React
 * editor slot for a slot-engine course: the slot owns its data, its own
 * check button, and its own check result. The result is computed here
 * from the real checkbox states, shown inside the slot, AND reported to
 * the shell's feedback card through the OPS-025 onJudgment channel
 * (premerge of #490 into #491): the shell displays the reported
 * judgment verbatim and never recomputes a score, so nothing here can
 * fabricate a shell-level pass. Editing after a check clears the
 * displayed result and reports null, mirroring the shell's
 * edit-invalidates-judgment rule: no stale pass is ever shown.
 */

import { useState } from 'react'

import { emptySlotDemoData, isValidSlotDemoData, type SlotDemoData } from './demo-slot-adapter'
import type { EditorSlotProps, JudgmentResult } from './workspace-slots'

const ITEM_LABELS = ['演示项一', '演示项二', '演示项三'] as const

export function DemoSlotEditor({ initial, onChange, onJudgment }: EditorSlotProps) {
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
    // OPS-025: explicitly report the invalidation, so the shell clears a
    // previously reported judgment even if its onChange path ever changes.
    // (Today the shell already invalidates on onChange; the null report is
    // a no-op there — handleSlotJudgment only shows the stale notice when
    // a judgment is currently shown.)
    onJudgment?.(null)
  }

  const check = () => {
    const lines = items.map((checked, index) =>
      checked ? `${ITEM_LABELS[index]}：已勾选。` : `${ITEM_LABELS[index]}：未勾选。`,
    )
    const failed = items.filter((checked) => !checked).length
    const conclusion = failed === 0 ? '三项全部通过。' : `还有 ${failed} 项未通过。`
    setResult({ lines, conclusion })
    // OPS-025: report the same real result to the shell. A single task
    // layer — the demo check is a checklist, so no stage/knowledge layer
    // is invented for it (same single-layer precedent as SlotProbeRun).
    const judgment: JudgmentResult = {
      layers: [
        {
          id: 'task',
          label: '任务判定',
          passed: failed === 0,
          detail:
            failed === 0 ? '任务判定：三项全部通过。' : `任务判定：还有 ${failed} 项未通过。`,
        },
      ],
      passed: failed === 0,
      conclusion,
    }
    onJudgment?.(judgment)
  }

  return (
    <div data-testid="ws-demo-slot-editor">
      <p>演示说明：勾选状态即检查输入；检查结果由插槽内实时计算，同时经 onJudgment 上报外壳反馈区。</p>
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
