'use client'

import { BindAccountForm } from '@/features/auth/bind-account-form'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export default function BindPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ff] px-6 py-10">
      <section className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
            保存学习成果
          </p>
          <h1 className="text-4xl font-black text-slate-950">
            绑定家长账号
          </h1>
          <p className="text-base leading-7 text-slate-600">
            完成第一个作品后，用家长账号保存进度，之后可以继续查看学习记录。
          </p>
        </header>
        <BindAccountForm
          requestOtp={async (channel, value) => {
            const supabase = createBrowserSupabaseClient()

            if (channel === 'email') {
              await supabase.auth.signInWithOtp({ email: value })
              return
            }

            await supabase.auth.signInWithOtp({ phone: value })
          }}
          verifyOtp={async (channel, value, token) => {
            const supabase = createBrowserSupabaseClient()

            if (channel === 'email') {
              await supabase.auth.verifyOtp({ email: value, token, type: 'email' })
              return
            }

            await supabase.auth.verifyOtp({ phone: value, token, type: 'sms' })
          }}
        />
      </section>
    </main>
  )
}
