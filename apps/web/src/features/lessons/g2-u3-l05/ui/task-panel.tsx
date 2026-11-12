'use client'

// 任务内容：说明、运行前预测、三级提示、通过之后的反思与别的做法。内容全部来自本课 contract / reference。

import { useState } from 'react'
import { L05_ACTIVITY_NOTE } from '../contract'
import { alternatives, describeProgram } from '../reference'
import type { L05Session } from '../session'
import { demoOutcome } from '../state'
import styles from './classroom.module.css'
import { useSession } from './use-session'

export function TaskPanel({ session }: { session: L05Session }) {
  const { snap, view } = useSession(session)
  const { content, levelId, judgment, passed, program, predictionTime, predictionAfter } = view
  const hintCount = snap.hints[levelId]
  const alts = passed && levelId !== 'explore' ? alternatives(view.level) : []
  return (
    <div data-testid="l5-task-content">
      <h2>{content.title}</h2>
      <p>{content.task}</p>
      <p><strong>现在要做：</strong>{content.step}</p>

      {content.prediction && (
        <section aria-label="运行前的预测" data-testid="l5-prediction">
          <h3>{content.prediction.question}</h3>
          <div className={styles.field}>
            <label htmlFor="l5-pred-time">{content.prediction.numberLabel}</label>
            <input id="l5-pred-time" type="number" inputMode="numeric" value={predictionTime} data-testid="l5-pred-time"
              onChange={e => session.setPrediction({ time: e.target.value.slice(0, 4) })} />
          </div>
          <div className={styles.field} role="radiogroup" aria-label={content.prediction.choiceLabel}>
            <span>{content.prediction.choiceLabel}</span>
            <div className={styles.choices}>
              {content.prediction.choices.map(choice => (
                <label key={choice}>
                  <input type="radio" name="l5-pred-after" checked={predictionAfter === choice}
                    data-testid={`l5-pred-after-${choice === '会' ? 'yes' : 'no'}`}
                    onChange={() => session.setPrediction({ after: choice })} />
                  {choice}
                </label>
              ))}
            </div>
          </div>
          {judgment?.status === 'judged' && levelId === 'explore' && snap.trace && (() => {
            const o = demoOutcome(snap.trace)
            return (
              <p data-testid="l5-pred-compare" className={styles.hint}>
                你预测 timeLeft 最后是 {predictionTime || '？'}，这一次真实运行是 {o.finalTime}；
                你预测广播之后得分{predictionAfter === '会' ? '会' : predictionAfter === '不会' ? '不会' : '？'}变，
                真实运行里广播之后得分{o.scoreChangedAfterBroadcast ? '还在变' : '没有再变'}（最后得分 {o.finalScore}）。
              </p>
            )
          })()}
        </section>
      )}

      <section aria-label="三级提示">
        <h3>需要提示吗？（一步一步来）</h3>
        {content.hints.slice(0, hintCount).map((h, i) => (
          <p key={i} className={styles.hint} data-testid={`l5-hint-${i + 1}`}><strong>提示 {i + 1}：</strong>{h}</p>
        ))}
        {hintCount < 3 && (
          <button type="button" className={styles.btn} data-testid="l5-next-hint" onClick={() => session.revealHint()}>
            看提示 {hintCount + 1}
          </button>
        )}
      </section>

      {passed && (
        <section aria-label="想一想" data-testid="l5-after">
          <h3>想一想</h3>
          <ul>{content.reflection.map(r => <li key={r}>{r}</li>)}</ul>
          {levelId !== 'explore' && (
            <>
              <h3>你的做法</h3>
              <pre className={styles.pre} data-testid="l5-own-solution">{describeProgram(program)}</pre>
              {alts.length > 0 && (
                <>
                  <h3>别的做法也可以</h3>
                  <ul data-testid="l5-alternatives">
                    {alts.map(a => <li key={a.title}>{a.title}</li>)}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      )}
      {levelId !== 'explore' && (
        <button type="button" className={styles.btn} data-testid="l5-reset-level" onClick={() => session.resetLevel()}>重新开始本关</button>
      )}
      <p className={styles.muted} data-testid="l5-scope-note">{L05_ACTIVITY_NOTE}</p>
    </div>
  )
}

/**
 * 手机上的任务栏：默认只占一行（“现在要做…” + 一个展开按钮），任务说明、预测输入、三级提示、事后反思都在展开后；
 * 这样默认首屏能看见可操作的积木编辑区。桌面和平板不折叠（CSS 控制，不靠 JS 判断视口，避免水合闪烁）。
 * 任务、提示和操作控件一个都不丢：展开后就是完整的 TaskPanel。
 */
export function CollapsibleTaskPanel({ session }: { session: L05Session }) {
  const { view } = useSession(session)
  const [open, setOpen] = useState(false)
  const needPrediction = view.levelId === 'explore' && !view.predictionReady
  const barText = needPrediction ? '先写下你的预测，再运行' : view.content.step
  return (
    <div className={styles.taskFold} data-open={open} data-testid="l5-task-fold">
      <div className={styles.taskBar} data-testid="l5-task-bar">
        <span className={styles.taskBarText} data-testid="l5-task-bar-text" data-needs-prediction={needPrediction} title={barText}>
          <strong>现在要做：</strong>{barText}
        </span>
        <button type="button" className={styles.btn} aria-expanded={open} aria-controls="l5-task-fold-body" data-testid="l5-task-toggle"
          onClick={() => setOpen(o => !o)}>
          {open ? '收起' : needPrediction ? '写预测' : '任务与提示'}
        </button>
      </div>
      <div className={styles.taskFoldBody} id="l5-task-fold-body" data-testid="l5-task-fold-body">
        <TaskPanel session={session} />
      </div>
    </div>
  )
}
