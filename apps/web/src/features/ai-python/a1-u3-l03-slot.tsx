/**
 * A1-U3-L03 JSON 校验编辑器插槽（JsonEditorSlot）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md
 * 与 L02 的插槽打法。外壳只负责布局、抽屉、文件菜单与自动保存；
 * 字段表、JSON 编辑、校验、字段级报错、判定与作品总结全部在本插槽。
 *
 * 与旧独立课堂 a1-u3-l03-lab.tsx 的差别（外壳承担的部分已删）：
 * - 删 h1 标题区与课节导言（外壳目标栏与任务抽屉承担）；
 * - 删三级提示按钮与提示区（外壳任务抽屉顺序揭示，提示揭示态不写草稿）；
 * - 删本地保存状态行与恢复默认按钮（外壳文件菜单与自动保存承担）；
 * - 删本地 localStorage 保存（外壳信封草稿 kidscoding-draft:A1-U3-L03）。
 *
 * 保留并与旧课堂一致的 testid（E2E 移植时机械对应）：
 * ai-u3-l03-json-input / ai-u3-l03-validate / ai-u3-l03-example-* /
 * ai-u3-l03-result / ai-u3-l03-verdict / ai-u3-l03-work。
 *
 * 判定三层分离：插槽内只展示本次校验的判定（五项逐项 + 结论 +
 * 方法证据），不写“已掌握”；编辑后旧判定失效，须重新点校验。
 * 草稿状态行只显示编辑区字数，不显示 hintLevel（外壳抽屉揭示态
 * 不回写草稿，旧 L02 教训：插槽不得显示它无法更新的计数）。
 */

'use client'

import { useState } from 'react'
import type { EditorSlotProps } from '../lessons/workspace/workspace-slots'
import { buildJsonJudgment } from './a1-u3-l03-adapter'
import { coerceDraft, type L03Draft } from './a1-u3-l03-draft'
import {
  FRUIT_SCHEMA_FIELDS,
  RECORD_EXAMPLES,
  validateRecordText,
  type RecordValidation,
} from './a1-u3-l03'

/**
 * 字段表：与旧课堂同款内容。取值范围列（“苹果 / 香蕉 / 橙子”）自然宽度
 * 超过 375px 视口，必须包一层横向滚动，否则整页横向溢出（旧课堂 lab.tsx
 * 同样用 overflow-x-auto 包裹这张表）。
 */
function SchemaTable() {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>字段</th>
            <th>必填</th>
            <th>类型</th>
            <th>取值范围</th>
          </tr>
        </thead>
        <tbody>
          {FRUIT_SCHEMA_FIELDS.map((field) => (
            <tr key={field.field}>
              <td>{field.field}</td>
              <td>{field.required ? '是' : '否'}</td>
              <td>{field.type}</td>
              <td>{field.values}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function JsonEditorSlot({ initial, onChange, editable }: EditorSlotProps) {
  const [draft, setDraft] = useState<L03Draft>(() => coerceDraft(initial))
  const [result, setResult] = useState<RecordValidation | null>(null)

  function persist(next: L03Draft) {
    setDraft(next)
    onChange(next)
  }

  function validate() {
    setResult(validateRecordText(draft.jsonText))
  }

  function loadExample(json: string) {
    persist({ ...draft, jsonText: json })
    setResult(null)
  }

  const judgment = result ? buildJsonJudgment(result, draft) : null

  if (!editable) {
    return (
      <div className="kc-stack">
        <p>本课为只读预览：先看字段表，再看当前记录的校验结果。</p>
        <SchemaTable />
        <pre>{draft.jsonText}</pre>
      </div>
    )
  }

  return (
    <div className="kc-stack">
      <p>课程开发中：本课为本地规则 JSON 校验，不调用外部模型、不接网关。</p>

      <SchemaTable />

      <label htmlFor="a1-u3-l03-json-input">把水果写成一条 JSON 记录</label>
      <textarea
        id="a1-u3-l03-json-input"
        data-testid="ai-u3-l03-json-input"
        value={draft.jsonText}
        onChange={(event) => {
          persist({ ...draft, jsonText: event.target.value })
          setResult(null)
        }}
        rows={8}
        placeholder='{"名称": "苹果", "颜色": "红", "重量": 182}'
      />

      <div>
        <span>例子：</span>
        {RECORD_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            data-testid={`ai-u3-l03-example-${example.id}`}
            onClick={() => loadExample(example.json)}
          >
            {example.label}
          </button>
        ))}
      </div>

      <button type="button" data-testid="ai-u3-l03-validate" onClick={validate}>
        执行校验
      </button>

      {result && judgment && (
        <div data-testid="ai-u3-l03-result">
          {!result.parseOk && <p>{result.parseError}</p>}
          {result.parseOk && (
            <ul>
              {(
                [
                  '字段齐全',
                  '必填非空',
                  '类型正确',
                  '枚举内',
                  '数值范围',
                ] as const
              ).map((check) => (
                <li key={check}>
                  {check}：{result.failedChecks.includes(check) ? '失败' : '通过'}
                </li>
              ))}
            </ul>
          )}
          {result.fieldErrors.map((error) => (
            <p key={error.field}>
              「{error.field}」{error.why}。{error.fix}
            </p>
          ))}
          <p data-testid="ai-u3-l03-verdict">{judgment.layers[1].detail}</p>
          <p>{judgment.conclusion}</p>
          <p>{judgment.methodEvidence}</p>
        </div>
      )}

      {result?.passed && (
        <div data-testid="ai-u3-l03-work">
          <h3>作品总结</h3>
          <p>你已修出一条合规记录：</p>
          <pre>{draft.jsonText}</pre>
        </div>
      )}

      {result && !result.passed && <p>先修到五项全过：按上面字段级报错逐条改，改完再点校验。</p>}

      <p data-testid="ai-u3-l03-draft-status">
        本机草稿状态：编辑区 {draft.jsonText.length} 字。
        要清空全部内容，用顶部文件菜单里的“恢复初始”。
      </p>
    </div>
  )
}
