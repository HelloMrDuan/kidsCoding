import { describe, expect, it } from 'vitest'
import { gradeMultiCases, pythonPracticeLessons, isMultiPythonLessonId } from './python-multi-grade'

describe('multi-case real Python practice grading contract', () => {
  it('registers five independent lesson IDs with three or six diverse cases', () => {
    expect(Object.keys(pythonPracticeLessons)).toEqual(['P0-U1-L02','P0-U1-L03','P0-U1-L04','P0-U1-L05','P0-U1-L06'])
    expect(isMultiPythonLessonId('P0-U1-L02')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L04')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L05')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L06')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L01')).toBe(false)
    for(const [id,lesson] of Object.entries(pythonPracticeLessons)) {
      expect(lesson.cases).toHaveLength(id === 'P0-U1-L06' ? 6 : 3)
      expect(new Set(lesson.cases.map(test=>JSON.stringify(test.args))).size).toBe(lesson.cases.length)
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
  it('covers a three-argument capstone with error boundaries and per-case evidence', () => {
    const cases=pythonPracticeLessons['P0-U1-L06'].cases
    expect(cases.filter(item=>item.expected.startsWith('ERROR:'))).toHaveLength(3)
    expect(cases[0].args).toHaveLength(3)
    expect(cases[5].args[1]).toContain('\n')
    expect(gradeMultiCases(cases,cases.map(item=>item.expected),null)).toMatchObject({passed:true,passedCount:6,total:6})
    expect(gradeMultiCases(cases,cases.map((item,index)=>index===5?'wrong':item.expected),null)).toMatchObject({passed:false,passedCount:5})
  })
  it('requires every case output to match, rather than a single memorized input', () => {
    const cases=pythonPracticeLessons['P0-U1-L02'].cases
    expect(gradeMultiCases(cases,cases.map(x=>x.expected),null)).toMatchObject({passed:true,passedCount:3})
    expect(gradeMultiCases(cases,[cases[0].expected,'wrong','wrong'],null)).toMatchObject({passed:false,passedCount:1})
    expect(gradeMultiCases(cases,[],null).passed).toBe(false)
    expect(gradeMultiCases(cases,cases.map(x=>x.expected),'SyntaxError').passed).toBe(false)
  })
})
