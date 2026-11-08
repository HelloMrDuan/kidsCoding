import { describe, expect, it } from 'vitest'
import {
  FRUIT_SCHEMA_FIELDS,
  HINTS,
  LESSON_STEPS,
  RECORD_EXAMPLES,
  fieldErrorsFor,
  validateRecordText,
} from './a1-u3-l03'
import { JsonAdapter, buildJsonJudgment, passedCountOf } from './a1-u3-l03-adapter'
import {
  L03_CONTRACT,
  L03_DRAFT_KEY,
  L03_WORKSPACE_CONTRACT_FIELDS,
} from './a1-u3-l03-contract'
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

describe('A1-U3-L03 workspace integration (contract fields + JsonAdapter)', () => {
  it('the lesson contract names the lesson honestly and uses the spec draft key', () => {
    expect(L03_CONTRACT.lessonId).toBe('A1-U3-L03')
    expect(L03_CONTRACT.title).toBe('结构化JSON输出')
    expect(L03_CONTRACT.goal5).toHaveLength(5)
    expect(L03_CONTRACT.scopeLabel).toBe('教学定向')
    expect(L03_CONTRACT.scopeGap).toContain('不等于完全掌握')
    expect(L03_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L03')
    expect(L03_CONTRACT.draftKey).toBe(L03_DRAFT_KEY)
  })

  it('workspace fields translate the contract without an engine value', () => {
    // 引擎值待首席裁定（共享壳尚无 JSON 校验引擎值，不能冒用 'summary'）。
    expect(L03_WORKSPACE_CONTRACT_FIELDS.lessonId).toBe('A1-U3-L03')
    expect(L03_WORKSPACE_CONTRACT_FIELDS.goal5).toHaveLength(5)
    expect(L03_WORKSPACE_CONTRACT_FIELDS.hints).toHaveLength(3)
    expect(L03_WORKSPACE_CONTRACT_FIELDS.structuredHints).toHaveLength(3)
    expect(L03_WORKSPACE_CONTRACT_FIELDS.methodSteps).toHaveLength(3)
    expect(L03_WORKSPACE_CONTRACT_FIELDS.activities).toHaveLength(3)
    expect(L03_WORKSPACE_CONTRACT_FIELDS.hasStage).toBe(false)
    expect(L03_WORKSPACE_CONTRACT_FIELDS.fileCapabilities).toEqual({
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    })
    expect(L03_WORKSPACE_CONTRACT_FIELDS.judging.knowledgeRule).toContain('不核验记录真假')
    expect('engine' in L03_WORKSPACE_CONTRACT_FIELDS).toBe(false)
  })

  it('a correct record builds a three-layer pass judgment', () => {
    const draft = {
      version: 1 as const,
      jsonText: '{"名称": "苹果", "颜色": "红", "重量": 182, "直径": 7.6}',
      hintLevel: 0 as const,
    }
    const judgment = buildJsonJudgment(validateRecordText(draft.jsonText), draft)
    expect(judgment.passed).toBe(true)
    expect(judgment.layers.map((l) => l.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(judgment.conclusion).toContain('本次记录合格')
    expect(judgment.layers[0].detail).toContain('五项全部通过')
    expect(judgment.methodEvidence).toContain('必填 3 项已写 3 项')
    expect(judgment.conclusion).not.toContain('已掌握')
  })

  it('a type error builds a fail judgment naming the failed check', () => {
    const draft = {
      version: 1 as const,
      jsonText: '{"名称": "苹果", "颜色": "红", "重量": "182"}',
      hintLevel: 0 as const,
    }
    const judgment = buildJsonJudgment(validateRecordText(draft.jsonText), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.layers[1].detail).toContain('未合格')
    expect(judgment.layers[1].detail).toContain('类型正确')
    expect(judgment.layers[0].detail).toContain('五项中通过 4 项')
  })

  it('broken JSON fails at parse, never as a five-check pass', () => {
    const draft = { version: 1 as const, jsonText: '{bad', hintLevel: 0 as const }
    const judgment = buildJsonJudgment(validateRecordText(draft.jsonText), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.layers[0].detail).toContain('JSON 格式错误')
    expect(judgment.methodEvidence).toContain('先修 JSON 格式')
  })

  it('JsonAdapter: checkRecord stores the judgment and loadScript clears it', () => {
    const adapter = new JsonAdapter()
    adapter.loadScript({
      version: 1,
      jsonText: '{"名称": "苹果", "颜色": "红", "重量": 182}',
      hintLevel: 0,
    })
    expect(adapter.getJudgmentResult()).toBeNull()
    const judgment = adapter.checkRecord()
    expect(judgment.passed).toBe(true)
    expect(adapter.getJudgmentResult()).toBe(judgment)
    expect(adapter.getJsonState()).toEqual({
      checked: true,
      passedCount: 5,
      totalChecks: 5,
      verdict: '结论：本次记录合格。',
    })
    adapter.loadScript({ version: 1, jsonText: '{"名称": "苹果"}', hintLevel: 0 })
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getJsonState().checked).toBe(false)
    expect(adapter.getJsonState().passedCount).toBe(0)
    expect(adapter.checkRecord().passed).toBe(false)
    expect(adapter.getJsonState().passedCount).toBeLessThan(5)
  })

  it('an empty object fails completeness and names all three required fields', () => {
    const result = validateRecordText('{}')
    expect(result.parseOk).toBe(true)
    expect(result.passed).toBe(false)
    expect(result.failedChecks).toEqual(['字段齐全'])
    expect(result.fieldErrors.map((e) => e.field)).toEqual(['名称', '颜色', '重量'])
  })

  it('a null weight fails non-empty and type, and its fix never mentions quotes', () => {
    const result = validateRecordText('{"名称": "苹果", "颜色": "红", "重量": null}')
    expect(result.failedChecks).toEqual(['必填非空', '类型正确'])
    const weightErrors = result.fieldErrors.filter((e) => e.field === '重量')
    expect(weightErrors).toHaveLength(2)
    expect(weightErrors[1].why).toContain('空值')
    expect(weightErrors[1].fix).toContain('大于 0 的数字')
    expect(weightErrors[1].fix).not.toContain('引号')
  })

  it('a boolean weight fails type only, and its fix never mentions quotes', () => {
    const result = validateRecordText('{"名称": "苹果", "颜色": "红", "重量": true}')
    expect(result.failedChecks).toEqual(['类型正确'])
    expect(result.fieldErrors).toHaveLength(1)
    expect(result.fieldErrors[0].fix).toContain('大于 0 的数字')
    expect(result.fieldErrors[0].fix).not.toContain('引号')
  })

  it('a null diameter fails type only, and its fix never mentions quotes', () => {
    const result = validateRecordText(
      '{"名称": "苹果", "颜色": "红", "重量": 182, "直径": null}',
    )
    expect(result.failedChecks).toEqual(['类型正确'])
    expect(result.fieldErrors.map((e) => e.field)).toEqual(['直径'])
    expect(result.fieldErrors[0].fix).toContain('大于 0 的数字')
    expect(result.fieldErrors[0].fix).not.toContain('引号')
  })

  it('a string diameter still fails type and its fix does mention quotes', () => {
    const result = validateRecordText(
      '{"名称": "苹果", "颜色": "红", "重量": 182, "直径": "7.6"}',
    )
    expect(result.failedChecks).toEqual(['类型正确'])
    expect(result.fieldErrors[0].fix).toContain('引号')
  })
})

describe('A1-U3-L03 parse-failure judgment (fail-closed wording)', () => {
  it('passedCountOf is 0 on a parse failure, 5 on a pass, 4 on one failed check', () => {
    expect(passedCountOf(validateRecordText('{bad'))).toBe(0)
    expect(passedCountOf(validateRecordText(''))).toBe(0)
    expect(
      passedCountOf(
        validateRecordText('{"名称": "苹果", "颜色": "红", "重量": 182, "直径": 7.6}'),
      ),
    ).toBe(5)
    expect(
      passedCountOf(
        validateRecordText('{"名称": "苹果", "颜色": "红", "重量": "182", "直径": 7.6}'),
      ),
    ).toBe(4)
  })

  it('a parse failure never says "0 项未通过" and never claims 5 passed', () => {
    const draft = { version: 1 as const, jsonText: '{bad', hintLevel: 0 as const }
    const judgment = buildJsonJudgment(validateRecordText(draft.jsonText), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.layers[0].detail).toContain('JSON 格式错误')
    expect(judgment.layers[0].detail).toContain('尚未校验五项')
    expect(judgment.layers[1].detail).toContain('JSON 格式错误')
    expect(judgment.layers[1].detail).not.toContain('0 项未通过')
    expect(judgment.conclusion).toContain('未合格')
  })

  it('JsonAdapter: checkRecord on an empty or broken draft reports 0 passed', () => {
    const adapter = new JsonAdapter()
    expect(adapter.checkRecord().passed).toBe(false)
    expect(adapter.getJsonState()).toEqual({
      checked: true,
      passedCount: 0,
      totalChecks: 5,
      verdict: '结论：未合格。',
    })
    // 非法草稿经 coerceDraft 回落为空草稿，校验同样是 0 通过（不是 5）。
    adapter.loadScript('not an object')
    expect(adapter.getScript()).toEqual({ version: 1, jsonText: '', hintLevel: 0 })
    adapter.checkRecord()
    expect(adapter.getJsonState().passedCount).toBe(0)
    expect(adapter.getJsonState().verdict).toBe('结论：未合格。')
  })

  it('JsonAdapter: run fires finished immediately, stop is a no-op, validateDraft is strict shape', () => {
    const adapter = new JsonAdapter()
    const events: string[] = []
    adapter.run((event) => events.push(event.kind))
    expect(events).toEqual(['finished'])
    expect(() => adapter.stop()).not.toThrow()
    expect(adapter.validateDraft({ version: 1, jsonText: '{}', hintLevel: 0 })).toBe(true)
    expect(adapter.validateDraft({ version: 1, jsonText: 42 })).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
  })
})
