'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createBlankScratchProject } from './blank-project'
import { scratchGuiUrl } from './gui-origin'
import {
  copyScratchWork, createScratchWork, deleteScratchWork, listScratchWorks, MAX_NAME_LENGTH,
  renameScratchWork, type ScratchWorkSummary,
} from './project-store'
import styles from './scratch-create.module.css'

export function ScratchCreateHub({ guiAddress }: { guiAddress?: string }) {
  const router = useRouter()
  const [works, setWorks] = useState<ScratchWorkSummary[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const locked = useRef(false)
  const enabled = Boolean(scratchGuiUrl(guiAddress))

  useEffect(() => {
    let active = true
    listScratchWorks().then((next) => { if (active) setWorks(next) }, (err: Error) => {
      if (active) setError(err.message)
    })
    return () => { active = false }
  }, [])

  async function perform(action: () => Promise<void>) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作未完成，请重试。')
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  async function makeWork() {
    const sb3 = await createBlankScratchProject()
    const work = await createScratchWork('我的 Scratch 作品', sb3)
    router.push('/create/scratch/' + work.id)
  }

  function submitName(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    void perform(async () => {
      await renameScratchWork(editing, name)
      setWorks(await listScratchWorks())
      setEditing(null)
    })
  }

  return (
    <div className="kc-page-main">
      <header className="kc-title-row"><div><h1>创作中心</h1><p className="kc-subtitle">把你的想法做成作品。</p></div></header>
      <div className={styles.launcher}>
        <section className={styles.card} aria-labelledby="scratch-heading">
          <h2 id="scratch-heading">Scratch 自由创作</h2>
          <p>从空白舞台开始，或打开一个 Scratch 作品。</p>
          {enabled ? <div className={styles.actions}>
            <button className="kc-action-surface" disabled={busy} onClick={() => void perform(makeWork)}>新建空白作品</button>
            <Link className="kc-action-surface kc-btn-outline" href="/create/scratch/import">导入 .sb3</Link>
          </div> : <p role="status">Scratch 编辑服务尚未配置。</p>}
        </section>
        <section className={styles.card} aria-labelledby="python-heading">
          <h2 id="python-heading">Python 自由编程</h2>
          <p>自由模式正在准备，现有 Python 练习仍可使用。</p>
          <Link className="kc-action-surface kc-btn-outline" href="/learn/python-lab/P0-U1-L01">打开 Python 实验室</Link>
        </section>
      </div>
      <section className={styles.card} aria-labelledby="works-heading">
        <div className={styles.listHeading}>
          <div><h2 id="works-heading">我的作品</h2><p>Scratch 作品保存在当前浏览器。需要换设备时，请先导出 .sb3。</p></div>
          <Link className="kc-action-surface kc-btn-outline" href="/learn/portfolio">查看课程作品</Link>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {!works && !error && <p role="status">正在读取作品…</p>}
        {!works && error && <button className="kc-action-surface kc-btn-outline" disabled={busy} onClick={() => void perform(async () => setWorks(await listScratchWorks()))}>重试</button>}
        {works?.length === 0 && <p>还没有 Scratch 作品。</p>}
        <ul className={styles.works}>
          {works?.map((work) => (
            <li key={work.id} data-testid="scratch-work-row">
              {editing === work.id ? (
                <form className={styles.actions} onSubmit={submitName}>
                  <input aria-label="作品名称" value={name} maxLength={MAX_NAME_LENGTH} required onChange={(event) => setName(event.target.value)} />
                  <button className="kc-action-surface" disabled={busy}>确认</button>
                  <button type="button" className="kc-action-surface kc-btn-outline" onClick={() => setEditing(null)}>取消</button>
                </form>
              ) : (
                <>
                  <div><h3>{work.name}</h3><time dateTime={new Date(work.updatedAt).toISOString()}>修改于 {new Date(work.updatedAt).toLocaleString('zh-CN')}</time></div>
                  <div className={styles.actions}>
                    {enabled && <Link className="kc-action-surface" href={'/create/scratch/' + work.id}>继续编辑</Link>}
                    <button className="kc-action-surface kc-btn-outline" disabled={busy} onClick={() => { setEditing(work.id); setName(work.name) }}>重命名</button>
                    <button className="kc-action-surface kc-btn-outline" disabled={busy} onClick={() => void perform(async () => { await copyScratchWork(work.id); setWorks(await listScratchWorks()) })}>复制</button>
                    <button className="kc-action-surface kc-btn-outline" disabled={busy} onClick={() => {
                      if (window.confirm('删除此作品的本机副本？')) void perform(async () => { await deleteScratchWork(work.id); setWorks(await listScratchWorks()) })
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
