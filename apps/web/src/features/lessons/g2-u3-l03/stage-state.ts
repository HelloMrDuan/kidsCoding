// 本课的舞台状态：共享壳只传一个「名字 → 数字/文字/布尔」的普通字典（StageSlotProps.stageState），
// 礼物和它走过的位置只存在于这里和本课的 StageSlot 中，共享核心不认识 giftX。
// parseStageState 是类型守卫：字典缺字段或类型不对就返回 null，舞台槽位退回到起始画面，不画出错误的位置。
//
// 字典里的值只能是数字 / 文字 / 布尔，装不下数组，所以“这一次礼物依次出现过的 x”用逗号分隔的文字 `trail` 传，
// 用 parseTrail 还原成数字数组（不是数字的片段会被丢掉，不会画出一个假的位置）。

import { L03_LEVELS, L03_PARAMS, type LevelId } from './params'

export type L03StageState = {
  giftX: number
  giftY: number
  /** 这一次运行里，礼物已经被放到新位置的次数。 */
  placed: number
  /** 这一次运行里，礼物依次出现过的 x。 */
  trail: number[]
  running: boolean
  levelId: LevelId
}

export type StageDict = Record<string, number | string | boolean>

export type StagePositions = { gift: { x: number; y: number }; trail: number[] }

/** 最多画出多少个历史位置（积木上限 × 重复上限的量级，防止异常数据撑爆界面）。 */
export const MAX_TRAIL = 60

export function startPositions(_levelId: LevelId): StagePositions {
  return { gift: { x: 0, y: L03_PARAMS.giftY }, trail: [] }
}

export function stageStateOf(positions: StagePositions, running: boolean, levelId: LevelId): StageDict {
  return {
    giftX: positions.gift.x,
    giftY: positions.gift.y,
    placed: positions.trail.length,
    trail: positions.trail.slice(0, MAX_TRAIL).join(','),
    running,
    levelId,
  }
}

export function parseTrail(raw: string): number[] {
  if (raw === '') return []
  return raw
    .split(',')
    .map(part => (part.trim() === '' ? Number.NaN : Number(part)))
    .filter(n => Number.isFinite(n))
    .slice(0, MAX_TRAIL)
}

export function parseStageState(raw: StageDict | undefined | null): L03StageState | null {
  if (!raw || typeof raw !== 'object') return null
  for (const key of ['giftX', 'giftY', 'placed'] as const) {
    if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) return null
  }
  if (typeof raw.trail !== 'string') return null
  if (typeof raw.running !== 'boolean') return null
  if (typeof raw.levelId !== 'string' || !(raw.levelId in L03_LEVELS)) return null
  return {
    giftX: raw.giftX as number,
    giftY: raw.giftY as number,
    placed: raw.placed as number,
    trail: parseTrail(raw.trail),
    running: raw.running,
    levelId: raw.levelId as LevelId,
  }
}

export function positionsOf(s: L03StageState): StagePositions {
  return { gift: { x: s.giftX, y: s.giftY }, trail: s.trail }
}
