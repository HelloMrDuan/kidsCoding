'use client'

// 运行结果：三层结果和结论都读自适配器的 getJudgmentResult()（共享 JudgmentResult 形状），
// 不在这里计算、不改写措辞。未判定（被停止、没落地）显示课程给的原因。

import { exploreDone, nextLevel } from '../state'
import type { LessonL02Adapter } from '../lesson-adapter'
import styles from './classroom.module.css'
import { useSession } from './use-session'

export function FeedbackPanel({ adapter, className }: { adapter: LessonL02Adapter; className?: string }) {
  const session = adapter.session
  const { snap, view } = useSession(session)
  const result = adapter.getJudgmentResult()
  const { levelId, passed, judgment } = view
  const next = levelId === 'explore' ? (exploreDone(snap.state) ? 'solve' : null) : passed ? nextLevel(levelId) : null
  return (
    <section className={className} data-testid="l2-feedback" aria-live="polite" aria-label="运行结果">
      <h2>运行结果</h2>
      {snap.notice && <p className={styles.error} data-testid="l2-run-notice">{snap.notice}</p>}
      {!snap.trace || !judgment ? (
        <p className={styles.muted} data-testid="l2-feedback-empty">
          {snap.running ? '正在运行…' : '还没有这一次的结果。点“运行作品”，舞台结果、任务结果、知识证据会一起出现。改了脚本，旧结果会马上清掉。'}
        </p>
      ) : judgment.status === 'not-judged' || !result ? (
        <p className={styles.muted} data-testid="l2-not-judged">{judgment.status === 'not-judged' ? judgment.reason : ''}</p>
      ) : (
        <div className={styles.feedback}>
          {result.layers.map(layer => (
            <div key={layer.id} className={styles.layerRow} data-testid={`l2-layer-${layer.id}`} data-passed={layer.passed}>
              {layer.label}：{layer.detail}
            </div>
          ))}
          <div className={styles.conclusion} data-testid="l2-conclusion" data-passed={result.passed}>{result.conclusion}</div>
          <div className={styles.layerRow} data-testid="l2-understanding">{result.methodEvidence}</div>
          {next && (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} data-testid="l2-next-level" onClick={() => session.switchLevel(next)}>下一关</button>
          )}
        </div>
      )}
    </section>
  )
}
