/**
 * TQ-005 — Python 实验室三层错因提示。
 *
 * 09 教学门禁要求每课的失败反馈按顺序给三层：现象 → 可能原因 → 动手修复，
 * 而不是一句通用报错。分类只看真实 Pyodide 返回的错误文本（或“跑起来但结果
 * 不对”这一事实），不猜测孩子代码以外的东西；分不出的统一归为 unknown，
 * 仍给三层通用动作，绝不把“不知道”写成“已定位”。
 *
 * 这些提示是本地练习反馈，不是正式考核成绩，也不改变任何通过判定。
 */

export type PythonErrorKind =
  | 'syntax'
  | 'indentation'
  | 'name'
  | 'type'
  | 'value'
  | 'timeout'
  | 'wrong-output'
  | 'engine'
  | 'unknown'

export type PythonHintLayers = {
  kind: PythonErrorKind
  /** [现象, 可能原因, 动手修复]，按顺序展示。 */
  layers: [string, string, string]
}

const LAYERS: Record<PythonErrorKind, [string, string, string]> = {
  syntax: [
    '现象：程序没能跑起来，Python 在读代码时就卡住了（SyntaxError）。',
    '可能原因：括号、引号、冒号不成对，或者某一行少了符号。',
    '动手修复：从报错指的那一行往前看，先补齐括号和引号，再点运行。',
  ],
  indentation: [
    '现象：程序没能跑起来，Python 抱怨缩进（IndentationError）。',
    '可能原因：函数体里的行没有对齐，或者混用了空格和 Tab。',
    '动手修复：把函数体里的每一行都用同样数量的空格开头，再点运行。',
  ],
  name: [
    '现象：程序跑到一半停了，说有个名字找不到（NameError）。',
    '可能原因：变量名拼错了，或者用了还没定义的名字。',
    '动手修复：对照函数参数名逐字检查拼写，确认名字先定义再使用。',
  ],
  type: [
    '现象：程序跑到一半停了，说类型对不上（TypeError）。',
    '可能原因：把字符串当数字算，或者把数字直接拼进文字里。',
    '动手修复：先想清楚每个值是文字还是数字，需要算就用 int() 转一下再算。',
  ],
  value: [
    '现象：程序跑到一半停了，说值不合法（ValueError）。',
    '可能原因：输入的值不在程序接受的范围里，例如空值、超长或带换行。',
    '动手修复：先检查输入是否为空、是否超长、是否带换行，改掉再运行。',
  ],
  timeout: [
    '现象：程序运行超时，被停下来了。',
    '可能原因：可能写了停不下来的循环，或者引擎还没加载完。',
    '动手修复：先检查有没有 while 一直成立、循环里有没有出口，再点运行。',
  ],
  'wrong-output': [
    '现象：程序跑起来了，但结果和目标不一样。',
    '可能原因：某一组输入走了另一条路——先找第一组不一样的用例。',
    '动手修复：只改那一组涉及的变量或运算，改完再运行，看它先变对。',
  ],
  engine: [
    '现象：Python 引擎没能加载或执行。',
    '可能原因：网络还没拿到 Pyodide，或者浏览器拦住了沙箱。',
    '动手修复：确认网络可以访问 jsDelivr，刷新页面后再点运行。',
  ],
  unknown: [
    '现象：程序这次没通过，但原因还不能从报错里确定。',
    '可能原因：先看第一组不一样的用例，或者把报错文字逐字读一遍。',
    '动手修复：一次只改一处，改完运行，看结果往目标靠近了没有。',
  ],
}

/** 从 Pyodide 原始报错文本分类；wrongOutput=true 表示无报错但结果不符。 */
export function classifyPythonError(
  errorText: string | null,
  wrongOutput = false,
): PythonErrorKind {
  if (errorText) {
    if (/运行超时|已停止|timeout/i.test(errorText)) return 'timeout'
    if (/IndentationError/i.test(errorText)) return 'indentation'
    if (/SyntaxError/i.test(errorText)) return 'syntax'
    if (/NameError/i.test(errorText)) return 'name'
    if (/TypeError/i.test(errorText)) return 'type'
    if (/ValueError/i.test(errorText)) return 'value'
    if (/引擎加载|执行失败|加载超时|NetworkError|importScripts/i.test(errorText)) return 'engine'
    return 'unknown'
  }
  if (wrongOutput) return 'wrong-output'
  return 'unknown'
}

export function pythonHintLayers(
  errorText: string | null,
  wrongOutput = false,
): PythonHintLayers {
  const kind = classifyPythonError(errorText, wrongOutput)
  return { kind, layers: LAYERS[kind] }
}
