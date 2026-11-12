// 本课的舞台状态：共享壳只传一个「名字 → 数字/文字/布尔」的普通字典（StageSlotProps.stageState），
// 倒计时的 timeLeft、得分 score、是否已广播“游戏结束”只存在于这里和本课的 StageSlot 中，共享核心不认识 timeLeft。
// parseStageState 是类型守卫：字典缺字段或类型不对就返回 null，舞台槽位退回到起始画面，不画出错误的值。
//
// 起始画面里的 timeLeft 是本关要求的起点秒数（课程参数，不是运行结果）；运行开始后，
// 舞台上的每一个数字都来自真实 VM 每一帧回报的变量值，页面不在本地推算倒计时。

import { L05_LEVELS, type LevelId } from './params'

export type StageDisplay = {
  timeLeft: number
  score: number
  /** “游戏结束”是否已经广播过。 */
  over: boolean
}

export type L05StageState = {
  display: StageDisplay
  running: boolean
  levelId: LevelId
}

export type StageDict = Record<string, number | string | boolean>

export function startDisplay(levelId: LevelId): StageDisplay {
  return { timeLeft: L05_LEVELS[levelId].startSeconds, score: 0, over: false }
}

export function stageStateOf(display: StageDisplay, running: boolean, levelId: LevelId): StageDict {
  return {
    timeLeft: display.timeLeft,
    score: display.score,
    over: display.over,
    running,
    levelId,
  }
}

const NUMBER_KEYS = ['timeLeft', 'score'] as const
const BOOL_KEYS = ['over', 'running'] as const

export function parseStageState(raw: StageDict | undefined | null): L05StageState | null {
  if (!raw || typeof raw !== 'object') return null
  for (const key of NUMBER_KEYS) {
    if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) return null
  }
  for (const key of BOOL_KEYS) {
    if (typeof raw[key] !== 'boolean') return null
  }
  if (typeof raw.levelId !== 'string' || !(raw.levelId in L05_LEVELS)) return null
  return {
    display: {
      timeLeft: raw.timeLeft as number,
      score: raw.score as number,
      over: raw.over as boolean,
    },
    running: raw.running as boolean,
    levelId: raw.levelId as LevelId,
  }
}

export function displayOf(s: L05StageState): StageDisplay {
  return s.display
}
