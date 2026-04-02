import { FirstAdminBootstrapCard } from '@/features/setup/first-admin-bootstrap-card'

export default async function SetupAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams

  return (
    <main className="min-h-screen bg-[#fffaf2] px-6 py-10">
      <section className="mx-auto max-w-2xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">
          首次部署
        </p>
        <FirstAdminBootstrapCard token={params.token ?? ''} />
      </section>
    </main>
  )
}
