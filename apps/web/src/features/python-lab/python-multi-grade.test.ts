import { describe, expect, it } from 'vitest'
import { gradeMultiCases, pythonPracticeLessons, isMultiPythonLessonId, isCustomArgsDifferentFromCases } from './python-multi-grade'

describe('TQ-005 practice B custom arguments must differ from every fixed case', () => {
  it('accepts genuinely new arguments and rejects copies of fixed cases', () => {
    expect(isCustomArgsDifferentFromCases('P0-U1-L02', ['小雨', '画画'])).toBe(false)
    expect(isCustomArgsDifferentFromCases('P0-U1-L02', ['小雨', '唱歌'])).toBe(true)
    expect(isCustomArgsDifferentFromCases('P0-U1-L02', ['小雨'])).toBe(false)
    expect(isCustomArgsDifferentFromCases('P0-U1-L06', ['  ', '画画', '蓝'])).toBe(false)
    expect(isCustomArgsDifferentFromCases('P0-U1-L06', ['小云', '画画', '蓝'])).toBe(true)
  })
  it('labels one input per function argument for every multi lesson', () => {
    for (const lesson of Object.values(pythonPracticeLessons)) {
      expect(lesson.argLabels).toHaveLength(lesson.cases[0].args.length)
    }
  })
})

describe('multi-case real Python practice grading contract', () => {
  it('registers five independent lesson IDs with three or six diverse cases', () => {
    expect(Object.keys(pythonPracticeLessons)).toEqual(['P0-U1-L02','P0-U1-L03','P0-U1-L04','P0-U1-L05','P0-U1-L06','P3-U3-L05'])
    expect(isMultiPythonLessonId('P0-U1-L02')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L04')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L05')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L06')).toBe(true)
    expect(isMultiPythonLessonId('P3-U3-L05')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L01')).toBe(false)
    for(const [id,lesson] of Object.entries(pythonPracticeLessons)) {
      expect(lesson.cases).toHaveLength(id === 'P0-U1-L06' ? 6 : id === 'P3-U3-L05' ? 5 : 3)
      expect(new Set(lesson.cases.map(test=>JSON.stringify(test.args))).size).toBe(lesson.cases.length)
    }
  })
  it('covers P3-U3-L05 robots.txt longest-prefix matching with agent-specific groups', () => {
    const cases=pythonPracticeLessons['P3-U3-L05'].cases
    expect(cases.filter(item=>item.expected.startsWith('ERROR:'))).toHaveLength(1)
    expect(cases[0].expected).toBe('禁止')
    expect(cases[2].expected).toBe('允许')
    expect(gradeMultiCases(cases,cases.map(item=>item.expected),null)).toMatchObject({passed:true,passedCount:5,total:5})
    expect(gradeMultiCases(cases,[cases[0].expected,'wrong',cases[2].expected,cases[3].expected,cases[4].expected],null)).toMatchObject({passed:false,passedCount:4})
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
