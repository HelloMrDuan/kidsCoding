/**
 * OPS-038《我的舞蹈秀》桌面样板页面（第三阶段：学习模式层）。
 *
 * 架构（负责人裁定）：官方 Scratch GUI standalone + 独立部署是唯一真实
 * 项目编辑环境；KidsCoding 只增加学习引导层，不重写编辑器布局，
 * 不自研角色/造型/声音/背景编辑器。
 *
 * - 右侧是真实的 Scratch GUI（iframe 加载，与 OPS-037 实验页同一来源，
 *   默认 http://localhost:8601/，可用 NEXT_PUBLIC_SCRATCH_GUI_URL 覆盖）。
 *   孩子在里面操作的是同一份真实 Scratch 项目（自己的舞蹈作品）。
 * - 左侧是学习引导层：步骤、目标、提示、检查。指引是浮层抽屉（可收起），
 *   展开时浮在编辑器上方、收起后 GUI 占满整宽，不长期挤占编辑空间。
 *   浮层是必需的：实测 Scratch GUI 在宽度 ≤1000px 时隐藏 File/Edit
 *   菜单（1024px 断点），固定分栏会把 GUI 压到约 860px 导致孩子无法
 *   导入/导出 .sb3；浮层让 GUI 恒得内容区全宽（1220px@1440）。
 * - 评价读的是孩子从 GUI 导出 .sb3 后的真实 project.json（本地解析），
 *   不是只检查积木字符串，也不是预制答案。
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
  parseSb3File,
  type ScratchProject,
  type StepCheckResult,
} from '@/features/lessons/dance-show/evaluate-project'
import {
  createGuiMessageListener,
  defaultGuiOriginAllowlist,
  type GuiProjectMessage,
} from '@/features/lessons/dance-show/gui-bridge'

const GUI_URL =
  process.env.NEXT_PUBLIC_SCRATCH_GUI_URL ?? 'http://localhost:8601/'

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

export default function DanceShowPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({})
  const [project, setProject] = useState<ScratchProject | null>(null)
  const [results, setResults] = useState<StepCheckResult[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [guiMessages, setGuiMessages] = useState(0)
  const [rejectedMessages, setRejectedMessages] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 受控消息接口（通道二）：接收端已接线并做严格来源与结构校验。
  // 官方 standalone 构建本身不主动发消息（实测无 postMessage 接口），
  // 所以当前样板实际走“导出 .sb3 文件”通道一；本接收端是为正式桥接
  // 准备的已验证接口，收到合规消息时会同样评价并更新结果。
  useEffect(() => {
    const allowlist = defaultGuiOriginAllowlist()
    const cleanup = createGuiMessageListener({
      allowlist,
      onValidMessage: (msg: GuiProjectMessage) => {
        setGuiMessages((n) => n + 1)
        try {
          const evaluated = evaluateProject(msg.project as ScratchProject)
          setProject(msg.project as ScratchProject)
          setResults(evaluated)
          setError('')
        } catch (e) {
          setError(`收到的作品数据无法评价：${String(e)}`)
        }
      },
      onRejectedMessage: () => setRejectedMessages((n) => n + 1),
    })
    return cleanup
  }, [])

  const doneCount = results ? results.filter((r) => r.pass).length : 0

  const handleFile = useCallback(async (file: File) => {
    setChecking(true)
    setError('')
    try {
      const parsed = await parseSb3File(file)
      const evaluated = evaluateProject(parsed)
      setProject(parsed)
      setResults(evaluated)
      setFileName(file.name)
      // 自动跳到第一个未通过的步骤，方便孩子继续。
      const firstFail = evaluated.findIndex((r) => !r.pass)
      if (firstFail >= 0) setCurrentStep(firstFail)
    } catch (e) {
      setError(`这个文件打不开：${e instanceof Error ? e.message : String(e)}。请确认是从 GUI 里“文件 → 保存到你的电脑”导出的 .sb3 文件。`)
      setResults(null)
      setProject(null)
    } finally {
      setChecking(false)
    }
  }, [])

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
          onClick={() => fileRef.current?.click()}
          data-testid="dance-show-check-button"
          style={{
            background: '#fff',
            color: NAVY,
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          检查我的作品
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
            即可全宽操作，随时再展开。 */}
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
                  改完后在编辑器里点“文件 → 保存到你的电脑”，再点上面
                  “检查我的作品”，选刚保存的 .sb3 文件，看看每一步过没过。
                </li>
              </ol>
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
              {error && (
                <div style={{ fontSize: 14, color: RED, lineHeight: 1.6 }}>{error}</div>
              )}
              {!checking && !error && !results && (
                <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
                  还没检查。改好后，在编辑器里点“文件 → 保存到你的电脑”，
                  再点顶栏“检查我的作品”，选刚保存的 .sb3 文件。
                  {project ? '' : '（也可以先在编辑器里打开你的 Scratch.sb3 再开始。）'}
                </div>
              )}
              {results && (
                <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                  <div>
                    已检查文件：<code>{fileName}</code>
                  </div>
                  <div>
                    通过 {doneCount}/{DANCE_SHOW_STEPS.length} 步。
                    {doneCount === DANCE_SHOW_STEPS.length
                      ? '全部通过，太棒了！记得给家人表演一次。'
                      : '没通过的步骤按提示改一改，再保存、再检查。'}
                  </div>
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
                  当前用的是“导出文件”通道：孩子在编辑器里保存 .sb3，
                  学习层在浏览器本地解析 project.json 并评价，不上传。
                  受控消息接口已接线（严格来源白名单 + 消息结构校验，
                  禁止 postMessage(&apos;*&apos;)），但官方 standalone
                  构建本身不主动发消息，所以当前不依赖它；正式桥接时由
                  GUI 宿主页面按同一约定发送。已收到合规消息 {guiMessages} 条，
                  拦截非白名单消息 {rejectedMessages} 条。
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
          <iframe
            ref={iframeRef}
            title="Scratch GUI — 我的舞蹈秀创作环境"
            src={GUI_URL}
            data-testid="dance-show-gui-iframe"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
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
