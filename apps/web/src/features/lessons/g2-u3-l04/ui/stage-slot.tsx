'use client'

// 舞台槽位（StageSlot）：只读壳传来的 stageState 普通字典，用 parseStageState 做类型守卫后画出背景、篮子、红球、蓝球和得分。
// 字典不合法（缺字段 / 类型不对）时退回到本关起点画面，不画出错误位置。素材（背景、篮子、红球、蓝球）来自真实 VM 沙箱。

import type { StageSlotProps } from '../../workspace/workspace-slots'
import { L04_LEVELS } from '../params'
import type { L04Session } from '../session'
import { parseStageState, positionsOf, startPositions } from '../stage-state'
import styles from './classroom.module.css'
import { StageView } from './stage-view'
import { useSession } from './use-session'

export function EngineStatus({ session }: { session: L04Session }) {
  const { snap } = useSession(session)
  const { engine } = snap
  return (
    // 视觉隐藏：壳的信息条已经显示“沙箱已就绪 / 未就绪：原因”；这一行留在页面里给读屏和测试用，不占舞台框的高度。
    <span className={styles.srOnly} data-testid="l4-engine-status">
      {engine.error ? `引擎未就绪：${engine.error}` : engine.ready ? 'Scratch VM 已就绪' : 'Scratch VM 准备中…'}
    </span>
  )
}

export function L04StageSlot({ session, stageState, embedEngineStatus }: StageSlotProps & { session: L04Session; embedEngineStatus?: boolean }) {
  const { snap, view } = useSession(session)
  const parsed = parseStageState(stageState)
  const levelId = parsed?.levelId ?? view.levelId
  const positions = parsed ? positionsOf(parsed) : startPositions(levelId)
  const level = L04_LEVELS[levelId]
  return (
    <>
      {embedEngineStatus && <EngineStatus session={session} />}
      <div className={styles.stageBox}>
        <StageView
          positions={positions}
          assets={snap.engine.assets}
          testId="l4-stage"
          label="舞台：红球落在篮子上，蓝球落在地上；只有碰到篮子的球才能得分"
          caption={`要求：碰到篮子的红球加 ${level.points} 分，蓝球不加`}
        />
      </div>
    </>
  )
}
