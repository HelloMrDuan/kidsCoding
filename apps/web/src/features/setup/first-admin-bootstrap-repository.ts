import type { SupabaseClient, User } from '@supabase/supabase-js'

import type { AdminBootstrapEventRow } from '@/features/domain/types'

type AdminClient = SupabaseClient

export function createFirstAdminBootstrapRepository(admin: AdminClient) {
  return {
    async hasAnyAdmin() {
      let page = 1

      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        })

        if (error) {
          throw error
        }

        const users = (data?.users ?? []) as User[]

        if (users.some((user) => user.app_metadata?.role === 'admin')) {
          return true
        }

        if (users.length < 200) {
          return false
        }

        page += 1
      }
    },

    async grantAdminRole(input: {
      userId: string
      appMetadata: Record<string, unknown>
    }) {
      const { error } = await admin.auth.admin.updateUserById(input.userId, {
        app_metadata: input.appMetadata,
      })

      if (error) {
        throw error
      }
    },

    async insertBootstrapEvent(row: AdminBootstrapEventRow) {
      const { error } = await admin.from('admin_bootstrap_events').insert(row)

      if (error) {
        throw error
      }
    },
  }
}
