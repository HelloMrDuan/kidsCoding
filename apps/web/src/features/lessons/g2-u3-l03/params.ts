// G2-U3-L03《随机出现的礼物》教学参数。
//
// 状态：**pilot-approved**（首席对 #494 裁定：批准为试点运行参数）。这不是儿童教学效果验收，不得描述为“已验证”或“已掌握”，课程也不得标 completed。
// 所有会影响教学判定的数值只能写在这个文件里；界面、判定、测试都从这里读取，不得在别处复制数字。
// 方案与理由：docs/curriculum/g2-u3-l03/TEACHING-PLAN.md。

export const L03_LESSON_ID = 'G2-U3-L03'

/** proposed：提议待裁定；pilot-approved：首席批准为试点运行参数；approved：经教学效果验证后的正式参数（目前没有）。 */
export type RulingStatus = 'proposed' | 'pilot-approved' | 'approved'

export const L03_PARAMS = {
  rulingStatus: 'pilot-approved' as RulingStatus,

  // 舞台（Scratch：x -240..240）
  stageMinX: -240,
  stageMaxX: 240,
  /** 礼物所在的高度：本课礼物只横向出现，y 固定。 */
  giftY: 0,

  // 程序限制（沙箱与编辑器共用同一组数）
  /** “取随机数”的上下界允许输入的范围：比要求范围宽，让孩子能写出错误的范围并看到后果。 */
  minBound: -500,
  maxBound: 500,
  minRepeatTimes: 1,
  maxRepeatTimes: 20,
  /** 不含“当绿旗被点击”帽子积木。 */
  maxBlocks: 8,
  maxNesting: 1,
  maxScripts: 3,

  // 知识证据 / 任务结果阈值
  /** 本关要求至少取值这么多次（详案“重复 10 次”）。 */
  requiredDraws: 10,
  /** 这些次取值里至少出现这么多个不同的位置，写死一个数不算“随机出现”。 */
  minDistinctPositions: 3,
  /** 上下界宽度不小于要求范围宽度的这个比例，否则范围窄到失去随机的意义。 */
  minSpreadShare: 0.5,

  /** 单次运行最多执行的帧数，超出视为异常终止。 */
  frameCap: 150,

  /** 演示关的随机数种子：沙箱在这一次运行里换上带种子的发生器，运行结束立即恢复。见 TEACHING-PLAN 第六节。 */
  demoSeed: 7,
} as const

export type LevelId = 'explore' | 'solve' | 'transferRight' | 'transferMiddle'

export type LevelParams = {
  id: LevelId
  layer: 1 | 2 | 3
  /** 本关要求礼物出现的 x 范围（含两端）。 */
  allowedMin: number
  allowedMax: number
  /** 演示关用固定种子，其余关每次运行都真的不一样。 */
  seeded: boolean
}

export const L03_LEVELS: Record<LevelId, LevelParams> = {
  explore: { id: 'explore', layer: 1, allowedMin: -180, allowedMax: 180, seeded: true },
  solve: { id: 'solve', layer: 2, allowedMin: -180, allowedMax: 180, seeded: false },
  transferRight: { id: 'transferRight', layer: 3, allowedMin: 0, allowedMax: 180, seeded: false },
  transferMiddle: { id: 'transferMiddle', layer: 3, allowedMin: -60, allowedMax: 60, seeded: false },
}

export const L03_LEVEL_ORDER: LevelId[] = ['explore', 'solve', 'transferRight', 'transferMiddle']

/** 一关要求范围的宽度（含两端的整数个数减一）。 */
export function allowedWidth(level: LevelParams): number {
  return level.allowedMax - level.allowedMin
}

/** 判断一个 x 是否在本关要求范围内。 */
export function inAllowed(x: number, level: LevelParams): boolean {
  return x >= level.allowedMin && x <= level.allowedMax
}
