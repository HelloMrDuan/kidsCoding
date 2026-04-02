import { createClient } from '@supabase/supabase-js'

function mergeAdminMetadata(appMetadata = {}) {
  return {
    ...appMetadata,
    role: 'admin',
  }
}

export function createLocalAdminClient({ url, serviceRoleKey }) {
  return createClient(url, serviceRoleKey)
}

export async function ensureLocalAdmin(admin, { email, password }) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })

  if (error) {
    throw error
  }

  const existing = (data?.users ?? []).find((user) => user.email === email)

  if (!existing) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
    })

    if (created.error) {
      throw created.error
    }

    return
  }

  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    app_metadata: mergeAdminMetadata(existing.app_metadata),
  })

  if (updated.error) {
    throw updated.error
  }
}
