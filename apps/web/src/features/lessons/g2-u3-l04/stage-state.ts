// 本课的舞台状态：共享壳只传一个「名字 → 数字/文字/布尔」的普通字典（StageSlotProps.stageState），
// 红球、蓝球、篮子的位置和得分只存在于这里和本课的 StageSlot 中，共享核心不认识 hitBall。
// parseStageState 是类型守卫：字典缺字段或类型不对就返回 null，舞台槽位退回到起始画面，不画出错误的位置。

import { L04_LEVELS, L04_PARAMS, type LevelId } from './params'

export type BallPosition = { x: number; y: number; visible: boolean }

export type StagePositions = {
  basket: { x: number; y: number }
  hitBall: BallPosition
  groundBall: BallPosition
  score: number
}

export type L04StageState = {
  positions: StagePositions
  running: boolean
  levelId: LevelId
}

export type StageDict = Record<string, number | string | boolean>

export function startPositions(_levelId: LevelId): StagePositions {
  return {
    basket: { x: L04_PARAMS.basketX, y: L04_PARAMS.basketY },
    hitBall: { x: L04_PARAMS.hitBallX, y: L04_PARAMS.ballStartY, visible: true },
    groundBall: { x: L04_PARAMS.groundBallX, y: L04_PARAMS.ballStartY, visible: true },
    score: 0,
  }
}

export function stageStateOf(positions: StagePositions, running: boolean, levelId: LevelId): StageDict {
  return {
    basketX: positions.basket.x,
    basketY: positions.basket.y,
    hitX: positions.hitBall.x,
    hitY: positions.hitBall.y,
    hitVisible: positions.hitBall.visible,
    groundX: positions.groundBall.x,
    groundY: positions.groundBall.y,
    groundVisible: positions.groundBall.visible,
    score: positions.score,
    running,
    levelId,
  }
}

const NUMBER_KEYS = ['basketX', 'basketY', 'hitX', 'hitY', 'groundX', 'groundY', 'score'] as const
const BOOL_KEYS = ['hitVisible', 'groundVisible', 'running'] as const

export function parseStageState(raw: StageDict | undefined | null): L04StageState | null {
  if (!raw || typeof raw !== 'object') return null
  for (const key of NUMBER_KEYS) {
    if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) return null
  }
  for (const key of BOOL_KEYS) {
    if (typeof raw[key] !== 'boolean') return null
  }
  if (typeof raw.levelId !== 'string' || !(raw.levelId in L04_LEVELS)) return null
  return {
    positions: {
      basket: { x: raw.basketX as number, y: raw.basketY as number },
      hitBall: { x: raw.hitX as number, y: raw.hitY as number, visible: raw.hitVisible as boolean },
      groundBall: { x: raw.groundX as number, y: raw.groundY as number, visible: raw.groundVisible as boolean },
      score: raw.score as number,
    },
    running: raw.running as boolean,
    levelId: raw.levelId as LevelId,
  }
}

export function positionsOf(s: L04StageState): StagePositions {
  return s.positions
}
