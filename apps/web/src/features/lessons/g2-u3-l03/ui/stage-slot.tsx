'use client'

// 舞台槽位（StageSlot）：只读壳传来的 stageState 普通字典，用 parseStageState 做类型守卫后画出背景、礼物和这一次的出现位置。
// 字典不合法（缺字段 / 类型不对）时退回到本关起点画面，不画出错误位置。素材（背景、礼物）来自真实 VM 沙箱。

import type { StageSlotProps } from '../../workspace/workspace-slots'
import { levelSituation } from '../contract'
import { L03_LEVELS } from '../params'
import type { L03Session } from '../session'
import { parseStageState, positionsOf, startPositions } from '../stage-state'
import styles from './classroom.module.css'
import { StageView } from './stage-view'
import { useSession } from './use-session'

export function EngineStatus({ session }: { session: L03Session }) {
  const { snap } = useSession(session)
  const { engine } = snap
  return (
    <span className={styles.muted} data-testid="l3-engine-status">
      {engine.error ? `引擎未就绪：${engine.error}` : engine.ready ? 'Scratch VM 已就绪' : 'Scratch VM 准备中…'}
    </span>
  )
}

export function L03StageSlot({ session, stageState, embedEngineStatus }: StageSlotProps & { session: L03Session; embedEngineStatus?: boolean }) {
  const { snap, view } = useSession(session)
  const parsed = parseStageState(stageState)
  const levelId = parsed?.levelId ?? view.levelId
  const positions = parsed ? positionsOf(parsed) : startPositions(levelId)
  return (
    <>
      {embedEngineStatus && <EngineStatus session={session} />}
      <div className={styles.stageBox}>
        <StageView positions={positions} assets={snap.engine.assets} testId="l3-stage" level={L03_LEVELS[levelId]} label="舞台：礼物每次出现在不同的位置，绿色底纹是本关要求的范围" />
      </div>
      <p className={styles.stageNote} data-testid="l3-situation">{levelSituation(L03_LEVELS[levelId])}</p>
    </>
  )
}
