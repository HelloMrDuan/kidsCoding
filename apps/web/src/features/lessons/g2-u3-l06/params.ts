// G2-U3-L06《水果接力挑战》教学参数。
//
// 状态：**提议，待首席裁定**（rulingStatus = 'proposed'）。这些数值是提议值，裁定之前不得描述为“已批准”或“已验证”，
// 也不代表儿童教学效果已验证，课程不得标 completed。
// 所有会影响教学判定的数值只能写在这个文件里；界面、判定、测试都从这里读取，不得在别处复制数字。
// 方案与理由：docs/curriculum/g2-u3-l06/TEACHING-PLAN.md。时序与几何数据来自真实 VM + 真实渲染器的实测，不是估算。
//
// 课程契约（台账 + 详细目录）：focusConcept =「随机」；组合随机落果、篮子移动、碰撞记分和结束条件；
// 验收 = 成功接到 5 颗或倒计时结束后能显示结果；错误路线 = 过期水果继续加分或比赛结束后仍能移动。

export const L06_LESSON_ID = 'G2-U3-L06'

/** proposed：提议待裁定；pilot-approved：首席批准为试点运行参数；approved：经教学效果验证后的正式参数（目前没有）。 */
export type RulingStatus = 'proposed' | 'pilot-approved' | 'approved'

export const L06_PARAMS = {
  rulingStatus: 'proposed' as RulingStatus,

  // 舞台（Scratch：x -240..240，y -180..180）
  stageMinX: -240,
  stageMaxX: 240,
  /** 水果出生点的 x 随机范围（“随机”积木的取值范围，含两端）。 */
  randomMinX: -200,
  randomMaxX: 200,
  /** 水果出生高度（回到顶部）。 */
  spawnY: 170,
  /** 地面：水果中心落到这里就算落地（舞台底 -180，水果半径 20，整个水果不出舞台）。 */
  groundY: -160,
  /**
   * 篮子位置：跟随指针左右移动，y 固定。几何沿用 L04 实测结论：篮子中心 -90（篮子占 -110～-70），
   * 水果落到地面时中心 -160、顶边 -140，低于篮子底边 -110，落地的水果不再压着篮子，
   * “碰到篮子？”在地面上恒为假，不会把落地误判成接住。
   */
  basketY: -90,

  /** 获胜需要接住的水果数（契约：成功接到 5 颗）。 */
  winTarget: 5,
  /** 每接住一颗的得分（得分变量直接等于接住的颗数）。 */
  pointsPerCatch: 1,

  // 程序限制（沙箱与编辑器共用同一组数）
  minRepeatTimes: 1,
  maxRepeatTimes: 100,
  minScoreStep: 1,
  maxScoreStep: 9,
  /** 不含“当绿旗被点击”帽子积木。 */
  maxBlocks: 12,
  /** 一直重复 > 重复执行 > 如果：嵌套深度（每层循环与如果各算一层）最多 3——接力结构本身就是三层。 */
  maxNesting: 3,
  maxScripts: 3,

  /** 单次运行最多执行的帧数。最长一局 = 倒计时 20 秒 ≈ 620 帧（实测等待积木约 31 帧/秒），加余量。 */
  frameCap: 700,
  /** 结束条件触发后再跑的收尾帧数（让当前帧的线程走完、状态稳定后再判定）。 */
  settleFrames: 5,

  /** 沙箱等 SVG 造型就绪的上限（毫秒）。超时必须明确报错，不能静默继续。 */
  skinWaitMs: 2000,

  /**
   * 沙箱随机种子：真实 VM 的 operator_random 走宿主 Math.random，沙箱把它换成带种子的 PRNG，
   * 同一程序每次运行得到同一串随机数（可复现、可判定），但一局之内每颗水果的位置都不同。
   * 这是可复现性措施，不是把随机改成写死：数值由真实 operator_random 积木在运行时求出，
   * 判定层会核对每个出生点都来自真实随机求值且互不相同。种子只影响复现，不影响教学目标。
   */
  randomSeed: 20261114,
} as const

export type LevelId = 'explore' | 'solve' | 'transferFix' | 'transferFast'

export type LevelParams = {
  id: LevelId
  layer: 1 | 2 | 3
  /** 水果每帧下落的距离。 */
  fruitSpeed: number
  /** 倒计时秒数（虚拟时钟）。 */
  timeLimitSeconds: number
  /** 获胜需要接住的颗数（契约固定为 5；迁移关只改速度或程序起点，不改这个数）。 */
  winTarget: number
}

export const L06_LEVELS: Record<LevelId, LevelParams> = {
  explore: { id: 'explore', layer: 1, fruitSpeed: 10, timeLimitSeconds: 20, winTarget: L06_PARAMS.winTarget },
  solve: { id: 'solve', layer: 2, fruitSpeed: 10, timeLimitSeconds: 20, winTarget: L06_PARAMS.winTarget },
  transferFix: { id: 'transferFix', layer: 3, fruitSpeed: 10, timeLimitSeconds: 20, winTarget: L06_PARAMS.winTarget },
  transferFast: { id: 'transferFast', layer: 3, fruitSpeed: 16, timeLimitSeconds: 20, winTarget: L06_PARAMS.winTarget },
}

export const L06_LEVEL_ORDER: LevelId[] = ['explore', 'solve', 'transferFix', 'transferFast']

/** 水果从出生高度落到地面需要的帧数（每次下落 fruitSpeed）。向下取整：宁可停得高一点，也不让水果掉出舞台。 */
export function fallFrames(level: LevelParams): number {
  return Math.floor((L06_PARAMS.spawnY - L06_PARAMS.groundY) / level.fruitSpeed)
}
