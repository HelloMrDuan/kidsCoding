// G2-U3-L02《接住掉落水果》教学参数。
//
// 状态：首席于 2026-11-03 批准为【试点运行参数】（docs/curriculum/g2-u3-l02/TEACHING-PLAN.md 第八节）。
// 试点参数只用于试点运行，不代表儿童教学效果已经验证；未经首席再次裁定不得改动数值。
// 所有会影响教学判定的数值只能写在这个文件里；界面、判定、测试都从这里读取，不得在别处复制数字。
// g2-u3-l02.test.ts 里有一条“已批准数值”快照测试，改数值必须同时有意识地改那条测试。

export const L02_LESSON_ID = 'G2-U3-L02'

/** proposed：提议待裁定；pilot-approved：首席批准为试点运行参数；approved：经教学效果验证后的正式参数（目前没有）。 */
export type RulingStatus = 'proposed' | 'pilot-approved' | 'approved'

export const L02_PARAMS = {
  rulingStatus: 'pilot-approved' as RulingStatus,

  // 舞台坐标（Scratch：x -240..240，y -180..180）
  basketStartX: 0,
  basketY: -130,
  fruitStartY: 150,

  /** 水果与篮子 x 相差不超过该值算接住（篮子宽 80 的一半）。 */
  catchTolerance: 40,

  // 程序限制（沙箱与编辑器共用同一组数）
  maxRepeatTimes: 20,
  minRepeatTimes: 1,
  maxMoveDx: 100,
  minMoveDx: -100,
  /** 不含“当绿旗被点击”帽子积木。 */
  maxBlocks: 12,
  maxNesting: 2,
  maxScripts: 3,

  // 知识证据阈值
  /** 循环体内的 x 移动至少执行这么多次，才算“循环确实在移动篮子”。 */
  minLoopIterations: 2,
  /** 循环贡献的净位移至少占总净位移的这个比例。 */
  minLoopShare: 0.5,

  /** 单次运行最多执行的帧数，超出视为异常终止。 */
  frameCap: 150,
} as const

export type LevelId = 'explore' | 'solve' | 'transferLeft' | 'transferFast'

export type LevelParams = {
  id: LevelId
  layer: 1 | 2 | 3
  fruitX: number
  /** 水果每帧下落的距离（正数）。 */
  fallSpeed: number
}

export const L02_LEVELS: Record<LevelId, LevelParams> = {
  explore: { id: 'explore', layer: 1, fruitX: 100, fallSpeed: 10 },
  solve: { id: 'solve', layer: 2, fruitX: 150, fallSpeed: 10 },
  transferLeft: { id: 'transferLeft', layer: 3, fruitX: -100, fallSpeed: 10 },
  transferFast: { id: 'transferFast', layer: 3, fruitX: 150, fallSpeed: 30 },
}

export const L02_LEVEL_ORDER: LevelId[] = ['explore', 'solve', 'transferLeft', 'transferFast']

/** 水果脚本重复的次数：足够落到篮子高度以下，并留 2 帧余量。 */
export function fruitFallRepeats(level: LevelParams): number {
  return Math.ceil((L02_PARAMS.fruitStartY - L02_PARAMS.basketY) / level.fallSpeed) + 2
}

/** 水果落到篮子高度所需的帧数（水果 y 第一次小于等于篮子 y）。 */
export function framesToLand(level: LevelParams): number {
  return Math.ceil((L02_PARAMS.fruitStartY - L02_PARAMS.basketY) / level.fallSpeed)
}
