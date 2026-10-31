export type PythonCase = { function: 'introduce' | 'weather_line' | 'number_or_text' | 'greet_name' | 'make_profile' | 'efficiency_report'; args: readonly string[]; expected: string }

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
  'P3-U4-L06': {
    title: '第6课 · 个人效率工具套件',
    prompt: '单元作品：编写 efficiency_report(tasks_json, day, reminders_json, now_time) 函数，把本单元 L01-L05 连起来，做一份个人效率日报。先按 L01 从任务列表里取出 day 这一天的任务（day 必须是周一到周日，任务项含任务、星期、完成，缺字段或完成不是布尔值就报错），每行“未完成：任务”或“已完成：任务”，没有就写“本日无任务”。再按 L05 从提醒列表里取出到 now_time 为止到期的提醒（时间是 HH:MM，小时 0 到 23、分钟 0 到 59，按分钟比较，含等于），每行“时间 内容”，没有就写“暂无提醒”。最后汇总今日任务总数、已完成数和到期提醒数。返回顺序固定为：第一行“任务：”，接着任务行，接着“提醒：”，接着提醒行，最后一行“汇总：今日任务：X 项，已完成 Y 项；到期提醒：Z 条”。JSON 解析失败、不是列表、时间格式不对、内容不是字符串或为空时都抛出 ValueError。不做真实等待和真实通知，只按给定模拟数据判断，数据全部是虚构示例。',
    argLabels: ['一周任务 JSON 列表', '星期', '提醒列表 JSON 文本', '当前时间'],
    startCode: 'import json\n\ndef efficiency_report(tasks_json, day, reminders_json, now_time):\n    # 先取当天任务，再取到期提醒，最后汇总\n    return "待完成"',
    cases: [
      { function: 'efficiency_report', args: ['[{"任务": "数学作业", "星期": "周一", "完成": false}, {"任务": "读英语", "星期": "周一", "完成": true}, {"任务": "跑步", "星期": "周二", "完成": false}]', '周一', '[{"时间": "08:00", "内容": "背单词"}, {"时间": "09:30", "内容": "练琴"}, {"时间": "10:00", "内容": "喝水"}]', '09:30'], expected: '任务：\n未完成：数学作业\n已完成：读英语\n提醒：\n08:00 背单词\n09:30 练琴\n汇总：今日任务：2 项，已完成 1 项；到期提醒：2 条' },
      { function: 'efficiency_report', args: ['[{"任务": "数学作业", "星期": "周一", "完成": false}]', '周三', '[{"时间": "08:00", "内容": "背单词"}]', '07:00'], expected: '任务：\n本日无任务\n提醒：\n暂无提醒\n汇总：今日任务：0 项，已完成 0 项；到期提醒：0 条' },
      { function: 'efficiency_report', args: ['[{"任务": "数学作业", "星期": "周一", "完成": false}]', '周八', '[{"时间": "08:00", "内容": "背单词"}]', '09:30'], expected: 'ERROR:ValueError' },
      { function: 'efficiency_report', args: ['[{"任务": "数学作业", "星期": "周一", "完成": false}]', '周一', '[{"时间": "08:00", "内容": "背单词"}]', '25:00'], expected: 'ERROR:ValueError' },
      { function: 'efficiency_report', args: ['不是 JSON', '周一', '[{"时间": "08:00", "内容": "背单词"}]', '09:30'], expected: 'ERROR:ValueError' },
      { function: 'efficiency_report', args: ['[{"任务": "数学作业", "星期": "周一", "完成": false}]', '周一', '[{"时间": "08:00"}]', '09:30'], expected: 'ERROR:ValueError' },
    ],
    hint: '提示：day = day.strip()，不在周一到周日里先 raise ValueError；tasks = json.loads(tasks_json)，失败或不是 list 就 raise ValueError；任务项缺字段、任务不是 str 或为空、完成不是 bool 就 raise ValueError；先写时间校验：按冒号拆 2 段，数字，小时 0 到 23、分钟 0 到 59，否则 raise ValueError；reminders = json.loads(reminders_json)，失败或不是 list 就 raise ValueError；提醒项缺字段、时间校验不过、内容不是 str 或为空就 raise ValueError；任务行和提醒行按原顺序生成，计数汇总，顺序固定为任务、提醒、汇总。',
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
