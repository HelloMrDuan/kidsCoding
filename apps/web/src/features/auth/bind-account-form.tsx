'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

  async function handleRequestOtp() {
    await requestOtp(channel, value)
    setCodeSent(true)
    setStatus('验证码已发送，请继续输入。')
  }

  async function handleVerify() {
    await verifyOtp(channel, value, token)

    const response = await fetch('/api/bind-account', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: '小小创作者' }),
    })

    if (!response.ok) {
      throw new Error('Failed to bind account')
    }

    router.push('/parent/overview')
  }

  return (
    <div className="kc-surface-3d space-y-5 rounded-[2rem] p-6">
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
      {status ? (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
          {status}
        </p>
      ) : null}
      {!codeSent ? (
        <button
          className="w-full rounded-full bg-orange-500 px-5 py-3 font-bold text-white"
          onClick={handleRequestOtp}
          type="button"
        >
          发送验证码
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
            className="w-full rounded-full bg-sky-600 px-5 py-3 font-bold text-white"
            onClick={handleVerify}
            type="button"
          >
            保存我的进度
          </button>
        </>
      )}
    </div>
  )
}
