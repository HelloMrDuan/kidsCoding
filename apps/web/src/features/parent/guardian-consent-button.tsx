'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// CLOUD-105: guardian grant button for the parent overview page. Posts to
// the guardian-consent API and refreshes the server-rendered status line.
// Styling reuses the page's existing button class; no new colors or layout.
export function GuardianConsentButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function grant() {
    setBusy(true)
    setFailed(false)
    try {
      const response = await fetch('/api/guardian-consent', { method: 'POST' })
      if (!response.ok) throw new Error('grant failed')
      router.refresh()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        data-testid="guardian-consent-grant"
        disabled={busy}
        onClick={grant}
        className="kc-button-3d inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"
      >
        {busy ? '正在确认…' : '确认监护人同意'}
      </button>
      {failed ? <p className="mt-2 text-sm text-slate-600">确认失败，请重试。</p> : null}
    </div>
  )
}
