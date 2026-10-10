// Output checking is practice feedback only, never a trusted server-side exam result.
export const PYTHON_TRIAL_LESSON_ID = 'P0-U1-L01'
export const PYTHON_TRIAL_EXPECTED_OUTPUT = '你好，编程世界'

export function gradeFirstPythonLesson(output: string, runtimeError: string | null) {
  if (runtimeError) {
    return { passed: false, feedback: '程序报错了。检查引号、括号和 print 的拼写，再运行一次。' }
  }
  const normalized = output.replace(/\r\n?/g, '\n').trim()
  if (normalized === PYTHON_TRIAL_EXPECTED_OUTPUT) {
    return { passed: true, feedback: '太棒了！你的 Python 程序真的运行了，并正确打印了问候语。' }
  }
  return {
    passed: false,
    feedback: normalized === ''
      ? '程序没有输出。试试 print("你好，编程世界")。'
      : '程序运行了，但输出还不符合任务目标。检查文字内容，再试一次。',
  }
}
