import { describe, expect, it } from 'vitest'
import {
  FRUIT_SCHEMA_FIELDS,
  HINTS,
  LESSON_STEPS,
  RECORD_EXAMPLES,
  fieldErrorsFor,
  validateRecordText,
} from './a1-u3-l03'
import { validateFruitRecord } from './u3-local-engines'

describe('A1-U3-L03 lesson layer (reuses the U3 pilot validator)', () => {
  it('the pilot schema has 4 fields with the right required flags', () => {
    expect(FRUIT_SCHEMA_FIELDS.map((f) => [f.field, f.required])).toEqual([
      ['名称', true],
      ['颜色', true],
      ['重量', true],
      ['直径', false],
    ])
  })

  it('a correct record passes with no field errors', () => {
    const result = validateRecordText('{"名称": "苹果", "颜色": "红", "重量": 182, "直径": 7.6}')
    expect(result.parseOk).toBe(true)
    expect(result.passed).toBe(true)
    expect(result.failedChecks).toEqual([])
    expect(result.fieldErrors).toEqual([])
  })

  it('a missing optional field still passes', () => {
    const result = validateRecordText('{"名称": "苹果", "颜色": "红", "重量": 182}')
    expect(result.passed).toBe(true)
  })

  it('a missing required field names that field', () => {
    const result = validateRecordText('{"名称": "苹果", "重量": 182, "直径": 7.6}')
    expect(result.passed).toBe(false)
    expect(result.failedChecks).toContain('字段齐全')
    expect(result.fieldErrors.map((e) => e.field)).toEqual(['颜色'])
    expect(result.fieldErrors[0].why).toContain('没有「颜色」')
    expect(result.fieldErrors[0].fix).toContain('加上')
  })

  it('an empty required value fails non-empty only', () => {
    const result = validateRecordText('{"名称": "苹果", "颜色": "", "重量": 182}')
    expect(result.failedChecks).toEqual(['必填非空'])
    expect(result.fieldErrors.map((e) => e.field)).toEqual(['颜色'])
  })

  it('a type error names the field and is not double-counted as range or enum', () => {
    const result = validateRecordText('{"名称": "苹果", "颜色": "红", "重量": "182", "直径": 7.6}')
    expect(result.failedChecks).toEqual(['类型正确'])
    expect(result.fieldErrors.map((e) => e.field)).toEqual(['重量'])
    expect(result.fieldErrors[0].why).toContain('字符串')
    expect(result.fieldErrors[0].fix).toContain('引号')
  })

  it('an illegal category names the field with the allowed values', () => {
    const result = validateRecordText('{"名称": "梨", "颜色": "红", "重量": 182, "直径": 7.6}')
    expect(result.failedChecks).toContain('枚举内')
    expect(result.fieldErrors.map((e) => e.field)).toEqual(['名称'])
    expect(result.fieldErrors[0].why).toContain('梨')
    expect(result.fieldErrors[0].fix).toContain('苹果')
  })

  it('an abnormal weight fails range with a fix', () => {
    for (const weight of [-5, 0]) {
      const result = validateRecordText(`{"名称": "香蕉", "颜色": "黄", "重量": ${weight}, "直径": 3.4}`)
      expect(result.failedChecks).toContain('数值范围')
      expect(result.fieldErrors.map((e) => e.field)).toEqual(['重量'])
      expect(result.fieldErrors[0].fix).toContain('大于 0')
    }
  })

  it('broken JSON and non-objects fail at parse with a message', () => {
    const broken = validateRecordText('{bad')
    expect(broken.parseOk).toBe(false)
    expect(broken.parseError).toContain('JSON 格式错误')
    for (const text of ['[1, 2]', '182', 'null', '"苹果"']) {
      const result = validateRecordText(text)
      expect(result.parseOk).toBe(false)
      expect(result.parseError).toContain('JSON 对象')
    }
  })

  it('extra keys are ignored by the pilot validator (honest boundary)', () => {
    const result = validateRecordText('{"名称": "苹果", "颜色": "红", "重量": 182, "产地": "山东"}')
    expect(result.passed).toBe(true)
    expect(validateFruitRecord({ 名称: '苹果', 颜色: '红', 重量: 182, 产地: '山东' } as unknown as Parameters<typeof validateFruitRecord>[0]).passed).toBe(true)
  })

  it('every bundled example validates to its designed outcome', () => {
    const expected: Record<string, boolean> = {
      good: true,
      'missing-required': false,
      'missing-optional': true,
      'type-error': false,
      'enum-error': false,
      'range-error': false,
    }
    for (const example of RECORD_EXAMPLES) {
      expect(validateRecordText(example.json).passed).toBe(expected[example.id])
    }
  })

  it('fieldErrorsFor maps each engine check to its fields', () => {
    const errors = fieldErrorsFor(
      { 名称: '梨', 颜色: '', 重量: '182' },
      ['必填非空', '类型正确', '枚举内'],
    )
    expect(errors.map((e) => e.field)).toEqual(['颜色', '重量', '名称'])
  })

  it('hints have three levels and the lesson has three steps', () => {
    expect(HINTS.map((h) => h.level)).toEqual([1, 2, 3])
    expect(LESSON_STEPS).toHaveLength(3)
  })
})
