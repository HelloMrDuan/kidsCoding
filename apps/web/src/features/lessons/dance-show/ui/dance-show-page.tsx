/**
 * OPS-038《我的舞蹈秀》桌面样板页面（第三阶段：学习模式层）。
 *
 * 架构（负责人裁定）：官方 Scratch GUI standalone + 独立部署是唯一真实
 * 项目编辑环境；KidsCoding 只增加学习引导层，不重写编辑器布局，
 * 不自研角色/造型/声音/背景编辑器。
 *
 * - 右侧是真实的 Scratch GUI（iframe 加载桥接宿主页面 bridge-host.html）。
 *   孩子在里面操作的是同一份真实 Scratch 项目（自己的舞蹈作品）。
 * - 左侧是学习引导层：步骤、目标、提示、检查。指引是浮层抽屉（可收起），
 *   展开时浮在编辑器上方、收起后 GUI 占满整宽，不长期挤占编辑空间。
 *   浮层是必需的：实测 Scratch GUI 在宽度 ≤1000px 时隐藏 File/Edit
 *   菜单（1024px 断点），固定分栏会把 GUI 压到约 860px 导致孩子无法
 *   导入/导出 .sb3；浮层让 GUI 恒得内容区全宽（1220px@1440）。
 * - P0 fail-closed：GUI 地址只读环境变量 NEXT_PUBLIC_SCRATCH_GUI_URL，
 *   未配置时不渲染 iframe（绝不默认指向访客的 localhost），显示明确
 *   的未配置提示。初始作品地址同理（NEXT_PUBLIC_DANCE_SHOW_STARTER_URL）。
 * - P1 桥接（Round 2）：学习层经 ScratchBridgeClient 向 GUI 宿主页面
 *   请求当前作品（get-project），拿到 projectJson 后直接评价，
 *   不需要手动导出文件；手动导出文件通道保留作备用。作品取回后存入
 *   浏览器 IndexedDB；页面加载时若库里有已保存作品，通过桥接载入 GUI
 *   恢复。桥接协议与安全校验见 gui-bridge.ts（与 P1 原型同一协议，
 *   永不 postMessage('*')）。
 * - 评价读的是 GUI 里那份真实项目的 project.json（本地解析），
 *   不是只检查积木字符串，也不是预制答案。步骤 8 只认真实的
 *   保存→关闭→重新打开流程（恢复证据），见 evaluate-project.ts。
 * - 音乐“真人听音验收”无法由无头浏览器完成：本页明确标注为待真人验收，
 *   不自动判通过。
 *
 * V2 视觉：外壳用冻结 V2 的深蓝 #152238 与科技蓝 #2463eb，
 * 内容区用中性浅色；编辑器本身保持 Scratch GUI 原生界面（首版不重写）。
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DANCE_SHOW_LESSON_GOAL,
  DANCE_SHOW_LESSON_TITLE,
  DANCE_SHOW_STEPS,
} from '@/features/lessons/dance-show/dance-show-steps'
import {
  evaluateProject,
  evaluationScopeNote,
  parseSb3File,
  projectHash,
  type RestoreEvidence,
  type RunObservations,
  type ScratchProject,
  type StepCheckResult,
} from '@/features/lessons/dance-show/evaluate-project'
import {
  BRIDGE_MAX_PAYLOAD_BYTES,
  ScratchBridgeClient,
} from '@/features/lessons/dance-show/gui-bridge'
import {
  loadSavedProject,
  saveProjectToStore,
} from '@/features/lessons/dance-show/project-store'

/**
 * GUI 地址只读环境变量，无默认值（P0 fail-closed）。
 * 未配置时页面不渲染 iframe、不连任何 localhost，明确提示未配置。
 * 已配置时该地址应指向桥接宿主页面 bridge-host.html（由部署时提供）。
 */
const GUI_URL = process.env.NEXT_PUBLIC_SCRATCH_GUI_URL ?? ''
/** 初始作品 .sb3 的下载地址（部署时把 P3 starter 文件放到静态服务上）。 */
const STARTER_URL = process.env.NEXT_PUBLIC_DANCE_SHOW_STARTER_URL ?? ''

const GUI_ORIGIN = (() => {
  if (GUI_URL === '') return ''
  try {
    return new URL(GUI_URL).origin
  } catch {
    return ''
  }
})()
/**
 * 地址是否可用：非空且能解析出合法 origin。
 * 相对路径等非法地址视为未配置——不渲染 iframe、不建桥接、检查按钮禁用，
 * 与未配置时一致（P0 fail-closed）。
 */
const GUI_CONFIGURED = GUI_URL !== '' && GUI_ORIGIN !== ''

const NAVY = '#152238'
const NAVY_2 = '#1c2c46'
const BLUE = '#2463eb'
const BG = '#f3f6fb'
const CARD = '#ffffff'
const BORDER = '#e7edf5'
const TEXT = '#18243a'
const MUTED = '#6f7d92'
const GREEN = '#148767'
const AMBER = '#ad6b20'
const RED = '#d64c4c'

type BridgeStatus = 'unconfigured' | 'connecting' | 'ready' | 'failed'

export default function DanceShowPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({})
  const [project, setProject] = useState<ScratchProject | null>(null)
  const [results, setResults] = useState<StepCheckResult[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>(
    GUI_CONFIGURED ? 'connecting' : 'unconfigured',
  )
  const [projectReady, setProjectReady] = useState(false)
  /**
   * 是否正在恢复上次保存的作品。
   * 恢复完成前 projectReady 保持 false，检查/加载按钮保持禁用：
   * 否则恢复完成前点“检查”会把 GUI 默认作品写进 IndexedDB，
   * 静默覆盖用户已保存的作品；在 GUI 里编辑也会被 loadProject 覆盖。
   */
  const [restoring, setRestoring] = useState(false)
  const [restoreEvidence, setRestoreEvidence] = useState<RestoreEvidence | null>(
    null,
  )
  const [observations, setObservations] = useState<RunObservations | undefined>(
    undefined,
  )
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [starterState, setStarterState] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const clientRef = useRef<ScratchBridgeClient | null>(null)

  // P1 桥接接线：不等 ready，直接轮询等作品非空，再恢复上次保存的作品。
  // ready 只发一次，若在监听挂载前就已发出（iframe 先加载完成，
  // 或开发模式 StrictMode 二次挂载），单靠它会永远等不到；实测
  // get-project 在桥接就绪后随发随回，轮询本身就是就绪探测。
  // 原型 bridge.js 在 window load 时宣告 ready，早于默认作品加载完成
  // 约 1–3 秒（此时 get-project 返回空作品），所以这里轮询等非空。
  useEffect(() => {
    if (!GUI_CONFIGURED || !GUI_ORIGIN) {
      setBridgeStatus('unconfigured')
      return
    }
    const iframe = iframeRef.current
    if (!iframe) return
    let cancelled = false
    let client: ScratchBridgeClient
    try {
      client = new ScratchBridgeClient({
        iframe,
        targetOrigin: GUI_ORIGIN,
        allowlist: [GUI_ORIGIN],
      })
    } catch (e) {
      setBridgeStatus('failed')
      setError(
        `创作环境配置有误：${e instanceof Error ? e.message : String(e)}`,
      )
      return
    }
    clientRef.current = client
    client.start()
    const setup = async () => {
      try {
        await client.waitUntilProjectNonEmpty()
        if (cancelled) return
        setBridgeStatus('ready')
        // 先恢复上次保存的作品，再启用检查/加载按钮。
        // projectReady 之前若已启用，恢复完成前点“检查”会把 GUI
        // 默认作品写进 IndexedDB，静默覆盖用户已保存的作品；
        // 恢复期间在 GUI 里编辑也会被 loadProject 覆盖。
        // 恢复完成（或确认无已保存作品）后才设 ready；按钮已 gate
        // 在 projectReady 上，随 ready 延后自动保持禁用。
        setRestoring(true)
        const saved = await loadSavedProject().catch(() => null)
        if (cancelled) return
        if (saved) {
          await client.loadProject({ format: 'sb3', data: saved.sb3 })
          const check = await client.getProject()
          if (cancelled) return
          if (check.project.targets.length > 0) {
            const evidence: RestoreEvidence = {
              savedAt: saved.savedAt,
              loadedAt: Date.now(),
              restored: true,
              // 证据绑定恢复当时的作品内容：恢复后又改过的作品不能搭便车。
              projectHash: projectHash(check.project),
            }
            setRestoreEvidence(evidence)
            setObservations(check.observations)
            setProject(check.project)
            setResults(
              evaluateProject(check.project, {
                restoreEvidence: evidence,
                runObservations: check.observations,
                projectHash: evidence.projectHash,
              }),
            )
            setFileName('上次保存的作品（已恢复）')
            setSavedAt(saved.savedAt)
          }
          // 恢复后仍是空作品：不认恢复证据（现有逻辑保留），
          // 但恢复流程已走完，继续设 ready（GUI 里是默认作品，
          // 用户可正常操作；不因恢复验证失败而卡住页面）。
        }
        if (cancelled) return
        setRestoring(false)
        setProjectReady(true)
      } catch (e) {
        if (cancelled) return
        setRestoring(false)
        setBridgeStatus('failed')
        setError(
          `创作环境连接失败：${e instanceof Error ? e.message : String(e)}。可以改用“从文件检查”：在编辑器里“文件 → 保存到你的电脑”，再选那个 .sb3 文件。`,
        )
      }
    }
    void setup()
    return () => {
      cancelled = true
      client.dispose()
      clientRef.current = null
    }
  }, [])

  const doneCount = results ? results.filter((r) => r.pass).length : 0

  const applyEvaluated = useCallback(
    (
      evaluated: StepCheckResult[],
      parsed: ScratchProject,
      name: string,
      obs: RunObservations | undefined,
    ) => {
      setProject(parsed)
      setResults(evaluated)
      setFileName(name)
      setObservations(obs)
      // 自动跳到第一个未通过的步骤，方便孩子继续。
      const firstFail = evaluated.findIndex((r) => !r.pass)
      if (firstFail >= 0) setCurrentStep(firstFail)
    },
    [],
  )

  // “检查我的作品”（主通道）：经桥接直接读 GUI 里正在改的作品，不用导出文件。
  const handleBridgeCheck = useCallback(async () => {
    const client = clientRef.current
    if (!client || !projectReady) {
      setError('创作环境还没准备好，请稍等再试。')
      return
    }
    setChecking(true)
    setError('')
    try {
      const res = await client.getProject()
      const evaluated = evaluateProject(res.project, {
        restoreEvidence: restoreEvidence ?? undefined,
        runObservations: res.observations,
        projectHash: projectHash(res.project),
      })
      applyEvaluated(
        evaluated,
        res.project,
        'GUI 里的当前作品（桥接直读）',
        res.observations,
      )
      // 作品有保存动作时存入 IndexedDB（不要只靠内存）。
      const at = await saveProjectToStore(res.sb3, 'bridge').catch(() => null)
      if (at !== null) setSavedAt(at)
    } catch (e) {
      setError(
        `桥接取作品失败：${e instanceof Error ? e.message : String(e)}。可以改用“从文件检查”：在编辑器里“文件 → 保存到你的电脑”，再选那个 .sb3 文件。`,
      )
    } finally {
      setChecking(false)
    }
  }, [applyEvaluated, projectReady, restoreEvidence])

  // “从文件检查”（备用通道）：孩子在 GUI 里导出 .sb3 后选文件评价。
  const handleFile = useCallback(async (file: File) => {
    setChecking(true)
    setError('')
    try {
      const parsed = await parseSb3File(file)
      const evaluated = evaluateProject(parsed, {
        restoreEvidence: restoreEvidence ?? undefined,
        projectHash: projectHash(parsed),
      })
      applyEvaluated(evaluated, parsed, file.name, undefined)
      // 文件通道读到的作品同样存入 IndexedDB，供下次打开恢复。
      const buf = await file.arrayBuffer()
      const at = await saveProjectToStore(buf, 'file').catch(() => null)
      if (at !== null) setSavedAt(at)
    } catch (e) {
      setError(`这个文件打不开：${e instanceof Error ? e.message : String(e)}。请确认是从 GUI 里“文件 → 保存到你的电脑”导出的 .sb3 文件。`)
      setResults(null)
      setProject(null)
    } finally {
      setChecking(false)
    }
  }, [applyEvaluated, restoreEvidence])

  // “加载初始作品”（P3）：从配置的 URL 取初始 .sb3，经桥接载入 GUI。
  const handleLoadStarter = useCallback(async () => {
    if (!STARTER_URL) {
      setError(
        '初始作品地址未配置（NEXT_PUBLIC_DANCE_SHOW_STARTER_URL），请联系负责人。',
      )
      return
    }
    const client = clientRef.current
    if (!client || !projectReady) {
      setError('创作环境还没准备好，请稍等再试。')
      return
    }
    setChecking(true)
    setError('')
    setStarterState('')
    try {
      const resp = await fetch(STARTER_URL)
      if (!resp.ok) throw new Error(`下载初始作品失败：HTTP ${resp.status}`)
      const buf = await resp.arrayBuffer()
      if (buf.byteLength === 0) throw new Error('下载到的初始作品是空文件')
      if (buf.byteLength > BRIDGE_MAX_PAYLOAD_BYTES) {
        throw new Error('初始作品超过 5MB 上限，无法载入')
      }
      await client.loadProject({ format: 'sb3', data: buf })
      const res = await client.getProject()
      if (res.project.targets.length === 0) {
        throw new Error('初始作品载入后仍是空作品')
      }
      const evaluated = evaluateProject(res.project, {
        restoreEvidence: restoreEvidence ?? undefined,
        runObservations: res.observations,
        projectHash: projectHash(res.project),
      })
      applyEvaluated(
        evaluated,
        res.project,
        '初始作品（舞蹈秀 starter）',
        res.observations,
      )
      const at = await saveProjectToStore(res.sb3, 'bridge').catch(() => null)
      if (at !== null) setSavedAt(at)
      setStarterState('初始作品已载入：Abby 和两条脚本都在，可以开始了。')
    } catch (e) {
      setError(
        `加载初始作品失败：${e instanceof Error ? e.message : String(e)}`,
      )
    } finally {
      setChecking(false)
    }
  }, [applyEvaluated, projectReady, restoreEvidence])

  const resultFor = (id: string) => results?.find((r) => r.id === id)

  return (
    <main
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        background: BG,
        color: TEXT,
      }}
    >
      {/* 顶栏：V2 深蓝外壳 */}
      <header
        style={{
          background: NAVY,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          height: 56,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {DANCE_SHOW_LESSON_TITLE}
        </div>
        <span
          style={{
            fontSize: 12,
            background: NAVY_2,
            border: '1px solid #2f6ae9',
            borderRadius: 999,
            padding: '2px 10px',
            color: '#cfe0ff',
          }}
        >
          Scratch GUI 创作环境 · 桌面样板
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: '#cfe0ff' }}>
          已完成 {doneCount}/{DANCE_SHOW_STEPS.length} 步
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          data-testid="dance-show-toggle-guide"
          style={{
            background: BLUE,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {collapsed ? '展开指引' : '收起指引'}
        </button>
        <button
          type="button"
          onClick={() => void handleBridgeCheck()}
          disabled={!GUI_CONFIGURED || !projectReady || checking}
          title={
            !GUI_CONFIGURED
              ? '创作环境地址未配置'
              : restoring
                ? '正在恢复上次保存的作品，请稍候'
                : !projectReady
                  ? '创作环境正在准备，请稍等'
                  : '直接读编辑器里正在改的作品，不用导出文件'
          }
          data-testid="dance-show-check-button"
          style={{
            background: '#fff',
            color: NAVY,
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 14,
            fontWeight: 600,
            cursor:
              !GUI_CONFIGURED || !projectReady || checking
                ? 'not-allowed'
                : 'pointer',
            opacity: !GUI_CONFIGURED || !projectReady || checking ? 0.6 : 1,
          }}
        >
          检查我的作品
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={checking}
          title="备用通道：在编辑器里导出 .sb3 后选文件检查"
          data-testid="dance-show-check-file-button"
          style={{
            background: 'transparent',
            color: '#cfe0ff',
            border: '1px solid #2f6ae9',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 14,
            cursor: checking ? 'not-allowed' : 'pointer',
          }}
        >
          从文件检查
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".sb3"
          data-testid="dance-show-sb3-input"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {/* 学习指引（浮层抽屉，可收起；不挤占编辑器宽度）
            实测：Scratch GUI 在宽度 ≤1000px 时隐藏 File/Edit 菜单
            （1024px 断点），孩子将无法导入/导出 .sb3。故指引必须
            是浮层而非固定分栏：GUI 恒得内容区全宽（1220px@1440），
            File 菜单与 480px 舞台始终可用；读完一步点“收起指引”
            即可全宽操作，随时再展开。切换指引与自由创作不重载 GUI、
            不丢作品（iframe 一直挂在页面上，作品只在桥接里流转）。 */}
        {!collapsed && (
          <aside
            data-testid="dance-show-guide"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 360,
              zIndex: 20,
              background: CARD,
              borderRight: `1px solid ${BORDER}`,
              boxShadow: '4px 0 24px rgba(21, 34, 56, 0.18)',
              overflowY: 'auto',
              padding: 16,
            }}
          >
            <section
              style={{
                background: '#eaf1ff',
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>今天学什么</div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                {DANCE_SHOW_LESSON_GOAL}
              </div>
            </section>

            <section style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>怎么做</div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
                <li>在右边的编辑器里打开你的 Scratch.sb3 舞蹈作品。</li>
                <li>按下面的步骤一步一步改，每步改完点绿旗看看。</li>
                <li>
                  读完一步点上面“收起指引”，编辑器就全宽了；随时可以再展开指引。
                </li>
                <li>
                  改完后点上面“检查我的作品”，直接读编辑器里正在改的作品，
                  不用再导出文件；也可以点“从文件检查”，选导出的 .sb3 文件作备用。
                </li>
              </ol>
            </section>

            {/* 初始作品（P3）：从配置的 URL 取 starter .sb3，经桥接载入 GUI */}
            <section
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                background: '#f8fafd',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>开始之前</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
                还没有作品？点下面直接把初始舞蹈作品载入编辑器
                （Abby、四造型、三背景、两条脚本都在）。
              </div>
              <button
                type="button"
                onClick={() => void handleLoadStarter()}
                disabled={checking || !projectReady}
                title={
                  restoring
                    ? '正在恢复上次保存的作品，请稍候'
                    : !projectReady
                      ? '创作环境正在准备，请稍等'
                      : '把初始作品载入编辑器'
                }
                data-testid="dance-show-load-starter"
                style={{
                  background: BLUE,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 14,
                  cursor: checking || !projectReady ? 'not-allowed' : 'pointer',
                  opacity: checking || !projectReady ? 0.6 : 1,
                }}
              >
                加载初始作品
              </button>
              {starterState && (
                <div style={{ fontSize: 14, color: GREEN, marginTop: 8 }}>
                  {starterState}
                </div>
              )}
              <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
                初始作品素材来自官方 Scratch 素材库，许可证版本待法律复核。
              </div>
            </section>

            {DANCE_SHOW_STEPS.map((step, idx) => {
              const result = resultFor(step.id)
              const open = idx === currentStep
              const hintsShown = revealedHints[step.id] ?? 0
              return (
                <section
                  key={step.id}
                  data-testid={`dance-show-step-${step.id}`}
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 10,
                    background: open ? '#fff' : '#f8fafd',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    style={{
                      all: 'unset',
                      display: 'flex',
                      width: '100%',
                      cursor: 'pointer',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        background: result?.pass
                          ? GREEN
                          : open
                            ? BLUE
                            : '#e7edf5',
                        color: result?.pass || open ? '#fff' : MUTED,
                      }}
                    >
                      {result?.pass ? '✓' : idx + 1}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 15, textAlign: 'left' }}>
                      {step.title}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: MUTED }}>
                      {result ? (result.pass ? '已通过' : '未通过') : open ? '进行中' : ''}
                    </span>
                  </button>
                  {open && (
                    <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.7 }}>
                      <div style={{ marginBottom: 6 }}>
                        <strong>本步目标：</strong>
                        {step.goal}
                      </div>
                      <ol style={{ margin: '0 0 8px', paddingLeft: 18 }}>
                        {step.instructions.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ol>
                      <div>
                        {step.hints.slice(0, hintsShown).map((h, i) => (
                          <div
                            key={i}
                            style={{
                              background: '#fff9e8',
                              border: '1px solid #ffba47',
                              borderRadius: 8,
                              padding: '6px 8px',
                              marginBottom: 6,
                            }}
                          >
                            提示 {i + 1}：{h}
                          </div>
                        ))}
                        {hintsShown < 3 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedHints((m) => ({
                                ...m,
                                [step.id]: (m[step.id] ?? 0) + 1,
                              }))
                            }
                            style={{
                              background: 'none',
                              border: `1px solid ${BLUE}`,
                              color: BLUE,
                              borderRadius: 8,
                              padding: '6px 10px',
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            需要提示？（{hintsShown}/3）
                          </button>
                        )}
                      </div>
                      {result && (
                        <div
                          style={{
                            marginTop: 8,
                            borderRadius: 8,
                            padding: '8px 10px',
                            background: result.pass ? '#e6f7f0' : '#fff0d8',
                            color: result.pass ? GREEN : AMBER,
                          }}
                        >
                          {result.pass ? '✓ 通过：' : '还没通过：'}
                          {result.detail}
                        </div>
                      )}
                      {!result && (
                        <div style={{ marginTop: 8, fontSize: 13, color: MUTED }}>
                          {step.checkHint}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )
            })}

            {/* 检查结果汇总 */}
            <section
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>检查结果</div>
              {checking && <div style={{ fontSize: 14 }}>正在读你的作品…</div>}
              {restoring && (
                <div style={{ fontSize: 14 }}>
                  正在恢复上次保存的作品…恢复完成前请不要点“检查我的作品”，也不要在编辑器里改动，以免覆盖。
                </div>
              )}
              {error && (
                <div style={{ fontSize: 14, color: RED, lineHeight: 1.6 }}>{error}</div>
              )}
              {!checking && !error && !results && (
                <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
                  还没检查。改好后点顶栏“检查我的作品”，直接读编辑器里
                  正在改的作品；也可以在编辑器里点“文件 → 保存到你的电脑”，
                  再点“从文件检查”选刚保存的 .sb3 文件。
                  {project ? '' : '（也可以先点“加载初始作品”再开始。）'}
                </div>
              )}
              {results && (
                <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                  <div>
                    已检查：<code>{fileName}</code>
                  </div>
                  <div>
                    通过 {doneCount}/{DANCE_SHOW_STEPS.length} 步。
                    {doneCount === DANCE_SHOW_STEPS.length
                      ? '全部通过，太棒了！记得给家人表演一次。'
                      : '没通过的步骤按提示改一改，再保存、再检查。'}
                  </div>
                  <div style={{ fontSize: 13, color: MUTED }}>
                    {evaluationScopeNote(observations)}
                  </div>
                  {savedAt !== null && (
                    <div style={{ fontSize: 13, color: MUTED }}>
                      作品已保存到本机浏览器，关闭后重新打开会恢复
                      （保存于 {new Date(savedAt).toLocaleString('zh-CN')}）。
                    </div>
                  )}
                  {restoreEvidence && (
                    <div style={{ fontSize: 13, color: MUTED }}>
                      已恢复上次保存的作品（保存于{' '}
                      {new Date(restoreEvidence.savedAt).toLocaleString('zh-CN')}，
                      重新打开于{' '}
                      {new Date(restoreEvidence.loadedAt).toLocaleString('zh-CN')}）。
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 真人听音验收：明确标注待真人验收，不自动判通过 */}
            <section
              data-testid="dance-show-listening-note"
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                background: '#fff5e9',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                音乐验收：待真人听音验收
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                电脑只能证明音乐播放被触发了，不能证明你真的听到了。
                请在真实设备上确认三件事：① 能听到 Dance Space 音乐；
                ② 点红色停止后音乐能停；③ 保存再打开后音乐还正常。
                这三件要由真人听过才算通过，本页不会自动帮你打勾。
              </div>
            </section>

            {/* 接口状态（诚实说明，不伪造） */}
            <section style={{ fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
              <details>
                <summary>作品是怎么传给课程层的？（给大人看）</summary>
                <div style={{ marginTop: 6 }}>
                  主通道是受控桥接消息：学习层经桥接向 GUI 宿主页面请求
                  当前作品（get-project），直接读 project.json 并评价，
                  不用手动导出文件。桥接只接受来源白名单里的回复
                  （严格相等 + 必须是该 iframe 发来），单条载荷上限 5MB，
                  禁止 postMessage(&apos;*&apos;）。作品取回后存入本机浏览器
                  IndexedDB，页面加载时若有已保存作品会经桥接载入 GUI 恢复；
                  步骤 8 只认真实走完保存→关闭→重新打开的流程。
                  备用通道仍是“导出 .sb3 文件”：孩子在编辑器里保存 .sb3，
                  学习层在浏览器本地解析，不上传。桥接状态：
                  {bridgeStatus === 'unconfigured'
                    ? '未配置（未配 GUI 地址，不渲染编辑器）'
                    : bridgeStatus === 'connecting'
                      ? '连接中'
                      : bridgeStatus === 'ready'
                        ? projectReady
                          ? '已连接，作品已就绪'
                          : '已连接，等待作品加载'
                        : '连接失败（可用“从文件检查”备用）'}。
                  原型 bridge.js 在页面加载时宣告 ready，早于默认作品
                  加载完成约 1–3 秒，本页不等 ready、直接轮询
                  get-project 直到作品非空才启用检查（ready 只发一次，
                  在监听挂载前发出就会错过）。
                </div>
              </details>
            </section>
          </aside>
        )}

        {/* 真实 Scratch GUI（唯一项目编辑环境） */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', background: '#fff' }}>
          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              data-testid="dance-show-show-guide"
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 10,
                background: NAVY,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              展开指引
            </button>
          )}
          {GUI_CONFIGURED ? (
            <iframe
              ref={iframeRef}
              title="Scratch GUI — 我的舞蹈秀创作环境"
              src={GUI_URL}
              data-testid="dance-show-gui-iframe"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          ) : (
            <div
              data-testid="dance-show-gui-not-configured"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  maxWidth: 560,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: 24,
                  background: CARD,
                  lineHeight: 1.8,
                  fontSize: 15,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
                  创作环境地址未配置，请联系负责人
                </div>
                <div>
                  Scratch 创作环境（GUI）需要部署时配置地址
                  （NEXT_PUBLIC_SCRATCH_GUI_URL），当前没有配置，
                  所以这里没有加载编辑器，也不会去连你电脑上的 localhost。
                  配好地址、重新部署后，编辑器就会出现在这里。
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer
        style={{
          flexShrink: 0,
          padding: '6px 16px',
          fontSize: 12,
          color: MUTED,
          borderTop: `1px solid ${BORDER}`,
          background: CARD,
        }}
      >
        编辑器是官方 Scratch GUI（AGPL-3.0-only，standalone 独立部署）；
        学习引导层由 KidsCoding 提供。正式对外发布前须完成 AGPL 合规审查。
        本页是桌面样板（1440×900 优先），移动端另行适配。
      </footer>
    </main>
  )
}
