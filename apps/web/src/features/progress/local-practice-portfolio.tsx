'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { parseCloudPythonDraft, type CloudPythonDraft } from './cloud-python-drafts'
import { collectLocalPractices, PRACTICE_STORAGE_PREFIX, type LocalPractice } from './local-practice'

export function LocalPracticePortfolio() {
  const [items, setItems] = useState<LocalPractice[]>([])
  const [loaded, setLoaded] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudMessage, setCloudMessage] = useState('需要登录账号并完成数据库迁移后才能使用。同步仅保存源码，不保存正式成绩。')
  const [needsLogin, setNeedsLogin] = useState(false)

  function refresh() {
    try {
      setItems(collectLocalPractices(window.localStorage))
    } catch {
      setItems([])
    }
    setLoaded(true)
  }

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

  return <main className="min-h-screen bg-[linear-gradient(140deg,#eaf7f2,#eff4ff_60%,#fff5e4)] px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/learn/catalog?track=P0" className="font-bold text-emerald-800">← 返回 Python 课程路线</Link>
      <header className="rounded-[2rem] bg-white p-8 shadow-sm">
        <p className="text-sm font-extrabold text-emerald-700">KidsCoding · 代码作品夹</p>
        <h1 className="mt-2 text-3xl font-black">我的 Python 练习作品</h1>
        <p className="mt-4 leading-7 text-slate-600">本机代码会自动保存。登录后可自主选择上传到自己账号，换设备后再恢复。上传和恢复不会改变正式课程成绩。</p>
        <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">达标标记来自本机存储，能够被修改，<strong>不是正式课程成绩</strong>。云端只保存代码草稿，尚不支持正式教师评测与认证进度。</p>
      </header>
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">我的账号 · 作品草稿同步</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">上传为手动操作，不会在后台自动收集代码。使用前需要先完成账号登录和 Supabase 数据库迁移。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" data-testid="cloud-upload-drafts" disabled={!loaded||cloudBusy} onClick={sendLocalToCloud} className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">上传本机草稿到账号</button>
          <button type="button" data-testid="cloud-restore-drafts" disabled={!loaded||cloudBusy} onClick={restoreCloudToLocal} className="rounded-full border border-sky-300 bg-sky-50 px-5 py-3 text-sm font-bold text-sky-900 disabled:opacity-50">从账号恢复较新草稿</button>
        </div>
        <p data-testid="cloud-drafts-status" role="status" className="mt-3 text-sm text-slate-600">{cloudMessage}</p>
        {needsLogin ? <Link href="/auth/bind" className="mt-3 inline-flex text-sm font-bold text-emerald-800">去登录 / 绑定账号 →</Link> : null}
      </section>
      <section data-testid="practice-portfolio" className="space-y-4">
        {!loaded ? <p className="rounded-2xl bg-white p-6">正在读取本机作品……</p> : null}
        {loaded && items.length === 0 ? <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <h2 className="text-xl font-black">还没有保存的练习</h2>
          <p className="mt-3 text-slate-600">先去第2～5课中的任意一节写一段 Python，编辑器会自动保存到当前浏览器。</p>
          <Link href="/learn/python-lab/P0-U1-L02" className="mt-5 inline-flex rounded-full bg-emerald-700 px-5 py-3 font-bold text-white">开始第2课 →</Link>
        </div> : null}
        {items.map(item=><article key={item.lessonId} data-testid={`practice-item-${item.lessonId}`} className="rounded-[2rem] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold text-emerald-700">{item.lessonId}</p><h2 className="mt-1 text-xl font-black">{item.title}</h2></div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">{item.passed?'本机记录：曾显示达标':'本机记录：继续练习'}</span>
          </div>
          <pre className="mt-4 max-h-44 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 font-mono text-sm text-emerald-200">{item.source}</pre>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">本机更新时间：{new Date(item.savedAt).toLocaleString('zh-CN')}</p>
            <Link href={`/learn/python-lab/${item.lessonId}`} className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white">继续编辑作品 →</Link>
          </div>
        </article>)}
      </section>
    </div>
  </main>
}
