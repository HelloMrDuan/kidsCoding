/**
 * OPS-040《我的舞蹈秀》全屏课堂页（正式入口 /studio/scratch/dance-show）。
 *
 * 外壳只有 StudioShell（OPS-039）：本页不再自带顶栏/页脚，不继承
 * AppShell——返回、标题、进度、保存状态、文件菜单、指引抽屉全部由
 * StudioShell 按 StudioLesson 契约渲染。编辑器（官方 Scratch GUI
 * 桥接宿主 iframe）作为外壳 children 挂在主区，恒占满主区全宽；
 * 外壳抽屉与本页的步骤面板都是浮层，开关不卸载 iframe、不丢作品。
 *
 * 课程能力与 OPS-038 样板页（/learn/dance-show）同一套实现，行为不变：
 * - 桥接直读检查（ScratchBridgeClient.getProject → evaluateProject）；
 * - 作品存入 IndexedDB、页面加载时经桥接恢复（含 #542 的恢复竞态
 *   修复：恢复完成前 projectReady 保持 false，检查/加载按钮禁用，
 *   恢复不会被默认作品静默覆盖）；
 * - .sb3 文件检查为备用通道；GUI 内导出仍走编辑器自己的文件菜单
 *   （外壳文件菜单不冒充提供导出，故 canExport=false 隐藏）；
 * - 初始作品经桥接载入（NEXT_PUBLIC_DANCE_SHOW_STARTER_URL）；
 * - GUI 地址只读 NEXT_PUBLIC_SCRATCH_GUI_URL，未配置时不渲染 iframe
 *   （fail-closed，绝不默认连访客 localhost）。
 *
 * 与样板页的差异只在外壳层（OPS-040 产品整改）：检查入口与步骤
 * 开关在外壳顶栏里（经 ShellControl.topbar 报告），不浮在编辑器上
 * 遮挡角色/舞台区；顶栏不常驻课程目标、不放帮助按钮（目标与帮助
 * 仍在指引抽屉里）。步骤面板只突出当前步（任务/操作/预期结果，
 * 提示默认折叠），其余步只列标题；检查结果在面板内。桥接协议、
 * 许可证、听音验收等给大人看的说明只放在指引抽屉的帮助里，
 * 不占儿童主操作区。
 *
 * 保存状态真实性（P0）：保存状态机区分未保存 / 保存中 / 已保存 /
 * 保存失败，并绑定实际保存成功的作品哈希与时间——只有
 * saveProjectToStore 真正写成功才置“已保存”；写入失败如实显示
 * “未能保存”（检查结果仍保留，不冒充已保存）。课程层无法感知
 * GUI 内部的每一次积木改动，故顶栏只声称“最后保存 HH:MM”，
 * 不声称“当前最新作品已保存”；再次检查取回的作品哈希与已保存
 * 哈希不同时，状态先回到保存中/未保存，再以新保存结果为准。
 * 窄屏（<1024px）显示明确提示：GUI 在窄屏会隐藏自身文件菜单，
 * 编辑器内导入/导出不可用——不假装移动端已完整适配。
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DANCE_SHOW_STEPS,
} from '@/features/lessons/dance-show/dance-show-steps'
import { buildDanceShowStudioLesson } from '@/features/lessons/dance-show/dance-show-lesson'
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
import { StudioShell } from '@/features/lessons/studio/studio-shell'
import type {
  SaveState,
  ShellControl,
} from '@/features/lessons/workspace/workspace-slots'

/**
 * GUI 地址只读环境变量，无默认值（P0 fail-closed）。
 * 未配置时页面不渲染 iframe、不连任何 localhost，明确提示未配置。
 * 已配置时该地址应指向桥接宿主页面 bridge-host.html（由部署时提供）。
 */
const GUI_URL = process.env.NEXT_PUBLIC_SCRATCH_GUI_URL ?? ''
/** 初始作品 .sb3 的下载地址（部署时把 starter 文件放到静态服务上）。 */
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

const BLUE = '#2463eb'
const CARD = '#ffffff'
const BORDER = '#e7edf5'
const TEXT = '#18243a'
const MUTED = '#6f7d92'
const GREEN = '#148767'
const AMBER = '#ad6b20'
const RED = '#d64c4c'

export default function DanceShowStudioPage() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({})
  const [project, setProject] = useState<ScratchProject | null>(null)
  const [results, setResults] = useState<StepCheckResult[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [projectReady, setProjectReady] = useState(false)
  /**
   * 是否正在恢复上次保存的作品（#542 恢复竞态修复，行为与样板页一致）。
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
  /**
   * 保存状态机（P0 真实性）：phase 区分四态；savedInfo 只在
   * saveProjectToStore 真正写成功（或恢复验证成功）后设置，
   * 绑定那一份作品的内容哈希与保存时间。savedInfo 存在不等于
   * “当前 GUI 里的作品已保存”——GUI 内部改动课程层感知不到，
   * 顶栏文案只报“最后保存 HH:MM”。
   */
  const [savePhase, setSavePhase] = useState<
    'unsaved' | 'saving' | 'saved' | 'failed'
  >('unsaved')
  const [savedInfo, setSavedInfo] = useState<{
    at: number
    hash: string
  } | null>(null)
  const [saveError, setSaveError] = useState('')
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
        // 先恢复上次保存的作品，再启用检查/加载按钮（#542）。
        // projectReady 之前若已启用，恢复完成前点“检查”会把 GUI
        // 默认作品写进 IndexedDB，静默覆盖用户已保存的作品；
        // 恢复期间在 GUI 里编辑也会被 loadProject 覆盖。
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
            // 恢复验证成功 = GUI 当前内容就是库里那份已保存作品，
            // 保存状态如实回到“已保存”，绑定恢复作品的哈希与原保存时间。
            setSavedInfo({ at: saved.savedAt, hash: evidence.projectHash })
            setSavePhase('saved')
            setSaveError('')
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
      // 检查完自动展开步骤面板看结果（浮层，不卸载编辑器）。
      setPanelOpen(true)
    },
    [],
  )

  /**
   * 把一份作品真正写入 IndexedDB 并如实更新保存状态机。
   * 写之前先置“保存中”——若这份作品的哈希与上次已保存的不同，
   * 说明作品已经变过，旧的“已保存”立即失效，不许继续声称。
   * 写入失败不吞：置“保存失败”并保留错误原因，调用方照常展示
   * 检查结果（检查成功 ≠ 已保存）。
   */
  const persistProject = useCallback(
    async (
      sb3: ArrayBuffer,
      source: 'bridge' | 'file',
      hash: string,
    ): Promise<boolean> => {
      setSavePhase('saving')
      try {
        const at = await saveProjectToStore(sb3, source)
        setSavedInfo({ at, hash })
        setSavePhase('saved')
        setSaveError('')
        return true
      } catch (e) {
        setSavePhase('failed')
        setSaveError(e instanceof Error ? e.message : String(e))
        return false
      }
    },
    [],
  )

  // “检查我的作品”（主通道）：经桥接直接读 GUI 里正在改的作品，不用导出文件。
  // 同一动作也把作品存入 IndexedDB，故外壳文件菜单的“保存作品”走同一入口。
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
      const hash = projectHash(res.project)
      const evaluated = evaluateProject(res.project, {
        restoreEvidence: restoreEvidence ?? undefined,
        runObservations: res.observations,
        projectHash: hash,
      })
      applyEvaluated(
        evaluated,
        res.project,
        'GUI 里的当前作品（桥接直读）',
        res.observations,
      )
      // 作品有保存动作时存入 IndexedDB（不要只靠内存）；
      // 保存失败如实置“未能保存”，检查结果照常保留。
      await persistProject(res.sb3, 'bridge', hash)
    } catch (e) {
      setError(
        `桥接取作品失败：${e instanceof Error ? e.message : String(e)}。可以改用文件通道：在编辑器里“文件 → 保存到你的电脑”，再点顶栏“文件 → 导入”选那个 .sb3 文件。`,
      )
    } finally {
      setChecking(false)
    }
  }, [applyEvaluated, persistProject, projectReady, restoreEvidence])

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
      // 文件通道读到的作品同样存入 IndexedDB，供下次打开恢复；
      // 保存失败如实置“未能保存”。
      const buf = await file.arrayBuffer()
      await persistProject(buf, 'file', projectHash(parsed))
    } catch (e) {
      setError(`这个文件打不开：${e instanceof Error ? e.message : String(e)}。请确认是从 GUI 里“文件 → 保存到你的电脑”导出的 .sb3 文件。`)
      setResults(null)
      setProject(null)
    } finally {
      setChecking(false)
    }
  }, [applyEvaluated, persistProject, restoreEvidence])

  // “加载初始作品”：从配置的 URL 取初始 .sb3，经桥接载入 GUI。
  // 在外壳文件菜单里对应“恢复初始”。
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
      const hash = projectHash(res.project)
      const evaluated = evaluateProject(res.project, {
        restoreEvidence: restoreEvidence ?? undefined,
        runObservations: res.observations,
        projectHash: hash,
      })
      applyEvaluated(
        evaluated,
        res.project,
        '初始作品（舞蹈秀 starter）',
        res.observations,
      )
      await persistProject(res.sb3, 'bridge', hash)
      setStarterState('初始作品已载入：Abby 和两条脚本都在，可以开始了。')
    } catch (e) {
      setError(
        `加载初始作品失败：${e instanceof Error ? e.message : String(e)}`,
      )
    } finally {
      setChecking(false)
    }
  }, [applyEvaluated, persistProject, projectReady, restoreEvidence])

  const resultFor = (id: string) => results?.find((r) => r.id === id)

  const lesson = useMemo(
    () => buildDanceShowStudioLesson({ currentStep }),
    [currentStep],
  )

  // 外壳保存芯片只认状态机：saved 才显示“已保存”，并在消息里给出
  // 最后保存时间（不声称 GUI 里当前最新改动已保存）；saving 显示
  // 未保存+“正在保存”；failed 显示“未能保存”。
  const saveState: SaveState =
    savePhase === 'saved'
      ? 'saved'
      : savePhase === 'failed'
        ? 'failed'
        : 'unsaved'
  const saveMessage = restoring
    ? '正在恢复上次保存的作品…'
    : savePhase === 'saving'
      ? '正在保存到本机…'
      : savePhase === 'saved' && savedInfo
        ? `最后保存 ${new Date(savedInfo.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
        : savePhase === 'failed'
          ? '保存失败，点“检查我的作品”重试'
          : null

  const shellControl: ShellControl = useMemo(
    () => ({
      // 运行/停止在本课发生在 GUI 内部（绿旗/停止按钮），外壳顶栏按
      // OPS-039 设计不放运行按钮，这两个字段仅为接口完整性而存在，
      // StudioShell 不渲染它们，不构成死按钮。
      run: () => {},
      stop: () => {},
      save: () => {
        void handleBridgeCheck()
      },
      running: checking,
      saveState,
      // 逐步检查结果由本页步骤面板渲染（外壳不代判、不改写结论）。
      judgment: null,
      file: {
        // canNew / canExport 为 false：外壳按能力隐藏，不渲染死按钮。
        // 新建无对应真实动作；导出走 GUI 自己的文件菜单。
        newLesson: () => {},
        export: () => {},
        import: () => fileRef.current?.click(),
        reset: () => {
          void handleLoadStarter()
        },
        capabilities: {
          canNew: false,
          canSave: true,
          canExport: false,
          canImport: true,
          canReset: true,
        },
      },
      // 顶栏精简（产品整改）：检查入口与步骤开关进顶栏，不再浮在
      // 编辑器上遮挡角色/舞台区；顶栏不常驻课程目标、不放帮助按钮
      // （目标全文与帮助仍在指引抽屉里）。
      topbar: {
        showGoal: false,
        showHelp: false,
        actions: [
          {
            label: panelOpen ? '收起步骤' : '步骤',
            testId: 'dance-show-steps-toggle',
            onClick: () => setPanelOpen((v) => !v),
          },
          {
            label: checking ? '检查中…' : '检查我的作品',
            testId: 'dance-show-check-button',
            primary: true,
            disabled: !GUI_CONFIGURED || !projectReady || checking,
            onClick: () => {
              void handleBridgeCheck()
            },
          },
        ],
      },
    }),
    [
      checking,
      saveState,
      handleBridgeCheck,
      handleLoadStarter,
      panelOpen,
      projectReady,
    ],
  )

  return (
    <StudioShell
      lesson={lesson}
      saveState={saveState}
      saveMessage={saveMessage}
      shellControl={shellControl}
    >
      <div
        data-testid="dance-show-studio-main"
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          background: '#fff',
        }}
      >
        <style>{`
          .dance-show-narrow-note { display: none; }
          @media (max-width: 1023px) {
            .dance-show-narrow-note {
              display: block; position: absolute; left: 12px; bottom: 12px; z-index: 15;
              max-width: min(420px, calc(100vw - 24px));
              background: #fff5e9; border: 1px solid #ffba47; border-radius: 10px;
              padding: 8px 10px; font-size: 12px; line-height: 1.6; color: #7a4d12;
            }
          }
        `}</style>

        {/* 真实 Scratch GUI（唯一项目编辑环境；始终挂载，浮层开关不卸载） */}
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
                color: TEXT,
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

        {/* 状态提示（浮层）：恢复/检查/错误必须在面板收起时也看得见 */}
        {(restoring || checking || error) && (
          <div
            data-testid="dance-show-status"
            role={error ? 'alert' : 'status'}
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30,
              maxWidth: 'min(640px, calc(100vw - 32px))',
              background: error ? '#fdf0f0' : '#eef4ff',
              border: `1px solid ${error ? RED : BLUE}`,
              color: error ? RED : TEXT,
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 13,
              lineHeight: 1.6,
              boxShadow: '0 8px 24px rgba(21,34,56,.16)',
            }}
          >
            {error
              ? error
              : restoring
                ? '正在恢复上次保存的作品…恢复完成前请不要点“检查我的作品”，也不要在编辑器里改动，以免覆盖。'
                : '正在读你的作品…'}
          </div>
        )}

        {/* 步骤与结果（浮层面板，默认收起；开关在顶栏，不挤占编辑器宽度） */}
        {panelOpen && (
          <aside
            data-testid="dance-show-guide"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 'min(360px, 92vw)',
              zIndex: 20,
              background: CARD,
              color: TEXT,
              borderRight: `1px solid ${BORDER}`,
              boxShadow: '4px 0 24px rgba(21, 34, 56, 0.18)',
              overflowY: 'auto',
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>步骤与结果</div>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  color: MUTED,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 999,
                  padding: '2px 8px',
                }}
              >
                通过 {doneCount}/{DANCE_SHOW_STEPS.length}
              </span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                data-testid="dance-show-steps-close"
                style={{
                  background: 'none',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 13,
                  cursor: 'pointer',
                  color: TEXT,
                }}
              >
                收起
              </button>
            </div>

            {/* 初始作品：从配置的 URL 取 starter .sb3，经桥接载入 GUI */}
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
                        <strong>任务：</strong>
                        {step.goal}
                      </div>
                      <div style={{ marginBottom: 2 }}>
                        <strong>这样做：</strong>
                      </div>
                      <ol style={{ margin: '0 0 8px', paddingLeft: 18 }}>
                        {step.instructions.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ol>
                      <div style={{ marginBottom: 8 }}>
                        <strong>预期结果：</strong>
                        {step.checkHint.replace(/^检查：/, '')}
                      </div>
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
                          <div>
                            {result.pass ? '✓ 通过：' : '还没通过：'}
                            {result.detail}
                          </div>
                          {!result.pass && (
                            <div style={{ marginTop: 4 }}>
                              下一步：按上面“这样做”再试一次，改完点顶栏“检查我的作品”。
                            </div>
                          )}
                        </div>
                      )}
                      {!result && (
                        <div style={{ marginTop: 8, fontSize: 13, color: MUTED }}>
                          还没检查这一步：改好后点顶栏“检查我的作品”。
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
                  正在改的作品；也可以先在编辑器里点“文件 → 保存到你的电脑”
                  导出 .sb3，再点顶栏“文件 → 导入”选那个文件。
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
                  {savePhase === 'saved' && savedInfo && (
                    <div style={{ fontSize: 13, color: MUTED }}>
                      这份作品已保存到本机浏览器，关闭后重新打开会恢复
                      （保存于 {new Date(savedInfo.at).toLocaleString('zh-CN')}）。
                      之后在编辑器里再改动，要再点一次“检查我的作品”才会保存新版本。
                    </div>
                  )}
                  {savePhase === 'saving' && (
                    <div style={{ fontSize: 13, color: MUTED }}>
                      正在把这份作品保存到本机浏览器…
                    </div>
                  )}
                  {savePhase === 'failed' && (
                    <div
                      data-testid="dance-show-save-failed"
                      style={{ fontSize: 13, color: RED }}
                    >
                      检查结果在上面，但这份作品没能保存到本机浏览器
                      {saveError ? `（${saveError}）` : ''}。
                      请再点一次顶栏“检查我的作品”重试保存；
                      在保存成功前，不要关掉这个页面。
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

            {/* 听音验收、桥接协议、许可证等给大人看的说明只放在
                外壳指引抽屉的“帮助”里（契约 help），不占儿童面板。 */}
          </aside>
        )}

        {/* 文件通道的隐藏 input：由顶栏“文件 → 导入”触发（检查入口
            已进顶栏，主区不再放任何浮动按钮遮挡编辑器）。 */}
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

        {/* 窄屏标记：GUI 在窄屏隐藏自身文件菜单，导入/导出不可用（CSS 按宽度显示） */}
        <div className="dance-show-narrow-note" data-testid="dance-show-narrow-note">
          窄屏提示：编辑器在手机/平板窄屏下会隐藏自己的“文件”菜单，
          在编辑器里导入/导出 .sb3 暂时不可用；可以先看指引和步骤，
          导入/导出请用大屏幕完成。
        </div>
      </div>
    </StudioShell>
  )
}
