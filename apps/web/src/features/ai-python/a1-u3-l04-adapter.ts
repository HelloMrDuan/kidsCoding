/**
 * A1-U3-L04 适配器骨架（脚手架 OPS-030 生成）。
 *
 * 插槽课不挂载命令式适配器：mount / unmount 为 no-op；run 立即以
 * finished 事件结束，不产生判定（判定由插槽经 onJudgment 上报外壳）。
 * 判定显示在插槽内与外壳反馈卡：外壳只在插槽上报后展示，不自算。
 * 草稿校验走本课 validateRecordText；非法草稿 fail-closed。
 */

import type {
  EngineAdapter,
  EngineState,
  RunEvent,
} from '../lessons/workspace/workspace-adapters'
import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { validateRecordText } from './a1-u3-l04'
import { coerceDraft } from './a1-u3-l04-draft'

/**
 * 由校验结果构造判定（TODO：按本课检查项填写 passed / failed / 结论文案）。
 * 未实现前返回 passed: false，不伪造通过。
 * 形状与共享 JudgmentResult 一致：layers 三层（stage / task / knowledge）
 * + passed + conclusion + methodEvidence。
 */
export function buildA1U3L04Judgment(
  validation: ReturnType<typeof validateRecordText>,
): JudgmentResult {
  // TODO(课程作者)：按本课检查项填写三层判定（舞台 / 任务 / 知识）与结论文案。
  return {
    layers: [
      {
        id: 'stage',
        label: '检查结果',
        passed: validation.passed,
        detail: validation.passed ? '检查结果：全部通过。' : '检查结果：未全部通过。',
      },
      {
        id: 'task',
        label: '任务判定',
        passed: validation.passed,
        detail: validation.passed ? '任务判定：合格。' : '任务判定：未合格。',
      },
      {
        id: 'knowledge',
        label: '知识证据',
        passed: validation.passed,
        detail: '知识证据：TODO。',
      },
    ],
    passed: validation.passed,
    conclusion: validation.passed ? '结论：本次合格。' : '结论：未合格。',
    methodEvidence: 'TODO：方法证据。',
  }
}

export class A1U3L04Adapter implements EngineAdapter {
  private draftText = ''

  mount(): void {
    // Intentionally empty: slot courses never mount an imperative adapter.
  }

  unmount(): void {
    // Intentionally empty: nothing was mounted.
  }

  loadScript(script: unknown): void {
    const draft = coerceDraft(script)
    this.draftText = draft.text
  }

  getScript(): unknown {
    return { text: this.draftText }
  }

  validateDraft(script: unknown): boolean {
    try {
      const draft = coerceDraft(script)
      return validateRecordText(draft.text).failed.indexOf('未实现') === -1
    } catch {
      return false
    }
  }

  getJudgmentResult(): JudgmentResult | null {
    return buildA1U3L04Judgment(validateRecordText(this.draftText))
  }

  run(onEvent: (event: RunEvent) => void): void {
    // 插槽课没有播放过程：run 立即以 finished 事件结束，不产生判定。
    onEvent({ kind: 'finished', state: this.getState() })
  }

  stop(): void {
    // Intentionally empty: 同步检查无可取消的播放。
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }
}
