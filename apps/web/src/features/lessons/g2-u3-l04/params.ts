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
  /**
   * 篮子固定不动。位置的几何约束（实测得出，见 TEACHING-PLAN）：球要“穿过”篮子再落到地上，并且最终整个球都在舞台里、不再压着篮子。
   * 球直径 40，舞台底 -180，所以球最终球心 ≥ -160（两个速度下最终球心都是 -160，球占 -180～-140）；
   * 要让球最终不与篮子重叠，篮子底边必须高于球顶边 -140。取篮子中心 -90（篮子 -110～-70，底边 -110）。
   * 如果把篮子放到 -130（底边 -150），球停在篮子里，落地后每一次检查都是真的，“连加”的分数就取决于循环剩余的迭代次数（实测重复 40 次得 16），不是一个稳定的数。
   */
  basketX: 0,
  basketY: -90,
  /** 两个球从这个高度同时开始落下。 */
  ballStartY: 150,
  /** 红球（会落在篮子上）和蓝球（落在篮子旁边的地上）的起点 x。 */
  hitBallX: 0,
  groundBallX: -150,
  /**
   * 课程预置的下落脚本最多走的距离，帧数 = floor(fallDistance / 球速)：球从 y=150 落下，停在地面条之内（地面条在 y -150～-180），
   * 整个球都看得见（球心最终在 -160 或 -150，球半径 20，不会有一半落到舞台外面）。
   */
  fallDistance: 310,

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

export type LevelId = 'explore' | 'solve' | 'transferPoints' | 'transferSlow'

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
  transferSlow: { id: 'transferSlow', layer: 3, ballSpeed: 5, points: 1 },
}

export const L04_LEVEL_ORDER: LevelId[] = ['explore', 'solve', 'transferPoints', 'transferSlow']

/** 课程预置的下落脚本要重复的次数（每次下落 ballSpeed）。向下取整：宁可停得高一点，也不让球掉出舞台。 */
export function fallFrames(level: LevelParams): number {
  return Math.floor(L04_PARAMS.fallDistance / level.ballSpeed)
}
