'use client'

/**
 * OPS-042：《接住掉落水果》Scratch GUI 全屏课堂（正式入口
 * /studio/scratch/g2-u3-l02，StudioShell 唯一外壳）。
 *
 * 骨架与 OPS-040 舞蹈秀同一套已验证的实现（桥接直读、IndexedDB
 * 保存恢复与恢复竞态保护、顶栏检查入口、页面自管关卡面板、四态
 * 保存状态机），判定换成本课的真实运行判定：
 * - 检查 = 桥接直读当前作品（getProject 的 .sb3）→ 先保存到本机
 *   （按关分开存）→ 在本机真实 Scratch VM 里完整运行一遍
 *   （run-trace.ts）→ judge.ts 三层判定（舞台/任务/知识）；
 * - 初始作品按关在页内生成（build-starter.ts：compile.ts 同源
 *   结构 + 真实素材 .sb3），经桥接 loadProject 载入，不依赖外部
 *   starter 托管地址；
 * - 切关先保存当前关再载入目标关（存不下就不切，不丢作品）；
 *   恢复回到上次的关卡与其在本机的作品，没有才载入初始作品。
 *
 * 保存状态的诚实边界与舞蹈秀相同：页面感知不到 GUI 内部的每次
 * 编辑，顶栏只报告“最后保存 HH:MM”（绑定实际保存的作品哈希）；
 * 检查成功但保存失败时明确显示“未能保存”，判定结果照常呈现
 * 但不冒充已保存。窄屏（<1024px）明确提示 GUI 自身文件菜单
 * 不可用，不假装移动端已完整适配。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  parseSb3,
  parseSb3File,
  projectHash,
} from '@/features/lessons/dance-show/evaluate-project'
import {
  BRIDGE_MAX_PAYLOAD_BYTES,
  ScratchBridgeClient,
} from '@/features/lessons/dance-show/gui-bridge'
import { StudioShell } from '@/features/lessons/studio/studio-shell'
import type {
  SaveState,
  ShellControl,
} from '@/features/lessons/workspace/workspace-slots'

import { L02_CONTENT } from '../../contract'
import { judgeRun, type RunJudgment } from '../../judge'
import { L02_LEVEL_ORDER, L02_LEVELS, type LevelId } from '../../params'
import {
  buildLevelStarterSb3,
  buildStarterSb3,
  starterProgramFor,
} from '../build-starter'
import {
  buildL02StudioLesson,
  L02_LEVEL_TITLES,
} from '../l02-studio-lesson'
import {
  loadLastLevel,
  loadLevelProject,
  saveLastLevel,
  saveLevelProject,
} from '../project-store'

/**
 * GUI 地址只读环境变量，无默认值（fail-closed，与舞蹈秀一致）：
 * 未配置时不渲染 iframe、不连任何 localhost，明确提示未配置。
 */
const GUI_URL = process.env.NEXT_PUBLIC_SCRATCH_GUI_URL ?? ''
const GUI_ORIGIN = (() => {
  if (GUI_URL === '') return ''
  try {
    return new URL(GUI_URL).origin
  } catch {
    return ''
  }
})()
const GUI_CONFIGURED = GUI_URL !== '' && GUI_ORIGIN !== ''

const CARD = '#ffffff'
const BORDER = '#e7edf5'
const TEXT = '#18243a'

type SavePhase = 'unsaved' | 'saving' | 'saved' | 'failed'

type LevelResult = {
  judgment: RunJudgment
  /** 这份判定对应的作品哈希（projectHash 口径）。 */
  projectHash: string
}

export default function G2U3L02StudioPage() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [levelId, setLevelId] = useState<LevelId>('explore')
  const [results, setResults] = useState<
    Partial<Record<LevelId, LevelResult>>
  >({})
  const [checking, setChecking] = useState(false)
  const [projectReady, setProjectReady] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [notice, setNotice] = useState('')
  const [revealedHints, setRevealedHints] = useState(0)
  const [predictionX, setPredictionX] = useState('')
  const [predictionCaught, setPredictionCaught] = useState<string | null>(
    null,
  )

  const [savePhase, setSavePhase] = useState<SavePhase>('unsaved')
  const [savedInfo, setSavedInfo] = useState<{
    at: number
    hash: string
  } | null>(null)
  const [saveError, setSaveError] = useState('')

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const clientRef = useRef<ScratchBridgeClient | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const runIdRef = useRef(0)
  const levelIdRef = useRef(levelId)
  levelIdRef.current = levelId

  const content = L02_CONTENT[levelId]
  const result = results[levelId]
  const judgment = result?.judgment
  const passedLevels = useMemo(
    () =>
      L02_LEVEL_ORDER.filter((id) => {
        const j = results[id]?.judgment
        return j?.status === 'judged' && j.passed
      }),
    [results],
  )

  /* ---------- 保存：桥接/文件来的作品统一走这里 ---------- */

  const persistProject = useCallback(
    async (sb3: ArrayBuffer, level: LevelId): Promise<string | null> => {
      setSavePhase('saving')
      setSaveError('')
      try {
        const stored = await saveLevelProject(level, sb3)
        const project = await parseSb3(sb3)
        const hash = projectHash(project)
        setSavedInfo({ at: stored.savedAt, hash })
        setSavePhase('saved')
        return hash
      } catch (error) {
        setSavePhase('failed')
        setSaveError(
          error instanceof Error ? error.message : '保存到本机失败',
        )
        return null
      }
    },
    [],
  )

  /* ---------- 桥接接线与恢复（与舞蹈秀同一竞态纪律） ---------- */

  useEffect(() => {
    if (!GUI_CONFIGURED || !GUI_ORIGIN) return
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
    } catch (error) {
      setNotice(
        `创作环境配置有误：${error instanceof Error ? error.message : String(error)}`,
      )
      return
    }
    clientRef.current = client
    client.start()
    const setup = async () => {
      try {
        await client.waitUntilProjectNonEmpty()
        if (cancelled) return
        // 恢复完成前 projectReady 保持 false：检查/切关保持禁用，
        // 避免把 GUI 默认作品写进本机库覆盖已保存作品（#542 纪律）。
        setRestoring(true)
        const last = await loadLastLevel().catch(() => null)
        const target =
          last && L02_LEVEL_ORDER.includes(last) ? last : 'explore'
        if (cancelled) return
        setLevelId(target)
        const stored = await loadLevelProject(target).catch(() => null)
        if (cancelled) return
        if (stored) {
          await client.loadProject({ format: 'sb3', data: stored.bytes })
          const check = await client.getProject()
          if (cancelled) return
          if (check.project.targets.length > 0) {
            setSavedInfo({
              at: stored.savedAt,
              hash: projectHash(check.project),
            })
            setSavePhase('saved')
            setNotice(
              `已恢复你上次在「${L02_LEVEL_TITLES[target]}」保存的作品。可以接着改，或在关卡面板里换一关。`,
            )
          }
        } else {
          const starter = await buildLevelStarterSb3(target)
          await client.loadProject({ format: 'sb3', data: starter })
          if (cancelled) return
          setNotice(
            target === 'explore'
              ? '第一关的程序已经搭好放在编辑器里。先在关卡面板里写下你的预测，再点“检查我的作品”看真实结果。'
              : `已载入「${L02_LEVEL_TITLES[target]}」的初始作品：水果和舞台都准备好了，篮子的程序等你来搭。`,
          )
        }
        if (cancelled) return
        setProjectReady(true)
      } catch (error) {
        if (!cancelled) {
          setNotice(
            `创作环境还没准备好：${error instanceof Error ? error.message : String(error)}。可以刷新页面重试。`,
          )
        }
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }
    void setup()
    return () => {
      cancelled = true
      client.dispose()
      clientRef.current = null
    }
  }, [])

  /* ---------- 检查：直读 → 保存 → 真实运行 → 三层判定 ---------- */

  const handleBridgeCheck = useCallback(async () => {
    const client = clientRef.current
    if (!client || !projectReady || checking) return
    const level = levelIdRef.current
    setChecking(true)
    setNotice('')
    try {
      const res = await client.getProject()
      const savedHash = await persistProject(res.sb3, level)
      const { runProjectTrace } = await import('../run-trace')
      runIdRef.current += 1
      const trace = await runProjectTrace(res.sb3, {
        levelId: level,
        runId: runIdRef.current,
        fingerprint: projectHash(res.project),
      })
      const judged = judgeRun(trace, L02_LEVELS[level])
      setResults((prev) => ({
        ...prev,
        [level]: { judgment: judged, projectHash: projectHash(res.project) },
      }))
      setRevealedHints(0)
      if (!savedHash) {
        setNotice(
          '检查完成了，但作品没能保存到本机（见顶栏保存状态）。判定结果只对这一次检查的作品有效。',
        )
      }
    } catch (error) {
      setNotice(
        `检查失败：${error instanceof Error ? error.message : '未知错误'}。你的作品还在编辑器里，没有丢。`,
      )
    } finally {
      setChecking(false)
    }
  }, [checking, persistProject, projectReady])

  /* ---------- 切关：先保存当前关，再载入目标关 ---------- */

  const switchLevel = useCallback(
    async (target: LevelId) => {
      const client = clientRef.current
      if (!client || !projectReady || checking) return
      if (target === levelIdRef.current) return
      setNotice('')
      try {
        const res = await client.getProject()
        const ok = await persistProject(res.sb3, levelIdRef.current)
        if (!ok) {
          setNotice(
            '当前这一关的作品没能保存到本机，先不切换关卡。处理好保存问题（或先在编辑器里导出 .sb3 备份）后再试。',
          )
          return
        }
      } catch {
        setNotice('还没能读到当前作品，先不切换关卡。请稍等再试。')
        return
      }
      setLevelId(target)
      setRevealedHints(0)
      setPredictionX('')
      setPredictionCaught(null)
      void saveLastLevel(target).catch(() => undefined)
      try {
        const stored = await loadLevelProject(target).catch(() => null)
        if (stored) {
          await client.loadProject({ format: 'sb3', data: stored.bytes })
          setSavedInfo({
            at: stored.savedAt,
            hash: projectHash(await parseSb3(stored.bytes)),
          })
          setSavePhase('saved')
          setNotice(
            `已切到「${L02_LEVEL_TITLES[target]}」，载入的是你上次保存的这一关作品。`,
          )
        } else {
          const starter = await buildLevelStarterSb3(target)
          await client.loadProject({ format: 'sb3', data: starter })
          setSavePhase('unsaved')
          setSavedInfo(null)
          setNotice(
            target === 'explore'
              ? '第一关的程序已经搭好。先写下预测，再点检查。'
              : `已切到「${L02_LEVEL_TITLES[target]}」：这是这一关的初始作品，篮子的程序等你来搭。`,
          )
        }
      } catch (error) {
        setNotice(
          `切关时载入作品失败：${error instanceof Error ? error.message : '未知错误'}。`,
        )
      }
    },
    [checking, persistProject, projectReady],
  )

  /* ---------- 文件：导入 / 恢复本关初始作品 ---------- */

  const handleImportFile = useCallback(
    async (file: File) => {
      const client = clientRef.current
      if (!client || !projectReady) return
      const level = levelIdRef.current
      setNotice('')
      try {
        await parseSb3File(file)
        const bytes = await file.arrayBuffer()
        if (bytes.byteLength > BRIDGE_MAX_PAYLOAD_BYTES) {
          throw new Error('文件超过 5MB 上限，无法载入')
        }
        await persistProject(bytes, level)
        await client.loadProject({ format: 'sb3', data: bytes })
        setResults((prev) => ({ ...prev, [level]: undefined }))
        setNotice(
          `已导入 ${file.name}（作为「${L02_LEVEL_TITLES[level]}」的作品）。点“检查我的作品”可以判定它。`,
        )
      } catch (error) {
        setNotice(
          `导入失败：${error instanceof Error ? error.message : '这不是有效的 .sb3 作品'}。编辑器里的作品没有被改动。`,
        )
      }
    },
    [persistProject, projectReady],
  )

  const handleRestoreStarter = useCallback(async () => {
    const client = clientRef.current
    if (!client || !projectReady) return
    const level = levelIdRef.current
    setNotice('')
    try {
      const starter = await buildStarterSb3(
        starterProgramFor(level),
        L02_LEVELS[level],
      )
      await client.loadProject({ format: 'sb3', data: starter })
      setResults((prev) => ({ ...prev, [level]: undefined }))
      setSavePhase('unsaved')
      setSavedInfo(null)
      setNotice(
        `已恢复「${L02_LEVEL_TITLES[level]}」的初始作品。点“检查我的作品”会把新作品保存到本机。`,
      )
    } catch (error) {
      setNotice(
        `恢复初始作品失败：${error instanceof Error ? error.message : '未知错误'}。`,
      )
    }
  }, [projectReady])

  /* ---------- 外壳接线 ---------- */

  const lesson = useMemo(() => buildL02StudioLesson(levelId), [levelId])

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
          ? `未能保存${saveError ? `：${saveError}` : ''}。点“检查我的作品”会重试保存`
          : null

  const shellControl: ShellControl = useMemo(
    () => ({
      run: () => {},
      stop: () => {},
      save: () => {
        void handleBridgeCheck()
      },
      running: checking,
      saveState,
      judgment: null,
      file: {
        newLesson: () => {},
        export: () => {},
        import: () => fileRef.current?.click(),
        reset: () => {
          void handleRestoreStarter()
        },
        capabilities: {
          canNew: false,
          canSave: true,
          canExport: false,
          canImport: true,
          canReset: true,
        },
      },
      topbar: {
        showGoal: false,
        showHelp: false,
        actions: [
          {
            label: panelOpen ? '收起关卡' : '关卡',
            testId: 'l02-levels-toggle',
            onClick: () => setPanelOpen((v) => !v),
          },
          {
            label: checking ? '检查中…' : '检查我的作品',
            testId: 'l02-check-button',
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
      handleRestoreStarter,
      panelOpen,
      projectReady,
    ],
  )

  /* ---------- 渲染 ---------- */

  return (
    <StudioShell
      lesson={lesson}
      saveState={saveState}
      saveMessage={saveMessage}
      shellControl={shellControl}
    >
      <div
        data-testid="l02-studio-main"
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          background: '#fff',
        }}
      >
        <style>{`
          .l02-narrow-note { display: none; }
          @media (max-width: 1023px) {
            .l02-narrow-note {
              display: block; position: absolute; left: 12px; bottom: 12px; z-index: 15;
              max-width: min(420px, calc(100vw - 24px));
              background: #fff5e9; border: 1px solid #ffba47; border-radius: 10px;
              padding: 8px 10px; font-size: 12px; line-height: 1.6; color: #7a4d12;
            }
          }
        `}</style>

        {GUI_CONFIGURED ? (
          <iframe
            ref={iframeRef}
            title="Scratch GUI — 接住掉落水果创作环境"
            src={GUI_URL}
            data-testid="l02-gui-iframe"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        ) : (
          <div
            data-testid="l02-gui-not-configured"
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
                所以这里不显示编辑器，也不会去连任何本机地址。
              </div>
            </div>
          </div>
        )}

        <p data-testid="l02-narrow-note" className="l02-narrow-note">
          小屏幕提示：Scratch 编辑器自己的“文件”菜单在这个宽度下点不到
          （Scratch 本身的限制）。保存、检查和切换关卡请用上方顶栏；
          导出 .sb3 请在大屏幕上用编辑器自己的文件菜单。
        </p>

        {panelOpen && (
          <aside
            data-testid="l02-guide"
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
              padding: 16,
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <p data-testid="l02-passed-count">
              已通过 {passedLevels.length} / {L02_LEVEL_ORDER.length} 关
            </p>

            {L02_LEVEL_ORDER.map((id) => {
              const isCurrent = id === levelId
              const j = results[id]?.judgment
              const passed = j?.status === 'judged' && j.passed
              if (!isCurrent) {
                return (
                  <div key={id}>
                    <button
                      type="button"
                      data-testid={`l02-level-switch-${id}`}
                      disabled={!projectReady || checking}
                      onClick={() => void switchLevel(id)}
                    >
                      {L02_CONTENT[id].title}
                      {passed ? '（已通过）' : ''}
                    </button>
                  </div>
                )
              }
              return (
                <section key={id} data-testid={`l02-level-current-${id}`}>
                  <h3>
                    {content.title}
                    {passed ? '（已通过）' : ''}
                  </h3>
                  <p>
                    <strong>任务：</strong>
                    {content.task}
                  </p>
                  <p>
                    <strong>这样做：</strong>
                    {content.step}
                  </p>
                  <p>
                    <strong>预期结果：</strong>
                    {id === 'explore'
                      ? '篮子最后停在 x=40，水果在 x=100——先写下你的预测，再点检查看真实结果'
                      : `水果落地时篮子要在 x=${L02_LEVELS[id].fruitX} 附近（相差不超过 40）才算接住`}
                  </p>

                  {id === 'explore' && (
                    <fieldset data-testid="l02-prediction">
                      <legend>先写下你的预测</legend>
                      <label>
                        篮子最后会停在 x 等于多少？
                        <input
                          data-testid="l02-prediction-x"
                          inputMode="numeric"
                          value={predictionX}
                          onChange={(e) => setPredictionX(e.target.value)}
                        />
                      </label>
                      <div>
                        {['能接住', '接不住'].map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            data-testid={`l02-prediction-${choice}`}
                            aria-pressed={predictionCaught === choice}
                            onClick={() => setPredictionCaught(choice)}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {content.hints.length > 0 && (
                    <div>
                      {revealedHints === 0 ? (
                        <button
                          type="button"
                          data-testid="l02-hint-reveal"
                          onClick={() => setRevealedHints(1)}
                        >
                          需要提示？
                        </button>
                      ) : (
                        <>
                          <ol data-testid="l02-hints">
                            {content.hints
                              .slice(0, revealedHints)
                              .map((hint) => (
                                <li key={hint}>{hint}</li>
                              ))}
                          </ol>
                          {revealedHints < content.hints.length && (
                            <button
                              type="button"
                              data-testid="l02-hint-reveal"
                              onClick={() => setRevealedHints((n) => n + 1)}
                            >
                              再给一条提示
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {judgment && (
                    <div data-testid="l02-result">
                      {judgment.status === 'not-judged' ? (
                        <p data-testid="l02-not-judged">
                          这一次没有判定：{judgment.reason}
                        </p>
                      ) : (
                        <>
                          <p data-testid="l02-conclusion">
                            <strong>{judgment.conclusion}</strong>
                          </p>
                          <ul>
                            <li data-testid="l02-layer-stage">
                              {judgment.stage.passed ? '✓ ' : '✗ '}
                              {judgment.stage.line}
                            </li>
                            <li data-testid="l02-layer-task">
                              {judgment.task.passed ? '✓ ' : '✗ '}
                              {judgment.task.line}
                            </li>
                            <li data-testid="l02-layer-knowledge">
                              {judgment.knowledge.passed ? '✓ ' : '✗ '}
                              {judgment.knowledge.line}
                            </li>
                          </ul>
                          <p>{judgment.understanding}</p>
                          {id === 'explore' &&
                            (predictionX !== '' || predictionCaught) && (
                              <p data-testid="l02-prediction-compare">
                                你的预测：篮子停在 x=
                                {predictionX || '（没填）'}，
                                {predictionCaught ?? '（没选）'}。真实结果：
                                篮子停在 x=
                                {judgment.stage.line.match(
                                  /篮子 x=(-?\d+)/,
                                )?.[1] ?? '—'}
                                ，{judgment.stage.passed ? '接住了' : '没接住'}。
                                {content.reflection[0]}
                              </p>
                            )}
                          {!judgment.passed && (
                            <p>
                              下一步：看上面哪一层没过，对照提示改一改程序，
                              再点一次检查。
                            </p>
                          )}
                          {judgment.passed &&
                            L02_LEVEL_ORDER.indexOf(id) <
                              L02_LEVEL_ORDER.length - 1 && (
                              <p>
                                下一步：这一关过了！点下面的关卡名字，
                                去试试下一关。
                              </p>
                            )}
                        </>
                      )}
                      <p>
                        这份结果只对刚才检查的那一版作品有效；之后在编辑器
                        里再改动，要再点一次“检查我的作品”才会保存新版本
                        并重新判定。
                      </p>
                    </div>
                  )}
                </section>
              )
            })}

            {notice && <p data-testid="l02-notice">{notice}</p>}

            <input
              ref={fileRef}
              data-testid="l02-file-input"
              type="file"
              accept=".sb3"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void handleImportFile(file)
              }}
            />
          </aside>
        )}
      </div>
    </StudioShell>
  )
}
