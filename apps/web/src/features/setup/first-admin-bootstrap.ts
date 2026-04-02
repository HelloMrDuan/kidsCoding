import type { User } from '@supabase/supabase-js'

import type {
  AdminBootstrapEventRow,
  FirstAdminBootstrapState,
} from '@/features/domain/types'

type BootstrapRepository = {
  hasAnyAdmin: () => Promise<boolean>
  grantAdminRole: (input: {
    userId: string
    appMetadata: Record<string, unknown>
  }) => Promise<void>
  insertBootstrapEvent: (row: AdminBootstrapEventRow) => Promise<void>
}

function buildIdentityLabel(user: Pick<User, 'email' | 'phone'>) {
  return user.email ?? user.phone ?? '当前账号'
}

export function resolveFirstAdminBootstrapState(input: {
  expectedToken: string
  providedToken: string | null
  user: Pick<User, 'id' | 'email' | 'phone'> | null
  hasAnyAdmin: boolean
}): FirstAdminBootstrapState {
  if (input.hasAnyAdmin) {
    return { status: 'closed' }
  }

  if (!input.expectedToken || input.providedToken !== input.expectedToken) {
    return { status: 'invalid_token' }
  }

  if (!input.user) {
    return { status: 'not_logged_in' }
  }

  return {
    status: 'ready',
    identityLabel: buildIdentityLabel(input.user),
  }
}

export async function bootstrapFirstAdmin(input: {
  expectedToken: string
  providedToken: string | null
  user: (Pick<User, 'id' | 'email' | 'phone'> & {
    app_metadata?: Record<string, unknown> | null
  }) | null
  repository: BootstrapRepository
  now?: () => string
}) {
  const state = resolveFirstAdminBootstrapState({
    expectedToken: input.expectedToken,
    providedToken: input.providedToken,
    user: input.user,
    hasAnyAdmin: await input.repository.hasAnyAdmin(),
  })

  if (state.status === 'invalid_token') {
    throw new Error('admin-bootstrap-token-invalid')
  }

  if (state.status === 'closed') {
    throw new Error('admin-bootstrap-closed')
  }

  if (state.status === 'not_logged_in' || !input.user) {
    throw new Error('admin-bootstrap-auth-required')
  }

  await input.repository.grantAdminRole({
    userId: input.user.id,
    appMetadata: {
      ...(input.user.app_metadata ?? {}),
      role: 'admin',
    },
  })

  try {
    await input.repository.insertBootstrapEvent({
      user_id: input.user.id,
      email: input.user.email ?? null,
      event_type: 'first_admin_granted',
      created_at: (input.now ?? (() => new Date().toISOString()))(),
    })
  } catch (error) {
    await input.repository.grantAdminRole({
      userId: input.user.id,
      appMetadata: {
        ...(input.user.app_metadata ?? {}),
      },
    })

    throw error
  }

  return { ok: true as const }
}
