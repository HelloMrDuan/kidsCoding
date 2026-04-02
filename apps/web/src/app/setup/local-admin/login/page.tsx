import { notFound } from 'next/navigation'

import { LocalAdminLoginCard } from '@/features/setup/local-admin-login-card'
import { readLocalAdminLoginConfig } from '@/features/setup/local-admin-login'

export default function LocalAdminLoginPage() {
  const config = readLocalAdminLoginConfig()

  if (!config.enabled) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-6 py-10">
      <section className="mx-auto max-w-2xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">
          本地联调
        </p>
        <LocalAdminLoginCard defaultEmail={config.email} />
      </section>
    </main>
  )
}
