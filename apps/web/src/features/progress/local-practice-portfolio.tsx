'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collectLocalPractices, type LocalPractice } from './local-practice'

export function LocalPracticePortfolio() {
  const [items, setItems] = useState<LocalPractice[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const refresh = () => {
      try {
        setItems(collectLocalPractices(window.localStorage))
      } catch {
        setItems([])
      }
      setLoaded(true)
    }
    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  return <main className="min-h-screen bg-[linear-gradient(140deg,#eaf7f2,#eff4ff_60%,#fff5e4)] px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/learn/catalog?track=P0" className="font-bold text-emerald-800">← 返回 Python 课程路线</Link>
      <header className="rounded-[2rem] bg-white p-8 shadow-sm">
        <p className="text-sm font-extrabold text-emerald-700">KidsCoding · 本机作品夹</p>
        <h1 className="mt-2 text-3xl font-black">我的 Python 练习作品</h1>
        <p className="mt-4 leading-7 text-slate-600">这里展示当前浏览器里保存的练习代码，点击后可以继续修改。更换浏览器、清理存储或使用别的设备，记录可能无法恢复。</p>
        <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">练习达标标记来自本机存储，能够被修改，<strong>不是正式课程成绩或云端进度</strong>。账号同步与教师可信评测还未开放。</p>
      </header>
      <section data-testid="practice-portfolio" className="space-y-4">
        {!loaded ? <p className="rounded-2xl bg-white p-6">正在读取本机作品……</p> : null}
        {loaded && items.length === 0 ? <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <h2 className="text-xl font-black">还没有保存的练习</h2>
          <p className="mt-3 text-slate-600">先去第2课或第3课写一段 Python，编辑器会自动保存到当前浏览器。</p>
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
