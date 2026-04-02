import { createLocalAdminClient, ensureLocalAdmin } from './seed-local-admin-core.mjs'

const admin = createLocalAdminClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
})

await ensureLocalAdmin(admin, {
  email: process.env.LOCAL_SUPABASE_ADMIN_EMAIL,
  password: process.env.LOCAL_SUPABASE_ADMIN_PASSWORD,
})
