import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'

/**
 * G1-U1-L01《给狐狸一个开场》课堂数据。
 *
 * 唯一教学依据：apps/web/src/content/curriculum/track-g1-detailed-lessons-v1.json
 * 中 G1-U1-L01（标题、年龄、引擎、故事、目标、五步、失败情形、拓展、三层提示、
 * 家长提示、评分权重）。凡详细稿未规定的数值，本文件一律在注释中标明“实现选择”，
 * 绝不冒充详细稿值。
 *
 * 判定语义不在此文件：见 features/lessons/story/g1-u1-l01-judging.ts 的
 * judgeStoryProgram，它原样复用第一阶段执行器
 * examples/blockly/g1/dialogue_executor.py 的判定语义。
 */

export type StoryStepKind = 'guided' | 'design' | 'build' | 'run' | 'error-lab' | 'creative' | 'review'

export type StoryPredictChoice = { text: string; when: 'pass' | 'move_only' | 'reversed_order' }

export type StoryLessonStep = {
  id: string
  kind: StoryStepKind
  title: string
  instruction: string
  predict: string
  predictChoices?: [StoryPredictChoice, StoryPredictChoice]
  /** 三层提示：原文照抄详细稿 feedback.tieredHints。 */
  hints: [string, string, string]
  allowedBlocks: string[]
  starterBlocks?: ProgramBlock[]
  /** 错误实验： starter 程序必须先跑出该失败，亲眼看到后修好才算过关。 */
  errorLab?: { expect: 'move_only' | 'reversed_order'; expected: string; actual: string }
  /** 创意拓展：详细稿 extension 原文。 */
  creative?: { prompt: string }
}

export type StoryLesson = {
  id: string
  title: string
  story: string
  concept: string
  objectives: string[]
  steps: StoryLessonStep[]
  reflection: { question: string; options: Array<{ text: string; correct: boolean }>; why: string }
  parentQuestion: string
  scoring: Array<{ criterion: string; weight: number; evidence: string }>
  extension: string
}

/**
 * 说话积木的可选台词（实现选择，非详细稿值）：
 * 详细稿只规定开场对白必须是“欢迎来到森林剧场”，拓展是“增加一段向观众提问的
 * 对白（例如‘你们准备好了吗？’）”。因此可选台词恰好是这两句：开场句 + 拓展
 * 提问句，不设自由文本输入（与 say-line-presets 的儿童隐私做法一致）。
 */
export const STORY_SAY_CHOICES = [
  { id: 'opening', text: '欢迎来到森林剧场' },
  { id: 'ready', text: '你们准备好了吗？' },
] as const

export type StorySayChoiceId = (typeof STORY_SAY_CHOICES)[number]['id']

export function resolveStorySayText(line: string | undefined): string | null {
  if (!line) return null
  const byId = STORY_SAY_CHOICES.find((choice) => choice.id === line)
  if (byId) return byId.text
  if (STORY_SAY_CHOICES.some((choice) => choice.text === line)) return line
  return line
}

/** 详细稿 feedback.tieredHints 原文，三层提示。 */
const TIERED_HINTS: [string, string, string] = [
  '先辨认题目需要变化的对象和目标，狐狸被选作森林主持人，可它总在故事开头沉默。',
  '把问题缩小到关键动作：把开场对白设为“欢迎来到森林剧场”，放在开始事件后。',
  '按步骤重试：检查对白积木是否接在事件之后，且属于狐狸。',
]

/** 实现选择：课堂积木箱。详细稿只规定开始事件、对白、移动三类动作；切换角色积木用于复现“对白给错人”的失败情形。 */
const ALL_BLOCKS = ['when_start', 'say_line', 'move_right', 'switch_character']

const OPENING: ProgramBlock[] = [
  { type: 'when_start' },
  { type: 'say_line', line: 'opening' },
  { type: 'move_right' },
]

export const G1_U1_L01_STORY_LESSON: StoryLesson = {
  id: 'G1-U1-L01',
  title: '给狐狸一个开场',
  story: '狐狸被选作森林主持人，可它总在故事开头沉默。',
  concept: '对白',
  objectives: [
    '理解并能解释对白',
    '在「给狐狸一个开场」完成具体任务：把开场对白设为“欢迎来到森林剧场”，放在开始事件后。',
    '用实际运行结果验证：点击开始后狐狸先打招呼再移动。',
  ],
  steps: [
    {
      id: 'look-predict',
      kind: 'guided',
      title: '引导：观察与预测',
      instruction: '狐狸被选作森林主持人，可它总在故事开头沉默。开始前先说一说：什么变化能证明任务成功？',
      predict: '先猜一猜：点击开始后，狐狸会先做什么？',
      predictChoices: [
        { text: '先打招呼，再移动', when: 'pass' },
        { text: '一句话不说，直接移动', when: 'move_only' },
      ],
      hints: TIERED_HINTS,
      allowedBlocks: ALL_BLOCKS,
      starterBlocks: [],
    },
    {
      id: 'design-order',
      kind: 'design',
      title: '设计：拆解与设计',
      instruction: '围绕「对白」设计操作顺序，为什么不能直接跳到最后？先定顺序：第一块是“开始时”，第二块是狐狸说“欢迎来到森林剧场”，第三块是狐狸移动。对白必须接在开始事件之后、移动之前，而且必须属于狐狸。',
      predict: '你的顺序里，对白在移动前面吗？说对白的是狐狸吗？',
      hints: TIERED_HINTS,
      allowedBlocks: ALL_BLOCKS,
      starterBlocks: [],
    },
    {
      id: 'build-opening',
      kind: 'build',
      title: '搭建：编码与搭建',
      instruction: '将计划变成工作区内实际可运行的指令：把开场对白设为“欢迎来到森林剧场”，放在开始事件后，再接一块移动。留意：说话积木要选开场那句，不能选提问那句。',
      predict: '拼好后先别急着运行：第一块是开始事件吗？说话的是狐狸吗？',
      hints: TIERED_HINTS,
      allowedBlocks: ALL_BLOCKS,
      starterBlocks: [{ type: 'when_start' }],
    },
    {
      id: 'run-verify',
      kind: 'run',
      title: '运行验收：运行与验收',
      instruction: '先预测结果，再运行观察；只看文本或截图还不算程序验证。重新拼一遍完整程序，按运行，确认：点击开始后狐狸先打招呼再移动。',
      predict: '运行前先说：你预测狐狸会先打招呼，还是先移动？',
      hints: TIERED_HINTS,
      allowedBlocks: ALL_BLOCKS,
      starterBlocks: [],
    },
    {
      id: 'error-lab',
      kind: 'error-lab',
      title: '错误实验：边界与修复',
      instruction: '这是一个故意的错误程序：只有移动，没有对白。先按原样运行，亲眼看看它为什么不能算完成，再修好它：检查对白积木是否接在事件之后，且属于狐狸。',
      predict: '先猜一猜：只有移动没有对白，算完成吗？',
      predictChoices: [
        { text: '不算完成，缺了对白', when: 'move_only' },
        { text: '算完成，动了就行', when: 'pass' },
      ],
      hints: TIERED_HINTS,
      allowedBlocks: ALL_BLOCKS,
      starterBlocks: [{ type: 'when_start' }, { type: 'move_right' }],
      errorLab: {
        expect: 'move_only',
        expected: '如果只有移动也算完成，狐狸一动就该算过关。',
        actual: '狐狸只移动、没有打招呼：只有移动没有对白时不能算完成。',
      },
    },
    {
      id: 'creative-encore',
      kind: 'creative',
      title: '创意拓展：向观众提问',
      instruction: '增加一段向观众提问的对白。例如：狐狸打招呼、移动之后，再说一句“你们准备好了吗？”。移动后的追加对白不破坏通过——先保证开场正确，再加提问。',
      predict: '加提问之前，开场那句还在移动前面吗？',
      hints: TIERED_HINTS,
      allowedBlocks: ALL_BLOCKS,
      starterBlocks: OPENING,
      creative: { prompt: '增加一段向观众提问的对白。' },
    },
    {
      id: 'review',
      kind: 'review',
      title: '复盘：说出为什么',
      instruction: '说出这节课的道理：为什么对白必须在移动之前、而且必须属于狐狸？只照抄示例、不能解释为何成功，还不算真正学会。',
      predict: '想一想：如果对白给了别人，或者先移动后说话，会怎样？',
      hints: TIERED_HINTS,
      allowedBlocks: ALL_BLOCKS,
      starterBlocks: [],
    },
  ],
  reflection: {
    question: '狐狸要先做什么，再移动？',
    options: [
      { text: '先说“欢迎来到森林剧场”，再移动', correct: true },
      { text: '先移动，再说话', correct: false },
      { text: '只移动，不说话', correct: false },
    ],
    why: '点击开始后狐狸先打招呼再移动：对白在开始事件后、移动前，且属于狐狸。',
  },
  parentQuestion: '让孩子展示「给狐狸一个开场」，请他先预测再运行，并说出为什么出错时应当检查对白积木是否接在事件之后，且属于狐狸。',
  scoring: [
    { criterion: '功能完成', weight: 40, evidence: '点击开始后狐狸先打招呼再移动。' },
    { criterion: '知识理解', weight: 25, evidence: '能解释对白与操作的关系' },
    { criterion: '调试能力', weight: 20, evidence: '解释并修正：只有移动没有对白时不能算完成。' },
    { criterion: '原创表达', weight: 15, evidence: '完成拓展挑战：增加一段向观众提问的对白。' },
  ],
  extension: '增加一段向观众提问的对白。',
}

/**
 * G1-U1-L02《与兔子轮流说话》课堂数据。
 *
 * 唯一教学依据：apps/web/src/content/curriculum/track-g1-detailed-lessons-v1.json
 * 中 G1-U1-L02（标题、年龄、引擎、故事、目标、五步、失败情形、拓展、三层提示、
 * 家长提示、评分权重）。凡详细稿未规定的数值，本文件一律在注释中标明“实现选择”，
 * 绝不冒充详细稿值。
 *
 * 判定语义不在此文件：见 features/lessons/story/g1-u1-l02-judging.ts 的
 * judgeTurnTakingProgram，它复用第一阶段执行器 turn_taking_executor.py
 * （~/workspace/g1-u1-l02/turn_taking_executor.py）的判定语义——严格前缀：
 * 前两句必须恰好是狐狸“你好”、兔子“很高兴见到你”。
 */

/**
 * 说话积木的可选台词（实现选择，非详细稿值）：
 * 详细稿只规定两句必修对白——狐狸“你好”、兔子“很高兴见到你”，拓展是
 * “加入第三句角色告别台词”且不规定固定告别文本。因此可选台词恰好是
 * 这两句必修台词：第三句（拓展）是任意已选台词，不另设固定告别句，
 * 不设自由文本输入（与 say-line-presets 的儿童隐私做法一致）。
 */
export const L02_SAY_CHOICES = [
  { id: 'hello', text: '你好' },
  { id: 'glad', text: '很高兴见到你' },
] as const

export type L02SayChoiceId = (typeof L02_SAY_CHOICES)[number]['id']

/**
 * 必修对白序列（教学数据，非判定逻辑）：狐狸先说“你好”，兔子再回应
 * “很高兴见到你”。判定函数 judgeTurnTakingProgram 默认以此序列为期望，
 * 调用方可注入 contract 的期望序列覆盖；判定逻辑本身不写死任何台词。
 */
export const L02_REQUIRED_LINES = [
  { actor: 'fox', text: '你好' },
  { actor: 'rabbit', text: '很高兴见到你' },
] as const

/** 详细稿 feedback.tieredHints 原文，三层提示。 */
const L02_TIERED_HINTS: [string, string, string] = [
  '先辨认题目需要变化的对象和目标，兔子和狐狸第一次见面，要轮流介绍自己的名字。',
  '把问题缩小到关键动作：安排狐狸说“你好”，兔子再回应“很高兴见到你”。',
  '按步骤重试：拆开两个角色的说话时机，逐句运行对照。',
]

/** 实现选择：课堂积木箱。本课无移动，积木箱只有开始事件、对白、切换角色三类。 */
const L02_ALL_BLOCKS = ['when_start', 'say_line', 'switch_character']

/** 正确程序：开始 → 狐狸说“你好” → 切换角色 → 兔子说“很高兴见到你”。 */
const CORRECT_TURN_TAKING: ProgramBlock[] = [
  { type: 'when_start' },
  { type: 'say_line', line: 'hello' },
  { type: 'switch_character' },
  { type: 'say_line', line: 'glad' },
]

/** 顺序颠倒的错误程序（第 5 关 error-lab 起始程序）：兔子先说，狐狸后说。 */
const REVERSED_TURN_TAKING: ProgramBlock[] = [
  { type: 'when_start' },
  { type: 'switch_character' },
  { type: 'say_line', line: 'glad' },
  { type: 'switch_character' },
  { type: 'say_line', line: 'hello' },
]

export const G1_U1_L02_STORY_LESSON: StoryLesson = {
  id: 'G1-U1-L02',
  title: '与兔子轮流说话',
  story: '兔子和狐狸第一次见面，要轮流介绍自己的名字。',
  concept: '对白',
  objectives: [
    '理解并能解释对白',
    '在「与兔子轮流说话」完成具体任务：安排狐狸说“你好”，兔子再回应“很高兴见到你”。',
    '用实际运行结果验证：两句对白按狐狸→兔子的顺序出现。',
  ],
  steps: [
    {
      id: 'look-predict',
      kind: 'guided',
      title: '引导：观察与预测',
      instruction: '兔子和狐狸第一次见面，要轮流介绍自己的名字。开始前先说一说：什么变化能证明任务成功？',
      predict: '先猜一猜：谁先说话？狐狸先说“你好”，还是兔子先说？',
      predictChoices: [
        { text: '狐狸先说“你好”，兔子再回应“很高兴见到你”', when: 'pass' },
        { text: '兔子先说，狐狸再回应', when: 'reversed_order' },
      ],
      hints: L02_TIERED_HINTS,
      allowedBlocks: L02_ALL_BLOCKS,
      starterBlocks: [],
    },
    {
      id: 'design-order',
      kind: 'design',
      title: '设计：拆解与设计',
      instruction: '围绕「对白」设计操作顺序，为什么不能直接跳到最后？先画出或写出操作顺序，并说出关键步骤：安排狐狸说“你好”，兔子再回应“很高兴见到你”。顺序是：开始事件 → 狐狸说“你好” → 切换角色 → 兔子说“很高兴见到你”。',
      predict: '你的顺序里，狐狸在兔子前面吗？两句是分开说的吗？',
      hints: L02_TIERED_HINTS,
      allowedBlocks: L02_ALL_BLOCKS,
      starterBlocks: [],
    },
    {
      id: 'build-turn-taking',
      kind: 'build',
      title: '搭建：编码与搭建',
      instruction: '将计划变成工作区内实际可运行的指令：先放开始事件，再让狐狸说“你好”，然后切换角色，最后让兔子说“很高兴见到你”。留意：说第二句之前一定要切换角色，不然两句都是同一个人说的。',
      predict: '拼好后先别急着运行：第一块是开始事件吗？第一句是狐狸说的吗？',
      hints: L02_TIERED_HINTS,
      allowedBlocks: L02_ALL_BLOCKS,
      starterBlocks: [{ type: 'when_start' }],
    },
    {
      id: 'run-verify',
      kind: 'run',
      title: '运行验收：运行与验收',
      instruction: '先预测结果，再运行观察；只看文本或截图还不算程序验证。重新拼一遍完整程序，按运行，确认：两句对白按狐狸→兔子的顺序出现。',
      predict: '运行前先说：你预测狐狸先说，还是兔子先说？',
      hints: L02_TIERED_HINTS,
      allowedBlocks: L02_ALL_BLOCKS,
      starterBlocks: [],
    },
    {
      id: 'error-lab',
      kind: 'error-lab',
      title: '错误实验：边界与修复',
      instruction: '这是一个故意的错误程序：兔子先说，狐狸后说。先按原样运行，亲眼看看它为什么不能算完成，再修好它：拆开两个角色的说话时机，逐句运行对照。',
      predict: '先猜一猜：兔子先说、狐狸后说，算完成吗？',
      predictChoices: [
        { text: '不算完成，顺序反了', when: 'reversed_order' },
        { text: '算完成，说了两句就行', when: 'pass' },
      ],
      hints: L02_TIERED_HINTS,
      allowedBlocks: L02_ALL_BLOCKS,
      starterBlocks: REVERSED_TURN_TAKING,
      errorLab: {
        expect: 'reversed_order',
        expected: '如果兔子先说也算完成，顺序颠倒也该算过关。',
        actual: '兔子先说了“很高兴见到你”，狐狸后说“你好”：两句对白没有按狐狸→兔子的顺序出现。',
      },
    },
    {
      id: 'creative-farewell',
      kind: 'creative',
      title: '创意拓展：加第三句告别',
      instruction: '加入第三句角色告别台词。先保证前两句正确——狐狸说“你好”，兔子回应“很高兴见到你”——再追加第三句：切换到想说话的角色，说一句你选的台词。第三句是任意已选台词都可以，不破坏通过。',
      predict: '加第三句之前，前两句的顺序还在吗？',
      hints: L02_TIERED_HINTS,
      allowedBlocks: L02_ALL_BLOCKS,
      starterBlocks: CORRECT_TURN_TAKING,
      creative: { prompt: '加入第三句角色告别台词。' },
    },
    {
      id: 'review',
      kind: 'review',
      title: '复盘：说出为什么',
      instruction: '说出这节课的道理：为什么两句对白必须按狐狸→兔子的顺序出现，而且不能同时说？只照抄示例、不能解释为何成功，还不算真正学会。',
      predict: '想一想：如果兔子先说，或者两个人同时说话，会怎样？',
      hints: L02_TIERED_HINTS,
      allowedBlocks: L02_ALL_BLOCKS,
      starterBlocks: [],
    },
  ],
  reflection: {
    question: '狐狸和兔子轮流说话，谁先说？',
    options: [
      { text: '狐狸先说“你好”，兔子再回应“很高兴见到你”', correct: true },
      { text: '兔子先说，狐狸再回应', correct: false },
      { text: '两个人同时说', correct: false },
    ],
    why: '两句对白按狐狸→兔子的顺序出现：先由狐狸说“你好”，切换角色后兔子再说“很高兴见到你”，不能同时说。',
  },
  parentQuestion: '让孩子展示「与兔子轮流说话」，请他先预测再运行，并说出为什么出错时应当拆开两个角色的说话时机，逐句运行对照。',
  scoring: [
    { criterion: '功能完成', weight: 40, evidence: '两句对白按狐狸→兔子的顺序出现。' },
    { criterion: '知识理解', weight: 25, evidence: '能解释对白与操作的关系' },
    { criterion: '调试能力', weight: 20, evidence: '解释并修正：两位角色同时说话造成重叠。' },
    { criterion: '原创表达', weight: 15, evidence: '完成拓展挑战：加入第三句角色告别台词。' },
  ],
  extension: '加入第三句角色告别台词。',
}

const STORY_LESSONS: Record<string, StoryLesson> = {
  [G1_U1_L01_STORY_LESSON.id]: G1_U1_L01_STORY_LESSON,
  [G1_U1_L02_STORY_LESSON.id]: G1_U1_L02_STORY_LESSON,
}

export function getStoryLesson(lessonId: string): StoryLesson | null {
  return STORY_LESSONS[lessonId] ?? null
}
