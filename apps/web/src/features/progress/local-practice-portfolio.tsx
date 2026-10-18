'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { CharacterArt, SceneBackdrop } from '@/features/lessons/playable-stage/character-art'
import { defaultGuestProgress, readGuestProgress, subscribeGuestProgress } from './local-progress'
import { buildPortfolioWorks, sourceLabels, type PortfolioWork, type WorkKind } from './portfolio-works'
import { parseCloudPythonDraft, type CloudPythonDraft } from './cloud-python-drafts'
import { collectLocalPractices, PRACTICE_STORAGE_PREFIX, type LocalPractice } from './local-practice'

export function LocalPracticePortfolio() {
  const [items, setItems] = useState<LocalPractice[]>([])
  const [loaded, setLoaded] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudMessage, setCloudMessage] = useState('需要登录账号并完成数据库迁移后才能使用。同步仅保存源码，不保存正式成绩。')
  const [needsLogin, setNeedsLogin] = useState(false)
  const [cloudDrafts, setCloudDrafts] = useState<CloudPythonDraft[] | null>(null)
  const [filter, setFilter] = useState<'all' | WorkKind>('all')
  const [page, setPage] = useState(1)
  const progress = useSyncExternalStore(subscribeGuestProgress, readGuestProgress, () => defaultGuestProgress)

  function refresh() {
    try {
      setItems(collectLocalPractices(window.localStorage))
    } catch {
      setItems([])
    }
    setLoaded(true)
  }

  useEffect(() => {
    // Read-only peek at the child's own account drafts to label cloud copies; 401/missing table = local only.
    let alive = true
    fetch('/api/practice/drafts', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null
        const payload: unknown = await response.json()
        const rows = payload && typeof payload === 'object' && 'drafts' in payload ? (payload as { drafts: unknown }).drafts : null
        return Array.isArray(rows) ? rows.map(parseCloudPythonDraft).filter((item): item is CloudPythonDraft => Boolean(item)) : null
      })
      .catch(() => null)
      .then((drafts) => { if (alive) setCloudDrafts(drafts) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  async function sendLocalToCloud() {
    setCloudBusy(true)
    setNeedsLogin(false)
    setCloudMessage('正在把本机代码保存到自己的账号……')
    try {
      const drafts = collectLocalPractices(window.localStorage)
      if (drafts.length === 0) {
        setCloudMessage('本机没有可上传的作品。')
        return
      }
      for (const draft of drafts) {
        const response = await fetch('/api/practice/drafts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: draft.lessonId, source: draft.source }),
        })
        if (response.status === 401) {
          setNeedsLogin(true)
          throw new Error('请先登录账号，再尝试云端保存。')
        }
        if (!response.ok) throw new Error('云端暂不可用，请确认数据库迁移已执行；本机草稿仍然保留。')
      }
      setCloudDrafts(drafts.map(d => ({ lessonId: d.lessonId, source: d.source, updatedAt: new Date().toISOString() })))
      setCloudMessage('已把 '+drafts.length+' 份代码草稿保存到当前账号。成绩与星星没有上传。')
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : '同步失败，请稍后再试。')
    } finally {
      setCloudBusy(false)
    }
  }

  async function restoreCloudToLocal() {
    setCloudBusy(true)
    setNeedsLogin(false)
    setCloudMessage('正在读取账号中的代码草稿……')
    try {
      const response = await fetch('/api/practice/drafts', {cache:'no-store'})
      if (response.status === 401) {
        setNeedsLogin(true)
        throw new Error('请先登录账号，再尝试恢复草稿。')
      }
      if (!response.ok) throw new Error('暂时无法读取云端草稿，当前本机数据未改变。')
      const payload: unknown = await response.json()
      const rows = payload && typeof payload === 'object' && 'drafts' in payload
        ? (payload as {drafts:unknown}).drafts : null
      if (!Array.isArray(rows)) throw new Error('云端返回的数据格式不正确。')
      const drafts: CloudPythonDraft[] = rows.map(parseCloudPythonDraft).filter((item): item is CloudPythonDraft => Boolean(item))
      setCloudDrafts(drafts)
      if (drafts.length === 0) {
        setCloudMessage('账号中还没有保存过 Python 作品。')
        return
      }
      if (!window.confirm('是否将账号中的代码草稿恢复到这台设备？只有比当前本机记录更新的草稿会覆盖本地代码，所有恢复的课程均需重新运行测评。')) {
        setCloudMessage('已取消恢复，本机草稿没有改变。')
        return
      }
      const current = new Map(collectLocalPractices(window.localStorage).map(item => [item.lessonId, item]))
      let count = 0
      for (const draft of drafts) {
        const local = current.get(draft.lessonId)
        if (local && Date.parse(local.savedAt) >= Date.parse(draft.updatedAt)) continue
        window.localStorage.setItem(PRACTICE_STORAGE_PREFIX + draft.lessonId,
          JSON.stringify({source:draft.source,passed:false,savedAt:draft.updatedAt}))
        count++
      }
      refresh()
      setCloudMessage('已恢复 '+count+' 份较新的代码草稿；旧版本或本机更新的草稿没有被覆盖。请进入课程重新运行评测。')
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : '恢复失败，请稍后再试。')
    } finally {
      setCloudBusy(false)
    }
  }

  const works = useMemo(() => buildPortfolioWorks({ progress, practices: items, cloudDrafts }), [progress, items, cloudDrafts])
  const shown = filter === 'all' ? works : works.filter((work) => work.kind === filter)
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const visible = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const counts = { all: works.length, blockly: works.filter((w) => w.kind === 'blockly').length, python: works.filter((w) => w.kind === 'python').length }

  return <div className="kc-v2h kc-v2p">
    <div className="kc-v2h-title-row">
      <div>
        <div className="kc-v2h-eyebrow">MY PROJECTS</div>
        <h1>作品中心</h1>
        <p className="kc-v2h-subtitle">这里只放你真的做出来、能打开、能再次修改的作品。</p>
      </div>
      <Link href="/learn/map" className="kc-v2h-btn">＋ 新建作品</Link>
    </div>

    <div className="kc-v2p-banner">作品自动保存在这台设备；Python 草稿登录后可手动存到自己账号。「完成」标记来自本机存储，<strong>不是正式课程成绩</strong>。</div>

    <nav className="kc-v2c-filterbar" aria-label="作品类型">
      {([['all', '全部作品'], ['blockly', '积木故事'], ['python', 'Python 练习']] as const).map(([key, label]) => (
        <button key={key} type="button" onClick={() => { setFilter(key); setPage(1) }}
          className={`kc-v2c-filter${filter === key ? ' kc-v2c-filter-active' : ''}`} aria-pressed={filter === key}>
          {label} · {counts[key]}
        </button>
      ))}
    </nav>

    <section data-testid="practice-portfolio" aria-label="我的作品">
      {!loaded ? <p className="kc-v2h-panel kc-v2p-loading">正在读取本机作品……</p> : null}
      {loaded && shown.length === 0 ? <EmptyPortfolio kind={filter} /> : null}
      {visible.length > 0 ? <div className="kc-v2p-grid">{visible.map((work) => <WorkCard key={work.id} work={work} />)}</div> : null}
      {pages > 1 ? <nav className="kc-v2c-pager" aria-label="作品分页">
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => setPage(n)} aria-current={n === current ? 'page' : undefined}
            className={`kc-v2c-page${n === current ? ' kc-v2c-page-active' : ''}`}>{n}</button>
        ))}
        <span className="kc-v2c-pager-note">共 {shown.length} 件</span>
      </nav> : null}
    </section>

    <section className="kc-v2h-panel kc-v2p-sync" aria-label="账号云端">
      <div className="kc-v2p-sync-text">
        <b>Python 草稿 · 账号云端</b>
        <p data-testid="cloud-drafts-status" role="status">{cloudMessage}</p>
        {needsLogin ? <Link href="/auth/bind" className="kc-v2p-login">去登录 / 绑定账号 →</Link> : null}
      </div>
      <div className="kc-v2p-sync-actions">
        <button type="button" data-testid="cloud-upload-drafts" disabled={!loaded||cloudBusy} onClick={sendLocalToCloud} className="kc-v2h-btn kc-v2h-btn-sm">上传本机草稿到账号</button>
        <button type="button" data-testid="cloud-restore-drafts" disabled={!loaded||cloudBusy} onClick={restoreCloudToLocal} className="kc-v2h-btn kc-v2h-btn-sm kc-v2h-btn-outline">从账号恢复较新草稿</button>
      </div>
    </section>
  </div>
}

const PAGE_SIZE = 8

function WorkCover({ work }: { work: PortfolioWork }) {
  if (work.cover.type === 'scene') {
    return <div className="kc-v2p-cover kc-v2p-cover-scene" aria-hidden="true">
      <SceneBackdrop scene={work.cover.scene} />
      <div className="kc-v2p-cast">{work.cover.characters.slice(0, 2).map((id) => <CharacterArt key={id} id={id} className="kc-v2p-char" />)}</div>
    </div>
  }
  return <div className="kc-v2p-cover kc-v2p-cover-code" aria-hidden="true">
    <span className="kc-v2p-dots"><i /><i /><i /></span>
    <pre>{work.cover.lines.join('\n') || '# 还没有代码'}</pre>
  </div>
}

function WorkCard({ work }: { work: PortfolioWork }) {
  const testId = work.kind === 'python' ? `practice-item-${work.lessonId}` : `portfolio-work-${work.lessonId}`
  return <article className="kc-v2h-panel kc-v2p-card" data-testid={testId}>
    <WorkCover work={work} />
    <div className="kc-v2p-meta">
      <h3>{work.title}</h3>
      <p>{work.meta}</p>
      <div className="kc-v2p-chips">
        <span className={`kc-v2c-chip ${work.source === 'local' ? 'kc-v2c-chip-gray' : 'kc-v2c-chip-green'}`}>{sourceLabels[work.source]}</span>
        <span className="kc-v2c-chip kc-v2c-chip-amber">{work.localPassed ? '本机：已完成' : '本机：继续练习'}</span>
      </div>
      <p className="kc-v2p-time">更新于 {new Date(work.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      <Link href={work.href} className="kc-v2h-btn kc-v2h-btn-sm kc-v2h-btn-outline kc-v2p-open">继续编辑作品 →</Link>
    </div>
  </article>
}

function EmptyPortfolio({ kind }: { kind: 'all' | WorkKind }) {
  const python = kind === 'python'
  return <div className="kc-v2h-panel kc-v2p-empty">
    <div className="kc-v2p-empty-art" aria-hidden="true"><SceneBackdrop scene="forest" /><CharacterArt id="fox" className="kc-v2p-empty-fox" /></div>
    <div>
      <h2>{python ? '还没有 Python 练习作品' : kind === 'blockly' ? '还没有积木故事作品' : '这里还空空的'}</h2>
      <p>{python ? '去第 2～6 课写一段 Python，编辑器会自动保存到这台设备。' : '完成一节启蒙课，小狐狸的故事就会出现在这里，可以随时打开再改。'}</p>
      <Link href={python ? '/learn/python-lab/P0-U1-L02' : '/learn/map'} className="kc-v2h-btn">{python ? '开始第 2 课 →' : '去完成第一课 →'}</Link>
    </div>
  </div>
}
