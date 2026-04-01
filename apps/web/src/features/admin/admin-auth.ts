import type { User } from '@supabase/supabase-js'

export function assertAdminUser(user: User | null | undefined) {
  if (!user) {
    throw new Error('admin-auth-required')
  }

  if (user.app_metadata?.role !== 'admin') {
    throw new Error('admin-role-required')
  }

  return user
}
