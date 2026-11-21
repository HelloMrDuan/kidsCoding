'use client'

/**
 * Scratch 自由创作工坊：单份作品的创作页。
 *
 * 真实编辑环境是部署时配置的 Scratch GUI（NEXT_PUBLIC_SCRATCH_GUI_URL），
 * 通过 `ScratchBridgeClient` 与本页受控通信；本页负责：
 * - 从本机作品库载入这份作品（IndexedDB，按作品 id，不覆盖别的作品）；
 * - 点“保存”时经桥接取回 GUI 里的当前作品，再写回同一份记录；
 * - 导入 / 导出 .sb3（桥接不可用时的备用通道）；
 * - 重命名、删除。
 *
 * fail-closed：GUI 地址未配置时绝不渲染指向 localhost 的 iframe，也不
 * 接受任何来源的消息；页面明确说明未配置。保存失败时如实显示“未能保存”，
 * 不把 GUI 的自动加载当成已保存。
 */

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ScratchBridgeClient } from '@/features/lessons/dance-show/gui-bridge'
import { normalizeProjectName, type StoredProject } from '@/features/lessons/studio/free-create/project-library'
import { createIndexedDbProjectStore } from '@/features/lessons/studio/free-create/project-library'
import { validateSb3Buffer } from '@/features/lessons/studio/free-create/sb3-import'

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

const MAX_IMPORT_BYTES = 20 * 1024 * 1024

type SaveState = 'unsaved' | 'saved' | 'failed'
type LoadState = 'loading' | 'ready' | 'missing' | 'error'

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function downloadSb3(name: string, sb3: ArrayBuffer) {
  const blob = new Blob([sb3], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${name || '我的作品'}.sb3`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function FreeCreateEditor({ projectId }: { projectId: string }) {
  const store = useRef(createIndexedDbProjectStore()).current
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const clientRef = useRef<ScratchBridgeClient | null>(null)

  const [project, setProject] = useState<StoredProject | null>(null)
  const projectRef = useRef<StoredProject | null>(null)
  projectRef.current = project
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState('')
  const [guiState, setGuiState] = useState<'waiting' | 'loading' | 'ready' | 'error'>(
    GUI_CONFIGURED ? 'waiting' : 'error',
  )
  const [saveState, setSaveState] = useState<SaveState>('unsaved')
  const [message, setMessage] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const loaded = await store.get(projectId)
        if (cancelled) return
        if (!loaded) {
          setLoadState('missing')
          return
        }
        setProject(loaded)
        setNameDraft(loaded.name)
        setLoadState('ready')
        setSaveState('unsaved')
        // 记下“上次打开”，作品库首页据此提供“继续”入口；失败不影响创作。
        void store.setLastOpened(projectId).catch(() => {})
      } catch (cause) {
        if (cancelled) return
        setLoadState('error')
        setLoadError(cause instanceof Error ? cause.message : '作品库读取失败')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, store])

  // 桥接接线：等 GUI 默认作品加载完成后，把本作品的 .sb3 载入 GUI。
  // 不做“自动保存”：孩子没点保存，本页就不知道 GUI 里改了什么。
  useEffect(() => {
    if (!GUI_CONFIGURED || loadState !== 'ready' || !project) return
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
    } catch (cause) {
      setGuiState('error')
      setMessage(`创作环境配置有误：${cause instanceof Error ? cause.message : String(cause)}`)
      return
    }
    clientRef.current = client
    client.start()
    setGuiState('waiting')
    void (async () => {
      try {
        await client.waitUntilProjectNonEmpty()
        if (cancelled) return
        setGuiState('loading')
        await client.loadProject({ format: 'sb3', data: project.sb3 })
        if (cancelled) return
        const check = await client.getProject()
        if (cancelled) return
        if (check.project.targets.length === 0) {
          throw new Error('作品载入后 GUI 仍为空')
        }
        setGuiState('ready')
        setSaveState('saved')
        setMessage('')
      } catch (cause) {
        if (cancelled) return
        setGuiState('error')
        setMessage(cause instanceof Error ? cause.message : 'Scratch 创作环境载入失败')
      }
    })()
    return () => {
      cancelled = true
      client.dispose()
      if (clientRef.current === client) clientRef.current = null
    }
    // project 只在首次读取完成后设置；后续保存用 projectRef，不重连桥接。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState, projectId])

  const saveToStore = useCallback(
    async (sb3: ArrayBuffer, name: string, savedAt = Date.now()) => {
      const next: StoredProject = {
        id: projectId,
        name,
        sb3,
        savedAt,
        byteLength: sb3.byteLength,
      }
      await store.put(next)
      await store.setLastOpened(projectId)
      setProject(next)
      return next
    },
    [projectId, store],
  )

  async function save() {
    const current = projectRef.current
    if (!current || busy) return
    setBusy(true)
    setMessage('')
    try {
      if (!GUI_CONFIGURED) throw new Error('创作环境未配置，无法从编辑器取回作品')
      const client = clientRef.current
      if (!client || guiState !== 'ready') throw new Error('创作环境还没准备好，稍后再试')
      const result = await client.getProject()
      if (result.project.targets.length === 0) throw new Error('编辑器里没有作品，未保存')
      await saveToStore(result.sb3, current.name)
      setSaveState('saved')
      setMessage('已保存到本机')
    } catch (cause) {
      setSaveState('failed')
      setMessage(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function importFile(file: File | null) {
    const current = projectRef.current
    if (!file || !current || busy) return
    setBusy(true)
    setMessage('')
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('文件太大：请选择 20MB 以内的 .sb3 作品')
      const sb3 = await file.arrayBuffer()
      await validateSb3Buffer(sb3)
      await saveToStore(sb3, current.name)
      if (GUI_CONFIGURED && clientRef.current && guiState === 'ready') {
        await clientRef.current.loadProject({ format: 'sb3', data: sb3 })
      }
      setSaveState('saved')
      setMessage(GUI_CONFIGURED && guiState === 'ready' ? '已导入并载入编辑器' : '已导入作品库（创作环境未就绪，暂未载入编辑器）')
    } catch (cause) {
      setSaveState('failed')
      setMessage(cause instanceof Error ? cause.message : '导入失败')
    } finally {
      setBusy(false)
    }
  }

  async function commitRename() {
    const current = projectRef.current
    if (!current) return
    try {
      const next = await saveToStore(current.sb3, normalizeProjectName(nameDraft), current.savedAt)
      setNameDraft(next.name)
      setRenaming(false)
      setMessage('名字已更新')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '重命名失败')
    }
  }

  async function removeProject() {
    if (busy) return
    setBusy(true)
    try {
      await store.remove(projectId)
      window.location.assign('/studio/scratch/free')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '删除失败')
      setBusy(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <main className="kc-page-main" data-testid="free-create-editor">
        <p data-testid="free-create-editor-loading">正在读取作品…</p>
      </main>
    )
  }

  if (loadState === 'missing') {
    return (
      <main className="kc-page-main" data-testid="free-create-editor">
        <section data-testid="free-create-missing">
          <h1>作品不存在</h1>
          <p>这份作品可能已被删除，或属于另一台设备。</p>
          <Link href="/studio/scratch/free">回到创作工坊</Link>
        </section>
      </main>
    )
  }

  if (loadState === 'error') {
    return (
      <main className="kc-page-main" data-testid="free-create-editor">
        <p role="alert" data-testid="free-create-editor-error">{loadError}</p>
        <Link href="/studio/scratch/free">回到创作工坊</Link>
      </main>
    )
  }

  const projectNow = project as StoredProject
  const saveLabel =
    saveState === 'saved'
      ? `已保存 ${formatTime(projectNow.savedAt)}`
      : saveState === 'failed'
        ? '未能保存'
        : '未保存'

  return (
    <main className="kc-page-main" data-testid="free-create-editor">
      <header className="kc-title-row flex-wrap gap-2">
        <div className="min-w-0 flex-1">
          <div className="kc-eyebrow">CREATE · 自由创作</div>
          {renaming ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void commitRename()
              }}
            >
              <input
                className="min-w-[8rem] flex-1 rounded-[6px] border border-[var(--kc-line)] px-2 py-1 text-lg font-bold"
                data-testid="free-create-name-input"
                value={nameDraft}
                maxLength={24}
                autoFocus
                onChange={(event) => setNameDraft(event.target.value)}
              />
              <button type="submit" className="kc-action-surface kc-btn-primary kc-btn-sm">
                保存名字
              </button>
              <button
                type="button"
                className="kc-action-surface kc-btn-outline kc-btn-sm"
                onClick={() => {
                  setRenaming(false)
                  setNameDraft(projectNow.name)
                }}
              >
                取消
              </button>
            </form>
          ) : (
            <h1 className="truncate" data-testid="free-create-name">
              {projectNow.name}
            </h1>
          )}
          <p className="kc-subtitle" data-testid="free-create-save-state" data-state={saveState}>
            {saveLabel}
            {message ? ` · ${message}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link className="kc-action-surface kc-btn-outline kc-btn-sm" href="/studio/scratch/free">
            作品库
          </Link>
          {!renaming ? (
            <button
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              data-testid="free-create-rename"
              onClick={() => setRenaming(true)}
            >
              重命名
            </button>
          ) : null}
          <button
            type="button"
            className="kc-action-surface kc-btn-primary kc-btn-sm"
            data-testid="free-create-save"
            onClick={() => void save()}
            disabled={busy || guiState !== 'ready'}
          >
            {busy ? '处理中…' : '保存'}
          </button>
          <label className="kc-action-surface kc-btn-outline kc-btn-sm cursor-pointer">
            导入
            <input
              type="file"
              accept=".sb3,application/octet-stream"
              className="hidden"
              data-testid="free-create-import"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                event.target.value = ''
                void importFile(file)
              }}
            />
          </label>
          <button
            type="button"
            className="kc-action-surface kc-btn-outline kc-btn-sm"
            data-testid="free-create-export"
            onClick={() => downloadSb3(projectNow.name, projectRef.current?.sb3 ?? projectNow.sb3)}
          >
            导出 .sb3
          </button>
          {confirmDelete ? (
            <>
              <button
                type="button"
                className="kc-action-surface kc-btn-outline kc-btn-sm"
                data-testid="free-create-delete-confirm"
                onClick={() => void removeProject()}
                disabled={busy}
              >
                确认删除
              </button>
              <button
                type="button"
                className="kc-action-surface kc-btn-outline kc-btn-sm"
                onClick={() => setConfirmDelete(false)}
              >
                取消
              </button>
            </>
          ) : (
            <button
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              data-testid="free-create-delete"
              onClick={() => setConfirmDelete(true)}
            >
              删除
            </button>
          )}
        </div>
      </header>

      <p className="mt-2 text-xs leading-relaxed text-[var(--kc-text-muted)]">
        在编辑器里改完积木后，点上面的“保存”才会写回作品库。手机和平板上编辑器可能不显示自己的文件菜单，请用这里的保存/导出。
      </p>

      <section
        className="relative mt-3 overflow-hidden rounded-[10px] border border-[var(--kc-line)] bg-white"
        style={{ height: 'calc(100dvh - 230px)', minHeight: 420 }}
        data-testid="free-create-canvas"
      >
        {GUI_CONFIGURED ? (
          <>
            <iframe
              ref={iframeRef}
              title={`Scratch 创作环境 — ${projectNow.name}`}
              src={GUI_URL}
              data-testid="free-create-gui"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
            {guiState !== 'ready' ? (
              <div
                className="absolute inset-0 flex items-center justify-center bg-white/95 p-6"
                data-testid="free-create-gui-status"
                role={guiState === 'error' ? 'alert' : 'status'}
              >
                <div className="max-w-[560px] text-sm leading-7 text-[var(--kc-text)]">
                  {guiState === 'error' ? (
                    <>
                      <b>创作环境加载失败</b>
                      <p>{message || '未能连接到 Scratch 创作环境。'}</p>
                      <p>请刷新页面重试；作品仍在作品库中，没有丢失。</p>
                    </>
                  ) : (
                    <p>{guiState === 'loading' ? '正在打开这份作品…' : '正在连接 Scratch 创作环境…'}</p>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div
            className="flex h-full items-center justify-center p-6"
            data-testid="free-create-gui-not-configured"
          >
            <div className="max-w-[560px] rounded-[10px] border border-[var(--kc-line)] bg-white p-6 text-[15px] leading-8 text-[var(--kc-text)]">
              <div className="mb-2 text-[17px] font-bold">创作环境地址未配置</div>
              <p>
                Scratch 创作环境需要部署时配置地址（NEXT_PUBLIC_SCRATCH_GUI_URL），当前没有配置，
                所以这里没有加载编辑器，也不会去连你电脑上的 localhost。
              </p>
              <p>
                作品本身已经保存在本机作品库：可以用“导出 .sb3”带走，
                或换到已配置创作环境的部署继续编辑。
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
