import { describe, expect, it } from 'vitest'
import { gradeMultiCases, pythonPracticeLessons, isMultiPythonLessonId } from './python-multi-grade'

describe('three-case real Python practice grading contract', () => {
  it('registers two independent lesson IDs with three distinct argument pairs each', () => {
    expect(Object.keys(pythonPracticeLessons)).toEqual(['P0-U1-L02','P0-U1-L03'])
    expect(isMultiPythonLessonId('P0-U1-L02')).toBe(true)
    expect(isMultiPythonLessonId('P0-U1-L01')).toBe(false)
    for(const lesson of Object.values(pythonPracticeLessons)){
      expect(lesson.cases).toHaveLength(3)
      expect(new Set(lesson.cases.map(test=>test.args.join('/'))).size).toBe(3)
    }
  })
  it('requires every case output to match, rather than a single memorized input', () => {
    const cases=pythonPracticeLessons['P0-U1-L02'].cases
    expect(gradeMultiCases(cases,cases.map(x=>x.expected),null)).toMatchObject({passed:true,passedCount:3})
    expect(gradeMultiCases(cases,[cases[0].expected,'wrong','wrong'],null)).toMatchObject({passed:false,passedCount:1})
    expect(gradeMultiCases(cases,[],null).passed).toBe(false)
    expect(gradeMultiCases(cases,cases.map(x=>x.expected),'SyntaxError').passed).toBe(false)
  })
})
