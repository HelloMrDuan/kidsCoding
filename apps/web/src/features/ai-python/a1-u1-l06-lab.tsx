'use client'

import { useEffect, useRef, useState } from 'react'
import {
  confusionMatrix,
  RULE_V1_PYTHON,
  RULE_V2_PYTHON,
  STUDENT_SOURCE_LIMIT,
  type ConfusionMatrix,
  type FruitName,
  type Judgment,
  type RuleId,
} from './fruit-classifier'
import {
  buildL06SandboxSource,
  parseL06SandboxJudgments,
  scorePredictions,
  SECOND_BATCH_ROWS,
} from './a1-u1-l06'

type SandboxEvent = { kind: 'FRAME_READY' | 'LOADED' | 'RESULT'; id?: number; output?: string; error?: string | null }

type RunResult =
  | { ok: true; judgments: Judgment[]; matrix: ConfusionMatrix }
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

const FRUIT_OPTIONS: FruitName[] = ['苹果', '香蕉', '橙子']

export function AiPythonU1L06Lab() {
  const [ruleV1, setRuleV1] = useState(RULE_V1_PYTHON)
  const [ruleV2, setRuleV2] = useState(RULE_V2_PYTHON)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState<RuleId | null>(null)
  const [status, setStatus] = useState('先做预测练习，再运行沙箱复验。首次运行需要加载 Python 引擎。')
  const [results, setResults] = useState<Record<RuleId, RunResult | null>>({ v1: null, v2: null })
  const [touched, setTouched] = useState<Record<RuleId, boolean>>({ v1: false, v2: false })
  const [predictions, setPredictions] = useState<Record<string, FruitName | undefined>>({})
  const [predictionScores, setPredictionScores] = useState<Record<RuleId, { correct: number; total: number } | null>>({ v1: null, v2: null })
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
        const parsed = parseL06SandboxJudgments(event.data.output ?? '')
        if (parsed.error) {
          setResults((prev) => ({ ...prev, [rule]: { ok: false, error: parsed.error } }))
          setStatus(`规则 ${rule} 的沙箱输出无法解析，未生成矩阵：${parsed.error}`)
          return
        }
        setResults((prev) => ({
          ...prev,
          [rule]: { ok: true, judgments: parsed.judgments, matrix: confusionMatrix(parsed.judgments, 'test') },
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
    const built = buildL06SandboxSource(ruleCode)
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
    const built = buildL06SandboxSource(rule === 'v1' ? ruleV1 : ruleV2)
    return `规则代码 ${built.studentCode.length} 字（学生源码上限 5000 字）· 课节静态数据 ${built.lessonStaticLength} 字（不计入学生源码）· 本次传输共 ${built.transmitted.length} 字（沙箱上限 5000 字）`
  }

  function checkPredictions(rule: RuleId) {
    const perSample: Record<string, FruitName | undefined> = {}
    for (const row of SECOND_BATCH_ROWS) perSample[row.id] = predictions[`${rule}:${row.id}`]
    if (SECOND_BATCH_ROWS.some((row) => perSample[row.id] === undefined)) {
      setStatus('请先为 6 条样本都选好预测，再核对。')
      return
    }
    const scored = scorePredictions(perSample, rule)
    setPredictionScores((prev) => ({ ...prev, [rule]: { correct: scored.correct, total: scored.total } }))
    setStatus(`规则 ${rule} 预测核对完成：${scored.correct}/${scored.total}。预测用的是固定规则、不改规则，所以不污染沙箱复验。`)
  }

  function renderResult(rule: RuleId) {
    const result = results[rule]
    if (!result) return null
    if (!result.ok) {
      return (
        <p data-testid="ai-u1-l06-error" className="mt-3 rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-900">
          未生成矩阵：{result.error}
        </p>
      )
    }
    const misses = result.judgments.filter((judgment) => judgment.actual !== judgment.predicted)
    return (
      <div data-testid={`ai-u1-l06-matrix-${rule}`} className="mt-3">
        <p className="text-sm font-bold text-slate-900">
          第二批：{result.matrix.correct}/{result.matrix.total}
        </p>
        <MatrixTable matrix={result.matrix} caption="第二批混淆矩阵（行是真实，列是预测）" />
        {misses.length > 0 ? (
          <p className="mt-3 text-sm leading-7 text-slate-800">
            第二批错误：
            {misses.map((miss) => `${miss.id}（真实${miss.actual}，判为${miss.predicted}）`).join('、')}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7 text-slate-800">第二批无错误。</p>
        )}
        {touched[rule] ? (
          <div data-testid={`ai-u1-l06-practice-label-${rule}`} className="mt-3 rounded-xl bg-amber-50 p-4">
            <p className="font-black text-amber-900">练习记录，已污染，不作最终成绩</p>
            <p className="mt-1 text-sm leading-7 text-slate-700">
              这次运行的规则代码已被改动，不再是课堂教过的原规则；为这批样本改过规则后，
              这批样本就不再是干净裁判。本次结果只作练习记录。
            </p>
          </div>
        ) : (
          <div data-testid={`ai-u1-l06-clean-label-${rule}`} className="mt-3 rounded-xl bg-emerald-50 p-4">
            <p className="font-black text-emerald-900">干净复验</p>
            <p className="mt-1 text-sm leading-7 text-slate-700">
              这次运行的是课堂教过的原规则、运行前没有为这批样本改过规则，
              因此这批样本是干净裁判，本次结果可作最终成绩候选。
            </p>
          </div>
        )}
      </div>
    )
  }

  function renderPredictionTable(rule: RuleId) {
    const score = predictionScores[rule]
    return (
      <div className="mt-3">
        <table className="w-full border-collapse text-sm text-slate-800">
          <thead>
            <tr>
              <th className="border border-slate-200 p-2 text-left">样本</th>
              <th className="border border-slate-200 p-2 text-left">真实（复验后可见，预测时先不看）</th>
              <th className="border border-slate-200 p-2 text-left">你的预测</th>
            </tr>
          </thead>
          <tbody>
            {SECOND_BATCH_ROWS.map((row) => (
              <tr key={row.id}>
                <td className="border border-slate-200 p-2">{row.id}（{row.color}，{row.weight} 克）</td>
                <td className="border border-slate-200 p-2">先预测，核对后再看</td>
                <td className="border border-slate-200 p-2">
                  <select
                    data-testid={`ai-u1-l06-predict-${rule}-${row.id}`}
                    value={predictions[`${rule}:${row.id}`] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      setPredictions((prev) => ({ ...prev, [`${rule}:${row.id}`]: value === '' ? undefined : (value as FruitName) }))
                    }}
                    aria-label={`${row.id} 的规则 ${rule} 预测`}
                    className="rounded-lg border border-slate-300 p-2"
                  >
                    <option value="">请选择</option>
                    {FRUIT_OPTIONS.map((fruit) => (
                      <option key={fruit} value={fruit}>{fruit}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          data-testid={`ai-u1-l06-check-${rule}`}
          onClick={() => checkPredictions(rule)}
          className="mt-3 rounded-full bg-indigo-700 px-6 py-3 font-bold text-white"
        >
          核对规则 {rule} 的预测
        </button>
        {score ? (
          <p data-testid={`ai-u1-l06-predict-score-${rule}`} className="mt-2 text-sm font-bold text-slate-900">
            预测得分：规则 {rule} {score.correct}/{score.total}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <main data-testid="ai-u1-l06-lab" className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs font-bold tracking-widest text-indigo-700">课程开发中（未发布、未通过独立复核）</p>
      <h1 className="mt-2 text-2xl font-black text-slate-900">A1-U1 水果分类综合项目</h1>
      <p data-testid="ai-u1-l06-lesson-heading" className="mt-2 font-bold text-slate-900">
        当前课节：A1-U1-L06 综合项目：第二批复验
      </p>
      <p className="mt-2 leading-7 text-slate-700">
        本节只走浏览器本地平面，不调用外部模型，不保存正式成绩。主线台账中本节仍为
        todo，目录仍为 outline_not_playable；本页完成不等于课节完成、发布或通过验证。
      </p>

      <section className="mt-6 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">回顾：为什么需要第二批</h2>
        <p className="mt-2 leading-7 text-slate-700">
          原始 30 条表按水果分层划分：训练集 24 条、测试集 6 条。规则 v1 在原测试集上
          5/6，唯一错误是 T2 金帅苹果（黄、168 克）被判成香蕉；规则 v2 加了“黄且
          150 克以上判苹果”分支后，在原测试集上 6/6。但 v2 是在看过 T2 错误后改的，
          原测试集已不再是干净裁判——“改后 6/6”不得当最终成绩。最终复验必须用一批
          在教学和调规则时都没见过的新样本，就是本节的第二批。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-black text-slate-900">第二批新样本：6 条（新增合成数据）</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          每类水果 2 条；6 条样本的（水果、颜色、重量、直径）没有一行与原始 30 条表重合，
          教学和调规则时都没用过。全合成数据，无真实个人信息。
        </p>
        <table data-testid="ai-u1-l06-dataset" className="mt-3 w-full border-collapse text-sm text-slate-800">
          <thead>
            <tr>
              <th className="border border-slate-200 p-2 text-left">编号</th>
              <th className="border border-slate-200 p-2 text-left">水果</th>
              <th className="border border-slate-200 p-2 text-left">颜色</th>
              <th className="border border-slate-200 p-2 text-left">重量（克）</th>
              <th className="border border-slate-200 p-2 text-left">直径（厘米）</th>
            </tr>
          </thead>
          <tbody>
            {SECOND_BATCH_ROWS.map((row) => (
              <tr key={row.id}>
                <td className="border border-slate-200 p-2">{row.id}</td>
                <td className="border border-slate-200 p-2">{row.fruit}</td>
                <td className="border border-slate-200 p-2">{row.color}</td>
                <td className="border border-slate-200 p-2">{row.weight}</td>
                <td className="border border-slate-200 p-2">{row.diameter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">练习 A：先预测，再运行</h2>
        <p className="mt-2 leading-7 text-slate-700">
          不看答案，先凭规则给每条第二批样本写预测：规则 v1 只看颜色，
          规则 v2 多看“黄且 150 克以上”分支。预测用的是固定规则、不改规则，
          所以不污染后面的沙箱复验。
        </p>
        <h3 className="mt-4 font-black text-slate-900">规则 v1 预测</h3>
        {renderPredictionTable('v1')}
        <h3 className="mt-6 font-black text-slate-900">规则 v2 预测</h3>
        {renderPredictionTable('v2')}
      </section>

      <section className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">练习 B：沙箱复验（真实 Python 运行）</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          规则代码由课节提供，可编辑；第二批数据集与驱动代码由课节静态下发，
          不计入学生源码。运行只用 Python 标准库，不引任何 ML 库。
          直接运行原规则就是干净复验；一旦改动规则代码再运行，结果即记为练习记录。
        </p>
        <label htmlFor="ai-u1-l06-rule-v1" className="mt-4 block font-bold text-slate-900">规则 v1（颜色规则）</label>
        <textarea
          id="ai-u1-l06-rule-v1"
          data-testid="ai-u1-l06-rule-v1"
          spellCheck={false}
          disabled={busy !== null}
          value={ruleV1}
          onChange={(event) => { setRuleV1(event.target.value); setTouched((prev) => ({ ...prev, v1: true })) }}
          rows={6}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm leading-7 text-slate-900 disabled:opacity-70"
          aria-label="规则 v1 代码编辑区"
        />
        <p data-testid="ai-u1-l06-length-v1" className="mt-1 text-xs text-slate-500">{lengthLine('v1')}</p>
        <button
          type="button"
          data-testid="ai-u1-l06-run-v1"
          onClick={() => run('v1')}
          disabled={!ready || busy !== null}
          className="mt-3 rounded-full bg-indigo-700 px-6 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-50"
        >
          {busy === 'v1' ? '运行中…' : '▶ 运行规则 v1'}
        </button>
        {renderResult('v1')}

        <label htmlFor="ai-u1-l06-rule-v2" className="mt-8 block font-bold text-slate-900">规则 v2（颜色 + 重量分支）</label>
        <textarea
          id="ai-u1-l06-rule-v2"
          data-testid="ai-u1-l06-rule-v2"
          spellCheck={false}
          disabled={busy !== null}
          value={ruleV2}
          onChange={(event) => { setRuleV2(event.target.value); setTouched((prev) => ({ ...prev, v2: true })) }}
          rows={8}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm leading-7 text-slate-900 disabled:opacity-70"
          aria-label="规则 v2 代码编辑区"
        />
        <p data-testid="ai-u1-l06-length-v2" className="mt-1 text-xs text-slate-500">{lengthLine('v2')}</p>
        <button
          type="button"
          data-testid="ai-u1-l06-run-v2"
          onClick={() => run('v2')}
          disabled={!ready || busy !== null}
          className="mt-3 rounded-full bg-indigo-700 px-6 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-50"
        >
          {busy === 'v2' ? '运行中…' : '▶ 运行规则 v2'}
        </button>
        {renderResult('v2')}
      </section>

      <section className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">误分类分析：v2 剩下的那一个错误</h2>
        <p className="mt-2 leading-7 text-slate-700">
          第二批里 v2 只错一条：S2 黄苹果 142 克。重量分支的门槛是 150 克，
          142 克够不着门槛，所以 v2 仍把它判成香蕉——v2 修好了重黄苹果（S1，172 克），
          没修好轻黄苹果。这是“边界代价”：颜色撞车的地方，单看重量门槛总有一侧会漏。
          门槛也不是越低越好，降下去会把重香蕉判成苹果；在这个只有颜色和重量的规则里，
          黄苹果问题没有免费解法，这就是本节要留下的诚实结论。
        </p>
      </section>

      <section className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">项目总结：两栏成绩</h2>
        <p className="mt-2 leading-7 text-slate-700">
          原测试集成绩（已污染，不作最终成绩）：v1 5/6，v2 6/6。
          第二批干净复验成绩：v1 4/6，v2 5/6。两栏都要报，只报第二栏是诚实分，
          只报第一栏是虚高分。本分类器只认苹果、香蕉、橙子三类，只用颜色和重量规则；
          新类别（如梨）超范围，颜色缺失时应拒答而不是猜一个；数据全合成，
          结论不能直接搬到真实水果上。下一步是更多样本、更多特征，但那是后续课的内容，
          不在本节假装做完。
        </p>
      </section>

      <p data-testid="ai-u1-l06-status" role="status" aria-live="polite" className="mt-6 rounded-xl bg-sky-50 p-4 text-sm leading-7 text-slate-800">
        {status}
      </p>
      <p className="mt-4 text-xs leading-6 text-slate-600">
        隔离说明：代码仅在无同源权限的 sandbox iframe 及其 Web Worker 里的 Pyodide 运行，
        不在 Next.js 服务器执行。矩阵由沙箱输出统计得出，不产生可信成绩记录；
        本节无保存与恢复能力，刷新后预测与运行结果不保留。
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
