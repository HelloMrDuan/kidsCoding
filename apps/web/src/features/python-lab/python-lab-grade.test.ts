import { describe, expect, it } from 'vitest'
import { gradeFirstPythonLesson, PYTHON_TRIAL_EXPECTED_OUTPUT } from './python-lab-grade'

describe('the first Python trial lesson output assessment', () => {
  it('accepts the exact single greeting from real stdout', () => {
    expect(gradeFirstPythonLesson(PYTHON_TRIAL_EXPECTED_OUTPUT+'\n', null).passed).toBe(true)
    expect(gradeFirstPythonLesson(PYTHON_TRIAL_EXPECTED_OUTPUT+'\r\n', null).passed).toBe(true)
  })
  it('rejects similar or extra output, not only presence of the target string', () => {
    for(const output of ['', '你好', PYTHON_TRIAL_EXPECTED_OUTPUT+'\n作弊', '再见，编程世界']) {
      expect(gradeFirstPythonLesson(output, null).passed).toBe(false)
    }
  })
  it('never passes a program that raised an exception even if it printed the target first', () => {
    expect(gradeFirstPythonLesson(PYTHON_TRIAL_EXPECTED_OUTPUT, 'SyntaxError').passed).toBe(false)
  })
})
