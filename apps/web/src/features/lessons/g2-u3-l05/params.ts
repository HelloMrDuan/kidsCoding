// G2-U3-L05《倒计时游戏结束》教学参数。
//
// 状态：**提议，待首席裁定**（rulingStatus = 'proposed'）。这些数值是提议值，裁定之前不得描述为“已批准”或“已验证”，
// 也不代表儿童教学效果已验证，课程不得标 completed。
// 所有会影响教学判定的数值只能写在这个文件里；判定、编译、测试都从这里读取，不得在别处复制数字。
// 方案与实测：docs/curriculum/g2-u3-l05/TEACHING-PLAN.md（探针 probe-countdown-virtual-clock.cjs）。

export const L05_LESSON_ID = 'G2-U3-L05'

export type RulingStatus = 'proposed' | 'pilot-approved' | 'approved'

export const L05_PARAMS = {
  rulingStatus: 'proposed' as RulingStatus,

  /** 虚拟时钟：每帧前进的毫秒数（30 帧/秒）。 */
  stepMs: 1000 / 30,

  // 程序限制
  minStart: 1,
  maxStart: 20,
  minRepeatTimes: 1,
  maxRepeatTimes: 20,
  minWait: 1,
  maxWait: 2,
  minDecrease: 1,
  maxDecrease: 5,
  /** 不含“当绿旗被点击”帽子积木。 */
  maxBlocks: 8,
  maxScripts: 3,

  /** 课程自带的“水果”得分脚本：每隔这么多秒，如果 timeLeft > 0 就加 1 分。 */
  scoreEverySeconds: 0.5,

  /** 学生脚本结束后再多看这么多帧，用来证明“归零后分数不再变化”（3 秒）。 */
  settleFrames: 90,

  /**
   * 单次运行最多执行的帧数（约 23 秒的虚拟时间）。标准做法（10 秒）约 310 帧。
   * 合法的程序也可能超出（例如起点 20、每次等 2 秒要 1200 多帧）：超出时明确告诉学生“运行太久，不判定”，不会静默通过或失败。
   */
  frameCap: 700,

  /** 广播的消息名。 */
  broadcastName: '游戏结束',

  /** “归零之后多少帧之内必须广播”：等 1 秒结束后线程还要多走一帧，留 2 帧余量。 */
  broadcastSlackFrames: 2,
} as const

export type LevelId = 'explore' | 'solve' | 'transferShort'

export type LevelParams = {
  id: LevelId
  layer: 1 | 2 | 3
  /** 本关要求倒计时从几秒开始。 */
  startSeconds: number
}

export const L05_LEVELS: Record<LevelId, LevelParams> = {
  explore: { id: 'explore', layer: 1, startSeconds: 10 },
  solve: { id: 'solve', layer: 2, startSeconds: 10 },
  transferShort: { id: 'transferShort', layer: 3, startSeconds: 6 },
}

export const L05_LEVEL_ORDER: LevelId[] = ['explore', 'solve', 'transferShort']
