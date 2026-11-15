// 本课的舞台状态：共享壳只传一个「名字 → 数字/文字/布尔」的普通字典（StageSlotProps.stageState），
// 篮子、水果的位置和得分、时间只存在于这里和本课的 StageSlot 中，共享核心不认识 fruit。
// parseStageState 是类型守卫：字典缺字段或类型不对就返回 null，舞台槽位退回到起始画面，不画出错误的位置。
// 注意：本课的舞台画面本身是沙箱里真实 scratch-render 渲染的画布；这份字典只驱动舞台上方的状态条
// （得分 / 时间 / 接住数），不驱动画面里的角色位置——角色位置由渲染器按真实 VM 状态绘制。

import { L06_LEVELS, L06_PARAMS, type LevelId } from './params'

export type SpritePosition = { x: number; y: number; visible: boolean }

export type StagePositions = {
  basket: { x: number; y: number }
  fruit: SpritePosition
  score: number
  timeLeft: number
}

export type L06StageState = {
  positions: StagePositions
  running: boolean
  levelId: LevelId
}

export type StageDict = Record<string, number | string | boolean>

export function startPositions(levelId: LevelId): StagePositions {
  return {
    basket: { x: 0, y: L06_PARAMS.basketY },
    fruit: { x: 0, y: L06_PARAMS.spawnY, visible: true },
    score: 0,
    timeLeft: L06_LEVELS[levelId].timeLimitSeconds,
  }
}

export function stageStateOf(positions: StagePositions, running: boolean, levelId: LevelId): StageDict {
  return {
    basketX: positions.basket.x,
    basketY: positions.basket.y,
    fruitX: positions.fruit.x,
    fruitY: positions.fruit.y,
    fruitVisible: positions.fruit.visible,
    score: positions.score,
    timeLeft: positions.timeLeft,
    running,
    levelId,
  }
}

const NUMBER_KEYS = ['basketX', 'basketY', 'fruitX', 'fruitY', 'score', 'timeLeft'] as const
const BOOL_KEYS = ['fruitVisible', 'running'] as const

export function parseStageState(raw: StageDict | undefined | null): L06StageState | null {
  if (!raw || typeof raw !== 'object') return null
  for (const key of NUMBER_KEYS) {
    if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) return null
  }
  for (const key of BOOL_KEYS) {
    if (typeof raw[key] !== 'boolean') return null
  }
  if (typeof raw.levelId !== 'string' || !(raw.levelId in L06_LEVELS)) return null
  return {
    positions: {
      basket: { x: raw.basketX as number, y: raw.basketY as number },
      fruit: { x: raw.fruitX as number, y: raw.fruitY as number, visible: raw.fruitVisible as boolean },
      score: raw.score as number,
      timeLeft: raw.timeLeft as number,
    },
    running: raw.running as boolean,
    levelId: raw.levelId as LevelId,
  }
}

export function positionsOf(s: L06StageState): StagePositions {
  return s.positions
}
