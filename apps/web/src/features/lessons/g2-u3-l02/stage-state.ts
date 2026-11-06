// 本课的舞台状态：共享壳只传一个「名字 → 数字/文字/布尔」的普通字典（StageSlotProps.stageState），
// 篮子、水果这些本课对象只存在于这里和本课的 StageSlot 中，共享核心不认识 basketX/fruitX。
// parseStageState 是类型守卫：字典缺字段或类型不对就返回 null，舞台槽位退回到起始画面，不画出错误的位置。

import { L02_LEVELS, L02_PARAMS, type LevelId } from './params'

export type L02StageState = {
  basketX: number
  basketY: number
  fruitX: number
  fruitY: number
  running: boolean
  levelId: LevelId
}

export type StageDict = Record<string, number | string | boolean>

export type StagePositions = { basket: { x: number; y: number }; fruit: { x: number; y: number } }

export function startPositions(levelId: LevelId): StagePositions {
  const level = L02_LEVELS[levelId]
  return { basket: { x: L02_PARAMS.basketStartX, y: L02_PARAMS.basketY }, fruit: { x: level.fruitX, y: L02_PARAMS.fruitStartY } }
}

export function stageStateOf(positions: StagePositions, running: boolean, levelId: LevelId): StageDict {
  return {
    basketX: positions.basket.x,
    basketY: positions.basket.y,
    fruitX: positions.fruit.x,
    fruitY: positions.fruit.y,
    running,
    levelId,
  }
}

export function parseStageState(raw: StageDict | undefined | null): L02StageState | null {
  if (!raw || typeof raw !== 'object') return null
  const nums = ['basketX', 'basketY', 'fruitX', 'fruitY'] as const
  for (const key of nums) {
    if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) return null
  }
  if (typeof raw.running !== 'boolean') return null
  if (typeof raw.levelId !== 'string' || !(raw.levelId in L02_LEVELS)) return null
  return {
    basketX: raw.basketX as number,
    basketY: raw.basketY as number,
    fruitX: raw.fruitX as number,
    fruitY: raw.fruitY as number,
    running: raw.running,
    levelId: raw.levelId as LevelId,
  }
}

export function positionsOf(s: L02StageState): StagePositions {
  return { basket: { x: s.basketX, y: s.basketY }, fruit: { x: s.fruitX, y: s.fruitY } }
}
