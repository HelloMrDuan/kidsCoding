'use client'

// 舞台：本课的舞台就是沙箱 iframe 里真实 scratch-render 画的画布（水果、篮子、背景都是 VM 里的角色）。
// 这个组件只负责：把舞台框交给适配器（沙箱 iframe 会被移进来填满整框）、在上方放一条状态条
// （得分 / 时间 / 接住数，全部来自真实 VM 变量，经 stageState 字典传进来），不自己绘制任何角色，
// 也不自己算位置或分数。指针直接落在画布上，沙箱把真实指针位置转发给 VM，篮子因此跟随移动。

import { useEffect, useRef } from 'react'
import type { StagePositions } from '../stage-state'
import styles from './classroom.module.css'

export type { StagePositions }

export function StageView({ positions, running, level, testId, label, caption, onStageHost }: {
  positions: StagePositions
  running: boolean
  level: { winTarget: number; timeLimitSeconds: number }
  testId: string
  label: string
  caption?: string
  /** 舞台框挂载/卸载时把元素交给适配器（null = 已卸载）。 */
  onStageHost: (el: HTMLElement | null) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    onStageHost(hostRef.current)
    return () => onStageHost(null)
    // onStageHost 由 slots 层保证稳定（useCallback 绑定 adapter）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div>
      <div className={styles.stageHud} data-testid="l6-stage-hud">
        <span className={styles.hudChip} data-testid="l6-hud-score">得分 <strong>{positions.score}</strong> / {level.winTarget}</span>
        <span className={styles.hudChip} data-testid="l6-hud-time">时间 <strong>{Math.max(0, Math.ceil(positions.timeLeft))}</strong> 秒</span>
        <span className={styles.hudChip} data-testid="l6-hud-state">{running ? '游戏进行中：移动篮子接水果' : '点“运行作品”开始'}</span>
      </div>
      <div
        ref={hostRef}
        role="img"
        aria-label={label}
        data-testid={testId}
        data-score={positions.score}
        data-time-left={Math.round(positions.timeLeft)}
        data-fruit-x={Math.round(positions.fruit.x)}
        data-fruit-y={Math.round(positions.fruit.y)}
        data-fruit-visible={positions.fruit.visible}
        data-basket-x={Math.round(positions.basket.x)}
        className={styles.stageFrame}
      />
      {caption && <p className={styles.stageNote}>{caption}</p>}
    </div>
  )
}
