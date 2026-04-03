# 首个真实中国大陆聚合支付 Provider 接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前占位的 `aggregated_cn` 支付实现替换为真实的连连支付 provider，打通真实下单、二维码支付、webhook 验签、主动查单和管理员补偿同步。

**Architecture:** 保持现有 `PaymentProvider`、统一订单状态和成功确认页不变，只替换 `aggregated-cn-provider.ts` 的真实实现，并通过环境变量与测试层把连连接入挂到既有支付骨架上。前端继续只读取平台统一订单状态，服务端继续由订单服务层决定权益发放。

**Tech Stack:** Next.js App Router、TypeScript、Supabase、Vitest、Playwright、Node 脚本、现有 billing/payment 抽象。

---

## 文件结构与职责

**新增或重点修改文件**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
  - 用真实连连请求替换当前占位实现。
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.ts`
  - 接住真实 `aggregated_cn` webhook 结果并走订单服务。
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.ts`
  - 让管理员重试同步走真实查单结果。
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\checkout\route.ts`
  - 保持统一下单入口，但兼容真实 provider 返回值。
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\lib\env.ts`
  - 增加连连真实接入所需环境读取。
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\env-check-core.mjs`
  - 增加真实连连配置校验规则。
- Modify: `D:\pyprograms\kidsCoding\apps\web\.env.example`
  - 补真实连连接口需要的环境变量模板。
- Modify: `D:\pyprograms\kidsCoding\apps\web\README.md`
  - 补真实连连配置、联调和 webhook 说明。

**测试文件**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-provider-registry.test.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\orders\[orderId]\route.test.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.test.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts`
- Keep: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\payment-success.spec.ts`

---

### Task 1: 固化连连环境配置与 provider 入口

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\lib\env.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\env-check-core.mjs`
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\env-check.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\.env.example`
- Modify: `D:\pyprograms\kidsCoding\apps\web\README.md`
- Test: `D:\pyprograms\kidsCoding\apps\web\scripts\env-check.test.ts`

- [ ] **Step 1: 先写环境检查失败用例**

```ts
it('requires CN provider signing config in production when aggregated_cn is default', () => {
  const result = runEnvCheck({
    NODE_ENV: 'production',
    PAYMENT_PROVIDER_DEFAULT: 'aggregated_cn',
    CN_PAYMENT_PROVIDER_BASE_URL: 'https://openapi.example.com',
    CN_PAYMENT_PROVIDER_APP_ID: 'app_123',
    CN_PAYMENT_PROVIDER_APP_SECRET: '',
    CN_PAYMENT_PROVIDER_WEBHOOK_SECRET: '',
  })

  expect(result.exitCode).toBe(1)
  expect(result.output).toContain('CN PAYMENT')
  expect(result.output).toContain('CN_PAYMENT_PROVIDER_APP_SECRET')
  expect(result.output).toContain('CN_PAYMENT_PROVIDER_WEBHOOK_SECRET')
})
```

- [ ] **Step 2: 运行单测确认先失败**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run scripts\env-check.test.ts --maxWorkers=1
```

Expected:

```text
FAIL
```

- [ ] **Step 3: 在 env 与检查脚本里补齐真实连连配置读取**

```ts
export function getCnPaymentProviderEnv() {
  return {
    baseUrl: process.env.CN_PAYMENT_PROVIDER_BASE_URL?.trim() ?? '',
    appId: process.env.CN_PAYMENT_PROVIDER_APP_ID?.trim() ?? '',
    appSecret: process.env.CN_PAYMENT_PROVIDER_APP_SECRET?.trim() ?? '',
    webhookSecret:
      process.env.CN_PAYMENT_PROVIDER_WEBHOOK_SECRET?.trim() ?? '',
  }
}
```

```js
function buildCnPaymentGroup(env) {
  const provider = env.PAYMENT_PROVIDER_DEFAULT?.trim() ?? ''
  const checks = []

  checks.push(
    validatePresence(
      'PAYMENT_PROVIDER_DEFAULT',
      provider,
      'Checkout cannot resolve the default payment provider',
      'Set PAYMENT_PROVIDER_DEFAULT in .env.local',
      provider === 'aggregated_cn',
    ),
  )

  if (provider === 'aggregated_cn') {
    checks.push(
      validateUrl(
        'CN_PAYMENT_PROVIDER_BASE_URL',
        env.CN_PAYMENT_PROVIDER_BASE_URL,
        'China mainland aggregate payment requests cannot be sent',
        'Set CN_PAYMENT_PROVIDER_BASE_URL in .env.local',
        true,
      ),
    )
    checks.push(
      validatePresence(
        'CN_PAYMENT_PROVIDER_APP_ID',
        env.CN_PAYMENT_PROVIDER_APP_ID,
        'Aggregate payment app identity is missing',
        'Set CN_PAYMENT_PROVIDER_APP_ID in .env.local',
        true,
      ),
    )
    checks.push(
      validatePresence(
        'CN_PAYMENT_PROVIDER_APP_SECRET',
        env.CN_PAYMENT_PROVIDER_APP_SECRET,
        'Aggregate payment requests cannot be authenticated',
        'Set CN_PAYMENT_PROVIDER_APP_SECRET in .env.local',
        true,
      ),
    )
    checks.push(
      validatePresence(
        'CN_PAYMENT_PROVIDER_WEBHOOK_SECRET',
        env.CN_PAYMENT_PROVIDER_WEBHOOK_SECRET,
        'Aggregate payment webhooks cannot be verified',
        'Set CN_PAYMENT_PROVIDER_WEBHOOK_SECRET in .env.local',
        true,
      ),
    )
  }

  return buildGroup('CN PAYMENT', checks)
}
```

- [ ] **Step 4: 更新 `.env.example` 与 README**

```env
PAYMENT_PROVIDER_DEFAULT=aggregated_cn
CN_PAYMENT_PROVIDER_BASE_URL=
CN_PAYMENT_PROVIDER_APP_ID=
CN_PAYMENT_PROVIDER_APP_SECRET=
CN_PAYMENT_PROVIDER_WEBHOOK_SECRET=
```

```md
### 中国大陆聚合支付

当 `PAYMENT_PROVIDER_DEFAULT=aggregated_cn` 时，至少需要：

- `CN_PAYMENT_PROVIDER_BASE_URL`
- `CN_PAYMENT_PROVIDER_APP_ID`
- `CN_PAYMENT_PROVIDER_APP_SECRET`
- `CN_PAYMENT_PROVIDER_WEBHOOK_SECRET`

本项目当前首个真实 provider 为连连支付实现，但变量名保持 provider-agnostic。
```

- [ ] **Step 5: 重新运行环境检查单测**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run scripts\env-check.test.ts --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 6: 提交**

```bash
git add apps/web/src/lib/env.ts apps/web/scripts/env-check-core.mjs apps/web/scripts/env-check.test.ts apps/web/.env.example apps/web/README.md
git commit -m "Add real CN payment provider env requirements"
```

---

### Task 2: 先用测试锁死真实 aggregated_cn provider 契约

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\payment-provider-registry.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`

- [ ] **Step 1: 写 provider 单测，先锁定 createPayment、parseWebhook、queryPayment 的统一行为**

```ts
describe('aggregatedCnProvider', () => {
  it('maps successful createPayment response to pending qr payment', async () => {
    const provider = createAggregatedCnProvider({
      baseUrl: 'https://openapi.example.com',
      appId: 'app_123',
      appSecret: 'secret_123',
      webhookSecret: 'whsec_123',
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: '0000',
            order_no: 'll-001',
            pay_url: 'https://pay.example.com/qr/ll-001',
            expire_at: '2026-04-02T10:00:00Z',
          }),
          { status: 200 },
        ),
      ),
    })

    const result = await provider.createPayment({
      orderId: 'order_1',
      userId: 'user_1',
      productCode: 'launch_pack',
      title: '启蒙课程包',
      amountCny: 19900,
      successUrl: 'https://kids.example.com/parent/purchase/success?order=order_1',
    })

    expect(result.provider).toBe('aggregated_cn')
    expect(result.status).toBe('pending')
    expect(result.providerOrderId).toBe('ll-001')
    expect(result.qrCodeValue).toBe('https://pay.example.com/qr/ll-001')
  })

  it('rejects webhook when signature is invalid', async () => {
    const provider = createAggregatedCnProvider({
      baseUrl: 'https://openapi.example.com',
      appId: 'app_123',
      appSecret: 'secret_123',
      webhookSecret: 'whsec_123',
    })

    const request = new Request('https://kids.example.com/api/payments/providers/aggregated_cn/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-cn-pay-signature': 'invalid',
      },
      body: JSON.stringify({
        order_no: 'll-001',
        trade_status: 'SUCCESS',
      }),
    })

    await expect(provider.parseWebhook(request)).rejects.toThrow('invalid-signature')
  })
})
```

- [ ] **Step 2: 运行 provider 单测确认先失败**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts --maxWorkers=1
```

Expected:

```text
FAIL
```

- [ ] **Step 3: 在 registry 测试里锁定 `aggregated_cn` 仍可正常解析**

```ts
it('resolves aggregated_cn provider', () => {
  const provider = resolvePaymentProvider('aggregated_cn')
  expect(provider).toBeDefined()
  expect(typeof provider.createPayment).toBe('function')
  expect(typeof provider.parseWebhook).toBe('function')
  expect(typeof provider.queryPayment).toBe('function')
})
```

- [ ] **Step 4: 运行 registry 与 provider 测试确认边界都锁住**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\payment-provider-registry.test.ts src\features\billing\providers\aggregated-cn-provider.test.ts --maxWorkers=1
```

Expected:

```text
FAIL
```

- [ ] **Step 5: 提交测试骨架**

```bash
git add apps/web/src/features/billing/providers/aggregated-cn-provider.test.ts apps/web/src/features/billing/payment-provider-registry.test.ts
git commit -m "Add tests for real CN payment provider contract"
```

---

### Task 3: 实现真实 `createPayment`

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`

- [ ] **Step 1: 在 provider 测试里加下单失败分支**

```ts
it('throws when createPayment returns a provider error', async () => {
  const provider = createAggregatedCnProvider({
    baseUrl: 'https://openapi.example.com',
    appId: 'app_123',
    appSecret: 'secret_123',
    webhookSecret: 'whsec_123',
    fetchImpl: vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: '1001',
          message: 'sign error',
        }),
        { status: 200 },
      ),
    ),
  })

  await expect(
    provider.createPayment({
      orderId: 'order_1',
      userId: 'user_1',
      productCode: 'launch_pack',
      title: '启蒙课程包',
      amountCny: 19900,
      successUrl: 'https://kids.example.com/parent/purchase/success?order=order_1',
    }),
  ).rejects.toThrow('create-payment-failed')
})
```

- [ ] **Step 2: 实现最小真实下单逻辑**

```ts
export function createAggregatedCnProvider(deps?: Partial<AggregatedCnProviderDeps>): PaymentProvider {
  const env = deps?.env ?? getCnPaymentProviderEnv()
  const fetchImpl = deps?.fetchImpl ?? fetch

  return {
    async createPayment(input) {
      const payload = {
        merchant_order_no: input.orderId,
        app_id: env.appId,
        amount: input.amountCny,
        subject: input.title,
        notify_url: `${getRequiredEnv('NEXT_PUBLIC_APP_URL')}/api/payments/providers/aggregated_cn/webhook`,
        return_url: input.successUrl,
      }

      const response = await fetchImpl(`${env.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: buildCnPaymentAuthorization(env.appId, env.appSecret, payload),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('create-payment-failed')
      }

      const json = (await response.json()) as {
        code?: string
        order_no?: string
        pay_url?: string
        expire_at?: string
      }

      if (json.code !== '0000' || !json.order_no || !json.pay_url) {
        throw new Error('create-payment-failed')
      }

      return {
        provider: 'aggregated_cn',
        providerOrderId: json.order_no,
        status: 'pending',
        qrCodeValue: json.pay_url,
        qrExpiresAt: json.expire_at ?? null,
      }
    },
```

- [ ] **Step 3: 运行 provider 单测确认下单逻辑通过**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/features/billing/providers/aggregated-cn-provider.ts apps/web/src/features/billing/providers/aggregated-cn-provider.test.ts
git commit -m "Implement real CN payment createPayment flow"
```

---

### Task 4: 实现真实 webhook 验签与状态解析

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.test.ts`

- [ ] **Step 1: 先写 webhook 路由测试**

```ts
it('marks order as paid when aggregated_cn webhook is valid and successful', async () => {
  vi.mocked(resolvePaymentProvider).mockReturnValue({
    createPayment: vi.fn(),
    parseWebhook: vi.fn().mockResolvedValue({
      providerOrderId: 'll-001',
      providerStatus: 'SUCCESS',
      verified: true,
      status: 'paid',
    }),
    queryPayment: vi.fn(),
  })

  const response = await POST(
    new Request('https://kids.example.com/api/payments/providers/aggregated_cn/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
    { params: Promise.resolve({ provider: 'aggregated_cn' }) },
  )

  expect(response.status).toBe(200)
  expect(markOrderPaidSpy).toHaveBeenCalled()
})
```

- [ ] **Step 2: 再写 provider 验签成功与状态映射测试**

```ts
it('maps SUCCESS webhook to paid after signature verification', async () => {
  const body = JSON.stringify({
    order_no: 'll-001',
    trade_status: 'SUCCESS',
  })

  const provider = createAggregatedCnProvider({
    baseUrl: 'https://openapi.example.com',
    appId: 'app_123',
    appSecret: 'secret_123',
    webhookSecret: 'whsec_123',
    verifySignature: vi.fn().mockReturnValue(true),
  })

  const request = new Request('https://kids.example.com/api/payments/providers/aggregated_cn/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })

  const result = await provider.parseWebhook(request)

  expect(result.verified).toBe(true)
  expect(result.providerOrderId).toBe('ll-001')
  expect(result.providerStatus).toBe('SUCCESS')
  expect(result.status).toBe('paid')
})
```

- [ ] **Step 3: 运行 webhook 相关测试确认先失败**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts src\app\api\payments\providers\[provider]\webhook\route.test.ts --maxWorkers=1
```

Expected:

```text
FAIL
```

- [ ] **Step 4: 实现验签、状态映射和 webhook 路由**

```ts
async parseWebhook(request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-cn-pay-signature') ?? ''

  if (!verifyCnPaymentSignature(rawBody, signature, env.webhookSecret)) {
    throw new Error('invalid-signature')
  }

  const payload = JSON.parse(rawBody) as {
    order_no?: string
    trade_status?: string
  }

  return {
    providerOrderId: payload.order_no ?? '',
    providerStatus: payload.trade_status ?? 'UNKNOWN',
    verified: true,
    status: mapCnPaymentStatus(payload.trade_status),
  }
}
```

```ts
if (parsed.status === 'paid') {
  await orderService.markOrderPaid({
    orderId: order.id,
    productCode: order.product_code,
    userId: order.user_id,
    providerStatus: parsed.providerStatus,
  })
} else {
  await admin
    .from('orders')
    .update({
      status: parsed.status,
      provider_status: parsed.providerStatus,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', order.id)
}
```

- [ ] **Step 5: 重新运行 webhook 测试**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts src\app\api\payments\providers\[provider]\webhook\route.test.ts --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 6: 提交**

```bash
git add apps/web/src/features/billing/providers/aggregated-cn-provider.ts apps/web/src/app/api/payments/providers/[provider]/webhook/route.ts apps/web/src/app/api/payments/providers/[provider]/webhook/route.test.ts
git commit -m "Implement CN payment webhook verification"
```

---

### Task 5: 实现真实主动查单与管理员补偿

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts`

- [ ] **Step 1: 先写管理员重试同步测试**

```ts
it('marks order as paid when reconcile query confirms payment', async () => {
  vi.mocked(resolvePaymentProvider).mockReturnValue({
    createPayment: vi.fn(),
    parseWebhook: vi.fn(),
    queryPayment: vi.fn().mockResolvedValue({
      providerStatus: 'SUCCESS',
      status: 'paid',
      paid: true,
      expired: false,
    }),
  })

  const response = await POST(
    new Request('https://kids.example.com/api/admin/payments/orders/order_1/reconcile', {
      method: 'POST',
    }),
    { params: Promise.resolve({ orderId: 'order_1' }) },
  )

  expect(response.status).toBe(200)
  expect(markOrderPaidSpy).toHaveBeenCalled()
})
```

- [ ] **Step 2: 再写 provider 查单测试**

```ts
it('maps queryPayment success to paid', async () => {
  const provider = createAggregatedCnProvider({
    baseUrl: 'https://openapi.example.com',
    appId: 'app_123',
    appSecret: 'secret_123',
    webhookSecret: 'whsec_123',
    fetchImpl: vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: '0000',
          trade_status: 'SUCCESS',
        }),
        { status: 200 },
      ),
    ),
  })

  const result = await provider.queryPayment({
    orderId: 'order_1',
    providerOrderId: 'll-001',
  })

  expect(result.status).toBe('paid')
  expect(result.paid).toBe(true)
  expect(result.providerStatus).toBe('SUCCESS')
})
```

- [ ] **Step 3: 运行补偿相关测试确认先失败**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts --maxWorkers=1
```

Expected:

```text
FAIL
```

- [ ] **Step 4: 实现真实 queryPayment 与 reconcile 路由**

```ts
async queryPayment(input) {
  const response = await fetchImpl(`${env.baseUrl}/payments/${input.providerOrderId ?? input.orderId}`, {
    method: 'GET',
    headers: {
      authorization: buildCnPaymentQueryAuthorization(env.appId, env.appSecret),
    },
  })

  if (!response.ok) {
    throw new Error('query-payment-failed')
  }

  const json = (await response.json()) as {
    code?: string
    trade_status?: string
  }

  if (json.code !== '0000') {
    throw new Error('query-payment-failed')
  }

  const status = mapCnPaymentStatus(json.trade_status)

  return {
    providerStatus: json.trade_status ?? 'UNKNOWN',
    status,
    paid: status === 'paid',
    expired: status === 'expired',
  }
}
```

```ts
if (payment.status === 'paid') {
  await orderService.markOrderPaid({
    orderId: order.id,
    productCode: order.product_code,
    userId: order.user_id,
    providerStatus: payment.providerStatus,
  })
} else {
  await admin
    .from('orders')
    .update({
      status: payment.status,
      provider_status: payment.providerStatus,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', order.id)
}
```

- [ ] **Step 5: 重新运行补偿相关测试**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 6: 提交**

```bash
git add apps/web/src/features/billing/providers/aggregated-cn-provider.ts apps/web/src/app/api/admin/payments/orders/[orderId]/reconcile/route.ts apps/web/src/app/api/admin/payments/orders/[orderId]/reconcile/route.test.ts
git commit -m "Implement CN payment reconcile flow"
```

---

### Task 6: 接上统一下单入口与成功确认流的回归验证

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\checkout\route.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\orders\[orderId]\route.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\payment-success.spec.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\orders\[orderId]\route.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\payment-success.spec.ts`

- [ ] **Step 1: 先补订单状态接口测试，锁定 paid 但未发权益时仍返回 pending**

```ts
it('returns pending when order is paid but entitlement is not active yet', async () => {
  mockOrder({
    id: 'order_paid',
    status: 'paid',
    provider: 'aggregated_cn',
  })
  mockEntitlement(null)

  const response = await GET(
    new Request('https://kids.example.com/api/payments/orders/order_paid'),
    { params: Promise.resolve({ orderId: 'order_paid' }) },
  )
  const payload = await response.json()

  expect(payload.status).toBe('pending')
  expect(payload.unlocked).toBe(false)
})
```

- [ ] **Step 2: 运行订单接口测试确认当前行为未回归**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\app\api\payments\orders\[orderId]\route.test.ts --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 3: 再跑支付成功页 E2E，确认仍然基于统一订单状态稳定通过**

Run:

```bash
cmd /c "set PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3100 && node_modules\.bin\playwright.cmd test tests/e2e/payment-success.spec.ts"
```

Expected:

```text
PASS
```

- [ ] **Step 4: 如果 checkout 需要适配真实 provider 返回结构，做最小实现并复测**

```ts
return NextResponse.json({
  orderId: order.id,
  provider: payment.provider,
  status: payment.status,
  qrCodeValue: payment.qrCodeValue,
  successUrl,
  checkoutUrl: payment.provider === 'stripe' ? payment.qrCodeValue : undefined,
})
```

- [ ] **Step 5: 重新跑订单接口测试与 E2E**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\app\api\payments\orders\[orderId]\route.test.ts --maxWorkers=1
cmd /c "set PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3100 && node_modules\.bin\playwright.cmd test tests/e2e/payment-success.spec.ts tests/e2e/trial-lock-purchase.spec.ts"
```

Expected:

```text
PASS
```

- [ ] **Step 6: 提交**

```bash
git add apps/web/src/app/api/checkout/route.ts apps/web/src/app/api/payments/orders/[orderId]/route.test.ts apps/web/tests/e2e/payment-success.spec.ts
git commit -m "Verify CN payment success flow against unified order status"
```

---

### Task 7: 全量验证与收口

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\README.md`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\payment-success.spec.ts`

- [ ] **Step 1: 补 README 中的真实联调说明**

```md
### 连连支付真实联调

当 `PAYMENT_PROVIDER_DEFAULT=aggregated_cn` 时：

1. 配置连连生产或测试环境参数
2. 确认 webhook 地址可被连连回调访问
3. 在预发布环境验证一次真实下单、回调、查单和管理员重试同步

注意：本地 E2E 仍然使用统一订单状态 mock，不直接依赖真实连连接口。
```

- [ ] **Step 2: 跑针对性的 provider 与接口测试**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts src\app\api\payments\providers\[provider]\webhook\route.test.ts src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts src\app\api\payments\orders\[orderId]\route.test.ts --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 3: 跑全量单测**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 4: 跑 lint、build、env check**

Run:

```bash
cmd /c node_modules\.bin\eslint.cmd .
cmd /c node_modules\.bin\next.cmd build
node .\scripts\env-check.mjs
```

Expected:

```text
PASS
```

- [ ] **Step 5: 跑支付相关 E2E**

Run:

```bash
cmd /c "set PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3100 && node_modules\.bin\playwright.cmd test tests/e2e/payment-success.spec.ts tests/e2e/trial-lock-purchase.spec.ts"
```

Expected:

```text
PASS
```

- [ ] **Step 6: 提交最终收口**

```bash
git add apps/web/README.md apps/web/src/features/billing/providers/aggregated-cn-provider.ts apps/web/src/app/api/payments/providers/[provider]/webhook/route.ts apps/web/src/app/api/admin/payments/orders/[orderId]/reconcile/route.ts apps/web/src/app/api/checkout/route.ts apps/web/src/app/api/payments/orders/[orderId]/route.test.ts apps/web/src/features/billing/providers/aggregated-cn-provider.test.ts apps/web/src/app/api/payments/providers/[provider]/webhook/route.test.ts apps/web/src/app/api/admin/payments/orders/[orderId]/reconcile/route.test.ts apps/web/tests/e2e/payment-success.spec.ts
git commit -m "Integrate real CN payment provider"
```

---

## 自检

- **Spec coverage:** 规格要求的真实下单、二维码、webhook 验签、主动查单、管理员补偿、环境配置、测试边界都已映射到任务。
- **Placeholder scan:** 无 `TODO`、`TBD`、"implement later"、"similar to task N" 之类占位语句。
- **Type consistency:** 全计划统一使用 `aggregated_cn`、统一订单状态 `created / pending / paid / failed / expired`、统一 provider 动作 `createPayment / parseWebhook / queryPayment`。
