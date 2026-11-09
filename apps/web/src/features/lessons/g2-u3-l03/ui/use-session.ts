'use client'

import { useSyncExternalStore } from 'react'
import type { L03Session, SessionSnapshot, SessionView } from '../session'

/** 订阅会话；服务端渲染与首次渲染用同一份初始快照，不会水合不一致。 */
export function useSession(session: L03Session): { snap: SessionSnapshot; view: SessionView } {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  return { snap, view: session.view(snap) }
}
