'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  FRUIT_SCHEMA_FIELDS,
  HINTS,
  L03_LESSON_TITLE,
  LESSON_STEPS,
  RECORD_EXAMPLES,
  validateRecordText,
  type RecordValidation,
} from './a1-u3-l03'
import {
  getDraftSnapshot,
  getServerDraftSnapshot,
  restoreDefaultDraft,
  storeDraft,
  subscribeDraft,
  type L03Draft,
} from './a1-u3-l03-draft'

const CHECK_NAMES = ['字段齐全', '必填非空', '类型正确', '枚举内', '数值范围'] as const

function CheckLines({ result }: { result: RecordValidation }) {
  return (
    <div className="mt-2 space-y-1">
      {CHECK_NAMES.map((name) => (
        <p key={name} className="text-sm leading-7 text-[#18243a]">
          {name}：{result.failedChecks.includes(name) ? '失败' : '通过'}
        </p>
      ))}
    </div>
  )
}

export default function A1U3L03Lab() {
  const draft = useSyncExternalStore(subscribeDraft, getDraftSnapshot, getServerDraftSnapshot)
  const [saveError, setSaveError] = useState(false)
  const [result, setResult] = useState<RecordValidation | null>(null)

  function persist(next: L03Draft) {
    const ok = storeDraft(next)
    setSaveError(!ok)
  }

  function loadExample(json: string) {
    persist({ ...draft, jsonText: json })
    setResult(null)
  }

  function validate() {
    setResult(validateRecordText(draft.jsonText))
  }

  function resetAll() {
    persist(restoreDefaultDraft())
    setResult(null)
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] p-4 text-[#18243a]">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-[#6f7d92]">KidsCoding / A1-U3 · Python 人工智能应用实践</p>
        <h1 className="mt-1 text-2xl font-black">{L03_LESSON_TITLE}：水果记录 JSON 校验</h1>
        <p className="mt-2 text-sm leading-7 text-[#6f7d92]">
          模型输出的结构化 JSON 能不能直接用？先看字段表，再改记录、点校验、修错误。本课练的是“动手改数据、看反馈、修到通过”，不是背规则。
          记录是合成数据，不是真实称重结果；校验只管格式与范围，不管水果真不真实。
        </p>

        <section className="mt-6 rounded-[14px] border border-[#e7edf5] bg-white p-4">
          <h2 className="text-lg font-black">字段表：这条记录长什么样</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#f3f6fb] text-left">
                  <th className="border border-[#e7edf5] px-3 py-2">字段</th>
                  <th className="border border-[#e7edf5] px-3 py-2">类型</th>
                  <th className="border border-[#e7edf5] px-3 py-2">必填</th>
                  <th className="border border-[#e7edf5] px-3 py-2">允许的值 / 范围</th>
                </tr>
              </thead>
              <tbody>
                {FRUIT_SCHEMA_FIELDS.map((field) => (
                  <tr key={field.field}>
                    <td className="border border-[#e7edf5] px-3 py-2">{field.field}</td>
                    <td className="border border-[#e7edf5] px-3 py-2">{field.type}</td>
                    <td className="border border-[#e7edf5] px-3 py-2">{field.required ? '必填' : '可选'}</td>
                    <td className="border border-[#e7edf5] px-3 py-2">{field.values}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm leading-7 text-[#6f7d92]">
            注意：直径是可选字段，缺直径仍可通过；名称、颜色、重量缺一不可。本校验器不检查多余字段，多写的键会被忽略。
          </p>
          <ol className="mt-2 space-y-1">
            {LESSON_STEPS.map((step) => (
              <li key={step} className="text-sm leading-7">{step}</li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-[14px] border border-[#e7edf5] bg-white p-4">
          <h2 className="text-lg font-black">动手：改记录、点校验、修错误</h2>
          <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
            在框里改 JSON，点“执行校验”看字段级报错：错在哪个字段、为什么错、如何修改。修完再点校验，五项全过才是合格。
          </p>
          <textarea
            data-testid="ai-u3-l03-json-input"
            value={draft.jsonText}
            onChange={(event) => {
              persist({ ...draft, jsonText: event.target.value })
              setResult(null)
            }}
            rows={8}
            spellCheck={false}
            placeholder={'{\n  "名称": "苹果",\n  "颜色": "红",\n  "重量": 182,\n  "直径": 7.6\n}'}
            className="mt-3 w-full rounded-[14px] border border-[#e7edf5] bg-white px-3 py-2 font-mono text-sm leading-7 text-[#18243a]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="ai-u3-l03-validate"
              onClick={validate}
              className="rounded-[14px] bg-[#2463eb] px-6 py-2 text-sm font-bold text-white"
            >
              执行校验
            </button>
            {RECORD_EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                data-testid={`ai-u3-l03-example-${example.id}`}
                onClick={() => loadExample(example.json)}
                className="rounded-[14px] border border-[#e7edf5] bg-white px-4 py-2 text-sm text-[#18243a]"
              >
                {example.label}
              </button>
            ))}
            {HINTS.map((hint) => (
              <button
                key={hint.level}
                type="button"
                data-testid={`ai-u3-l03-hint-${hint.level}`}
                onClick={() => persist({ ...draft, hintLevel: hint.level })}
                className="rounded-[14px] border border-[#e7edf5] bg-white px-4 py-2 text-sm text-[#18243a]"
              >
                {hint.title}
              </button>
            ))}
          </div>
          {draft.hintLevel > 0 && (
            <div data-testid="ai-u3-l03-hint-text" className="mt-3 space-y-1 rounded-[14px] bg-[#eef4ff] p-4">
              {HINTS.filter((hint) => hint.level <= draft.hintLevel).map((hint) => (
                <p key={hint.level} className="text-sm leading-7 text-[#18243a]">
                  {hint.title}：{hint.text}
                </p>
              ))}
            </div>
          )}
          {result !== null && (
            <div data-testid="ai-u3-l03-result" className="mt-3 rounded-[14px] bg-[#f3f6fb] p-4">
              {!result.parseOk && (
                <p className="text-sm leading-7 text-[#d64c4c]">{result.parseError}</p>
              )}
              {result.parseOk && (
                <>
                  <p data-testid="ai-u3-l03-verdict" className="text-sm font-bold text-[#18243a]">
                    {result.passed ? '合格：五项全部通过。' : `未合格：${result.failedChecks.length} 项未通过（${result.failedChecks.join('、')}）。`}
                  </p>
                  <CheckLines result={result} />
                  {result.fieldErrors.map((error) => (
                    <p key={error.field} className="text-sm leading-7 text-[#18243a]">
                      「{error.field}」：{error.why}修复：{error.fix}
                    </p>
                  ))}
                </>
              )}
            </div>
          )}
          {result !== null && result.passed && (
            <div data-testid="ai-u3-l03-work" className="mt-3 rounded-[14px] bg-[#eef4ff] p-4">
              <p className="text-sm font-bold text-[#18243a]">作品总结：你修出了一条通过校验的记录。</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-[#18243a]">{draft.jsonText}</pre>
              <p className="text-sm leading-7 text-[#6f7d92]">它通过了全部五项检查，可以作为结构化 JSON 输出的合格示例。</p>
            </div>
          )}
          {result !== null && !result.passed && (
            <p className="mt-2 text-sm leading-7 text-[#6f7d92]">
              先修到五项全过，作品总结才会出现。
            </p>
          )}
        </section>

        <p data-testid="ai-u3-l03-draft-status" className="mt-4 text-sm leading-7 text-[#6f7d92]">
          本机草稿状态：编辑区 {draft.jsonText.length} 字；提示已揭示到 {draft.hintLevel === 0 ? '未揭示' : `${draft.hintLevel} 级`}。
          {saveError ? '未能保存：本次编辑没有存入本机草稿。' : '已保存到本机草稿，刷新后恢复。'}
        </p>
        <button
          type="button"
          data-testid="ai-u3-l03-reset"
          onClick={resetAll}
          className="mt-2 rounded-[14px] border border-[#e7edf5] bg-white px-4 py-2 text-sm text-[#18243a]"
        >
          恢复默认
        </button>
        <p className="mt-4 text-sm leading-7 text-[#6f7d92]">
          本课只用本地规则校验合成记录，不调用外部模型、不上传任何数据。生成式内容只在详案里写方向，本课不实现。
        </p>
      </div>
    </main>
  )
}
