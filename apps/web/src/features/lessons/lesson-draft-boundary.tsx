'use client'

import { createContext, type ReactNode } from 'react'
import { useDraftOwnerLock } from './use-draft-owner-lock'

export const LessonDraftOwnerContext = createContext<string | undefined>(undefined)

export function LessonDraftBoundary({ owner, children }: { owner: string | null; children: ReactNode }) {
  const locked = useDraftOwnerLock(owner)
  if (!owner || locked) return <p role="alert">当前账号无法确认，课堂草稿已锁定。请恢复原账号后重新打开课堂。</p>
  return <LessonDraftOwnerContext.Provider value={owner}>{children}</LessonDraftOwnerContext.Provider>
}
