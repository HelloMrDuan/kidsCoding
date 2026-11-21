'use client'

/**
 * Scratch 自由创作工坊：作品库首页。
 *
 * 这里是“不依附任何课程”的创作入口：孩子可以新建一份空白 Scratch
 * 作品、导入已有 .sb3、继续上次的作品，或重命名/删除自己的作品。
 * 作品本身只保存在本机 IndexedDB；进入编辑器后由 GUI 桥接负责读写，
 * 页面只显示真实结果，不伪造“已保存”。
 */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { loadBlankProjectSb3 } from '@/features/lessons/studio/free-create/blank-project'
import {
  createIndexedDbProjectStore,
  defaultProjectName,
  newProjectId,
  normalizeProjectName,
  type ProjectSummary,
} from '@/features/lessons/studio/free-create/project-library'
import { validateSb3Buffer } from '@/features/lessons/studio/free-create/sb3-import'

const MAX_IMPORT_BYTES = 20 * 1024 * 1024

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Busy = 'create' | 'import' | `delete:${string}` | null

export function FreeCreateHub() {
  const store = useMemo(() => createIndexedDbProjectStore(), [])
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [lastOpened, setLastOpened] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [list, last] = await Promise.all([store.list(), store.getLastOpened()])
      setProjects(list)
      setLastOpened(last)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '作品库读取失败')
      setProjects([])
    }
  }, [store])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createBlank() {
    if (busy) return
    setBusy('create')
    setError(null)
    try {
      const list = projects ?? (await store.list())
      const sb3 = await loadBlankProjectSb3()
      const id = newProjectId()
      const savedAt = Date.now()
      await store.put({
        id,
        name: defaultProjectName(list),
        sb3,
        savedAt,
        byteLength: sb3.byteLength,
      })
      await store.setLastOpened(id)
      window.location.assign(`/studio/scratch/free/${id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '新建作品失败')
      setBusy(null)
    }
  }

  async function importFile(file: File | null) {
    if (!file || busy) return
    setBusy('import')
    setError(null)
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('文件太大：请选择 20MB 以内的 .sb3 作品')
      const sb3 = await file.arrayBuffer()
      // 真实解析一次：不是有效 .sb3 就不入库，避免把坏文件存进作品库。
      await validateSb3Buffer(sb3)
      const id = newProjectId()
      const savedAt = Date.now()
      const base = file.name.replace(/\.sb3$/i, '')
      await store.put({
        id,
        name: normalizeProjectName(base),
        sb3,
        savedAt,
        byteLength: sb3.byteLength,
      })
      await store.setLastOpened(id)
      await refresh()
      setBusy(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导入作品失败')
      setBusy(null)
    }
  }

  async function commitRename(id: string) {
    setError(null)
    try {
      const project = await store.get(id)
      if (!project) throw new Error('作品不存在或已被删除')
      await store.put({
        ...project,
        name: normalizeProjectName(renameDraft),
        savedAt: project.savedAt,
      })
      setRenamingId(null)
      setRenameDraft('')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '重命名失败')
    }
  }

  async function removeProject(id: string) {
    setBusy(`delete:${id}`)
    setError(null)
    try {
      await store.remove(id)
      if ((await store.getLastOpened()) === id) await store.setLastOpened(null)
      setConfirmDeleteId(null)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除作品失败')
    } finally {
      setBusy(null)
    }
  }

  const resumeProject = projects?.find((project) => project.id === lastOpened) ?? null

  return (
    <main className="kc-page-main" data-testid="free-create-hub">
      <header className="kc-title-row">
        <div className="min-w-0">
          <div className="kc-eyebrow">CREATE · 自由创作</div>
          <h1>Scratch 创作工坊</h1>
          <p className="kc-subtitle">
            不跟课程走，自己想做就做什么。作品只保存在这台设备上。
          </p>
        </div>
        <Link className="kc-action-surface kc-btn-outline kc-btn-sm shrink-0" href="/learn/catalog">
          回到课程体系
        </Link>
      </header>

      <section className="mt-4 flex flex-wrap items-center gap-2" aria-label="作品操作">
        <button
          type="button"
          className="kc-action-surface kc-btn-primary kc-btn-sm"
          data-testid="free-create-new"
          onClick={() => void createBlank()}
          disabled={busy !== null}
        >
          {busy === 'create' ? '正在准备空白作品…' : '＋ 新建空白作品'}
        </button>
        <label className="kc-action-surface kc-btn-outline kc-btn-sm cursor-pointer">
          {busy === 'import' ? '正在导入…' : '导入 .sb3'}
          <input
            type="file"
            accept=".sb3,application/octet-stream"
            className="hidden"
            data-testid="free-create-import"
            disabled={busy !== null}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              event.target.value = ''
              void importFile(file)
            }}
          />
        </label>
        {resumeProject ? (
          <Link
            className="kc-action-surface kc-btn-outline kc-btn-sm"
            href={`/studio/scratch/free/${resumeProject.id}`}
            data-testid="free-create-resume"
          >
            继续上次：{resumeProject.name}
          </Link>
        ) : null}
      </section>

      {error ? (
        <p className="mt-3 rounded-[8px] border border-[var(--kc-danger)] bg-white px-3 py-2 text-sm font-bold text-[var(--kc-danger)]" data-testid="free-create-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-5" aria-label="我的作品">
        <h2 className="text-[15px] font-bold text-[var(--kc-text)]">我的作品</h2>
        {projects === null ? (
          <p className="mt-2 text-sm text-[var(--kc-text-muted)]" data-testid="free-create-loading">
            正在读取本机作品库…
          </p>
        ) : projects.length === 0 ? (
          <p className="mt-2 rounded-[10px] border border-dashed border-[var(--kc-line)] px-4 py-6 text-sm text-[var(--kc-text-muted)]" data-testid="free-create-empty">
            还没有作品。点“新建空白作品”开始，或导入一个已有的 .sb3。
          </p>
        ) : (
          <ul className="mt-2 grid gap-2 md:grid-cols-2" data-testid="free-create-list">
            {projects.map((project) => (
              <li
                key={project.id}
                className="rounded-[10px] border border-[var(--kc-line)] bg-white px-3 py-3"
                data-testid={`free-create-project-${project.id}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  {renamingId === project.id ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void commitRename(project.id)
                      }}
                    >
                      <input
                        className="min-w-0 flex-1 rounded-[6px] border border-[var(--kc-line)] px-2 py-1 text-sm"
                        data-testid={`free-create-rename-input-${project.id}`}
                        value={renameDraft}
                        maxLength={24}
                        autoFocus
                        onChange={(event) => setRenameDraft(event.target.value)}
                      />
                      <button type="submit" className="kc-action-surface kc-btn-primary kc-btn-sm" data-testid={`free-create-rename-save-${project.id}`}>
                        保存名字
                      </button>
                      <button
                        type="button"
                        className="kc-action-surface kc-btn-outline kc-btn-sm"
                        onClick={() => {
                          setRenamingId(null)
                          setRenameDraft('')
                        }}
                      >
                        取消
                      </button>
                    </form>
                  ) : (
                    <Link
                      className="min-w-0 truncate font-bold text-[var(--kc-text)] underline decoration-[var(--kc-line)] underline-offset-2"
                      href={`/studio/scratch/free/${project.id}`}
                      data-testid={`free-create-open-${project.id}`}
                    >
                      {project.name}
                    </Link>
                  )}
                  <span className="shrink-0 text-xs text-[var(--kc-text-muted)]">
                    {formatTime(project.savedAt)} · {(project.byteLength / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="kc-action-surface kc-btn-outline kc-btn-sm"
                    data-testid={`free-create-rename-${project.id}`}
                    onClick={() => {
                      setRenamingId(project.id)
                      setRenameDraft(project.name)
                      setConfirmDeleteId(null)
                    }}
                  >
                    重命名
                  </button>
                  {confirmDeleteId === project.id ? (
                    <>
                      <button
                        type="button"
                        className="kc-action-surface kc-btn-outline kc-btn-sm"
                        data-testid={`free-create-delete-confirm-${project.id}`}
                        disabled={busy !== null}
                        onClick={() => void removeProject(project.id)}
                      >
                        {busy === `delete:${project.id}` ? '正在删除…' : '确认删除'}
                      </button>
                      <button
                        type="button"
                        className="kc-action-surface kc-btn-outline kc-btn-sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="kc-action-surface kc-btn-outline kc-btn-sm"
                      data-testid={`free-create-delete-${project.id}`}
                      onClick={() => setConfirmDeleteId(project.id)}
                    >
                      删除
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-[var(--kc-text-muted)]" data-testid="free-create-note">
        说明：作品保存在这台设备的浏览器里，换设备或清除浏览器数据后不会自动同步。
        首次打开编辑器需要先加载 Scratch 创作环境，加载失败时页面会明确提示，不会假装可以编辑。
      </p>
    </main>
  )
}
