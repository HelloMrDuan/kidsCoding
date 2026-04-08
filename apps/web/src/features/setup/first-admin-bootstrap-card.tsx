'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

type BootstrapState =
  | { status: 'loading' }
  | { status: 'not_logged_in' }
  | { status: 'invalid_token' }
  | { status: 'closed' }
  | { status: 'ready'; identityLabel: string }

export function FirstAdminBootstrapCard({ token }: { token: string }) {
  const router = useRouter()
  const [state, setState] = useState<BootstrapState>({ status: 'loading' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function reloadState() {
    const response = await fetch(
      `/api/setup/admin/bootstrap?token=${encodeURIComponent(token)}`,
    )
    const data = (await response.json()) as BootstrapState
    setState(data)
  }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const response = await fetch(
        `/api/setup/admin/bootstrap?token=${encodeURIComponent(token)}`,
      )
      const data = (await response.json()) as BootstrapState

      if (!cancelled) {
        setState(data)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSendOtp() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signInWithOtp({ email })
    setCodeSent(true)
    setMessage('验证码已发送，请完成验证后继续。')
  }

  async function handleVerifyOtp() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    setMessage(null)
    await reloadState()
  }

  async function handleConfirm() {
    setSubmitting(true)
    setMessage(null)

    const response = await fetch('/api/setup/admin/bootstrap', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        token,
      }),
    })

    setSubmitting(false)

    if (!response.ok) {
      setMessage('开通失败，请稍后重试。')
      await reloadState()
      return
    }

    router.push('/admin')
  }

  if (state.status === 'loading') {
    return (
      <p className="text-sm font-semibold text-slate-600">正在检查开通状态...</p>
    )
  }

  if (state.status === 'invalid_token') {
    return (
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">开通链接无效或不可用</h1>
      </section>
    )
  }

  if (state.status === 'closed') {
    return (
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">首个管理员已完成开通</h1>
      </section>
    )
  }

  if (state.status === 'not_logged_in') {
    return (
      <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">请先登录后继续</h1>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          邮箱
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {codeSent ? (
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            验证码
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
        ) : null}
        {!codeSent ? (
          <button
            type="button"
            className="rounded-full bg-slate-900 px-5 py-3 font-bold text-white"
            onClick={handleSendOtp}
          >
            发送验证码
          </button>
        ) : (
          <button
            type="button"
            className="rounded-full bg-emerald-600 px-5 py-3 font-bold text-white"
            onClick={handleVerifyOtp}
          >
            验证并继续
          </button>
        )}
        {message ? (
          <p className="text-sm font-semibold text-slate-700">{message}</p>
        ) : null}
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-black text-slate-950">开通首个管理员</h1>
      <div className="space-y-1 text-base font-semibold text-slate-700">
        <p>当前登录账号：</p>
        <p>{state.identityLabel}</p>
      </div>
      <p className="text-sm font-semibold text-slate-600">
        确认后会把当前账号开通为首个管理员，并立刻启用 `/admin`。
      </p>
      <button
        type="button"
        data-testid="setup-admin-confirm"
        className="rounded-full bg-orange-500 px-5 py-3 font-bold text-white disabled:bg-orange-300"
        disabled={submitting}
        onClick={handleConfirm}
      >
        {submitting ? '正在开通管理员权限' : '开通管理员权限'}
      </button>
      {message ? (
        <p className="text-sm font-semibold text-rose-700">{message}</p>
      ) : null}
    </section>
  )
}
