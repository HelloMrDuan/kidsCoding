'use client'

/**
 * StudioShell — the shared fullscreen classroom shell (OPS-039).
 *
 * Layout: `height: 100dvh`, flex column, `overflow: hidden`. The topbar
 * is the ONLY topbar: on desktop it is a single 76px row (the frozen V2
 * value); below 1024px it becomes two rows (title row + actions row,
 * height auto, min 58px) so the back link, title, progress, save chip,
 * file menu, stage toggle, help and guide all stay visible and reachable
 * on narrow screens instead of being clipped off-screen. The current-goal
 * subtitle shows only at >=1280px (it is always in the drawer). The main
 * area is the single vertical scroll region (`overflow-y: auto`, no
 * horizontal overflow); the document itself never scrolls.
 *
 * The guidance drawer is a floating overlay (absolute inside the shell
 * root, below the topbar), default closed. Its content comes only from
 * the StudioLesson contract. The editor subtree (`children`) is the
 * drawer's sibling and is always mounted — toggling the drawer only
 * changes overlay visibility and can never remount the editor.
 *
 * The shell only renders, never computes: it shows the save state it is
 * given (nothing when absent — never a fabricated "已保存"), it shows
 * progress from the contract (or the step text), and it never invents a
 * judgment or a lesson. An invalid contract fails closed: the shell
 * renders the validation errors and no editor. There is NO run button
 * here — run lives inside the embedded workspace, never duplicated.
 * There is NO file menu unless the workspace reports one, and unsupported
 * file actions are hidden, never rendered as dead buttons.
 */

import { useMemo, useState, type ReactNode } from 'react'

import type { SaveState, ShellControl } from '../workspace/workspace-slots'
import { validateStudioLesson, type StudioLesson } from './studio-lesson'

export type StudioShellProps = {
  lesson: StudioLesson
  /** Save state reported by the embedded workspace; absent = no chip. */
  saveState?: SaveState
  /** Save message reported alongside the state, if any. */
  saveMessage?: string | null
  /** Control surface reported by the embedded workspace; absent = no file/stage controls. */
  shellControl?: ShellControl | null
  /** The editing surface (e.g. LessonWorkspace in studio chrome). Always mounted. */
  children: ReactNode
}

function saveChipText(state: SaveState): string {
  if (state === 'saved') return '已保存到本机'
  if (state === 'failed') return '未能保存'
  return '未保存'
}

export function StudioShell({ lesson, saveState, saveMessage, shellControl, children }: StudioShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [revealedHints, setRevealedHints] = useState(0)

  const contractErrors = useMemo(() => validateStudioLesson(lesson), [lesson])

  if (contractErrors.length > 0) {
    return (
      <div className="studio-shell" data-testid="studio-shell">
        <section data-testid="studio-shell-invalid">
          <h1>课程契约无效</h1>
          <p>本课无法在全屏课堂中打开，未展示编辑器。</p>
          <ul>
            {contractErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      </div>
    )
  }

  const file = shellControl?.file
  const showFile = (key: 'canNew' | 'canSave' | 'canExport' | 'canImport' | 'canReset') =>
    file !== undefined && file.capabilities[key] !== false
  const stage = shellControl?.stage
  const progressText = lesson.progress
    ? `${lesson.progress.label} ${lesson.progress.current}/${lesson.progress.total}`
    : lesson.step

  const hintLevels = lesson.structuredHints
    ? lesson.structuredHints.map((h) => ({ title: h.title, text: h.text }))
    : (lesson.hints as readonly string[]).map((text, index) => ({
        title: ['方向提示', '知识提示', '调试提示'][index] ?? `提示 ${index + 1}`,
        text,
      }))

  return (
    <div className="studio-shell" data-testid="studio-shell">
      <style>{`
        .studio-shell { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; position: relative; background: #f3f6fb; color: #18243a; font-family: "PingFang SC","Microsoft YaHei",sans-serif; box-sizing: border-box; }
        .studio-shell * { box-sizing: border-box; }
        .studio-topbar { height: 76px; flex: 0 0 auto; display: flex; align-items: center; gap: 12px; padding: 0 16px; background: #ffffff; border-bottom: 1px solid #e7edf5; }
        .studio-topbar-main { display: flex; align-items: center; gap: 12px; flex: 1 1 auto; min-width: 0; }
        .studio-topbar-actions { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
        .studio-topbar h1 { margin: 0; font-size: 18px; flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .studio-topbar a { color: #2463eb; text-decoration: none; white-space: nowrap; flex: 0 0 auto; }
        .studio-btn { background: #2463eb; color: #ffffff; border: none; border-radius: 8px; padding: 10px 16px; cursor: pointer; white-space: nowrap; flex: 0 0 auto; }
        .studio-btn-outline { background: #ffffff; color: #18243a; border: 1px solid #e7edf5; border-radius: 8px; padding: 10px 16px; cursor: pointer; white-space: nowrap; flex: 0 0 auto; }
        .studio-topbar .studio-meta { color: #6f7d92; font-size: 13px; white-space: nowrap; flex: 0 0 auto; }
        .studio-goal-current { color: #6f7d92; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; min-width: 0; }
        .studio-demo-badge { background: #2463eb; color: #ffffff; border-radius: 8px; padding: 2px 8px; font-size: 12px; white-space: nowrap; flex: 0 0 auto; }
        .studio-file-wrap { position: relative; display: flex; flex: 0 0 auto; }
        .studio-file-menu { position: absolute; top: calc(100% + 8px); right: 0; z-index: 40; background: #ffffff; border: 1px solid #e7edf5; border-radius: 14px; box-shadow: 0 10px 32px rgba(30,57,96,.12); padding: 8px; display: flex; flex-direction: column; gap: 4px; }
        .studio-main { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
        .studio-guide-drawer { position: absolute; left: 0; top: 76px; bottom: 0; width: min(360px, 92vw); background: #ffffff; border-right: 1px solid #e7edf5; z-index: 30; overflow-y: auto; box-shadow: 0 10px 32px rgba(30,57,96,.12); padding: 16px; }
        .studio-guide-drawer h2 { font-size: 15px; margin: 0 0 8px; }
        .studio-guide-drawer h3 { font-size: 14px; margin: 16px 0 6px; }
        @media (max-width: 1279px) {
          .studio-goal-current { display: none; }
        }
        @media (max-width: 1023px) {
          .studio-topbar { height: auto; min-height: 58px; flex-direction: column; align-items: stretch; gap: 6px; padding: 8px 12px; }
          .studio-topbar-main { flex: 0 0 auto; }
          .studio-topbar-actions { flex-wrap: wrap; gap: 8px; }
          .studio-topbar h1 { font-size: 16px; }
          .studio-topbar-actions .studio-meta { min-width: 0; overflow: hidden; text-overflow: ellipsis; flex: 1 1 100px; }
          .studio-btn, .studio-btn-outline { padding: 8px 12px; }
          .studio-guide-drawer { position: fixed; top: 0; bottom: 0; }
        }
      `}</style>

      <header className="studio-topbar" data-testid="studio-topbar">
        <div className="studio-topbar-main">
          <a href={lesson.backHref} data-testid="studio-back">
            ← 返回
          </a>
          <h1 data-testid="studio-title">{lesson.title}</h1>
          {lesson.demo && <span className="studio-demo-badge" data-testid="studio-demo-badge">演示</span>}
          {saveState !== undefined && (
            <span className="studio-meta" data-testid="studio-save-chip">
              {saveChipText(saveState)}
            </span>
          )}
          {saveMessage && (
            <span className="studio-meta" data-testid="studio-save-message">
              {saveMessage}
            </span>
          )}
        </div>
        <div className="studio-topbar-actions">
          <span className="studio-goal-current" data-testid="studio-goal-current">
            {lesson.goal5[0]}
          </span>
          <span className="studio-meta" data-testid="studio-progress">
            {progressText}
          </span>
          {file !== undefined && (
            <span className="studio-file-wrap">
              <button
                type="button"
                className="studio-btn-outline"
                onClick={() => setFileMenuOpen((v) => !v)}
                data-testid="studio-file-menu-button"
              >
                文件
              </button>
              {fileMenuOpen && shellControl !== undefined && shellControl !== null && (
                <div className="studio-file-menu" data-testid="studio-file-menu">
                  {showFile('canNew') && (
                    <button
                      type="button"
                      className="studio-btn-outline"
                      onClick={() => {
                        setFileMenuOpen(false)
                        file.newLesson()
                      }}
                      data-testid="studio-file-new"
                    >
                      新建
                    </button>
                  )}
                  {showFile('canSave') && (
                    <button
                      type="button"
                      className="studio-btn-outline"
                      onClick={() => {
                        setFileMenuOpen(false)
                        shellControl.save()
                      }}
                      data-testid="studio-file-save"
                    >
                      保存作品
                    </button>
                  )}
                  {showFile('canExport') && (
                    <button
                      type="button"
                      className="studio-btn-outline"
                      onClick={() => {
                        setFileMenuOpen(false)
                        file.export()
                      }}
                      data-testid="studio-file-export"
                    >
                      导出
                    </button>
                  )}
                  {showFile('canImport') && (
                    <button
                      type="button"
                      className="studio-btn-outline"
                      onClick={() => {
                        setFileMenuOpen(false)
                        file.import()
                      }}
                      data-testid="studio-file-import"
                    >
                      导入
                    </button>
                  )}
                  {showFile('canReset') && (
                    <button
                      type="button"
                      className="studio-btn-outline"
                      onClick={() => {
                        setFileMenuOpen(false)
                        file.reset()
                      }}
                      data-testid="studio-file-reset"
                    >
                      恢复初始
                    </button>
                  )}
                </div>
              )}
            </span>
          )}
          {stage?.canToggle && (
            <button
              type="button"
              className="studio-btn-outline"
              onClick={() => stage.toggle()}
              data-testid="studio-stage-toggle"
            >
              {stage.visible ? '隐藏舞台' : '显示舞台'}
            </button>
          )}
          <button
            type="button"
            className="studio-btn-outline"
            onClick={() => setDrawerOpen(true)}
            data-testid="studio-help-button"
          >
            帮助
          </button>
          <button
            type="button"
            className="studio-btn"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-expanded={drawerOpen}
            data-testid="studio-guide-button"
          >
            {drawerOpen ? '收起指引' : '指引'}
          </button>
        </div>
      </header>

      <main className="studio-main" data-testid="studio-main">
        {children}
      </main>

      {drawerOpen && (
        <aside className="studio-guide-drawer" data-testid="studio-guide-drawer" aria-label="课程指引">
          <button
            type="button"
            className="studio-btn-outline"
            onClick={() => setDrawerOpen(false)}
            data-testid="studio-guide-close"
          >
            关闭指引
          </button>
          <h2>课程指引</h2>
          <h3>学习目标</h3>
          <ol data-testid="studio-goal5">
            {lesson.goal5.map((goal, index) => (
              <li key={index}>{goal}</li>
            ))}
          </ol>
          <h3>任务</h3>
          <p>{lesson.brief}</p>
          <p>{lesson.step}</p>
          {lesson.methodSteps !== undefined && (
            <>
              <h3>方法步骤</h3>
              <ol>
                {lesson.methodSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </>
          )}
          {lesson.activities !== undefined && (
            <>
              <h3>学习活动</h3>
              <ul>
                {lesson.activities.map((activity, index) => (
                  <li key={index}>
                    <strong>{activity.title}：</strong>
                    {activity.text}
                  </li>
                ))}
              </ul>
            </>
          )}
          {lesson.progress !== undefined && (
            <p data-testid="studio-drawer-progress">
              {lesson.progress.label} {lesson.progress.current}/{lesson.progress.total}
            </p>
          )}
          {lesson.scopeGap !== undefined && <p>{lesson.scopeGap}</p>}
          <h3>提示（逐步揭示，不直接给答案）</h3>
          {hintLevels.map((hint, index) => (
            <div key={index}>
              <button
                type="button"
                className="studio-btn-outline"
                onClick={() => setRevealedHints(index + 1)}
                data-testid={`studio-hint-reveal-${index + 1}`}
              >
                {hint.title}
              </button>
              {revealedHints > index && <p data-testid={`studio-hint-${index + 1}`}>{hint.text}</p>}
            </div>
          ))}
          <h3>帮助</h3>
          {lesson.help !== undefined ? (
            <>
              <p>
                <strong>{lesson.help.title}</strong>
              </p>
              {lesson.help.body.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </>
          ) : (
            <p>点“指引”随时查看学习目标与提示；点运行可以运行作品；保存会自动保存到本机。</p>
          )}
        </aside>
      )}
    </div>
  )
}
