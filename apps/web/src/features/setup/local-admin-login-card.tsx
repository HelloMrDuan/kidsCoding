'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export function LocalAdminLoginCard({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter()
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  return (
    <form
      className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault()

        if (email !== defaultEmail) {
          setMessage('请使用本地管理员邮箱登录。')
          return
        }

        const supabase = createBrowserSupabaseClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          setMessage('登录失败，请检查本地管理员账号和密码。')
          return
        }

        router.push('/admin')
      }}
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-slate-950">本地管理员登录</h1>
        <p className="text-sm font-semibold text-slate-600">
          这个入口只用于本地 Supabase Docker 联调。
        </p>
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        邮箱
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        密码
        <input
          type="password"
          className="rounded-2xl border border-slate-200 px-4 py-3"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button
        type="submit"
        data-testid="local-admin-login-submit"
        className="rounded-full bg-slate-900 px-5 py-3 font-bold text-white"
      >
        登录并进入后台
      </button>
      {message ? <p className="text-sm font-semibold text-rose-700">{message}</p> : null}
    </form>
  )
}
