'use client'

// 舞台槽位（StageSlot）：只读壳传来的 stageState 普通字典，用 parseStageState 做类型守卫后画出倒计时牌和得分牌。
// 字典不合法（缺字段 / 类型不对）时退回到本关起始画面，不画出错误的值。

import type { StageSlotProps } from '../../workspace/workspace-slots'
import { L05_LEVELS } from '../params'
import type { L05Session } from '../session'
import { displayOf, parseStageState, startDisplay } from '../stage-state'
import styles from './classroom.module.css'
import { StageView } from './stage-view'
import { useSession } from './use-session'

export function EngineStatus({ session }: { session: L05Session }) {
  const { snap } = useSession(session)
  const { engine } = snap
  return (
    // 视觉隐藏：壳的信息条已经显示“沙箱已就绪 / 未就绪：原因”；这一行留在页面里给读屏和测试用，不占舞台框的高度。
    <span className={styles.srOnly} data-testid="l5-engine-status">
      {engine.error ? `引擎未就绪：${engine.error}` : engine.ready ? 'Scratch VM 已就绪' : 'Scratch VM 准备中…'}
    </span>
  )
}

export function L05StageSlot({ session, stageState, embedEngineStatus }: StageSlotProps & { session: L05Session; embedEngineStatus?: boolean }) {
  const { snap, view } = useSession(session)
  const parsed = parseStageState(stageState)
  const levelId = parsed?.levelId ?? view.levelId
  const display = parsed ? displayOf(parsed) : startDisplay(levelId)
  const running = parsed ? parsed.running : snap.running
  const level = L05_LEVELS[levelId]
  return (
    <>
      {embedEngineStatus && <EngineStatus session={session} />}
      <div className={styles.stageBox}>
        <StageView
          display={display}
          running={running}
          startSeconds={level.startSeconds}
          testId="l5-stage"
          label="舞台：一个大大的倒计时牌，显示还剩几秒和现在的得分；数到 0 会广播游戏结束"
          caption={`本关从 ${level.startSeconds} 秒开始倒数`}
        />
      </div>
    </>
  )
}
