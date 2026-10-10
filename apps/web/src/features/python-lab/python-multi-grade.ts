export type PythonCase = { function: 'introduce' | 'weather_line'; args: [string, string]; expected: string }

export const pythonPracticeLessons = {
  'P0-U1-L02': {
    title: '第2课 · 让程序自我介绍',
    prompt: '编写 introduce(name, hobby) 函数。无论名字和爱好如何变化，都要返回“我是{name}，喜欢{hobby}”。',
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
    startCode: 'def weather_line(city, weather):\n    # 使用 f-string 拼接文字\n    return city',
    cases: [
      { function: 'weather_line', args: ['北京', '晴'], expected: '北京今天晴' },
      { function: 'weather_line', args: ['上海', '多云'], expected: '上海今天多云' },
      { function: 'weather_line', args: ['成都', '小雨'], expected: '成都今天小雨' },
    ],
    hint: '提示：return f"{city}今天{weather}"',
  },
} as const satisfies Record<string, {title:string; prompt:string; startCode:string; cases: readonly PythonCase[]; hint:string}>

export type MultiPythonLessonId = keyof typeof pythonPracticeLessons
export function isMultiPythonLessonId(id: string): id is MultiPythonLessonId {
  return Object.prototype.hasOwnProperty.call(pythonPracticeLessons, id)
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
