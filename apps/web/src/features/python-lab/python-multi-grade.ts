export type PythonCase = { function: 'introduce' | 'weather_line' | 'number_or_text' | 'greet_name' | 'make_profile' | 'weather_alert'; args: readonly [string, string] | readonly [string, string, string]; expected: string }

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
  'P3-U3-L06': {
    title: '第6课 · 制作天气提醒助手',
    prompt: '单元作品：编写 weather_alert(weather_json, date, robots_text, agent, env_json) 函数，把本单元 L01-L05 连起来。先按 L05 的 robots.txt 规则判断能不能访问路径 /weather（agent 专属组优先，否则星号组，最长前缀匹配，长度相同 Allow 胜出），被禁止就返回“禁止访问：请遵守网站访问规则”。再按 L04 检查 env_json 里必须有非空字符串 WEATHER_KEY，缺失或无效就抛出 ValueError（密钥只从环境变量里读，不写死在代码里，不原样输出）。再按 L02 从模拟天气接口 JSON 里按 date 查找（温度必须是整数，布尔值不算），找不到、JSON 解析失败、结构不对都抛出 ValueError。最后按天气生成提醒：状况含雨返回“日期：有雨，记得带伞”，温度大于等于 30 返回“日期：高温温度度，注意防暑”，温度小于等于 0 返回“日期：低温温度度，注意保暖”，否则返回“日期：状况，温度度，天气正常”。不做真实网络请求，不使用真实密钥和网址，数据全部是虚构示例。',
    argLabels: ['天气接口 JSON 文本', '日期', 'robots.txt 文本', '爬虫名', '环境变量 JSON 文本'],
    startCode: 'import json\n\ndef weather_alert(weather_json, date, robots_text, agent, env_json):\n    # 先查 robots 规则，再查环境变量密钥，再查天气，最后生成提醒\n    return "待完成"',
    cases: [
      { function: 'weather_alert', args: ['{"天气": [{"日期": "2026-10-01", "温度": 20, "状况": "晴"}]}', '2026-10-01', 'User-agent: *\nDisallow: /admin/\n', '*', '{"WEATHER_KEY": "abc123"}'], expected: '2026-10-01：晴，20度，天气正常' },
      { function: 'weather_alert', args: ['{"天气": [{"日期": "2026-10-02", "温度": 18, "状况": "雨"}]}', '2026-10-02', 'User-agent: *\nDisallow: /admin/\n', '*', '{"WEATHER_KEY": "abc123"}'], expected: '2026-10-02：有雨，记得带伞' },
      { function: 'weather_alert', args: ['{"天气": [{"日期": "2026-10-03", "温度": 32, "状况": "晴"}]}', '2026-10-03', 'User-agent: *\nDisallow: /admin/\n', '*', '{"WEATHER_KEY": "abc123"}'], expected: '2026-10-03：高温32度，注意防暑' },
      { function: 'weather_alert', args: ['{"天气": [{"日期": "2026-10-01", "温度": 20, "状况": "晴"}]}', '2026-10-01', 'User-agent: *\nDisallow: /weather\n', '*', '{"WEATHER_KEY": "abc123"}'], expected: '禁止访问：请遵守网站访问规则' },
      { function: 'weather_alert', args: ['{"天气": [{"日期": "2026-10-01", "温度": 20, "状况": "晴"}]}', '2026-10-01', 'User-agent: *\nDisallow: /admin/\n', '*', '{"OTHER_KEY": "abc123"}'], expected: 'ERROR:ValueError' },
      { function: 'weather_alert', args: ['{"天气": [{"日期": "2026-10-01", "温度": 20, "状况": "晴"}]}', '2026-10-09', 'User-agent: *\nDisallow: /admin/\n', '*', '{"WEATHER_KEY": "abc123"}'], expected: 'ERROR:ValueError' },
    ],
    hint: '提示：先复用 L05 的分组与最长前缀逻辑判断 /weather，禁止直接返回禁止文案；再 json.loads(env_json)，不是 dict 或 WEATHER_KEY 不是非空字符串就 raise ValueError；再 json.loads(weather_json)，不是 dict 或天气不是 list 就 raise ValueError；按日期查找，缺字段或温度不是 int 就 raise ValueError，找不到 raise ValueError；最后按状况含雨、高温、低温、正常的顺序返回提醒。',
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
