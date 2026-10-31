import { describe, expect, it } from 'vitest'
import { W0_U1_L01_FAILURE_HELP, validateW0U1L01Page, w0u1L01 } from './w0-u1-web-lessons'

describe('w0-u1-web-lessons', () => {
  it('carries the draft lesson record intact', () => {
    expect(w0u1L01.id).toBe('W0-U1-L01')
    expect(w0u1L01.title).toBe('写出我的第一张网页')
    expect(w0u1L01.concept).toBe('标签')
    expect(w0u1L01.ageRange).toBe('11-16')
    expect(w0u1L01.nextLesson).toBe('W0-U1-L02 标题与段落')
    expect(w0u1L01.materialsReady).toBe(false)
    expect(w0u1L01.doesNotCollectPersonalData).toBe(true)
  })

  it('has five steps in order from the draft', () => {
    expect(w0u1L01.steps).toHaveLength(5)
    expect(w0u1L01.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5])
    expect(w0u1L01.steps[1].check).toContain('成对与包裹规则')
    expect(w0u1L01.steps[4].check).toContain('漏写结束标签')
  })

  it('has three diagnostics and criteria summing to 100', () => {
    expect(w0u1L01.diagnostics).toHaveLength(3)
    expect(w0u1L01.diagnostics[0].mistake).toContain('漏写结束标签')
    expect(w0u1L01.diagnostics[1].mistake).toContain('标签名拼错')
    expect(w0u1L01.diagnostics[2].mistake).toContain('缺尖括号')
    expect(w0u1L01.criteria.map(c => c.points)).toEqual([40, 25, 20, 15])
    expect(w0u1L01.criteria.reduce((sum, c) => sum + c.points, 0)).toBe(100)
  })

  it('passes a well-formed first page', () => {
    const result = validateW0U1L01Page({
      titleText: '我的第一张网页',
      bodyText: '这是第一段话。',
      html: '<h1>我的第一张网页</h1><p>这是第一段话。</p>',
    })
    expect(result.passed).toBe(true)
    expect(result.failures).toEqual([])
    expect(result.paired).toBe(true)
    expect(result.wrapped).toBe(true)
    expect(result.distinct).toBe(true)
  })

  it('fails a missing end tag as unbalanced', () => {
    const result = validateW0U1L01Page({
      titleText: '我的第一张网页',
      bodyText: '这是第一段话。',
      html: '<h1>我的第一张网页<p>这是第一段话。</p>',
    })
    expect(result.passed).toBe(false)
    expect(result.paired).toBe(false)
    expect(result.failures).toContain('missing_end_tag')
    expect(W0_U1_L01_FAILURE_HELP.missing_end_tag).toContain('成对闭合')
  })

  it('fails tags written as plain text without brackets', () => {
    const result = validateW0U1L01Page({
      titleText: '我的第一张网页',
      bodyText: '这是第一段话。',
      html: 'h1我的第一张网页 p这是第一段话。',
    })
    expect(result.passed).toBe(false)
    expect(result.wrapped).toBe(false)
    expect(result.failures).toContain('no_paired_element')
    expect(W0_U1_L01_FAILURE_HELP.no_paired_element).toContain('尖括号')
  })

  it('fails a stray closing tag', () => {
    const result = validateW0U1L01Page({
      titleText: '标题',
      bodyText: '正文',
      html: '<h1>标题</h1></p>',
    })
    expect(result.paired).toBe(false)
    expect(result.failures).toContain('missing_end_tag')
  })

  it('fails an empty title, an empty body, and identical title and body', () => {
    const noTitle = validateW0U1L01Page({ titleText: '  ', bodyText: '正文', html: '<h1></h1><p>正文</p>' })
    expect(noTitle.failures).toContain('missing_title')
    const noBody = validateW0U1L01Page({ titleText: '标题', bodyText: '', html: '<h1>标题</h1><p></p>' })
    expect(noBody.failures).toContain('missing_body')
    const same = validateW0U1L01Page({ titleText: '同一句', bodyText: '同一句', html: '<h1>同一句</h1><p>同一句</p>' })
    expect(same.failures).toContain('title_body_not_distinct')
  })

  it('accepts void elements without a closing tag', () => {
    const result = validateW0U1L01Page({
      titleText: '标题',
      bodyText: '正文',
      html: '<h1>标题</h1><br><p>正文</p>',
    })
    expect(result.passed).toBe(true)
  })

  it('does not judge any particular tag name', () => {
    const result = validateW0U1L01Page({
      titleText: '标题',
      bodyText: '正文',
      html: '<foo>标题</foo><bar>正文</bar>',
    })
    expect(result.passed).toBe(true)
  })
})
