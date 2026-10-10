import { describe, expect, it } from 'vitest'
import { gradeMultiCases, pythonPracticeLessons, isMultiPythonLessonId } from './python-multi-grade'

describe('three-case real Python practice grading contract', () => {
  it('registers four independent lesson IDs with three distinct argument pairs each', () => {
    expect(Object.keys(pythonPracticeLessons)).toEqual(['P0-U1-L02','P0-U1-L03','P0-U1-L04','P0-U1-L05'])
    expect(isMultiPythonLessonId('P0-U1-L02')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L04')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L05')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L01')).toBe(false)
    for(const lesson of Object.values(pythonPracticeLessons)){
      expect(lesson.cases).toHaveLength(3)
      expect(new Set(lesson.cases.map(test=>test.args.join('/'))).size).toBe(3)
    }
  })
  it('verifies actual numeric conversion and blank-name boundary expectations', () => {
    const digits=pythonPracticeLessons['P0-U1-L04'].cases
    expect(digits[2].expected).toBe('相加=8；拼接=08')
    expect(gradeMultiCases(digits,['相加=2；拼接=11','相加=15；拼接=123','相加=8；拼接=08'],null).passed).toBe(true)
    const names=pythonPracticeLessons['P0-U1-L05'].cases
    expect(names[2].args[0].trim()).toBe('')
    expect(gradeMultiCases(names,[names[0].expected,names[1].expected,'你好，'],null)).toMatchObject({passed:false,passedCount:2})
  })
  it('requires every case output to match, rather than a single memorized input', () => {
    const cases=pythonPracticeLessons['P0-U1-L02'].cases
    expect(gradeMultiCases(cases,cases.map(x=>x.expected),null)).toMatchObject({passed:true,passedCount:3})
    expect(gradeMultiCases(cases,[cases[0].expected,'wrong','wrong'],null)).toMatchObject({passed:false,passedCount:1})
    expect(gradeMultiCases(cases,[],null).passed).toBe(false)
    expect(gradeMultiCases(cases,cases.map(x=>x.expected),'SyntaxError').passed).toBe(false)
  })
})
