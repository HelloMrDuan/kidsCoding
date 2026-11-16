'use client'

// 舞台槽位（StageSlot）：只读壳传来的 stageState 普通字典，用 parseStageState 做类型守卫，
// 把其中的得分/时间交给 StageView 的状态条；画面本身是真实渲染画布（见 stage-view.tsx）。
// 字典不合法（缺字段 / 类型不对）时退回到本关起点数据，画布不受影响（它由沙箱独立驱动）。

import type { StageSlotProps } from '../../workspace/workspace-slots'
import { L06_LEVELS } from '../params'
import type { L06Session } from '../session'
import { parseStageState, positionsOf, startPositions } from '../stage-state'
import styles from './classroom.module.css'
import { StageView } from './stage-view'
import { useSession } from './use-session'

export function EngineStatus({ session }: { session: L06Session }) {
  const { snap } = useSession(session)
  const { engine } = snap
  return (
    // 视觉隐藏：壳的信息条已经显示“沙箱已就绪 / 未就绪：原因”；这一行留在页面里给读屏和测试用，不占舞台框的高度。
    <span className={styles.srOnly} data-testid="l6-engine-status">
      {engine.error ? `引擎未就绪：${engine.error}` : engine.ready ? 'Scratch VM 已就绪' : 'Scratch VM 准备中…'}
    </span>
  )
}

export function L06StageSlot({ session, stageState, embedEngineStatus, onStageHost }: StageSlotProps & {
  session: L06Session
  embedEngineStatus?: boolean
  onStageHost: (el: HTMLElement | null) => void
}) {
  const { snap, view } = useSession(session)
  const parsed = parseStageState(stageState)
  const levelId = parsed?.levelId ?? view.levelId
  const positions = parsed ? positionsOf(parsed) : startPositions(levelId)
  const level = L06_LEVELS[levelId]
  return (
    <>
      {embedEngineStatus && <EngineStatus session={session} />}
      <div className={styles.stageBox}>
        <StageView
          positions={positions}
          running={parsed?.running ?? snap.running}
          level={level}
          onStageHost={onStageHost}
          testId="l6-stage"
          label="舞台：水果从上面随机的位置落下来，移动篮子去接；接到 5 颗获胜，倒计时结束显示结果"
          caption={`接到 ${level.winTarget} 颗获胜；倒计时 ${level.timeLimitSeconds} 秒结束也会显示结果。移动鼠标或手指，篮子会跟着走。`}
        />
      </div>
    </>
  )
}
