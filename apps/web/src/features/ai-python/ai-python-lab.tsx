'use client'

import { useEffect, useRef, useState } from 'react'
import { AI_PYTHON_PILOT_STAGE_TITLES } from './ai-python-engine'
import {
  buildSandboxSource,
  confusionMatrix,
  FRUIT_DATASET,
  parseSandboxJudgments,
  RULE_V1_PYTHON,
  RULE_V2_PYTHON,
  STUDENT_SOURCE_LIMIT,
  testMisses,
  TRAIN_ROWS,
  TEST_ROWS,
  type ConfusionMatrix,
  type Judgment,
  type RuleId,
} from './fruit-classifier'

type SandboxEvent = { kind: 'FRAME_READY' | 'LOADED' | 'RESULT'; id?: number; output?: string; error?: string | null }

type RunResult =
  | { ok: true; judgments: Judgment[]; train: ConfusionMatrix; test: ConfusionMatrix }
  | { ok: false; error: string }

function MatrixTable({ matrix, caption }: { matrix: ConfusionMatrix; caption: string }) {
  return (
    <div className="mt-3">
      <p className="text-sm font-bold text-slate-800">{caption}</p>
      <table className="mt-2 w-full border-collapse text-sm text-slate-800">
        <thead>
          <tr>
            <th className="border border-slate-200 p-2 text-left">真实＼预测</th>
            {matrix.labels.map((label) => (
              <th key={label} className="border border-slate-200 p-2">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.labels.map((label, rowIndex) => (
            <tr key={label}>
              <th className="border border-slate-200 p-2 text-left">{label}</th>
              {matrix.counts[rowIndex].map((value, colIndex) => (
                <td key={`${label}-${matrix.labels[colIndex]}`} className="border border-slate-200 p-2 text-center">{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AiPythonLab({ lessonId }: { lessonId: string }) {
  const [ruleV1, setRuleV1] = useState(RULE_V1_PYTHON)
  const [ruleV2, setRuleV2] = useState(RULE_V2_PYTHON)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState<RuleId | null>(null)
  const [status, setStatus] = useState('修改规则代码后，点击运行。首次运行需要加载 Python 引擎。')
  const [results, setResults] = useState<Record<RuleId, RunResult | null>>({ v1: null, v2: null })
  const frame = useRef<HTMLIFrameElement>(null)
  const requestId = useRef(0)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = useRef(false)
  const pendingRule = useRef<RuleId | null>(null)

  useEffect(() => {
    const frameNode = frame.current
    const readyProbe = window.setInterval(() => {
      frame.current?.contentWindow?.postMessage({ kind: 'PING' }, '*')
    }, 300)
    const handler = (event: MessageEvent<SandboxEvent>) => {
      // A sandboxed iframe has an opaque origin and no access to app cookies or DOM.
      if (event.source !== frame.current?.contentWindow || event.origin !== 'null') return
      if (event.data?.kind === 'FRAME_READY') {
        clearInterval(readyProbe)
        setReady(true)
        return
      }
      if (!active.current || !event.data || event.data.id !== requestId.current) return
      if (event.data.kind === 'LOADED') {
        setStatus('Python 已加载，正在运行规则……')
        if (timeout.current) clearTimeout(timeout.current)
        timeout.current = setTimeout(() => {
          frame.current?.contentWindow?.postMessage({ kind: 'STOP', id: requestId.current }, '*')
          active.current = false
          setBusy(null)
          setStatus('运行超过6秒，已停止当前任务。请检查规则代码是否存在无限循环。')
        }, 6000)
      } else if (event.data.kind === 'RESULT') {
        if (timeout.current) clearTimeout(timeout.current)
        active.current = false
        const rule = pendingRule.current
        setBusy(null)
        const sandboxError = event.data.error ?? null
        if (!rule) {
          setStatus('沙箱返回了无法对应的结果，未生成矩阵。')
          return
        }
        if (sandboxError) {
          setResults((prev) => ({ ...prev, [rule]: { ok: false, error: sandboxError } }))
          setStatus(`规则 ${rule} 运行失败，未生成矩阵：${sandboxError}`)
          return
        }
        const parsed = parseSandboxJudgments(event.data.output ?? '')
        if (parsed.error) {
          setResults((prev) => ({ ...prev, [rule]: { ok: false, error: parsed.error } }))
          setStatus(`规则 ${rule} 的沙箱输出无法解析，未生成矩阵：${parsed.error}`)
          return
        }
        setResults((prev) => ({
          ...prev,
          [rule]: {
            ok: true,
            judgments: parsed.judgments,
            train: confusionMatrix(parsed.judgments, 'train'),
            test: confusionMatrix(parsed.judgments, 'test'),
          },
        }))
        setStatus(`规则 ${rule} 运行完成，矩阵由沙箱逐条判定输出统计得出。`)
      }
    }
    window.addEventListener('message', handler)
    return () => {
      clearInterval(readyProbe)
      window.removeEventListener('message', handler)
      if (timeout.current) clearTimeout(timeout.current)
      frameNode?.contentWindow?.postMessage({ kind: 'STOP', id: requestId.current }, '*')
      active.current = false
    }
  }, [])

  function run(rule: RuleId) {
    if (!frame.current?.contentWindow || !ready || busy) return
    const ruleCode = rule === 'v1' ? ruleV1 : ruleV2
    if (ruleCode.length > STUDENT_SOURCE_LIMIT) {
      setResults((prev) => ({ ...prev, [rule]: { ok: false, error: '规则代码长度不得超过5000字符。' } }))
      setStatus('规则代码长度不得超过5000字符，未发送到沙箱。')
      return
    }
    const built = buildSandboxSource(ruleCode)
    if (built.transmitted.length > STUDENT_SOURCE_LIMIT) {
      setResults((prev) => ({
        ...prev,
        [rule]: { ok: false, error: `规则代码 ${ruleCode.length} 字 + 课节静态数据 ${built.lessonStaticLength} 字，本次传输共 ${built.transmitted.length} 字，超过沙箱 5000 字上限，未发送到沙箱。` },
      }))
      setStatus('本次传输超过沙箱 5000 字上限，未发送到沙箱。')
      return
    }
    requestId.current += 1
    const id = requestId.current
    setBusy(rule)
    pendingRule.current = rule
    setStatus('正在加载真实 Python 引擎，请稍候……')
    active.current = true
    timeout.current = setTimeout(() => {
      frame.current?.contentWindow?.postMessage({ kind: 'STOP', id }, '*')
      active.current = false
      setBusy(null)
      setStatus('Python 引擎加载超时。请确认网络可以访问 jsDelivr，然后重试。')
    }, 35000)
    frame.current.contentWindow.postMessage({ kind: 'RUN', id, source: built.transmitted }, '*')
  }

  function lengthLine(rule: RuleId): string {
    const built = buildSandboxSource(rule === 'v1' ? ruleV1 : ruleV2)
    return `规则代码 ${built.studentCode.length} 字（学生源码上限 5000 字）· 课节静态数据 ${built.lessonStaticLength} 字（不计入学生源码）· 本次传输共 ${built.transmitted.length} 字（沙箱上限 5000 字）`
  }

  function renderResult(rule: RuleId) {
    const result = results[rule]
    if (!result) return null
    if (!result.ok) {
      return (
        <p data-testid="ai-python-error" className="mt-3 rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-900">
          未生成矩阵：{result.error}
        </p>
      )
    }
    const misses = testMisses(result.judgments)
    return (
      <div data-testid={`ai-python-matrix-${rule}`} className="mt-3">
        <p className="text-sm font-bold text-slate-900">
          训练：{result.train.correct}/{result.train.total} · 测试：{result.test.correct}/{result.test.total}
        </p>
        <MatrixTable matrix={result.train} caption="训练集混淆矩阵（行是真实，列是预测）" />
        <MatrixTable matrix={result.test} caption="测试集混淆矩阵（行是真实，列是预测）" />
        {misses.length > 0 ? (
          <p className="mt-3 text-sm leading-7 text-slate-800">
            测试集错误：
            {misses.map((miss) => `${miss.id}（真实${miss.actual}，判为${miss.predicted}）`).join('、')}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7 text-slate-800">测试集无错误。</p>
        )}
        {rule === 'v2' ? (
          <div data-testid="ai-python-v2-practice-label" className="mt-3 rounded-xl bg-amber-50 p-4">
            <p className="font-black text-amber-900">练习记录，已污染，不作最终成绩</p>
            <p className="mt-1 text-sm leading-7 text-slate-700">
              规则 v2 是在看过测试集错误（T2 金帅苹果）后改的，原测试集已不再是干净裁判。
              最终复验须用第二批新测试样本，即 L06，不在本试点。
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  const stageTitle = AI_PYTHON_PILOT_STAGE_TITLES[lessonId] ?? lessonId

  return (
    <main data-testid="ai-python-lab" className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs font-bold tracking-widest text-indigo-700">实验试玩（非正式课程）</p>
      <h1 className="mt-2 text-2xl font-black text-slate-900">A1-U1 水果分类器试玩</h1>
      <p data-testid="ai-python-lesson-heading" className="mt-2 font-bold text-slate-900">
        当前课节：{lessonId} {stageTitle}
      </p>
      <p className="mt-2 leading-7 text-slate-700">
        试点范围：仅 L01→L05 水果分类器纵线。本地平面运行，不调用外部模型，不保存正式成绩。
        L06 第二批复验不在本试点。本试玩不代表课节已完成、已发布或已通过验证。
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-black text-slate-900">L01 观察水果数据：合成数据表 30 条</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          训练集 {TRAIN_ROWS.length} 条、测试集 {TEST_ROWS.length} 条；每类水果训练 8 条、测试 2 条。
          全合成数据，无真实个人信息。
        </p>
        <table data-testid="ai-python-dataset" className="mt-3 w-full border-collapse text-sm text-slate-800">
          <thead>
            <tr>
              <th className="border border-slate-200 p-2 text-left">编号</th>
              <th className="border border-slate-200 p-2 text-left">水果</th>
              <th className="border border-slate-200 p-2 text-left">颜色</th>
              <th className="border border-slate-200 p-2 text-left">重量（克）</th>
              <th className="border border-slate-200 p-2 text-left">直径（厘米）</th>
              <th className="border border-slate-200 p-2 text-left">集合</th>
            </tr>
          </thead>
          <tbody>
            {FRUIT_DATASET.map((row) => (
              <tr key={row.id}>
                <td className="border border-slate-200 p-2">{row.id}</td>
                <td className="border border-slate-200 p-2">{row.fruit}</td>
                <td className="border border-slate-200 p-2">{row.color}</td>
                <td className="border border-slate-200 p-2">{row.weight}</td>
                <td className="border border-slate-200 p-2">{row.diameter}</td>
                <td className="border border-slate-200 p-2">{row.set === 'train' ? '训练' : '测试'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">L02 选择合适特征</h2>
        <p className="mt-2 leading-7 text-slate-700">
          颜色是主特征（类间基本分开，只有黄苹果这类边界情形会撞车）；重量在苹果和橙子间重叠，
          单看重量分不清；直径只能分出香蕉；行号是坏特征，与水果种类毫无关系。
        </p>
      </section>

      <section className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">L03 划分训练与测试</h2>
        <p className="mt-2 leading-7 text-slate-700">
          按水果分层固定划分：每类前 8 条进训练集、后 2 条进测试集。测试集是没见过的考题；
          在测试集上调过规则后，该测试集就不再是干净裁判（见 L05 的练习记录标注）。
        </p>
      </section>

      <section className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">L04 训练简单分类器：规则代码</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          规则代码由课节提供，可编辑；数据集与驱动代码由课节静态下发，不计入学生源码。
          运行只用 Python 标准库，不引任何 ML 库。
        </p>
        <label htmlFor="ai-python-rule-v1" className="mt-4 block font-bold text-slate-900">规则 v1（颜色规则）</label>
        <textarea
          id="ai-python-rule-v1"
          data-testid="ai-python-rule-v1"
          spellCheck={false}
          disabled={busy !== null}
          value={ruleV1}
          onChange={(event) => setRuleV1(event.target.value)}
          rows={6}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm leading-7 text-slate-900 disabled:opacity-70"
          aria-label="规则 v1 代码编辑区"
        />
        <p data-testid="ai-python-length-v1" className="mt-1 text-xs text-slate-500">{lengthLine('v1')}</p>
        <button
          type="button"
          data-testid="ai-python-run-v1"
          onClick={() => run('v1')}
          disabled={!ready || busy !== null}
          className="mt-3 rounded-full bg-indigo-700 px-6 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-50"
        >
          {busy === 'v1' ? '运行中…' : '▶ 运行规则 v1'}
        </button>
        {renderResult('v1')}

        <label htmlFor="ai-python-rule-v2" className="mt-8 block font-bold text-slate-900">规则 v2（颜色 + 重量分支）</label>
        <textarea
          id="ai-python-rule-v2"
          data-testid="ai-python-rule-v2"
          spellCheck={false}
          disabled={busy !== null}
          value={ruleV2}
          onChange={(event) => setRuleV2(event.target.value)}
          rows={8}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm leading-7 text-slate-900 disabled:opacity-70"
          aria-label="规则 v2 代码编辑区"
        />
        <p data-testid="ai-python-length-v2" className="mt-1 text-xs text-slate-500">{lengthLine('v2')}</p>
        <button
          type="button"
          data-testid="ai-python-run-v2"
          onClick={() => run('v2')}
          disabled={!ready || busy !== null}
          className="mt-3 rounded-full bg-indigo-700 px-6 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-50"
        >
          {busy === 'v2' ? '运行中…' : '▶ 运行规则 v2'}
        </button>
        {renderResult('v2')}
      </section>

      <section className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">L05 混淆矩阵基础</h2>
        <p className="mt-2 leading-7 text-slate-700">
          矩阵由沙箱逐条判定输出统计得出：行是真实标签，列是预测标签，对角线是判对。
          只看总数会藏起错误去向，矩阵暴露错误去向——这就是矩阵存在的理由。
        </p>
      </section>

      <p data-testid="ai-python-status" role="status" aria-live="polite" className="mt-6 rounded-xl bg-sky-50 p-4 text-sm leading-7 text-slate-800">
        {status}
      </p>
      <p className="mt-4 text-xs leading-6 text-slate-600">
        隔离说明：代码仅在无同源权限的 sandbox iframe 及其 Web Worker 里的 Pyodide 运行，
        不在 Next.js 服务器执行。矩阵由沙箱输出统计得出，不产生可信成绩记录。
        沙箱限制了应用数据访问，但不是通用的恶意代码安全执行平台。
      </p>
      <iframe
        ref={frame}
        title="隔离的 Python 执行沙箱"
        src="/python-lab-sandbox.html"
        sandbox="allow-scripts"
        className="hidden"
        onLoad={() => setReady(true)}
        aria-hidden="true"
        tabIndex={-1}
      />
    </main>
  )
}
