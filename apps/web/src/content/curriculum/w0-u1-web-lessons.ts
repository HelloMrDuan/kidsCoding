// W0-U1 web lessons: "写出我的第一张网页" (W0-U1-L01).
// Stage 1 delivered lesson data plus a pure structural check. There is no
// trial, no route, no E2E spec and no UI in this stage, and nothing here
// is a published or playable course.
// The lesson content comes from the B-account detailed-outline draft
// (2026-10-31, local draft, stage draft_not_reviewed, pending independent
// teaching review); it is NOT presented as reviewed ledger content. The
// draft deliberately states rules only and does not hard-code specific tag
// names, so this module does not hard-code any either: the check below
// judges pairing, bracket-wrapping, and title/body distinction, never a
// particular tag name. That also means diagnostic 2 (a misspelled tag name)
// cannot be machine-judged here: it needs the teacher's tag card, which is
// listed in materials but not ready (materialsReady: false).
// W0 has no track detailed-lessons JSON in the repo yet, so the入库 format
// for W0 lessons is still for teaching review to decide; this module is the
// lesson's stage-1 data source, mirroring the A0 stage-1 pattern.

export type W0Step = { order: number; teacher: string; child: string; check: string }

export type W0Diagnostic = { mistake: string; help: string }

export type W0Criterion = { name: string; points: number; evidence: string }

export type W0Lesson = {
  id: string
  title: string
  concept: string
  ageRange: string
  story: string
  /** The one rule every page in this lesson must follow. */
  rule: string
  steps: W0Step[]
  /** The detailed-outline draft's three diagnostics, verbatim in meaning. */
  diagnostics: W0Diagnostic[]
  criteria: W0Criterion[]
  extension: string
  materials: string[]
  materialsReady: boolean
  doesNotCollectPersonalData: boolean
  nextLesson: string
}

export const w0u1L01: W0Lesson = {
  id: 'W0-U1-L01',
  title: '写出我的第一张网页',
  concept: '标签',
  ageRange: '11-16',
  story: '学生要在浏览器里做出第一张网页：一个标题、一段话。',
  rule: '标签成对出现、用尖括号包裹名称；标题、正文各有自己的标签',
  steps: [
    {
      order: 1,
      teacher: '讲述真实世界情境，但不要求学生分享自己的隐私。',
      child: '观察问题并说出风险或目标：一张只有纯文字、没有标签的页面，浏览器分不清哪句是标题、哪段是正文。',
      check: '能指出任务的对象（标题、正文）和初始条件（纯文本）',
    },
    {
      order: 2,
      teacher: '引导分析：标签如何告诉浏览器一段文字的身份？',
      child: '拆解任务与规则：标签成对出现、用尖括号包裹名称；标题、正文各有自己的标签；写出本页结构：标题一行、正文一段。',
      check: '能说出标签成对与包裹规则，而非只背标签名',
    },
    {
      order: 3,
      teacher: '使用离线编辑器与本地浏览器完成实作，不收集学生个人信息。',
      child: '写出第一张网页并在浏览器打开：标题显示为大字标题，正文分段显示。',
      check: '有可展示的网页成品',
    },
    {
      order: 4,
      teacher: '不要把“页面打开了”等同于“做对了”，需要核查证据。',
      child: '验证任务是否符合：标题与正文区分正确，能说明每个标签的规则，并演示一次正常输入。',
      check: '标题与正文区分正确，能说明所用标签规则',
    },
    {
      order: 5,
      teacher: '呈现反例：漏写结束标签，页面显示异常。',
      child: '比较失败与成功情形：定位缺失的结束标签，补全后重新打开验证。',
      check: '能解释为什么漏写结束标签不可接受并提出修复',
    },
  ],
  diagnostics: [
    { mistake: '漏写结束标签，标题与正文混在一起或格式错乱。', help: '逐对检查标签是否成对闭合，补全缺失的结束标签后重新打开验证。' },
    { mistake: '标签名拼错，浏览器不识别，页面原样显示标签文本。', help: '对照标签对照卡逐个核对标签名，修正拼写后重新打开验证。' },
    { mistake: '把标签当成普通文字写进页面（缺尖括号），页面直接显示标签名。', help: '检查每个标签是否被尖括号包裹，补上尖括号后重新打开验证。' },
  ],
  criteria: [
    { name: '作品与任务', points: 40, evidence: '网页正常显示标题与正文，能说明所用标签规则。' },
    { name: '概念理解', points: 25, evidence: '能解释标签成对与包裹规则并对照本课例子。' },
    { name: '风险与核验', points: 20, evidence: '识别漏写结束标签并提出逐对检查、补全重验的修复。' },
    { name: '自主创作与反思', points: 15, evidence: '给网页再加一个自己选的元素（如第二段话或副标题），并说明用了什么标签。' },
  ],
  extension: '给网页再加一个自己选的元素（如第二段话或副标题），并说明用了什么标签。',
  materials: ['原创空白网页模板', '标签对照卡', '课堂记录表', '教师引导话术', '家长/儿童隐私安全说明'],
  materialsReady: false,
  doesNotCollectPersonalData: true,
  nextLesson: 'W0-U1-L02 标题与段落',
}

export type W0PageCheck = {
  /** Every opening tag has a matching closing tag (void elements excluded). */
  paired: boolean
  /** At least one complete paired element exists and no stray '<' remains. */
  wrapped: boolean
  hasTitle: boolean
  hasBody: boolean
  distinct: boolean
  passed: boolean
  failures: string[]
}

/** HTML void elements: they never take a closing tag, so they are not unclosed tags. */
const W0_VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
])

/**
 * Structural check for a learner's first page. It judges only the draft's
 * rules (pairing, bracket-wrapping, title/body distinction) and never a
 * particular tag name. Only the first two failure codes map to draft
 * diagnostics (missing_end_tag -> diagnostic 1, no_paired_element ->
 * diagnostic 3); the rest are structural prompts, not draft content.
 */
export const validateW0U1L01Page = (input: { titleText: string; bodyText: string; html: string }): W0PageCheck => {
  const { titleText, bodyText } = input
  let html = input.html
  // Comments, doctype and processing instructions are not elements.
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<![^>]*>/g, '').replace(/<\?[\s\S]*?\?>/g, '')
  const stack: string[] = []
  let paired = true
  let pairedElements = 0
  const tagPattern = /<(\/?)([A-Za-z][A-Za-z0-9]*)(\s[^>]*)?(\/?)>/g
  let match: RegExpExecArray | null
  while ((match = tagPattern.exec(html)) !== null) {
    const closing = match[1] === '/'
    const name = match[2].toLowerCase()
    const selfClosing = match[4] === '/'
    if (selfClosing || W0_VOID_ELEMENTS.has(name)) continue
    if (closing) {
      if (stack.length === 0 || stack[stack.length - 1] !== name) paired = false
      else {
        stack.pop()
        pairedElements += 1
      }
    } else {
      stack.push(name)
    }
  }
  if (stack.length > 0) paired = false
  const withoutTags = html.replace(tagPattern, '')
  const wrapped = pairedElements >= 1 && !withoutTags.includes('<')
  const hasTitle = titleText.trim().length > 0
  const hasBody = bodyText.trim().length > 0
  const distinct = titleText.trim().length > 0 && titleText.trim() !== bodyText.trim()
  const failures: string[] = []
  if (!paired) failures.push('missing_end_tag')
  if (!wrapped) failures.push('no_paired_element')
  if (!hasTitle) failures.push('missing_title')
  if (!hasBody) failures.push('missing_body')
  if (!distinct) failures.push('title_body_not_distinct')
  return { paired, wrapped, hasTitle, hasBody, distinct, passed: failures.length === 0, failures }
}

/** Help text per failure code; only the first two come from the draft diagnostics. */
export const W0_U1_L01_FAILURE_HELP: Record<string, string> = {
  missing_end_tag: '逐对检查标签是否成对闭合，补全缺失的结束标签后重新打开验证。',
  no_paired_element: '检查每个标签是否被尖括号包裹，补上尖括号后重新打开验证。',
  missing_title: '写出标题文字，并用一对标签把它和正文区分开。',
  missing_body: '写出正文文字，并用一对标签把它和标题区分开。',
  title_body_not_distinct: '标题与正文不能写成同一句话，区分开后再验证。',
}
