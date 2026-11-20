'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { BRIDGE_PROTOCOL, BRIDGE_VERSION, ScratchBridgeClient } from '@/features/lessons/dance-show/gui-bridge'
import { workLibrary, MAX_NAME_LENGTH, type WorkSummary } from '@/features/create/project-store'
import { useWorkspaceSession } from '@/features/create/use-workspace-session'
import { downloadWork, Workspace, WorkspaceLink } from '@/features/create/workspace'
import { createBlankScratchProject } from './blank-project'
import { scratchGuiUrl } from './gui-origin'
import { readScratchImport } from './read-project'
import styles from './scratch-create.module.css'

const failText = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重试。'

export function ScratchCreateEditor({ id, guiAddress, owner }: { id: string; guiAddress?: string; owner: string }) {
  const address = scratchGuiUrl(guiAddress)?.href
  const isImport = id === 'import'
  const [record, setRecord] = useState<WorkSummary | null>(null)
  const [reading, setReading] = useState(true)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [storageAttempt, setStorageAttempt] = useState(0)
  const [loadedFrame, setLoadedFrame] = useState(-1)
  const frame = useRef<HTMLIFrameElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const client = useRef<ScratchBridgeClient | null>(null)
  const original = useRef<ArrayBuffer | null>(null)
  const changes = useRef(0)
  const locked = useRef(false)
  const sessionLocked = useWorkspaceSession(owner, dirty)

  useEffect(() => {
    let alive = true
    const stored = isImport ? createBlankScratchProject().then((sb3) => ({
      id, name: '导入 Scratch 作品', createdAt: 0, updatedAt: 0, revision: 0, sb3, language: 'scratch' as const,
    })) : workLibrary(owner).open(id, 'scratch')
    stored.then((work) => {
      if (!alive) return
      original.current = work?.language === 'scratch' ? work.sb3 : null
      setRecord(work)
      if (!work) setError('此作品未保存在当前浏览器。')
    }, (err) => {
      if (alive) setError(failText(err))
    }).finally(() => {
      if (alive) setReading(false)
    })
    return () => { alive = false }
  }, [id, isImport, owner, storageAttempt])

  // Save updates the revision but doesn't change which project is mounted.
  const hasWork = Boolean(record)
  useEffect(() => {
    const iframe = frame.current
    const data = original.current
    if (!address || !iframe || !hasWork || !data || loadedFrame !== attempt) return
    const origin = new URL(address).origin
    const bridge = new ScratchBridgeClient({ iframe, targetOrigin: origin, allowlist: [origin], requestTimeoutMs: 15000 })
    bridge.start()
    client.current = bridge
    let alive = true
    let acceptsEdits = false
    function onEdit(event: MessageEvent) {
      if (!acceptsEdits || event.origin !== origin || event.source !== iframe?.contentWindow) return
      if (event.data?.type !== 'project-changed' || event.data.protocol !== BRIDGE_PROTOCOL ||
          event.data.version !== BRIDGE_VERSION || event.data.requestId !== 'editor') return
      changes.current += 1
      setDirty(true)
    }
    window.addEventListener('message', onEdit)
    void bridge.loadProject({ format: 'sb3', data }).then((targets) => {
      if (!alive) return
      if (targets.length === 0) throw new Error('没有在编辑器中找到可恢复的舞台。')
      acceptsEdits = true
      setReady(true)
    }).catch((err) => {
      if (alive) setError(failText(err))
    })
    return () => {
      alive = false
      acceptsEdits = false
      window.removeEventListener('message', onEdit)
      bridge.dispose()
      client.current = null
    }
  }, [address, attempt, hasWork, loadedFrame])

  async function perform(action: (bridge: ScratchBridgeClient) => Promise<void>) {
    if (!ready || !client.current || locked.current || sessionLocked) return
    locked.current = true
    setBusy(true)
    setError('')
    try { await action(client.current) }
    catch (err) { setError(failText(err)) }
    finally { locked.current = false; setBusy(false) }
  }

  function save() {
    if (!record || isImport) return
    void perform(async (bridge) => {
      const snapshot = changes.current
      try {
        const { sb3 } = await bridge.getProject()
        const metadata = await workLibrary(owner).save(record.id, record.revision, { language: 'scratch', sb3 })
        setRecord(metadata)
        original.current = sb3
        setSaveFailed(false)
        setDirty(changes.current !== snapshot)
      } catch (error) {
        setSaveFailed(true)
        throw error
      }
    })
  }

  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected || !isImport) return
    void perform(async (bridge) => {
      const bytes = await readScratchImport(selected)
      const targets = await bridge.loadProject({ format: 'sb3', data: bytes })
      if (!targets.length) throw new Error('Scratch 无法打开这个作品。')
      const projectName = (selected.name.replace(/\.sb3$/i, '').trim() || '导入的 Scratch 作品').slice(0, MAX_NAME_LENGTH)
      const work = await workLibrary(owner).create(projectName, { language: 'scratch', sb3: bytes })
      window.location.replace('/create/scratch/' + work.id)
    })
  }

  const saveStatus = saveFailed ? '未能保存' : dirty ? '未保存' : '已保存到本机'
  return (
    <Workspace title={sessionLocked ? 'Scratch 创作' : record?.name ?? 'Scratch 自由创作'} status={!sessionLocked && ready && !isImport ? saveStatus : undefined}
      actions={!sessionLocked && record && address && (isImport ? (
          <button type="button" className={styles.editorPrimary} disabled={!ready || busy} onClick={() => file.current?.click()}>导入 .sb3</button>
        ) : (
          <>
            <button type="button" className={styles.editorPrimary} disabled={!ready || busy} onClick={save}>保存</button>
            <WorkspaceLink className={styles.editorSecondary} href="/create/scratch/import">导入 .sb3</WorkspaceLink>
            <button type="button" className={styles.editorSecondary} disabled={!ready || busy} onClick={() => void perform(async (bridge) => {
              downloadWork((await bridge.getProject()).sb3, record.name, 'sb3')
            })}>导出 .sb3</button>
          </>
        ))}>
        {sessionLocked && <p role="alert" className={styles.notice}>无法确认当前身份，作品已锁定。请恢复原账号或返回创作中心。</p>}
        <div className={styles.editorBody} hidden={sessionLocked} inert={sessionLocked}>
        <div className={styles.notice} data-testid="scratch-create-status" role={error ? 'alert' : 'status'} data-error={error ? '' : undefined}>
          {error || (!address ? 'Scratch 编辑服务尚未配置。' : reading || (record && !ready) ? '正在打开 Scratch 编辑器…' :
            busy ? '正在处理作品…' : isImport ? '选择 .sb3 文件来创建独立的本机作品。' : '作品仅保存在此浏览器。请在离开前保存，换设备时先导出。')}
          {error && record && address && !ready && (
            <button className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => {
              setError('')
              setAttempt((current) => current + 1)
            }}>重试加载</button>
          )}
          {error && !record && <button className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => {
            setError('')
            setReading(true)
            setStorageAttempt((current) => current + 1)
          }}>重试读取</button>}
        </div>
        {isImport && <input type="file" accept=".sb3" hidden ref={file} onChange={importFile} />}
        {record && address && <iframe
          key={attempt} ref={frame} src={address} title="Scratch 自由创作编辑器"
          onLoad={() => setLoadedFrame(attempt)}
          sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-popups"
          referrerPolicy="no-referrer" className={styles.editorFrame} data-loading={!ready ? '' : undefined}
          tabIndex={ready ? 0 : -1}
        />}
        </div>
    </Workspace>
  )
}
