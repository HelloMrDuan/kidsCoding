'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { clearOnboardingSession } from '@/features/onboarding/onboarding-session'
import { clearGuestProgress } from '@/features/progress/local-progress'

export function BindAccountForm({
  requestOtp,
  verifyOtp,
}: {
  requestOtp: (channel: 'email' | 'phone', value: string) => Promise<void>
  verifyOtp: (
    channel: 'email' | 'phone',
    value: string,
    token: string,
  ) => Promise<void>
}) {
  const router = useRouter()
  const [channel, setChannel] = useState<'email' | 'phone'>('email')
  const [value, setValue] = useState('')
  const [token, setToken] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRequestOtp() {
    setError('')
    setIsSubmitting(true)

    try {
      await requestOtp(channel, value)
      setCodeSent(true)
      setStatus('验证码已发送，请继续输入。')
    } catch {
      setError('验证码发送失败，请检查邮箱或手机号后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerify() {
    setError('')
    setIsSubmitting(true)

    try {
      await verifyOtp(channel, value, token)

      const response = await fetch('/api/bind-account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: '小小创作者' }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setError(
          payload?.error === 'missing-guest-snapshot'
            ? '没有找到游客进度，请先在学习地图里完成一节课再绑定。'
            : '绑定失败，请稍后重试或联系支持。',
        )
        return
      }

      clearGuestProgress()
      clearOnboardingSession()
      router.push('/parent/overview')
    } catch {
      setError('验证码校验失败，请确认验证码后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="kc-panel-3d space-y-5 rounded-[2rem] p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-950">绑定家长账号</h2>
        <p className="text-sm leading-7 text-slate-600">
          先验证家长邮箱或手机号，再把孩子当前的作品和进度保存下来。
        </p>
      </div>
      <div className="flex gap-3">
        <button
          className={`rounded-full px-4 py-2 font-bold ${
            channel === 'email'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
          onClick={() => setChannel('email')}
          type="button"
        >
          邮箱
        </button>
        <button
          className={`rounded-full px-4 py-2 font-bold ${
            channel === 'phone'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
          onClick={() => setChannel('phone')}
          type="button"
        >
          手机号
        </button>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        邮箱或手机号
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3"
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
      </label>
      {error ? (
        <p
          className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          data-testid="bind-account-error"
        >
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
          {status}
        </p>
      ) : null}
      {!codeSent ? (
        <button
          className="kc-button-3d w-full rounded-full bg-orange-500 px-5 py-3 font-bold text-white disabled:opacity-60"
          disabled={isSubmitting}
          onClick={handleRequestOtp}
          type="button"
        >
          {isSubmitting ? '正在发送…' : '发送验证码'}
        </button>
      ) : (
        <>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            验证码
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setToken(event.target.value)}
              value={token}
            />
          </label>
          <button
            className="kc-button-3d w-full rounded-full bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-60"
            data-testid="bind-account-submit"
            disabled={isSubmitting}
            onClick={handleVerify}
            type="button"
          >
            {isSubmitting ? '正在保存…' : '保存我的进度'}
          </button>
        </>
      )}
    </div>
  )
}
