/**
 * A1-U3-L05 引用与幻觉核对：学生当“核对员”，核对 AI 助手给出的带引用回答。
 *
 * 全部资料是本地课堂示例资料：资料册 5 张卡、待核对的 AI 回答 8 项，
 * 全部虚构但自洽；页面与文案明确写“课堂示例资料，不是真实联网搜索
 * 结果”，绝不冒充实时互联网搜索、真实数据或真实来源。
 *
 * 本课新增的只是课堂交互层：先猜 verdict 再核对、逐字对照资料卡、
 * 指出编造数字与编造来源、证据不足时拒绝下结论、迁移新资料验证。
 * 判定只认行为（verdict 选对），不按操作顺序匹配，不虚构运行结果。
 *
 * 诚实边界（课堂上明说）：
 * - 资料册是课堂示例：卡上的数字、日期、名称全是编的，只用来练核对，
 *   不能当真去查、去引用。
 * - 八项核对是练习记录：看过答案再选、重复做旧题，不作最终成绩；
 *   最终核验须用新资料新回答（迁移项）。
 * - 方法证据只记计数（选了几项、选对几项、各类型选对几项、迁移完成
 *   几项），不记 AI 回答原文、学生身份。
 * - 前置 A1-U3-L04《检索可信资料》教找可信资料；本课用本课资料册核对
 *   AI 的回答，方法从规则卡从零教起，不依赖 L04 的任何文件。
 */

export const L05_LESSON_ID = 'A1-U3-L05'
export const L05_LESSON_TITLE = '引用与幻觉核对'
export const L05_ROUTE = '/learn/ai-python-lab-u3-l05/A1-U3-L05'

/** 四种 verdict（每项预设选项，不用自由文本）。 */
export type Verdict = '可信' | '编造数字' | '编造来源' | '证据不足'

export const VERDICTS: Verdict[] = ['可信', '编造数字', '编造来源', '证据不足']

/** 待核对项编号：E1/E2 探索预测，P1–P4 独立练习，T1/T2 迁移应用。 */
export const CHECK_ITEM_IDS = ['E1', 'E2', 'P1', 'P2', 'P3', 'P4', 'T1', 'T2'] as const

export type CheckItemId = (typeof CHECK_ITEM_IDS)[number]

/** 资料册卡片：标题 / 出处 / 正文（正文 2 句可核对事实）。 */
export type SourceCard = {
  id: 'A' | 'B' | 'C' | 'D' | 'E'
  title: string
  source: string
  text: string
}

export const SOURCE_CARDS: SourceCard[] = [
  {
    id: 'A',
    title: '森林图书馆借阅单（示例）',
    source: '森林图书馆前台借阅单，第 2 页',
    text: '本周三，小狐狸借走了 3 本图画书。归还日期是周五。',
  },
  {
    id: 'B',
    title: '森林气象站记录（示例）',
    source: '气象站记录本，第 5 页',
    text: '周四下午下了 2 小时雨，雨量 12 毫米。周五全天晴。',
  },
  {
    id: 'C',
    title: '学校作息表（示例）',
    source: '学校门口公告栏',
    text: '上午第一节课 8 点开始，每节课 40 分钟。午饭 11 点半。',
  },
  {
    id: 'D',
    title: '动物图鉴·刺猬（示例）',
    source: '图鉴第 8 页',
    text: '刺猬是夜行动物，白天大多在睡觉。遇到危险会缩成一团。',
  },
  {
    id: 'E',
    title: '植物园记录（示例）',
    source: '植物园门口记录板',
    text: '周六植物园来了 20 名小学生。他们一共种了 5 棵小树。',
  },
]

/** 待核对的 AI 回答：一项一引用一结论，verdict 四选一。 */
export type CheckItem = {
  id: CheckItemId
  level: 1 | 2 | 3
  quote: string
  sourceLabel: string
  sourceCardId: SourceCard['id'] | null
  correct: Verdict
  /** 正确 verdict 的依据（只讲本项事实，不提别的项）。 */
  reason: string
}

export const CHECK_ITEMS: CheckItem[] = [
  {
    id: 'E1',
    level: 1,
    quote: '根据借阅单，小狐狸借了 3 本书，周五归还。',
    sourceLabel: '资料 A',
    sourceCardId: 'A',
    correct: '可信',
    reason: 'A 卡写的是借 3 本书、周五归还，AI 说的一样。',
  },
  {
    id: 'E2',
    level: 1,
    quote: '根据气象站记录，周四下了 5 小时雨。',
    sourceLabel: '资料 B',
    sourceCardId: 'B',
    correct: '编造数字',
    reason: 'B 卡写的是 2 小时，AI 写的 5 小时对不上。',
  },
  {
    id: 'P1',
    level: 2,
    quote: '根据《森林日报》报道，小狐狸借了 10 本书。',
    sourceLabel: '《森林日报》',
    sourceCardId: null,
    correct: '编造来源',
    reason: '《森林日报》不在资料册里，来源是编造的。',
  },
  {
    id: 'P2',
    level: 2,
    quote: '根据作息表，第一节课 8 点开始，所以小狐狸 7 点就到了学校。',
    sourceLabel: '资料 C',
    sourceCardId: 'C',
    correct: '证据不足',
    reason: 'C 卡只写了 8 点上课，没写小狐狸 7 点到。',
  },
  {
    id: 'P3',
    level: 2,
    quote: '根据作息表，每节课 90 分钟。',
    sourceLabel: '资料 C',
    sourceCardId: 'C',
    correct: '编造数字',
    reason: 'C 卡写的是 40 分钟，AI 写的 90 分钟对不上。',
  },
  {
    id: 'P4',
    level: 2,
    quote: '小狐狸最喜欢吃葡萄。',
    sourceLabel: '（无引用）',
    sourceCardId: null,
    correct: '证据不足',
    reason: '这句话没有引用，资料册里也没写小狐狸爱吃什么，没法核对。',
  },
  {
    id: 'T1',
    level: 3,
    quote: '根据植物园记录，周六有 20 名小学生种了 5 棵树，所以植物园一共有 25 棵树。',
    sourceLabel: '资料 E',
    sourceCardId: 'E',
    correct: '证据不足',
    reason: 'E 卡只写了来了 20 名学生、种了 5 棵树，没写植物园一共有多少棵树；20 加 5 得不出总数。',
  },
  {
    id: 'T2',
    level: 3,
    quote: '根据植物园记录，周六植物园来了 20 名小学生，种了 5 棵小树。',
    sourceLabel: '资料 E',
    sourceCardId: 'E',
    correct: '可信',
    reason: 'E 卡写的就是 20 名小学生、5 棵小树，AI 说的一样。',
  },
]

/**
 * L05 草稿形状（字段定义见 a1-u3-l05-draft.ts 的实现；类型放这里，
 * 与 L06 的做法一致：草稿模块 import 类型，本模块不 import 草稿模块，
 * 避免值层循环引用）。
 */
export type L05Draft = {
  version: 1
  lessonId: 'A1-U3-L05'
  verdicts: Record<CheckItemId, Verdict | null>
}

/** 一项的核对结果：学生选的 verdict 与预设正确 verdict 是否一致。 */
export type CheckVerdictResult = {
  id: CheckItemId
  level: 1 | 2 | 3
  quote: string
  sourceLabel: string
  picked: Verdict | null
  correct: Verdict
  passed: boolean
  detail: string
}

/** 八项一次核对的完整结果。 */
export type CheckResult = {
  checks: CheckVerdictResult[]
  pickedCount: number
  passedCount: number
  totalChecks: number
  passed: boolean
  unpickedIds: CheckItemId[]
}

/**
 * 核对八项：逐条对照预设正确 verdict，选对才算通过。
 * 未选、选错，一律未通过（fail-closed）。
 */
export function checkVerdicts(draft: L05Draft): CheckResult {
  const checks: CheckVerdictResult[] = CHECK_ITEMS.map((item) => {
    const picked = draft.verdicts[item.id] ?? null
    const passed = picked !== null && picked === item.correct
    let detail: string
    if (picked === null) {
      detail = '尚未选择：先选一个判断，再点“检查”。'
    } else if (passed) {
      detail = `判断正确：${item.correct}。${item.reason}`
    } else {
      detail = `不对：${item.reason}你选的是“${picked}”。`
    }
    return {
      id: item.id,
      level: item.level,
      quote: item.quote,
      sourceLabel: item.sourceLabel,
      picked,
      correct: item.correct,
      passed,
      detail,
    }
  })
  const pickedCount = checks.filter((check) => check.picked !== null).length
  const passedCount = checks.filter((check) => check.passed).length
  return {
    checks,
    pickedCount,
    passedCount,
    totalChecks: CHECK_ITEMS.length,
    passed: passedCount === CHECK_ITEMS.length,
    unpickedIds: checks.filter((check) => check.picked === null).map((check) => check.id),
  }
}

/* ------------------------------------------------------------------ */
/* 三级提示：逐级揭示，不一次全给                                       */
/* ------------------------------------------------------------------ */

export const HINTS: { level: 1 | 2 | 3; title: string; text: string }[] = [
  {
    level: 1,
    title: '一级提示：方法',
    text: '核对三步：先找到 AI 引用的资料卡，再逐字对数字，最后问一句：结论在资料里写着吗？',
  },
  {
    level: 2,
    title: '二级提示：类型',
    text: '没有引用的回答没法核对；数字对不上就是编造；结论超出资料范围时，选‘证据不足’。',
  },
  {
    level: 3,
    title: '三级提示：实例',
    text: '逐项点出来：E2 的‘5 小时’对不上 B 卡的‘2 小时’；P1 的《森林日报》不在资料册里。',
  },
]

/** 规则卡：核对四步（与契约 methodSteps 一致）。 */
export const LESSON_STEPS: string[] = [
  '第一步：找到引用：AI 说的每句话，先找到它引用的资料卡。',
  '第二步：逐字对数字：把 AI 写的数字和资料卡上的数字一个一个对。',
  '第三步：问一句依据：结论在资料里写着吗？没写着就拒绝下结论。',
  '第四步：来源不在册子里，就是编造来源；数字对不上，就是编造数字。',
]
