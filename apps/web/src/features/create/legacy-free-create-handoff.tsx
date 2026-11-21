'use client'

/**
 * Compatibility handoff for the retired /studio/scratch/free workshop.
 *
 * Old deep links (/studio/scratch/free/<id>) must keep working and old works
 * must stay visible. This page reads the work from the read-only legacy
 * IndexedDB (`kidscoding-free-create`), copies it under the current owner in
 * the unified OPS-050 library (`kidscoding-create`), then continues to the
 * unified editor. The legacy database is never deleted.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { adoptLegacyFreeCreateWork } from './project-store'

type State =
  | { kind: 'working' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }

export function LegacyFreeCreateHandoff({ legacyId }: { legacyId: string }) {
  const [state, setState] = useState<State>({ kind: 'working' })

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const response = await fetch('/create/session', { cache: 'no-store' })
        if (!response.ok) throw new Error('暂时无法核对账号，请刷新页面后重试。')
        const session = (await response.json()) as { owner?: unknown }
        const owner = typeof session.owner === 'string' ? session.owner : null
        if (!owner) throw new Error('暂时无法核对账号，请刷新页面后重试。')
        const work = await adoptLegacyFreeCreateWork(owner, legacyId)
        if (!alive) return
        if (!work) {
          setState({ kind: 'missing' })
          return
        }
        // Document navigation, like the creation centre's other links.
        window.location.replace(`/create/scratch/${work.id}`)
      } catch (cause) {
        if (alive) setState({ kind: 'error', message: cause instanceof Error ? cause.message : '迁移旧作品失败，请重试。' })
      }
    })()
    return () => { alive = false }
  }, [legacyId])

  return (
    <main className="kc-page-main" data-testid="legacy-free-create-handoff">
      {state.kind === 'working' && <p role="status">正在打开旧作品并迁移到创作中心…</p>}
      {state.kind === 'missing' && (
        <section data-testid="legacy-free-create-missing">
          <h1>没有找到这份旧作品</h1>
          <p>它可能已被删除，或保存在另一台设备上。旧作品库没有被清空。</p>
          <Link href="/create">前往创作中心</Link>
        </section>
      )}
      {state.kind === 'error' && (
        <>
          <p role="alert" data-testid="legacy-free-create-error">{state.message}</p>
          <Link href="/create">前往创作中心</Link>
        </>
      )}
    </main>
  )
}
