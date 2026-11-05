'use client'

// 过渡课堂页自己的本地草稿：挂载时恢复，之后防抖自动保存。草稿内容只来自 session.draft()，
// 保存失败如实显示“未能保存”，不显示“已保存”。键与信封见 state.ts（kidscoding-draft:G2-U3-L02）。

import { useCallback, useEffect, useRef, useState } from 'react'
import type { L02Session } from '../session'
import { initialState, saveDraft, toDraft } from '../state'
import { useSession } from './use-session'

export type SaveStatus = { state: 'idle' | 'saved' | 'failed'; text: string }

function storage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function useLocalDraft(session: L02Session, onFresh: () => void) {
  const { snap } = useSession(session)
  const [restored, setRestored] = useState<'pending' | 'fresh' | 'restored'>('pending')
  const [save, setSave] = useState<SaveStatus>({ state: 'idle', text: '尚未保存' })
  /** 最近一次成功写入（或恢复出来）的草稿文本：内容没变就不重复保存，也不覆盖“已恢复”的提示。 */
  const lastSaved = useRef<string>(JSON.stringify(toDraft(initialState())))
  const onFreshRef = useRef(onFresh)
  useEffect(() => { onFreshRef.current = onFresh })

  // 本机存储只能在客户端读取，不能放进初始 state（会造成服务端与客户端渲染不一致），所以挂载后恢复一次。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const result = session.restoreFromStorage(storage())
    if (result.restored) {
      lastSaved.current = JSON.stringify(session.draft())
      setRestored('restored')
      setSave({ state: 'saved', text: '已恢复上次保存的作品' })
    } else {
      setRestored('fresh')
      if (result.reason) setSave({ state: 'failed', text: `未能恢复：${result.reason}` })
      onFreshRef.current() // 第一次进课堂（手机）先看到今天学什么
    }
  }, [session])
  /* eslint-enable react-hooks/set-state-in-effect */

  const persist = useCallback(() => {
    const state = session.getSnapshot().state
    const r = saveDraft(storage(), state)
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    if (r.ok) lastSaved.current = JSON.stringify(toDraft(state))
    setSave(r.ok ? { state: 'saved', text: `已保存 ${time}` } : { state: 'failed', text: r.reason })
    return r
  }, [session])

  const draftJson = JSON.stringify(toDraft(snap.state))
  useEffect(() => {
    if (restored === 'pending') return
    if (draftJson === lastSaved.current) return
    const t = setTimeout(persist, 350)
    return () => clearTimeout(t)
  }, [draftJson, restored, persist])

  return { save, persist }
}
