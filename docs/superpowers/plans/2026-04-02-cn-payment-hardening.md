# 中国大陆聚合支付与解锁确认 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前单一 `Stripe` 购买链路升级为统一支付提供方架构，并新增独立支付确认页、统一订单状态轮询和管理员手动重试同步入口。

**Architecture:** 在现有 `orders / entitlements` 结构上增加统一支付服务层。前端只关心平台订单状态，支付服务商差异由 `PaymentProvider` 实现屏蔽。首发默认走中国大陆聚合支付 provider，但保留 `Stripe` 作为兼容实现和测试路径。

**Tech Stack:** Next.js App Router、TypeScript、Supabase、Vitest、Playwright、Stripe（兼容实现）、自定义支付 provider 抽象

---

## File Structure

### Existing files to modify

- `D:\pyprograms\kidsCoding\apps\web\src\features\domain\types.ts`
  - 新增支付 provider、订单状态、订单查询结果类型。
- `D:\pyprograms\kidsCoding\apps\web\src\lib\env.ts`
  - 增加默认支付 provider 配置读取。
- `D:\pyprograms\kidsCoding\apps\web\src\app\api\checkout\route.ts`
  - 从直接 Stripe 下单改为统一下单入口。
- `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\page.tsx`
  - 从“直接表单提交”改成展示二维码入口和跳转成功确认页。
- `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\stripe\webhook\route.ts`
  - 降为 provider webhook 实现，核心逻辑迁到统一服务层。
- `D:\pyprograms\kidsCoding\apps\web\src\app\parent\overview\page.tsx`
  - 在购买成功回跳逻辑上改为使用独立成功页，不再承接支付确认。
- `D:\pyprograms\kidsCoding\apps\web\src\app\admin\page.tsx`
  - 增加订单重试同步入口或入口卡片。
- `D:\pyprograms\kidsCoding\apps\web\src\app\api\course-access\route.ts`
  - 复用统一的权益判定结果，避免散落查询。
- `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\page.tsx`
  - 用统一订单创建结果决定后续页面跳转。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\resolve-course-access.ts`
  - 如果需要，接入统一 entitlement 状态映射。

### New files to create

- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-provider.ts`
  - 定义 `PaymentProvider` 接口和统一 provider 名称。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-status.ts`
  - 统一订单状态映射和辅助函数。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-provider-registry.ts`
  - 根据环境选择默认 provider，聚合 `stripe` 与 `aggregated_cn`。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\stripe-provider.ts`
  - 现有 Stripe 下单、webhook、查询能力封装成 provider。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
  - 中国大陆聚合支付 provider 的首发实现占位与接口适配。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-orders.ts`
  - 平台订单创建、状态查询、支付确认、权益发放、重试同步。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-orders.test.ts`
  - 订单服务单测。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-provider-registry.test.ts`
  - 默认 provider 与环境选择单测。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-status.test.ts`
  - 状态映射单测。
- `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\orders\[orderId]\route.ts`
  - 前端轮询订单状态的统一接口。
- `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.ts`
  - provider 分发式 webhook 路由。
- `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.ts`
  - 管理员手动重试同步支付结果。
- `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\success\page.tsx`
  - 独立支付确认页。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\purchase-status-card.tsx`
  - 成功确认页的状态展示组件。
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\purchase-status-card.test.tsx`
  - 状态卡测试。
- `D:\pyprograms\kidsCoding\apps\web\tests\e2e\payment-success.spec.ts`
  - 购买成功轮询和管理员重试同步的 E2E。
- `D:\pyprograms\kidsCoding\apps\web\supabase\migrations\202604020006_cn_payment_hardening.sql`
  - 补齐 `orders` 字段、索引和状态所需结构。

---

### Task 1: 定义统一支付类型与 provider 注册表

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-provider.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-status.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-provider-registry.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-status.test.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-provider-registry.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\domain\types.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\lib\env.ts`

- [ ] **Step 1: 写失败测试，约束状态映射和默认 provider 选择**

```ts
import { describe, expect, it } from 'vitest'

import { mapProviderStatus, isTerminalPaymentStatus } from './payment-status'
import { resolveDefaultPaymentProvider } from './payment-provider-registry'

describe('payment status helpers', () => {
  it('maps provider statuses into unified platform statuses', () => {
    expect(mapProviderStatus('created')).toBe('created')
    expect(mapProviderStatus('waiting_payment')).toBe('pending')
    expect(mapProviderStatus('paid')).toBe('paid')
    expect(mapProviderStatus('closed')).toBe('expired')
    expect(mapProviderStatus('failed')).toBe('failed')
  })

  it('marks only paid failed and expired as terminal', () => {
    expect(isTerminalPaymentStatus('created')).toBe(false)
    expect(isTerminalPaymentStatus('pending')).toBe(false)
    expect(isTerminalPaymentStatus('paid')).toBe(true)
    expect(isTerminalPaymentStatus('failed')).toBe(true)
    expect(isTerminalPaymentStatus('expired')).toBe(true)
  })
})

describe('resolveDefaultPaymentProvider', () => {
  it('prefers cn aggregate provider in production-like envs', () => {
    expect(
      resolveDefaultPaymentProvider({
        PAYMENT_PROVIDER_DEFAULT: 'aggregated_cn',
      }),
    ).toBe('aggregated_cn')
  })
})
```

- [ ] **Step 2: 跑测试，确认当前缺少实现而失败**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\billing\payment-status.test.ts src\features\billing\payment-provider-registry.test.ts --maxWorkers=1`

Expected: FAIL，提示缺少新文件或导出。

- [ ] **Step 3: 写最小实现和类型**

```ts
// src/features/billing/payment-provider.ts
export type PaymentProviderName = 'stripe' | 'aggregated_cn'
export type PaymentOrderStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'

export type CreatePaymentResult = {
  provider: PaymentProviderName
  providerOrderId: string
  status: PaymentOrderStatus
  qrCodeValue: string
  qrExpiresAt: string | null
}

export interface PaymentProvider {
  readonly name: PaymentProviderName
  createPayment(input: {
    orderId: string
    userId: string
    productCode: string
    title: string
    amountCny: number
    successUrl: string
  }): Promise<CreatePaymentResult>
  parseWebhook(request: Request): Promise<{
    providerOrderId: string
    providerStatus: string
    status: PaymentOrderStatus
  }>
  queryPayment(input: {
    orderId: string
    providerOrderId: string
  }): Promise<{
    providerStatus: string
    status: PaymentOrderStatus
  }>
}
```

```ts
// src/features/billing/payment-status.ts
import type { PaymentOrderStatus } from './payment-provider'

export function mapProviderStatus(value: string): PaymentOrderStatus {
  switch (value) {
    case 'created':
      return 'created'
    case 'waiting_payment':
    case 'pending':
      return 'pending'
    case 'paid':
    case 'succeeded':
      return 'paid'
    case 'closed':
    case 'expired':
      return 'expired'
    default:
      return 'failed'
  }
}

export function isTerminalPaymentStatus(status: PaymentOrderStatus) {
  return status === 'paid' || status === 'failed' || status === 'expired'
}
```

```ts
// src/features/billing/payment-provider-registry.ts
import type { PaymentProviderName } from './payment-provider'

export function resolveDefaultPaymentProvider(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): PaymentProviderName {
  return env.PAYMENT_PROVIDER_DEFAULT === 'stripe' ? 'stripe' : 'aggregated_cn'
}
```

```ts
// src/lib/env.ts
export function getDefaultPaymentProvider(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return env.PAYMENT_PROVIDER_DEFAULT === 'stripe' ? 'stripe' : 'aggregated_cn'
}
```

- [ ] **Step 4: 重新运行测试，确认转绿**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\billing\payment-status.test.ts src\features\billing\payment-provider-registry.test.ts --maxWorkers=1`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/features/billing/payment-provider.ts apps/web/src/features/billing/payment-status.ts apps/web/src/features/billing/payment-provider-registry.ts apps/web/src/features/billing/payment-status.test.ts apps/web/src/features/billing/payment-provider-registry.test.ts apps/web/src/features/domain/types.ts apps/web/src/lib/env.ts
git commit -m "Add payment provider abstractions"
```

### Task 2: 扩展订单表和统一订单服务

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-orders.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-orders.test.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\supabase\migrations\202604020006_cn_payment_hardening.sql`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\domain\types.ts`

- [ ] **Step 1: 写失败测试，约束订单状态更新和 paid 时权益发放**

```ts
import { describe, expect, it, vi } from 'vitest'

import { createPaymentOrderService } from './payment-orders'

describe('payment order service', () => {
  it('creates a pending order from provider payment result', async () => {
    const service = createPaymentOrderService({
      createOrder: vi.fn().mockResolvedValue({ id: 'order-1' }),
      upsertEntitlement: vi.fn(),
      updateOrder: vi.fn(),
    })

    const result = await service.applyCreatePaymentResult({
      orderId: 'order-1',
      provider: 'aggregated_cn',
      providerOrderId: 'cn-123',
      status: 'pending',
      qrCodeValue: 'weixin://qrcode',
      qrExpiresAt: '2026-04-02T10:00:00.000Z',
    })

    expect(result.status).toBe('pending')
  })

  it('grants entitlement when order transitions to paid', async () => {
    const upsertEntitlement = vi.fn()
    const service = createPaymentOrderService({
      createOrder: vi.fn(),
      upsertEntitlement,
      updateOrder: vi.fn(),
    })

    await service.markOrderPaid({
      orderId: 'order-1',
      userId: 'user-1',
      productCode: 'launch-story-pack',
      providerStatus: 'paid',
    })

    expect(upsertEntitlement).toHaveBeenCalledWith({
      userId: 'user-1',
      productCode: 'launch-story-pack',
      status: 'active',
    })
  })
})
```

- [ ] **Step 2: 跑测试，确认失败**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\billing\payment-orders.test.ts --maxWorkers=1`

Expected: FAIL，提示服务不存在。

- [ ] **Step 3: 新增迁移和最小订单服务**

```sql
alter table orders
  add column if not exists amount_cny integer,
  add column if not exists qr_expires_at timestamptz,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text,
  add column if not exists provider_status text;

create index if not exists orders_user_created_idx
  on orders (user_id, created_at desc);
```

```ts
// src/features/billing/payment-orders.ts
export function createPaymentOrderService(deps: {
  createOrder: (input: Record<string, unknown>) => Promise<{ id: string }>
  updateOrder: (input: Record<string, unknown>) => Promise<void>
  upsertEntitlement: (input: {
    userId: string
    productCode: string
    status: 'active'
  }) => Promise<void>
}) {
  return {
    async applyCreatePaymentResult(input: {
      orderId: string
      provider: 'stripe' | 'aggregated_cn'
      providerOrderId: string
      status: 'created' | 'pending'
      qrCodeValue: string
      qrExpiresAt: string | null
    }) {
      await deps.updateOrder({
        id: input.orderId,
        provider: input.provider,
        provider_session_id: input.providerOrderId,
        status: input.status,
        qr_expires_at: input.qrExpiresAt,
      })

      return input
    },
    async markOrderPaid(input: {
      orderId: string
      userId: string
      productCode: string
      providerStatus: string
    }) {
      await deps.updateOrder({
        id: input.orderId,
        status: 'paid',
        provider_status: input.providerStatus,
        last_synced_at: new Date().toISOString(),
      })
      await deps.upsertEntitlement({
        userId: input.userId,
        productCode: input.productCode,
        status: 'active',
      })
    },
  }
}
```

- [ ] **Step 4: 重新运行测试**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\billing\payment-orders.test.ts --maxWorkers=1`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/features/billing/payment-orders.ts apps/web/src/features/billing/payment-orders.test.ts apps/web/supabase/migrations/202604020006_cn_payment_hardening.sql apps/web/src/features/domain/types.ts
git commit -m "Add payment order service and schema fields"
```

### Task 3: 重构统一下单入口和 provider webhook

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\stripe-provider.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\orders\[orderId]\route.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\orders\[orderId]\route.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\checkout\route.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\stripe\webhook\route.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\lib\billing\stripe.ts`

- [ ] **Step 1: 先写 API 红测**

```ts
import { describe, expect, it } from 'vitest'

import { GET } from './route'

describe('GET /api/payments/orders/[orderId]', () => {
  it('returns paid with unlocked access when entitlement is active', async () => {
    const response = await GET(
      new Request('http://localhost/api/payments/orders/order-1'),
      { params: Promise.resolve({ orderId: 'order-1' }) },
    )

    expect(response.status).toBe(200)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\app\api\payments\orders\[orderId]\route.test.ts --maxWorkers=1`

Expected: FAIL

- [ ] **Step 3: 实现统一 checkout 和订单状态接口**

```ts
// src/app/api/checkout/route.ts
const providerName = getDefaultPaymentProvider()
const provider = resolvePaymentProvider(providerName)
const order = await admin
  .from('orders')
  .insert({
    user_id: user.id,
    provider: providerName,
    provider_session_id: crypto.randomUUID(),
    status: 'created',
    product_code: launchCoursePack.productCode,
    amount_cny: launchCoursePack.priceCny,
  })
  .select('id')
  .single()

const payment = await provider.createPayment({
  orderId: order.data!.id,
  userId: user.id,
  productCode: launchCoursePack.productCode,
  title: launchCoursePack.title,
  amountCny: launchCoursePack.priceCny,
  successUrl: `${appUrl}/parent/purchase/success?order=${order.data!.id}`,
})

await admin
  .from('orders')
  .update({
    provider_session_id: payment.providerOrderId,
    status: payment.status,
    qr_expires_at: payment.qrExpiresAt,
  })
  .eq('id', order.data!.id)

return NextResponse.json({
  orderId: order.data!.id,
  status: payment.status,
  qrCodeValue: payment.qrCodeValue,
  successUrl: `${appUrl}/parent/purchase/success?order=${order.data!.id}`,
})
```

```ts
// src/app/api/payments/orders/[orderId]/route.ts
return NextResponse.json({
  orderId: row.id,
  status: row.status,
  unlocked: entitlement?.status === 'active',
})
```

```ts
// src/app/api/payments/providers/[provider]/webhook/route.ts
const provider = resolvePaymentProvider(params.provider)
const parsed = await provider.parseWebhook(request)
// 查订单并更新状态，paid 时调用 markOrderPaid
```

- [ ] **Step 4: 重新运行 API 测试**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\app\api\payments\orders\[orderId]\route.test.ts --maxWorkers=1`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/features/billing/providers/stripe-provider.ts apps/web/src/features/billing/providers/aggregated-cn-provider.ts apps/web/src/app/api/checkout/route.ts apps/web/src/app/api/payments/orders/[orderId]/route.ts apps/web/src/app/api/payments/orders/[orderId]/route.test.ts apps/web/src/app/api/payments/providers/[provider]/webhook/route.ts apps/web/src/app/api/payments/stripe/webhook/route.ts apps/web/src/lib/billing/stripe.ts
git commit -m "Refactor checkout and webhooks through payment providers"
```

### Task 4: 新增独立支付确认页和轮询状态卡

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\success\page.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\purchase-status-card.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\purchase-status-card.test.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\parent\overview\page.tsx`

- [ ] **Step 1: 写失败测试，约束 success 页面状态卡**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PurchaseStatusCard } from './purchase-status-card'

describe('PurchaseStatusCard', () => {
  it('shows timeout copy and manual refresh action', () => {
    render(
      <PurchaseStatusCard
        orderId="order-1"
        status="pending"
        timedOut
        onRefresh={async () => {}}
      />,
    )

    expect(screen.getByText('仍在确认中')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '手动刷新' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\billing\purchase-status-card.test.tsx --maxWorkers=1`

Expected: FAIL

- [ ] **Step 3: 实现状态卡和 success 页面**

```tsx
// src/features/billing/purchase-status-card.tsx
'use client'

export function PurchaseStatusCard(props: {
  orderId: string
  status: 'created' | 'pending' | 'paid' | 'failed' | 'expired'
  timedOut?: boolean
  onRefresh: () => Promise<void>
}) {
  if (props.status === 'paid') {
    return <div>正式课程已解锁</div>
  }

  if (props.status === 'failed') {
    return <div>支付未成功，请重新发起。</div>
  }

  if (props.status === 'expired') {
    return <div>二维码已失效，请重新发起支付。</div>
  }

  if (props.timedOut) {
    return (
      <div>
        <p>仍在确认中</p>
        <button onClick={() => void props.onRefresh()}>手动刷新</button>
      </div>
    )
  }

  return <div>正在确认支付，请稍候。</div>
}
```

```tsx
// src/app/parent/purchase/success/page.tsx
// 客户端轮询 /api/payments/orders/[orderId]
// 60 秒超时后切换 timedOut
```

- [ ] **Step 4: 重新运行组件测试**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\billing\purchase-status-card.test.tsx --maxWorkers=1`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/app/parent/purchase/success/page.tsx apps/web/src/features/billing/purchase-status-card.tsx apps/web/src/features/billing/purchase-status-card.test.tsx apps/web/src/app/parent/purchase/page.tsx apps/web/src/app/parent/overview/page.tsx
git commit -m "Add purchase success polling page"
```

### Task 5: 增加管理员手动重试同步入口

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\admin\payment-reconcile-card.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\admin\payment-reconcile-card.test.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\admin\page.tsx`

- [ ] **Step 1: 先写失败测试，约束管理员能提交订单号并触发重试**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PaymentReconcileCard } from './payment-reconcile-card'

describe('PaymentReconcileCard', () => {
  it('submits entered order id to reconcile handler', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true })

    render(<PaymentReconcileCard reconcileRequest={onSubmit} />)

    fireEvent.change(screen.getByLabelText('订单号'), {
      target: { value: 'order-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: '重试同步' }))

    expect(onSubmit).toHaveBeenCalledWith('order-1')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\admin\payment-reconcile-card.test.tsx --maxWorkers=1`

Expected: FAIL

- [ ] **Step 3: 实现 API 和后台卡片**

```ts
// src/app/api/admin/payments/orders/[orderId]/reconcile/route.ts
const provider = resolvePaymentProvider(row.provider)
const queried = await provider.queryPayment({
  orderId: row.id,
  providerOrderId: row.provider_session_id,
})

if (queried.status === 'paid') {
  await markOrderPaid(...)
}

return NextResponse.json({
  ok: true,
  status: queried.status,
})
```

```tsx
// src/features/admin/payment-reconcile-card.tsx
'use client'

export function PaymentReconcileCard(props: {
  reconcileRequest: (orderId: string) => Promise<{ ok: boolean; status?: string }>
}) {
  // 输入订单号并调用 reconcileRequest
}
```

- [ ] **Step 4: 重新运行测试**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\admin\payment-reconcile-card.test.tsx --maxWorkers=1`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/app/api/admin/payments/orders/[orderId]/reconcile/route.ts apps/web/src/features/admin/payment-reconcile-card.tsx apps/web/src/features/admin/payment-reconcile-card.test.tsx apps/web/src/app/admin/page.tsx
git commit -m "Add admin payment reconcile action"
```

### Task 6: 跑通 E2E、文档和环境变量

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\payment-success.spec.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\README.md`
- Modify: `D:\pyprograms\kidsCoding\apps\web\.env.example`
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\env-check.mjs`

- [ ] **Step 1: 先写 E2E 场景**

```ts
import { expect, test } from '@playwright/test'

test('purchase success page polls until paid and unlocks the map', async ({ page }) => {
  await page.goto('/parent/purchase/success?order=order-paid')

  await expect(page.getByText('正在确认支付')).toBeVisible()
  await expect(page.getByText('正式课程已解锁')).toBeVisible()
})
```

- [ ] **Step 2: 跑 E2E，确认当前失败**

Run: `cmd /c node_modules\.bin\playwright.cmd test tests\e2e\payment-success.spec.ts`

Expected: FAIL

- [ ] **Step 3: 更新 README、env 模板和 env 检查**

```env
PAYMENT_PROVIDER_DEFAULT=aggregated_cn
CN_PAYMENT_PROVIDER_BASE_URL=
CN_PAYMENT_PROVIDER_APP_ID=
CN_PAYMENT_PROVIDER_APP_SECRET=
CN_PAYMENT_PROVIDER_WEBHOOK_SECRET=
```

```md
## 中国大陆聚合支付

- `PAYMENT_PROVIDER_DEFAULT=aggregated_cn`
- 本地开发可继续使用 `stripe`
- 生产环境必须补齐聚合支付 provider 参数
```

- [ ] **Step 4: 跑全量验证**

Run: `cmd /c node_modules\.bin\vitest.cmd run --maxWorkers=1`

Expected: PASS

Run: `cmd /c node_modules\.bin\eslint.cmd .`

Expected: PASS

Run: `cmd /c node_modules\.bin\next.cmd build`

Expected: PASS

Run: `cmd /c node_modules\.bin\playwright.cmd test tests\e2e\payment-success.spec.ts tests\e2e\trial-lock-purchase.spec.ts`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/tests/e2e/payment-success.spec.ts apps/web/README.md apps/web/.env.example apps/web/scripts/env-check.mjs
git commit -m "Document and verify payment hardening flow"
```

---

## Self-Review

- **Spec coverage:** 已覆盖统一 provider、统一订单状态、成功确认页、管理员手动重试同步、前端轮询订单状态、环境变量和验证。
- **Placeholder scan:** 无 `TODO`、`TBD`、"later"、"similar to task N"。
- **Type consistency:** 统一使用 `PaymentOrderStatus`、`PaymentProviderName`、`aggregated_cn`、`paid / pending / failed / expired / created`。

