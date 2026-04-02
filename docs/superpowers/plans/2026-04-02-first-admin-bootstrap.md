# First Admin Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-safe first-admin bootstrap flow so a logged-in operator can promote themselves to the first `/admin` user through `/setup/admin?token=...` without manually editing Supabase metadata.

**Architecture:** Keep `app_metadata.role = 'admin'` as the only runtime admin authority, add one focused setup feature folder for bootstrap state and write logic, and expose the flow through a dedicated `/api/setup/admin/bootstrap` route plus a `/setup/admin` UI. Persist only a small `admin_bootstrap_events` audit row, while the route checks current admin existence through Supabase Auth admin APIs before every state read and write.

**Tech Stack:** Next.js App Router, React client components, Supabase SSR/auth admin APIs, Vitest, Playwright, SQL migrations

---

## File Structure

- Modify: `apps/web/src/features/domain/types.ts`
  Add first-admin bootstrap status and event row types.
- Modify: `apps/web/src/lib/env.ts`
  Add a helper for reading the setup token from environment variables.
- Create: `apps/web/src/features/setup/first-admin-bootstrap.ts`
  Pure bootstrap state resolver plus the write action that promotes the current user.
- Create: `apps/web/src/features/setup/first-admin-bootstrap.test.ts`
  Unit coverage for token validation, closed-state handling, and admin promotion write behavior.
- Create: `apps/web/supabase/migrations/20260402_005_admin_bootstrap_events.sql`
  Add the `admin_bootstrap_events` table.
- Create: `apps/web/src/features/setup/first-admin-bootstrap-repository.ts`
  Service-role repository for checking whether any admin exists, updating `app_metadata`, and writing bootstrap events.
- Create: `apps/web/src/app/api/setup/admin/bootstrap/route.ts`
  `GET` returns current setup state; `POST` performs the first-admin promotion.
- Create: `apps/web/src/app/api/setup/admin/bootstrap/route.test.ts`
  Route tests for ready, closed, invalid-token, and promotion success cases.
- Create: `apps/web/src/features/setup/first-admin-bootstrap-card.tsx`
  Client UI for loading state, OTP login, confirmation, and success redirect.
- Create: `apps/web/src/features/setup/first-admin-bootstrap-card.test.tsx`
  Component tests for login-required and ready-to-confirm flows.
- Create: `apps/web/src/app/setup/admin/page.tsx`
  Page shell for the bootstrap card.
- Modify: `apps/web/.env.example`
  Add `ADMIN_SETUP_TOKEN`.
- Modify: `apps/web/README.md`
  Document first-admin setup, the token env var, and the closure rule.
- Create: `apps/web/tests/e2e/first-admin-bootstrap.spec.ts`
  Browser coverage for the setup page state flow and success redirect.

### Task 1: Add First-Admin Bootstrap Types, Env Helper, And Service Logic

**Files:**
- Modify: `apps/web/src/features/domain/types.ts`
- Modify: `apps/web/src/lib/env.ts`
- Create: `apps/web/src/features/setup/first-admin-bootstrap.ts`
- Test: `apps/web/src/features/setup/first-admin-bootstrap.test.ts`

- [ ] **Step 1: Write the failing bootstrap service tests**

```ts
import { describe, expect, it, vi } from 'vitest'

import {
  bootstrapFirstAdmin,
  resolveFirstAdminBootstrapState,
} from './first-admin-bootstrap'

describe('resolveFirstAdminBootstrapState', () => {
  it('returns not_logged_in when the token is valid but there is no session', () => {
    expect(
      resolveFirstAdminBootstrapState({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
        user: null,
        hasAnyAdmin: false,
      }),
    ).toEqual({ status: 'not_logged_in' })
  })

  it('returns invalid_token when the token does not match', () => {
    expect(
      resolveFirstAdminBootstrapState({
        expectedToken: 'setup-demo-token',
        providedToken: 'wrong-token',
        user: null,
        hasAnyAdmin: false,
      }),
    ).toEqual({ status: 'invalid_token' })
  })

  it('returns closed when any admin already exists', () => {
    expect(
      resolveFirstAdminBootstrapState({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
        user: { id: 'user-1', email: 'owner@example.com' } as never,
        hasAnyAdmin: true,
      }),
    ).toEqual({ status: 'closed' })
  })

  it('returns ready with an identity label when the user can continue', () => {
    expect(
      resolveFirstAdminBootstrapState({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          phone: null,
        } as never,
        hasAnyAdmin: false,
      }),
    ).toEqual({
      status: 'ready',
      identityLabel: 'owner@example.com',
    })
  })
})

describe('bootstrapFirstAdmin', () => {
  it('promotes the current user and records the bootstrap event', async () => {
    const repository = {
      hasAnyAdmin: vi.fn().mockResolvedValue(false),
      grantAdminRole: vi.fn().mockResolvedValue(undefined),
      insertBootstrapEvent: vi.fn().mockResolvedValue(undefined),
    }

    await bootstrapFirstAdmin({
      expectedToken: 'setup-demo-token',
      providedToken: 'setup-demo-token',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        app_metadata: { plan: 'launch' },
      } as never,
      repository,
      now: () => '2026-04-02T10:30:00.000Z',
    })

    expect(repository.grantAdminRole).toHaveBeenCalledWith({
      userId: 'user-1',
      appMetadata: { plan: 'launch', role: 'admin' },
    })
    expect(repository.insertBootstrapEvent).toHaveBeenCalledWith({
      user_id: 'user-1',
      email: 'owner@example.com',
      event_type: 'first_admin_granted',
      created_at: '2026-04-02T10:30:00.000Z',
    })
  })

  it('rejects the write when an admin already exists', async () => {
    const repository = {
      hasAnyAdmin: vi.fn().mockResolvedValue(true),
      grantAdminRole: vi.fn(),
      insertBootstrapEvent: vi.fn(),
    }

    await expect(
      bootstrapFirstAdmin({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          app_metadata: {},
        } as never,
        repository,
      }),
    ).rejects.toThrowError('admin-bootstrap-closed')
  })
})
```

- [ ] **Step 2: Run the tests to verify the bootstrap service does not exist yet**

Run: `cd apps/web; npm run test:run -- src/features/setup/first-admin-bootstrap.test.ts`

Expected: FAIL with `Cannot find module './first-admin-bootstrap'`.

- [ ] **Step 3: Add the bootstrap types and setup-token env helper**

```ts
// apps/web/src/features/domain/types.ts
export type FirstAdminBootstrapState =
  | { status: 'not_logged_in' }
  | { status: 'invalid_token' }
  | { status: 'closed' }
  | { status: 'ready'; identityLabel: string }

export type AdminBootstrapEventRow = {
  user_id: string
  email: string | null
  event_type: 'first_admin_granted'
  created_at: string
}
```

```ts
// apps/web/src/lib/env.ts
export function getAdminSetupToken(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return (env.ADMIN_SETUP_TOKEN ?? '').trim()
}
```

- [ ] **Step 4: Implement the pure bootstrap resolver and write action**

```ts
// apps/web/src/features/setup/first-admin-bootstrap.ts
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
  if (!input.expectedToken || input.providedToken !== input.expectedToken) {
    return { status: 'invalid_token' }
  }

  if (input.hasAnyAdmin) {
    return { status: 'closed' }
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

  if (state.status === 'invalid_token') throw new Error('admin-bootstrap-token-invalid')
  if (state.status === 'closed') throw new Error('admin-bootstrap-closed')
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

  await input.repository.insertBootstrapEvent({
    user_id: input.user.id,
    email: input.user.email ?? null,
    event_type: 'first_admin_granted',
    created_at: (input.now ?? (() => new Date().toISOString()))(),
  })

  return { ok: true as const }
}
```

- [ ] **Step 5: Run the bootstrap service tests**

Run: `cd apps/web; npm run test:run -- src/features/setup/first-admin-bootstrap.test.ts`

Expected: PASS with state branches and promotion writes covered.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/domain/types.ts apps/web/src/lib/env.ts apps/web/src/features/setup/first-admin-bootstrap.ts apps/web/src/features/setup/first-admin-bootstrap.test.ts
git commit -m "feat: add first admin bootstrap service"
```

### Task 2: Add Bootstrap Persistence And The Setup API Route

**Files:**
- Create: `apps/web/supabase/migrations/20260402_005_admin_bootstrap_events.sql`
- Create: `apps/web/src/features/setup/first-admin-bootstrap-repository.ts`
- Create: `apps/web/src/app/api/setup/admin/bootstrap/route.ts`
- Test: `apps/web/src/app/api/setup/admin/bootstrap/route.test.ts`

- [ ] **Step 1: Write the failing setup route tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createAdminClient: vi.fn(),
  createFirstAdminBootstrapRepository: vi.fn(),
  resolveFirstAdminBootstrapState: vi.fn(),
  bootstrapFirstAdmin: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  getAdminSetupToken: () => 'setup-demo-token',
  hasServiceRoleEnv: () => true,
  hasSupabaseEnv: () => true,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

vi.mock('@/features/setup/first-admin-bootstrap-repository', () => ({
  createFirstAdminBootstrapRepository: mocks.createFirstAdminBootstrapRepository,
}))

vi.mock('@/features/setup/first-admin-bootstrap', () => ({
  resolveFirstAdminBootstrapState: mocks.resolveFirstAdminBootstrapState,
  bootstrapFirstAdmin: mocks.bootstrapFirstAdmin,
}))

import { GET, POST } from './route'

describe('GET /api/setup/admin/bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'owner@example.com',
              app_metadata: {},
            },
          },
        }),
      },
    })
    mocks.createAdminClient.mockReturnValue({ admin: true })
    mocks.createFirstAdminBootstrapRepository.mockReturnValue({
      hasAnyAdmin: vi.fn().mockResolvedValue(false),
    })
    mocks.resolveFirstAdminBootstrapState.mockReturnValue({
      status: 'ready',
      identityLabel: 'owner@example.com',
    })
  })

  it('returns the resolved bootstrap state', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/setup/admin/bootstrap?token=setup-demo-token',
      ),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'ready',
      identityLabel: 'owner@example.com',
    })
  })
})

describe('POST /api/setup/admin/bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'owner@example.com',
              app_metadata: { plan: 'launch' },
            },
          },
        }),
      },
    })
    mocks.createAdminClient.mockReturnValue({ admin: true })
    mocks.createFirstAdminBootstrapRepository.mockReturnValue({})
    mocks.bootstrapFirstAdmin.mockResolvedValue({ ok: true })
  })

  it('runs the bootstrap write and returns ok', async () => {
    const response = await POST(
      new Request('http://localhost/api/setup/admin/bootstrap', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'setup-demo-token' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mocks.bootstrapFirstAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
      }),
    )
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run the route tests to verify the setup API does not exist yet**

Run: `cd apps/web; npm run test:run -- src/app/api/setup/admin/bootstrap/route.test.ts`

Expected: FAIL with `Cannot find module './route'`.

- [ ] **Step 3: Add the migration and bootstrap repository**

```sql
-- apps/web/supabase/migrations/20260402_005_admin_bootstrap_events.sql
create table if not exists admin_bootstrap_events (
  id bigint generated by default as identity primary key,
  user_id uuid not null,
  email text,
  event_type text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_bootstrap_events_user_id_idx
  on admin_bootstrap_events (user_id);
```

```ts
// apps/web/src/features/setup/first-admin-bootstrap-repository.ts
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
```

- [ ] **Step 4: Implement the setup route**

```ts
// apps/web/src/app/api/setup/admin/bootstrap/route.ts
import { NextResponse } from 'next/server'

import {
  bootstrapFirstAdmin,
  resolveFirstAdminBootstrapState,
} from '@/features/setup/first-admin-bootstrap'
import { createFirstAdminBootstrapRepository } from '@/features/setup/first-admin-bootstrap-repository'
import { getAdminSetupToken, hasServiceRoleEnv, hasSupabaseEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: 'setup-unavailable' }, { status: 503 })
  }

  const url = new URL(request.url)
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const repository = createFirstAdminBootstrapRepository(createAdminClient())
  const state = resolveFirstAdminBootstrapState({
    expectedToken: getAdminSetupToken(),
    providedToken: url.searchParams.get('token'),
    user: data.user ?? null,
    hasAnyAdmin: await repository.hasAnyAdmin(),
  })

  return NextResponse.json(state)
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: 'setup-unavailable' }, { status: 503 })
  }

  const body = (await request.json()) as { token?: string }
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const repository = createFirstAdminBootstrapRepository(createAdminClient())

  try {
    const result = await bootstrapFirstAdmin({
      expectedToken: getAdminSetupToken(),
      providedToken: body.token ?? null,
      user: data.user ?? null,
      repository,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'admin-bootstrap-failed'

    if (message === 'admin-bootstrap-token-invalid') {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    if (message === 'admin-bootstrap-auth-required') {
      return NextResponse.json({ error: message }, { status: 401 })
    }

    if (message === 'admin-bootstrap-closed') {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: 'admin-bootstrap-failed' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run the setup route tests**

Run: `cd apps/web; npm run test:run -- src/app/api/setup/admin/bootstrap/route.test.ts`

Expected: PASS with GET state lookup and POST promotion wiring covered.

- [ ] **Step 6: Commit**

```bash
git add apps/web/supabase/migrations/20260402_005_admin_bootstrap_events.sql apps/web/src/features/setup/first-admin-bootstrap-repository.ts apps/web/src/app/api/setup/admin/bootstrap/route.ts apps/web/src/app/api/setup/admin/bootstrap/route.test.ts
git commit -m "feat: add first admin bootstrap api"
```

### Task 3: Add The `/setup/admin` Page And Client Bootstrap Card

**Files:**
- Create: `apps/web/src/features/setup/first-admin-bootstrap-card.tsx`
- Create: `apps/web/src/features/setup/first-admin-bootstrap-card.test.tsx`
- Create: `apps/web/src/app/setup/admin/page.tsx`

- [ ] **Step 1: Write the failing client-component tests**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FirstAdminBootstrapCard } from './first-admin-bootstrap-card'

const push = vi.fn()
const fetchMock = vi.fn()
const requestOtp = vi.fn().mockResolvedValue(undefined)
const verifyOtp = vi.fn().mockResolvedValue(undefined)

vi.stubGlobal('fetch', fetchMock)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/lib/supabase/browser', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithOtp: ({ email }: { email: string }) => requestOtp(email),
      verifyOtp: ({ email, token }: { email: string; token: string }) =>
        verifyOtp(email, token),
    },
  }),
}))

describe('FirstAdminBootstrapCard', () => {
  it('shows login controls when the user is not logged in and reloads after otp verification', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'not_logged_in' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'ready',
            identityLabel: 'owner@example.com',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    render(<FirstAdminBootstrapCard token="setup-demo-token" />)

    await screen.findByText('请先登录后继续')
    fireEvent.change(screen.getByLabelText('邮箱'), {
      target: { value: 'owner@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))

    await waitFor(() => {
      expect(requestOtp).toHaveBeenCalledWith('owner@example.com')
    })

    fireEvent.change(screen.getByLabelText('验证码'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: '验证并继续' }))

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith('owner@example.com', '123456')
    })
    await screen.findByText('owner@example.com')
  })
 
  it('submits the bootstrap confirmation and redirects to /admin', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'ready',
            identityLabel: 'owner@example.com',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    render(<FirstAdminBootstrapCard token="setup-demo-token" />)

    await screen.findByText('owner@example.com')
    fireEvent.click(screen.getByTestId('setup-admin-confirm'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/setup/admin/bootstrap',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'setup-demo-token' }),
        }),
      )
    })
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/admin')
    })
  })
})
```

- [ ] **Step 2: Run the component tests to verify the setup card does not exist yet**

Run: `cd apps/web; npm run test:run -- src/features/setup/first-admin-bootstrap-card.test.tsx`

Expected: FAIL with `Cannot find module './first-admin-bootstrap-card'`.

- [ ] **Step 3: Implement the client card with OTP login and bootstrap confirmation**

```tsx
// apps/web/src/features/setup/first-admin-bootstrap-card.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

type BootstrapState =
  | { status: 'loading' }
  | { status: 'not_logged_in' }
  | { status: 'invalid_token' }
  | { status: 'closed' }
  | { status: 'ready'; identityLabel: string }

export function FirstAdminBootstrapCard({ token }: { token: string }) {
  const router = useRouter()
  const [state, setState] = useState<BootstrapState>({ status: 'loading' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function loadState() {
    const response = await fetch(
      `/api/setup/admin/bootstrap?token=${encodeURIComponent(token)}`,
    )
    const data = (await response.json()) as BootstrapState
    setState(data)
  }

  useEffect(() => {
    void loadState()
  }, [token])

  async function handleSendOtp() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signInWithOtp({ email })
    setCodeSent(true)
    setMessage('验证码已发送，请完成验证后继续')
  }

  async function handleVerifyOtp() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    setMessage(null)
    await loadState()
  }

  async function handleConfirm() {
    setSubmitting(true)
    setMessage(null)

    const response = await fetch('/api/setup/admin/bootstrap', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        token,
      }),
    })

    setSubmitting(false)

    if (!response.ok) {
      setMessage('开通失败，请稍后重试')
      await loadState()
      return
    }

    router.push('/admin')
  }

  if (state.status === 'loading') {
    return <p className="text-sm font-semibold text-slate-600">正在检查开通状态...</p>
  }

  if (state.status === 'invalid_token') {
    return (
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">开通链接无效或不可用</h1>
      </section>
    )
  }

  if (state.status === 'closed') {
    return (
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">首个管理员已完成开通</h1>
      </section>
    )
  }

  if (state.status === 'not_logged_in') {
    return (
      <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">请先登录后继续</h1>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          邮箱
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {codeSent ? (
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            验证码
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
        ) : null}
        {!codeSent ? (
          <button
            type="button"
            className="rounded-full bg-slate-900 px-5 py-3 font-bold text-white"
            onClick={handleSendOtp}
          >
            发送验证码
          </button>
        ) : (
          <button
            type="button"
            className="rounded-full bg-emerald-600 px-5 py-3 font-bold text-white"
            onClick={handleVerifyOtp}
          >
            验证并继续
          </button>
        )}
        {message ? <p className="text-sm font-semibold text-slate-700">{message}</p> : null}
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-black text-slate-950">开通首个管理员</h1>
      <p className="text-base font-semibold text-slate-700">
        当前登录账号：{state.identityLabel}
      </p>
      <p className="text-sm font-semibold text-slate-600">
        确认后会把当前账号开通为首个管理员，并立即启用 /admin。
      </p>
      <button
        type="button"
        data-testid="setup-admin-confirm"
        className="rounded-full bg-orange-500 px-5 py-3 font-bold text-white disabled:bg-orange-300"
        disabled={submitting}
        onClick={handleConfirm}
      >
        {submitting ? '正在开通管理员权限' : '开通管理员权限'}
      </button>
      {message ? <p className="text-sm font-semibold text-rose-700">{message}</p> : null}
    </section>
  )
}
```

```tsx
// apps/web/src/app/setup/admin/page.tsx
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
```

- [ ] **Step 4: Run the setup card tests**

Run: `cd apps/web; npm run test:run -- src/features/setup/first-admin-bootstrap-card.test.tsx`

Expected: PASS with login-required and ready-confirm states covered.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/setup/first-admin-bootstrap-card.tsx apps/web/src/features/setup/first-admin-bootstrap-card.test.tsx apps/web/src/app/setup/admin/page.tsx
git commit -m "feat: add first admin bootstrap page"
```

### Task 4: Document The Setup Token And Add Browser Coverage

**Files:**
- Modify: `apps/web/.env.example`
- Modify: `apps/web/README.md`
- Create: `apps/web/tests/e2e/first-admin-bootstrap.spec.ts`

- [ ] **Step 1: Write the failing E2E spec**

```ts
import { expect, test } from '@playwright/test'

test('setup admin page can complete the first-admin bootstrap flow', async ({
  page,
}) => {
  await page.route(
    '**/api/setup/admin/bootstrap?token=setup-demo-token',
    async (route) => {
      await route.fulfill({
        json: {
          status: 'ready',
          identityLabel: 'owner@example.com',
        },
      })
    },
  )

  await page.route('**/api/setup/admin/bootstrap', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      token: 'setup-demo-token',
    })

    await route.fulfill({
      json: { ok: true },
    })
  })

  await page.goto('/setup/admin?token=setup-demo-token')
  await expect(page.getByText('owner@example.com')).toBeVisible()
  await page.getByTestId('setup-admin-confirm').click()
  await page.waitForURL('**/admin')
})
```

- [ ] **Step 2: Run the E2E spec to verify the setup page does not exist yet**

Run: `cd apps/web; npm run test:e2e -- tests/e2e/first-admin-bootstrap.spec.ts`

Expected: FAIL because `/setup/admin` and the setup card do not exist yet.

- [ ] **Step 3: Update `.env.example` and `README.md` with the real bootstrap instructions**

```env
# apps/web/.env.example

# First admin bootstrap
ADMIN_SETUP_TOKEN=replace-with-a-long-random-setup-token
```

```md
## 首个管理员开通

- 在 `.env.local` 中配置 `ADMIN_SETUP_TOKEN`
- 首次部署后，使用链接 `/setup/admin?token=<ADMIN_SETUP_TOKEN>` 打开首个管理员开通页
- 先完成登录，再确认“开通管理员权限”
- 成功后当前账号会获得 `/admin` 访问权限
- 只要系统里已经存在任一管理员，这个开通入口就会永久关闭
```

- [ ] **Step 4: Run the browser spec plus the full verification suite**

Run:

```bash
cd apps/web
npm run test:run -- src/features/setup/first-admin-bootstrap.test.ts src/app/api/setup/admin/bootstrap/route.test.ts src/features/setup/first-admin-bootstrap-card.test.tsx
npm run test:e2e -- tests/e2e/first-admin-bootstrap.spec.ts
npm run lint
npm run test:run -- --maxWorkers=4
npm run build
npm run env:check
```

Expected:
- Targeted unit tests pass for service, route, and component layers
- `first-admin-bootstrap.spec.ts` passes and ends on `/admin`
- `lint`, full `vitest`, `build`, and `env:check` all pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/.env.example apps/web/README.md apps/web/tests/e2e/first-admin-bootstrap.spec.ts
git commit -m "docs: add first admin bootstrap setup flow"
```

## Spec Coverage Check

- `2026-04-02-first-admin-bootstrap-design.md`
  Covered by Tasks 1-4.
- `/setup/admin` 首个管理员自助开通页
  Covered by Task 3.
- 专用链接 token + 登录后校验
  Covered by Tasks 1-3.
- `app_metadata.role=admin` 写入
  Covered by Tasks 1-2.
- `admin_bootstrap_events` 开通日志
  Covered by Task 2.
- “系统已有任一管理员后永久关闭”
  Covered by Tasks 1-2.
- 与现有 `/admin` 鉴权的接法
  Covered by Tasks 1-4 because the flow writes the existing authority field and the E2E redirects into `/admin`.

## Placeholder Scan

- No `TODO`, `TBD`, or “implement later” markers remain.
- Each task names exact files, test commands, and commit points.
- The plan intentionally does not add second-admin management, role revocation, or a full admin settings console because those are out of scope in the approved spec.
