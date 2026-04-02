# Local Supabase Development Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/web` 增加一套可重复执行的本地 `Supabase` Docker 联调流程，让开发者一条命令完成本地栈启动、`.env.local` 写入、数据库重置、本地测试管理员初始化，并通过本地密码登录进入 `/admin`。

**Architecture:** 使用 `Supabase CLI` 作为本地 Docker 栈入口；Node 脚本负责解析 `supabase status -o env` 输出并托管 `.env.local` 中的本地 Supabase 变量；本地测试管理员通过 `service_role` 调用 `auth.admin` 创建；新增一个仅本地模式可用的密码登录页面，不改动正式 OTP 链路。

**Tech Stack:** Next.js App Router, `@supabase/supabase-js`, `@supabase/ssr`, Node `.mjs` scripts, Vitest, Playwright, Supabase CLI, Docker Desktop

---

## File Structure

- `D:\pyprograms\kidsCoding\apps\web\package.json`
  - 增加 `local:supabase:setup` 脚本。
- `D:\pyprograms\kidsCoding\apps\web\supabase\config.toml`
  - 本地 Supabase CLI 配置。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-env.mjs`
  - 解析 `supabase status -o env` 输出，更新 `.env.local` 受管区块。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-env.test.mjs`
  - 本地环境块解析与写入规则测试。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup-core.mjs`
  - 编排 `supabase start -> status -> db reset -> seed`。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup-core.test.mjs`
  - 本地 setup 编排顺序与错误处理测试。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup.mjs`
  - 命令行入口。
- `D:\pyprograms\kidsCoding\apps\web\scripts\seed-local-admin-core.mjs`
  - 查询、创建、修复本地管理员。
- `D:\pyprograms\kidsCoding\apps\web\scripts\seed-local-admin-core.test.mjs`
  - 本地管理员幂等创建测试。
- `D:\pyprograms\kidsCoding\apps\web\scripts\seed-local-admin.mjs`
  - 本地管理员命令行入口。
- `D:\pyprograms\kidsCoding\apps\web\src\lib\env.ts`
  - 增加本地 Supabase 模式和本地管理员邮箱的读取函数。
- `D:\pyprograms\kidsCoding\apps\web\src\features\setup\local-admin-login.ts`
  - 本地登录配置的纯函数和守卫。
- `D:\pyprograms\kidsCoding\apps\web\src\features\setup\local-admin-login.test.ts`
  - 本地登录配置守卫测试。
- `D:\pyprograms\kidsCoding\apps\web\src\features\setup\local-admin-login-card.tsx`
  - 本地密码登录表单。
- `D:\pyprograms\kidsCoding\apps\web\src\features\setup\local-admin-login-card.test.tsx`
  - 本地密码登录表单测试。
- `D:\pyprograms\kidsCoding\apps\web\src\app\setup\local-admin\login\page.tsx`
  - 仅本地模式可访问的登录页。
- `D:\pyprograms\kidsCoding\apps\web\.env.example`
  - 补本地 Supabase 环境变量示例。
- `D:\pyprograms\kidsCoding\apps\web\README.md`
  - 补本地 Docker 联调说明。

### Task 1: 本地 Supabase 配置和 `.env.local` 受管区块

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\supabase\config.toml`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-env.mjs`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-env.test.mjs`
- Modify: `D:\pyprograms\kidsCoding\apps\web\package.json`
- Modify: `D:\pyprograms\kidsCoding\apps\web\.env.example`

- [ ] **Step 1: 先写本地环境块 helper 的失败测试**

```js
import { describe, expect, it } from 'vitest'

import {
  LOCAL_SUPABASE_BLOCK_END,
  LOCAL_SUPABASE_BLOCK_START,
  buildLocalSupabaseValues,
  parseSupabaseStatusEnv,
  upsertLocalSupabaseBlock,
} from './local-supabase-env.mjs'

describe('parseSupabaseStatusEnv', () => {
  it('maps Supabase CLI env output into app env keys', () => {
    const parsed = parseSupabaseStatusEnv(`
API_URL=http://127.0.0.1:54321
ANON_KEY=anon-local-key
SERVICE_ROLE_KEY=service-local-key
`)

    expect(parsed).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-local-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-local-key',
    })
  })
})

describe('upsertLocalSupabaseBlock', () => {
  it('replaces only the managed block and keeps unrelated keys', () => {
    const values = buildLocalSupabaseValues({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-local-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-local-key',
    })

    const next = upsertLocalSupabaseBlock(
      `STRIPE_SECRET_KEY=keep-me\n${LOCAL_SUPABASE_BLOCK_START}\nOLD=1\n${LOCAL_SUPABASE_BLOCK_END}\nADMIN_SETUP_TOKEN=keep-token\n`,
      values,
    )

    expect(next).toContain('STRIPE_SECRET_KEY=keep-me')
    expect(next).toContain('ADMIN_SETUP_TOKEN=keep-token')
    expect(next).toContain('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321')
    expect(next).not.toContain('OLD=1')
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm run test:run -- scripts/local-supabase-env.test.mjs`  
Expected: FAIL，提示 `Cannot find module './local-supabase-env.mjs'`

- [ ] **Step 3: 实现本地 env helper**

```js
export const LOCAL_SUPABASE_BLOCK_START = '# BEGIN LOCAL_SUPABASE_MANAGED'
export const LOCAL_SUPABASE_BLOCK_END = '# END LOCAL_SUPABASE_MANAGED'

export function parseSupabaseStatusEnv(output) {
  const record = Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split('='))
      .map(([key, ...rest]) => [key, rest.join('=')]),
  )

  if (!record.API_URL || !record.ANON_KEY || !record.SERVICE_ROLE_KEY) {
    throw new Error('local-supabase-status-invalid')
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: record.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: record.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: record.SERVICE_ROLE_KEY,
  }
}

export function buildLocalSupabaseValues(input) {
  return {
    ...input,
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    LOCAL_SUPABASE_ENABLED: 'true',
    LOCAL_SUPABASE_ADMIN_EMAIL: 'admin-local@kidscoding.test',
    LOCAL_SUPABASE_ADMIN_PASSWORD: 'KidsCodingLocalAdmin123!',
  }
}

export function upsertLocalSupabaseBlock(current, values) {
  const block = [
    LOCAL_SUPABASE_BLOCK_START,
    ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
    LOCAL_SUPABASE_BLOCK_END,
  ].join('\n')

  const pattern = new RegExp(
    `${LOCAL_SUPABASE_BLOCK_START}[\\s\\S]*?${LOCAL_SUPABASE_BLOCK_END}`,
    'm',
  )

  if (pattern.test(current)) {
    return current.replace(pattern, block)
  }

  return `${current.trimEnd()}\n\n${block}\n`
}
```

- [ ] **Step 4: 补本地 Supabase 配置入口和 npm script**

```toml
# D:\pyprograms\kidsCoding\apps\web\supabase\config.toml
[api]
enabled = true
port = 54321

[db]
port = 54322
major_version = 15

[studio]
enabled = true
port = 54323

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000"]
```

```json
{
  "scripts": {
    "local:supabase:setup": "node ./scripts/local-supabase-setup.mjs"
  }
}
```

```env
LOCAL_SUPABASE_ENABLED=false
LOCAL_SUPABASE_ADMIN_EMAIL=admin-local@kidscoding.test
LOCAL_SUPABASE_ADMIN_PASSWORD=KidsCodingLocalAdmin123!
```

- [ ] **Step 5: 重新运行测试**

Run: `npm run test:run -- scripts/local-supabase-env.test.mjs`  
Expected: PASS

- [ ] **Step 6: 提交这一批**

```bash
git add apps/web/package.json apps/web/.env.example apps/web/supabase/config.toml apps/web/scripts/local-supabase-env.mjs apps/web/scripts/local-supabase-env.test.mjs
git commit -m "chore: add local supabase env scaffolding"
```

### Task 2: 本地 setup 编排脚本

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup-core.mjs`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup-core.test.mjs`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup.mjs`

- [ ] **Step 1: 先写编排顺序的失败测试**

```js
import { describe, expect, it, vi } from 'vitest'

import { runLocalSupabaseSetup } from './local-supabase-setup-core.mjs'

describe('runLocalSupabaseSetup', () => {
  it('starts supabase, reads env, and resets the local database', async () => {
    const exec = vi.fn()
      .mockResolvedValueOnce({ stdout: '' })
      .mockResolvedValueOnce({
        stdout: 'API_URL=http://127.0.0.1:54321\nANON_KEY=anon\nSERVICE_ROLE_KEY=service\n',
      })
      .mockResolvedValueOnce({ stdout: '' })
      .mockResolvedValueOnce({ stdout: '' })

    const writeEnv = vi.fn().mockResolvedValue(undefined)

    await runLocalSupabaseSetup({
      exec,
      writeEnv,
      projectDir: 'D:/pyprograms/kidsCoding/apps/web',
    })

    expect(exec.mock.calls.map(([command]) => command)).toEqual([
      'supabase start',
      'supabase status -o env',
      'supabase db reset --yes',
    ])
    expect(writeEnv).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm run test:run -- scripts/local-supabase-setup-core.test.mjs`  
Expected: FAIL，提示 `Cannot find module './local-supabase-setup-core.mjs'`

- [ ] **Step 3: 实现 setup core 和命令行入口**

```js
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import {
  buildLocalSupabaseValues,
  parseSupabaseStatusEnv,
  upsertLocalSupabaseBlock,
} from './local-supabase-env.mjs'

const execFileAsync = promisify(execFile)
const NPX_BIN = process.platform === 'win32' ? 'npx.cmd' : 'npx'

async function defaultExec(command, args, cwd) {
  if (command === 'supabase') {
    return execFileAsync(NPX_BIN, ['supabase', ...args], { cwd })
  }

  return execFileAsync(command, args, { cwd })
}

async function defaultWriteEnv(envPath, values) {
  const current = await fs.readFile(envPath, 'utf8').catch(() => '')
  await fs.writeFile(envPath, upsertLocalSupabaseBlock(current, values), 'utf8')
}

export async function runLocalSupabaseSetup({
  projectDir,
  exec = defaultExec,
  writeEnv = defaultWriteEnv,
}) {
  await exec('supabase', ['start'], projectDir)
  const status = await exec('supabase', ['status', '-o', 'env'], projectDir)
  const envValues = buildLocalSupabaseValues(parseSupabaseStatusEnv(status.stdout))
  const envPath = join(projectDir, '.env.local')
  await writeEnv(envPath, envValues)
  await exec('supabase', ['db', 'reset', '--yes'], projectDir)
}
```

```js
import { runLocalSupabaseSetup } from './local-supabase-setup-core.mjs'

runLocalSupabaseSetup({ projectDir: process.cwd() }).catch((error) => {
  console.error('[local:supabase:setup] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
```

- [ ] **Step 4: 重新运行测试**

Run: `npm run test:run -- scripts/local-supabase-setup-core.test.mjs`  
Expected: PASS

- [ ] **Step 5: 手工 smoke 一次脚本入口**

Run: `node ./scripts/local-supabase-setup.mjs`  
Expected: 在未安装 Supabase CLI 或 Docker 时失败，但报错指向具体步骤，不是裸堆栈

- [ ] **Step 6: 提交这一批**

```bash
git add apps/web/scripts/local-supabase-setup-core.mjs apps/web/scripts/local-supabase-setup-core.test.mjs apps/web/scripts/local-supabase-setup.mjs
git commit -m "feat: orchestrate local supabase setup"
```

### Task 3: 本地测试管理员初始化

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\seed-local-admin-core.mjs`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\seed-local-admin-core.test.mjs`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\seed-local-admin.mjs`
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup-core.mjs`

- [ ] **Step 1: 先写本地管理员幂等逻辑的失败测试**

```js
import { describe, expect, it, vi } from 'vitest'

import { ensureLocalAdmin } from './seed-local-admin-core.mjs'

describe('ensureLocalAdmin', () => {
  it('creates the user when it does not exist', async () => {
    const admin = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null }),
          updateUserById: vi.fn(),
        },
      },
    }

    await ensureLocalAdmin(admin, {
      email: 'admin-local@kidscoding.test',
      password: 'KidsCodingLocalAdmin123!',
    })

    expect(admin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin-local@kidscoding.test',
        password: 'KidsCodingLocalAdmin123!',
        email_confirm: true,
        app_metadata: { role: 'admin' },
      }),
    )
  })

  it('repairs the role when the user exists without admin metadata', async () => {
    const admin = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: '1', email: 'admin-local@kidscoding.test', app_metadata: {} }] },
            error: null,
          }),
          createUser: vi.fn(),
          updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    }

    await ensureLocalAdmin(admin, {
      email: 'admin-local@kidscoding.test',
      password: 'KidsCodingLocalAdmin123!',
    })

    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        password: 'KidsCodingLocalAdmin123!',
        app_metadata: { role: 'admin' },
      }),
    )
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm run test:run -- scripts/seed-local-admin-core.test.mjs`  
Expected: FAIL，提示 `Cannot find module './seed-local-admin-core.mjs'`

- [ ] **Step 3: 实现本地管理员 seed core 和入口**

```js
import { createClient } from '@supabase/supabase-js'

function mergeAdminMetadata(appMetadata = {}) {
  return {
    ...appMetadata,
    role: 'admin',
  }
}

export async function ensureLocalAdmin(admin, { email, password }) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })

  if (error) throw error

  const existing = (data?.users ?? []).find((user) => user.email === email)

  if (!existing) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
    })

    if (created.error) throw created.error
    return
  }

  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    app_metadata: mergeAdminMetadata(existing.app_metadata),
  })

  if (updated.error) throw updated.error
}

export function createLocalAdminClient({ url, serviceRoleKey }) {
  return createClient(url, serviceRoleKey)
}
```

```js
import { createLocalAdminClient, ensureLocalAdmin } from './seed-local-admin-core.mjs'

const admin = createLocalAdminClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
})

await ensureLocalAdmin(admin, {
  email: process.env.LOCAL_SUPABASE_ADMIN_EMAIL,
  password: process.env.LOCAL_SUPABASE_ADMIN_PASSWORD,
})
```

- [ ] **Step 4: 把 seed 步骤接回 setup 编排测试和实现**

```js
expect(exec.mock.calls.map(([command]) => command)).toEqual([
  'supabase start',
  'supabase status -o env',
  'supabase db reset --yes',
  'node',
])
```

```js
await exec('supabase', ['db', 'reset', '--yes'], projectDir)
await exec('node', ['./scripts/seed-local-admin.mjs'], projectDir)
```

- [ ] **Step 5: 运行相关测试**

Run: `npm run test:run -- scripts/seed-local-admin-core.test.mjs scripts/local-supabase-setup-core.test.mjs`  
Expected: PASS

- [ ] **Step 6: 提交这一批**

```bash
git add apps/web/scripts/seed-local-admin-core.mjs apps/web/scripts/seed-local-admin-core.test.mjs apps/web/scripts/seed-local-admin.mjs apps/web/scripts/local-supabase-setup-core.mjs
git commit -m "feat: seed local admin account"
```

### Task 4: 本地密码登录入口

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\lib\env.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\setup\local-admin-login.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\setup\local-admin-login.test.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\setup\local-admin-login-card.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\setup\local-admin-login-card.test.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\setup\local-admin\login\page.tsx`

- [ ] **Step 1: 先写纯函数和登录卡片的失败测试**

```ts
import { describe, expect, it } from 'vitest'

import { readLocalAdminLoginConfig } from './local-admin-login'

describe('readLocalAdminLoginConfig', () => {
  it('enables the page only when local mode and email are configured', () => {
    expect(
      readLocalAdminLoginConfig({
        LOCAL_SUPABASE_ENABLED: 'true',
        LOCAL_SUPABASE_ADMIN_EMAIL: 'admin-local@kidscoding.test',
      }),
    ).toEqual({
      enabled: true,
      email: 'admin-local@kidscoding.test',
    })
  })
})
```

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

import { LocalAdminLoginCard } from './local-admin-login-card'

const push = vi.fn()
const signInWithPassword = vi.fn().mockResolvedValue({ error: null })

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/lib/supabase/browser', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithPassword,
    },
  }),
}))

it('signs in and redirects to /admin', async () => {
  render(<LocalAdminLoginCard defaultEmail="admin-local@kidscoding.test" />)

  fireEvent.change(screen.getByLabelText('邮箱'), {
    target: { value: 'admin-local@kidscoding.test' },
  })
  fireEvent.change(screen.getByLabelText('密码'), {
    target: { value: 'KidsCodingLocalAdmin123!' },
  })
  fireEvent.click(screen.getByTestId('local-admin-login-submit'))

  await waitFor(() => {
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'admin-local@kidscoding.test',
      password: 'KidsCodingLocalAdmin123!',
    })
    expect(push).toHaveBeenCalledWith('/admin')
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm run test:run -- src/features/setup/local-admin-login.test.ts src/features/setup/local-admin-login-card.test.tsx`  
Expected: FAIL，提示缺少模块和组件

- [ ] **Step 3: 实现本地登录配置和页面守卫**

```ts
export function readLocalAdminLoginConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  const enabled = (env.LOCAL_SUPABASE_ENABLED ?? '').trim() === 'true'
  const email = (env.LOCAL_SUPABASE_ADMIN_EMAIL ?? '').trim()

  return {
    enabled: enabled && email.length > 0,
    email,
  }
}
```

```ts
export function isLocalSupabaseEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return (env.LOCAL_SUPABASE_ENABLED ?? '').trim() === 'true'
}

export function getLocalSupabaseAdminEmail(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return (env.LOCAL_SUPABASE_ADMIN_EMAIL ?? '').trim()
}
```

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export function LocalAdminLoginCard({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter()
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        if (email !== defaultEmail) {
          setMessage('请使用本地管理员邮箱登录。')
          return
        }
        const supabase = createBrowserSupabaseClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          setMessage('登录失败，请检查本地管理员账号和密码。')
          return
        }

        router.push('/admin')
      }}
    >
      {/* inputs */}
    </form>
  )
}
```

```tsx
import { notFound } from 'next/navigation'

import { LocalAdminLoginCard } from '@/features/setup/local-admin-login-card'
import { readLocalAdminLoginConfig } from '@/features/setup/local-admin-login'

export default function LocalAdminLoginPage() {
  const config = readLocalAdminLoginConfig()

  if (!config.enabled) {
    notFound()
  }

  return <LocalAdminLoginCard defaultEmail={config.email} />
}
```

- [ ] **Step 4: 重新运行测试**

Run: `npm run test:run -- src/features/setup/local-admin-login.test.ts src/features/setup/local-admin-login-card.test.tsx`  
Expected: PASS

- [ ] **Step 5: 做一次手工页面 smoke**

Run: `npm run dev`  
Expected: 访问 `/setup/local-admin/login` 时：
- 本地模式开启时显示密码登录页
- 本地模式关闭时返回 404 或关闭页

- [ ] **Step 6: 提交这一批**

```bash
git add apps/web/src/lib/env.ts apps/web/src/features/setup/local-admin-login.ts apps/web/src/features/setup/local-admin-login.test.ts apps/web/src/features/setup/local-admin-login-card.tsx apps/web/src/features/setup/local-admin-login-card.test.tsx apps/web/src/app/setup/local-admin/login/page.tsx
git commit -m "feat: add local admin password login"
```

### Task 5: 文档、联调验证和首管回归

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\README.md`

- [ ] **Step 1: 先补 README 的本地联调章节**

```md
## 本地 Supabase Docker 联调

1. 安装 Docker Desktop
2. 在 `apps/web` 下执行 `npm run local:supabase:setup`
3. 执行 `npm run env:check`
4. 执行 `npm run dev`
5. 打开 `/setup/local-admin/login`
6. 使用以下本地管理员账号登录：
   - 邮箱：`admin-local@kidscoding.test`
   - 密码：`KidsCodingLocalAdmin123!`

说明：
- 这条链路只用于本地开发
- 不覆盖 Stripe 和本地 AI provider 联调
- 首个管理员开通页 `/setup/admin` 仍保留给正式环境或非本地 bootstrap 使用
```

- [ ] **Step 2: 跑自动化回归**

Run: `npm run lint`  
Expected: PASS

Run: `npm run test:run -- --maxWorkers=4`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 3: 执行本地联调命令**

Run: `npm run local:supabase:setup`  
Expected:
- `supabase start` 成功
- `supabase db reset --yes` 成功
- `.env.local` 出现本地 Supabase 受管区块
- 本地管理员创建成功

- [ ] **Step 4: 执行手工验收**

1. 运行 `npm run dev`
2. 访问 `http://localhost:3000/setup/local-admin/login`
3. 使用固定账号密码登录
4. 确认进入 `http://localhost:3000/admin`
5. 访问 `http://localhost:3000/setup/admin?token=test-token`
6. 确认页面显示“首个管理员开通入口已关闭”或等价关闭状态

- [ ] **Step 5: 提交这一批**

```bash
git add apps/web/README.md
git commit -m "docs: add local supabase workflow"
```

- [ ] **Step 6: 最终复核并准备收尾**

Run: `git status --short`  
Expected: 空输出

Run: `git log --oneline -5`  
Expected: 能看到本次 5 个任务对应提交
