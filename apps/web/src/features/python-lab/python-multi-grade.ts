export type PythonCase = { function: 'introduce' | 'weather_line' | 'number_or_text' | 'greet_name' | 'make_profile' | 'filter_logs'; args: readonly [string, string] | readonly [string, string, string]; expected: string }

export const pythonPracticeLessons = {
  'P0-U1-L02': {
    title: '第2课 · 让程序自我介绍',
    prompt: '编写 introduce(name, hobby) 函数。无论名字和爱好如何变化，都要返回“我是{name}，喜欢{hobby}”。',
    argLabels: ['名字', '爱好'],
    startCode: 'def introduce(name, hobby):\n    # 试着组合变量，返回自我介绍\n    return "待完成"',
    cases: [
      { function: 'introduce', args: ['小雨', '画画'], expected: '我是小雨，喜欢画画' },
      { function: 'introduce', args: ['乐乐', '篮球'], expected: '我是乐乐，喜欢篮球' },
      { function: 'introduce', args: ['阿星', '编程'], expected: '我是阿星，喜欢编程' },
    ],
    hint: '提示：return f"我是{name}，喜欢{hobby}"',
  },
  'P0-U1-L03': {
    title: '第3课 · 文字拼接小助手',
    prompt: '编写 weather_line(city, weather) 函数。把不同城市和天气组合成“城市今天天气”。',
    argLabels: ['城市', '天气'],
    startCode: 'def weather_line(city, weather):\n    # 使用 f-string 拼接文字\n    return city',
    cases: [
      { function: 'weather_line', args: ['北京', '晴'], expected: '北京今天晴' },
      { function: 'weather_line', args: ['上海', '多云'], expected: '上海今天多云' },
      { function: 'weather_line', args: ['成都', '小雨'], expected: '成都今天小雨' },
    ],
    hint: '提示：return f"{city}今天{weather}"',
  },

  'P0-U1-L04': {
    title: '第4课 · 数字和字符串',
    prompt: '编写 number_or_text(left, right) 函数。两个参数是数字字符串，要分别计算整数加法和原字符串拼接，返回“相加=结果；拼接=结果”。注意数字 0 和前导 0。',
    argLabels: ['左边的数', '右边的数'],
    startCode: 'def number_or_text(left, right):\n    # 数字字符串不能直接当整数相加\n    return left + right',
    cases: [
      { function: 'number_or_text', args: ['1', '1'], expected: '相加=2；拼接=11' },
      { function: 'number_or_text', args: ['12', '3'], expected: '相加=15；拼接=123' },
      { function: 'number_or_text', args: ['0', '8'], expected: '相加=8；拼接=08' },
    ],
    hint: '提示：先用 int(left) + int(right) 求和，再单独用 left + right 拼接。',
  },
  'P0-U1-L05': {
    title: '第5课 · 输入你的名字',
    prompt: '编写 greet_name(name, prefix) 函数。先清除名字首尾空格，再返回“称呼，姓名”；如果名字只有空格，就返回“请输入名字”。',
    argLabels: ['名字', '称呼'],
    startCode: 'def greet_name(name, prefix):\n    # 清理姓名，注意空白输入\n    return prefix + "，" + name',
    cases: [
      { function: 'greet_name', args: [' 小明 ', '你好'], expected: '你好，小明' },
      { function: 'greet_name', args: ['  小雪', '欢迎'], expected: '欢迎，小雪' },
      { function: 'greet_name', args: ['   ', '你好'], expected: '请输入名字' },
    ],
    hint: '提示：clean = name.strip()，如果 not clean 则提示重新输入。',
  },
  'P0-U1-L06': {
    title: '第6课 · 制作个人名片生成器',
    prompt: '单元作品：编写 make_profile(nickname, hobby, color)，返回三行兴趣名片（昵称、爱好、喜欢的颜色）。去除每项首尾空格，空值、超过20字、包含换行或制表符时抛出 ValueError。请只填写虚构昵称，不填真实姓名、电话或住址。',
    argLabels: ['昵称（请用虚构名字）', '爱好', '喜欢的颜色'],
    startCode: 'def make_profile(nickname, hobby, color):\n    # 先验证三个字段，再用换行拼接成名片\n    return "待完成"',
    cases: [
          {
                "function": "make_profile",
                "args": [
                      "小雨",
                      "画画",
                      "蓝"
                ],
                "expected": "昵称：小雨\n爱好：画画\n喜欢的颜色：蓝"
          },
          {
                "function": "make_profile",
                "args": [
                      " 阿星 ",
                      "编程",
                      "紫 "
                ],
                "expected": "昵称：阿星\n爱好：编程\n喜欢的颜色：紫"
          },
          {
                "function": "make_profile",
                "args": [
                      "乐乐",
                      "踢足球",
                      "绿"
                ],
                "expected": "昵称：乐乐\n爱好：踢足球\n喜欢的颜色：绿"
          },
          {
                "function": "make_profile",
                "args": [
                      "  ",
                      "画画",
                      "蓝"
                ],
                "expected": "ERROR:ValueError"
          },
          {
                "function": "make_profile",
                "args": [
                      "超过二十个汉字的昵称不可以通过这一组测试哦",
                      "画画",
                      "蓝"
                ],
                "expected": "ERROR:ValueError"
          },
          {
                "function": "make_profile",
                "args": [
                      "阿星",
                      "画\n画",
                      "蓝"
                ],
                "expected": "ERROR:ValueError"
          }
    ],
    hint: '三步：strip() 去空格；验证空值、长度和换行制表符；用换行符拼成名片。',
  },
  'P3-U4-L04': {
    title: '第4课 · 记录程序日志',
    prompt: '编写 filter_logs(logs_json, level) 函数，从程序日志列表里按级别筛选并格式化输出。logs_json 是日志列表的 JSON 文本，每项含时间（字符串）、级别（INFO、WARNING、ERROR 之一）、消息（字符串）。level 去空格后必须是 INFO、WARNING、ERROR、全部之一，否则抛出 ValueError；JSON 解析失败、不是列表、某项缺字段、时间或消息不是字符串或为空、级别不在三者之内时都抛出 ValueError。筛选规则：level 为全部时留全部，否则只留级别相同的；按原顺序返回，每行“[时间] 级别: 消息”；没有匹配时返回“没有匹配的日志”。数据全部是虚构示例，不记录真实个人信息。',
    argLabels: ['程序日志 JSON 列表', '日志级别'],
    startCode: 'import json\n\ndef filter_logs(logs_json, level):\n    # 先 json.loads 解析并校验级别，再筛选并格式化\n    return "待完成"',
    cases: [
      { function: 'filter_logs', args: ['[{"时间": "2026-10-30 10:00", "级别": "INFO", "消息": "程序启动"}, {"时间": "2026-10-30 10:01", "级别": "WARNING", "消息": "磁盘空间不足"}, {"时间": "2026-10-30 10:02", "级别": "ERROR", "消息": "保存失败"}]', 'ERROR'], expected: '[2026-10-30 10:02] ERROR: 保存失败' },
      { function: 'filter_logs', args: ['[{"时间": "2026-10-30 10:00", "级别": "INFO", "消息": "程序启动"}, {"时间": "2026-10-30 10:01", "级别": "WARNING", "消息": "磁盘空间不足"}]', '全部'], expected: '[2026-10-30 10:00] INFO: 程序启动\n[2026-10-30 10:01] WARNING: 磁盘空间不足' },
      { function: 'filter_logs', args: ['[{"时间": "2026-10-30 10:00", "级别": "INFO", "消息": "程序启动"}]', 'WARNING'], expected: '没有匹配的日志' },
      { function: 'filter_logs', args: ['[{"时间": "2026-10-30 10:00", "级别": "INFO", "消息": "程序启动"}]', 'DEBUG'], expected: 'ERROR:ValueError' },
      { function: 'filter_logs', args: ['不是 JSON', 'INFO'], expected: 'ERROR:ValueError' },
      { function: 'filter_logs', args: ['[{"时间": "2026-10-30 10:00", "级别": "INFO"}]', 'INFO'], expected: 'ERROR:ValueError' },
    ],
    hint: '提示：level = level.strip()，不在 INFO、WARNING、ERROR、全部里先 raise ValueError；logs = json.loads(logs_json)，失败或不是 list 就 raise ValueError；每项不是 dict 或缺时间、级别、消息就 raise ValueError；时间或消息不是 str 或为空、级别不在三者之内就 raise ValueError；按原顺序留级别相同或 level 为全部的，每行 f"[{时间}] {级别}: {消息}"，没有就返回“没有匹配的日志”。',
  },
} as const satisfies Record<string, {title:string; prompt:string; argLabels: readonly string[]; startCode:string; cases: readonly PythonCase[]; hint:string}>

export type MultiPythonLessonId = keyof typeof pythonPracticeLessons
export function isMultiPythonLessonId(id: string): id is MultiPythonLessonId {
  return Object.prototype.hasOwnProperty.call(pythonPracticeLessons, id)
}

/**
 * TQ-005 练习 B 的完成判定：自选参数必须与全部固定用例都不同。
 * 照抄某一组固定用例再跑一次不算“换参数练习”，只算重复运行。
 */
export function isCustomArgsDifferentFromCases(
  lessonId: MultiPythonLessonId,
  args: readonly string[],
): boolean {
  const lesson = pythonPracticeLessons[lessonId]
  if (args.length !== lesson.cases[0].args.length) return false
  return lesson.cases.every(test => JSON.stringify([...test.args]) !== JSON.stringify([...args]))
}

export function gradeMultiCases(
  cases: readonly PythonCase[],
  outputs: unknown,
  error: string | null,
) {
  if (error || !Array.isArray(outputs) || outputs.length !== cases.length) {
    return {passed:false,passedCount:0,total:cases.length,feedback:'程序执行失败，请检查函数名、缩进和语法。'}
  }
  const passedCount=cases.filter((test,index)=>typeof outputs[index]==='string' && outputs[index]===test.expected).length
  return {
    passed:passedCount===cases.length,
    passedCount,
    total:cases.length,
    feedback:passedCount===cases.length
      ? '你通过了所有真实 Python 测试！试试更换参数，解释变量如何影响输出。'
      : `通过 ${passedCount}/${cases.length} 组。逐条比较函数的实际返回值和期望结果。`,
  }
}
