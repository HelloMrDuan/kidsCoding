'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createBlankScratchProject } from '../scratch-create/blank-project'
import { scratchGuiUrl } from '../scratch-create/gui-origin'
import styles from '../scratch-create/scratch-create.module.css'
import { MAX_NAME_LENGTH, workLibrary, type WorkLanguage, type WorkSummary } from './project-store'
import { readPythonFile } from './python-file'
import { useWorkspaceSession } from './use-workspace-session'
import { WorkspaceLink } from './workspace'

const languageLabel = { scratch: 'Scratch', python: 'Python' } as const
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' })

export function CreateHub({ owner, guiAddress }: { owner: string; guiAddress?: string }) {
  const library = useMemo(() => workLibrary(owner), [owner])
  const [works, setWorks] = useState<WorkSummary[] | null>(null)
  const [filter, setFilter] = useState<'all' | WorkLanguage>('all')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const guard = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const blocked = useWorkspaceSession(owner, false)
  const enabled = Boolean(scratchGuiUrl(guiAddress))

  useEffect(() => {
    let active = true
    const refresh = () => void library.list().then((items) => { if (active) setWorks(items) }, (err: Error) => { if (active) setError(err.message) })
    refresh()
    window.addEventListener('pageshow', refresh)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.removeEventListener('pageshow', refresh); window.removeEventListener('focus', refresh) }
  }, [library])

  async function perform(action: () => Promise<void>) {
    if (guard.current || blocked) return
    guard.current = true
    setBusy(true)
    setError('')
    try { await action() }
    catch (err) { setError(err instanceof Error ? err.message : '操作未完成，请重试。') }
    finally { guard.current = false; setBusy(false) }
  }

  function newWork(language: WorkLanguage) {
    void perform(async () => {
      const title = `我的 ${languageLabel[language]} 作品`
      const work = language === 'scratch' ? await library.create(title, { language, sb3: await createBlankScratchProject() })
        : await library.create(title, { language, source: '' })
      window.location.assign(`/create/${language}/${work.id}`)
    })
  }

  function submitName(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    void perform(async () => {
      await library.rename(editing, name)
      setWorks(await library.list())
      setEditing(null)
    })
  }

  const visible = works?.filter((work) => filter === 'all' || work.language === filter)
  if (blocked) return <main className="kc-page-main"><h1>创作中心</h1><p role="alert">当前账号已更改或暂时无法核对。请刷新页面后打开作品。</p></main>

  return (
    <div className="kc-page-main">
      <header className="kc-title-row"><div><h1>创作中心</h1><p className="kc-subtitle">用积木或代码做自己的作品。</p></div></header>
      <div className={styles.launcher}>
        <section className={styles.card} aria-labelledby="scratch-heading">
          <h2 id="scratch-heading">Scratch 图形化创作</h2>
          <p>用角色、积木和声音制作动画与游戏。</p>
          {enabled ? <div className={styles.actions}>
            <button className="kc-action-surface" disabled={busy} onClick={() => newWork('scratch')}>新建空白作品</button>
            <WorkspaceLink className="kc-action-surface kc-btn-outline" href="/create/scratch/import">导入 .sb3</WorkspaceLink>
          </div> : <p role="status">Scratch 编辑服务尚未配置。</p>}
        </section>
        <section className={styles.card} aria-labelledby="python-heading">
          <h2 id="python-heading">Python 代码创作</h2>
          <p>从空白代码开始，在工作台输入并运行程序。</p>
          <div className={styles.actions}>
            <button className="kc-action-surface" disabled={busy} onClick={() => newWork('python')}>新建 Python 作品</button>
            <button className="kc-action-surface kc-btn-outline" disabled={busy} onClick={() => input.current?.click()}>导入 .py</button>
            <input ref={input} hidden type="file" aria-label="导入 Python 文件" accept=".py" onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void perform(async () => {
                const { name, source } = await readPythonFile(file)
                const work = await library.create(name, { language: 'python', source })
                window.location.assign(`/create/python/${work.id}`)
              })
            }} />
          </div>
        </section>
      </div>
      <section className={styles.card} aria-labelledby="works-heading">
        <div className={styles.listHeading}>
          <div><h2 id="works-heading">我的作品</h2><p>{owner === 'guest' ? '当前是此浏览器的访客作品库。' : '当前是此账号在此浏览器的作品库。'}换设备前请导出作品。</p></div>
          <Link className="kc-action-surface kc-btn-outline" href="/learn/portfolio">查看课程作品</Link>
        </div>
        <div className={styles.filters} role="group" aria-label="筛选作品语言">
          {([['all', '全部'], ['scratch', 'Scratch'], ['python', 'Python']] as const).map(([key, label]) => (
            <button key={key} className={`kc-action-surface${filter === key ? '' : ' kc-btn-outline'}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {!works && !error && <p role="status">正在读取作品…</p>}
        {!works && error && <button className="kc-action-surface kc-btn-outline" disabled={busy} onClick={() => void perform(async () => setWorks(await library.list()))}>重试</button>}
        {visible?.length === 0 && <p>这里还没有作品。</p>}
        <ul className={styles.works}>
          {visible?.map((work) => (
            <li key={work.id} data-testid={work.language === 'scratch' ? 'scratch-work-row' : 'python-work-row'}>
              {editing === work.id ? (
                <form className={styles.actions} onSubmit={submitName}>
                  <input aria-label="作品名称" value={name} maxLength={MAX_NAME_LENGTH} required onChange={(event) => setName(event.target.value)} />
                  <button className="kc-action-surface" disabled={busy}>确认</button>
                  <button type="button" className="kc-action-surface kc-btn-outline" onClick={() => setEditing(null)}>取消</button>
                </form>
              ) : (
                <>
                  <div className={styles.workInfo}>
                    <h3>{work.name}</h3><div className={styles.workMeta}><span>{languageLabel[work.language]}</span>
                    <time dateTime={new Date(work.createdAt).toISOString()}>创建 {dateFormat.format(work.createdAt)}</time>
                    <time dateTime={new Date(work.updatedAt).toISOString()}>修改 {dateFormat.format(work.updatedAt)}</time></div>
                  </div>
                  <div className={styles.actions}>
                    {(enabled || work.language === 'python') && <WorkspaceLink className="kc-action-surface" href={`/create/${work.language}/${work.id}`}>继续编辑</WorkspaceLink>}
                    <button className="kc-action-surface kc-btn-outline" disabled={busy} onClick={() => { setEditing(work.id); setName(work.name) }}>重命名</button>
                    <button className="kc-action-surface kc-btn-outline" disabled={busy} onClick={() => void perform(async () => { await library.copy(work.id); setWorks(await library.list()) })}>复制</button>
                    <button className="kc-action-surface kc-btn-outline" disabled={busy} onClick={() => {
                      if (window.confirm(`删除「${work.name}」的本机副本？`)) void perform(async () => { await library.delete(work.id); setWorks(await library.list()) })
                    }}>删除</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
