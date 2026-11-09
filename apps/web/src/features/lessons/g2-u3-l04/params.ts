// G2-U3-L04《判断碰撞得分》教学参数。
//
// 状态：**提议，待首席裁定**（rulingStatus = 'proposed'）。这些数值是提议值，裁定之前不得描述为“已批准”或“已验证”，
// 也不代表儿童教学效果已验证，课程不得标 completed。
// 所有会影响教学判定的数值只能写在这个文件里；界面、判定、测试都从这里读取，不得在别处复制数字。
// 方案与理由：docs/curriculum/g2-u3-l04/TEACHING-PLAN.md。球速与时序的数据来自真实 VM + 真实渲染器的实测，不是估算。

export const L04_LESSON_ID = 'G2-U3-L04'

/** proposed：提议待裁定；pilot-approved：首席批准为试点运行参数；approved：经教学效果验证后的正式参数（目前没有）。 */
export type RulingStatus = 'proposed' | 'pilot-approved' | 'approved'

export const L04_PARAMS = {
  rulingStatus: 'proposed' as RulingStatus,

  // 舞台（Scratch：x -240..240，y -180..180）
  stageMinX: -240,
  stageMaxX: 240,
  groundY: -180,
  /** 篮子固定不动。 */
  basketX: 0,
  basketY: -130,
  /** 两个球从这个高度同时开始落下。 */
  ballStartY: 150,
  /** 红球（会落在篮子上）和蓝球（落在篮子旁边的地上）的起点 x。 */
  hitBallX: 0,
  groundBallX: -150,
  /** 课程预置的下落脚本要走的总距离：从 y=150 落到 y=-180（舞台底）。帧数 = ceil(fallDistance / 球速)。 */
  fallDistance: 330,

  // 程序限制（沙箱与编辑器共用同一组数）
  minRepeatTimes: 1,
  maxRepeatTimes: 100,
  minScoreStep: 1,
  maxScoreStep: 9,
  /** 不含“当绿旗被点击”帽子积木。 */
  maxBlocks: 8,
  /** 重复 > 如果 > 叶子：嵌套深度（重复与如果各算一层）最多 2。 */
  maxNesting: 2,
  maxScripts: 3,

  /** 单次运行最多执行的帧数，超出视为异常终止。有效程序最长约 100 帧。 */
  frameCap: 150,

  /** 沙箱等 SVG 造型就绪的上限（毫秒）。实测约 14ms；超时必须明确报错，不能静默继续。 */
  skinWaitMs: 2000,
} as const

export type LevelId = 'explore' | 'solve' | 'transferPoints' | 'transferFast'

export type LevelParams = {
  id: LevelId
  layer: 1 | 2 | 3
  /** 球每帧下落的距离。 */
  ballSpeed: number
  /** 本关“接到一个球”应得的分数。 */
  points: number
}

export const L04_LEVELS: Record<LevelId, LevelParams> = {
  explore: { id: 'explore', layer: 1, ballSpeed: 10, points: 1 },
  solve: { id: 'solve', layer: 2, ballSpeed: 10, points: 1 },
  transferPoints: { id: 'transferPoints', layer: 3, ballSpeed: 10, points: 2 },
  transferFast: { id: 'transferFast', layer: 3, ballSpeed: 20, points: 1 },
}

export const L04_LEVEL_ORDER: LevelId[] = ['explore', 'solve', 'transferPoints', 'transferFast']

/** 课程预置的下落脚本要重复的次数（每次下落 ballSpeed）。 */
export function fallFrames(level: LevelParams): number {
  return Math.ceil(L04_PARAMS.fallDistance / level.ballSpeed)
}
