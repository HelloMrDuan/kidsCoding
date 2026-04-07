'use client'

import { BindAccountForm } from '@/features/auth/bind-account-form'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export default function BindPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fffaf4_0%,#fff2e2_38%,#f5f7ff_100%)] px-6 py-10">
      <section className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
            保存学习成果
          </p>
          <h1 className="text-4xl font-black text-slate-950">绑定家长账号</h1>
          <p className="text-base leading-7 text-slate-600">
            完成作品后，用家长账号保存孩子的进度、作品和成长记录。以后换设备回来，也能继续沿着成长路线往前走。
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
