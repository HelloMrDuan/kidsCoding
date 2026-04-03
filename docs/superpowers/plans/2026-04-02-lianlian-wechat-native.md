# 连连 `WECHAT_NATIVE` 真实接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `aggregated_cn` 的当前测试级真实骨架替换为连连 `WECHAT_NATIVE` 的真实微信扫码下单、严格验签 webhook 和真实查单补偿。

**Architecture:** 保持现有统一支付骨架与前端成功确认页不变，只把 `aggregated-cn-provider.ts` 接到连连官方 `WECHAT_NATIVE` 接口组合上，并通过 provider 单测、接口测试和现有 E2E 验证来收口。前端继续只读取平台统一订单状态，二维码由前端根据 `code_url` 渲染。

**Tech Stack:** Next.js App Router、TypeScript、Supabase、Vitest、Playwright、现有 `PaymentProvider` 抽象、连连开放平台 HTTP 接口。

---

## 文件结构与职责

**重点修改文件**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
  - 接入连连 `WECHAT_NATIVE` 统一创单、验签和查单。
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
  - 锁定真实微信扫码请求映射、回调验签和查单映射。
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.test.ts`
  - 补齐连连 webhook 命中后的接口行为验证。
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts`
  - 补齐管理员补偿的真实查单路径验证。
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\lib\env.ts`
  - 如果连连微信扫码需要额外最小配置，在这里补读取 helper。
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\env-check-core.mjs`
  - 增加 `WECHAT_NATIVE` 实际所需字段的生产校验。
- Modify: `D:\pyprograms\kidsCoding\apps\web\.env.example`
  - 补齐连连微信扫码必需变量。
- Modify: `D:\pyprograms\kidsCoding\apps\web\README.md`
  - 补齐微信扫码联调、二维码展示和 webhook 要求。

**保持不动**

- `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\page.tsx`
- `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\success\page.tsx`
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\purchase-success-view.tsx`
- `D:\pyprograms\kidsCoding\apps\web\src\features\billing\purchase-checkout-card.tsx`

这些文件不需要理解连连协议字段，只继续消费统一支付结果与 `code_url`。

---

### Task 1: 锁定 `WECHAT_NATIVE` 下单请求和结果映射

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`

- [ ] **Step 1: 在 provider 测试里增加 `WECHAT_NATIVE` 下单请求断言**

```ts
it('sends a WECHAT_NATIVE create order request to LianLian', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        code: '0000',
        order_no: 'll-001',
        code_url: 'weixin://wxpay/mock-qrcode',
        expire_at: '2026-04-03T10:00:00Z',
      }),
      { status: 200 },
    ),
  )

  const provider = createAggregatedCnProvider({
    env: {
      baseUrl: 'https://openapi.lianlianpay.example.com',
      appId: 'll-app-id',
      appSecret: 'll-app-secret',
      webhookSecret: 'll-webhook-secret',
    },
    fetchImpl,
  })

  await provider.createPayment({
    orderId: 'order_1',
    userId: 'user_1',
    productCode: 'launch_pack',
    title: '启蒙课程包',
    amountCny: 19900,
    successUrl: 'https://kids.example.com/parent/purchase/success?order=order_1',
  })

  expect(fetchImpl).toHaveBeenCalledWith(
    'https://openapi.lianlianpay.example.com/payments',
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('WECHAT_NATIVE'),
    }),
  )
})
```

- [ ] **Step 2: 在同一测试文件里补 `code_url` 映射断言**

```ts
it('maps LianLian code_url to qrCodeValue', async () => {
  const provider = createAggregatedCnProvider({
    fetchImpl: vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: '0000',
          order_no: 'll-001',
          code_url: 'weixin://wxpay/mock-qrcode',
          expire_at: '2026-04-03T10:00:00Z',
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

  expect(result.status).toBe('pending')
  expect(result.qrCodeValue).toBe('weixin://wxpay/mock-qrcode')
})
```

- [ ] **Step 3: 运行 provider 单测确认先失败**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts --maxWorkers=1
```

Expected:

```text
FAIL
```

- [ ] **Step 4: 提交测试红灯**

```bash
git add apps/web/src/features/billing/providers/aggregated-cn-provider.test.ts
git commit -m "Add LianLian WeChat createPayment contract tests"
```

---

### Task 2: 实现真实 `WECHAT_NATIVE` 下单请求

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`

- [ ] **Step 1: 在 provider 实现里构造 `WECHAT_NATIVE` 下单请求**

```ts
const payload = {
  merchant_order_no: input.orderId,
  payment_method: 'WECHAT_NATIVE',
  amount: input.amountCny,
  subject: input.title,
  notify_url: `${getRequiredEnv('NEXT_PUBLIC_APP_URL')}/api/payments/providers/aggregated_cn/webhook`,
  return_url: input.successUrl,
}
```

- [ ] **Step 2: 把连连响应里的 `code_url` 映射到统一返回值**

```ts
const payload = (await response.json()) as {
  code?: string
  order_no?: string
  code_url?: string
  expire_at?: string
}

if (payload.code !== '0000' || !payload.order_no || !payload.code_url) {
  throw new Error('create-payment-failed')
}

return {
  provider: 'aggregated_cn',
  providerOrderId: payload.order_no,
  status: 'pending',
  qrCodeValue: payload.code_url,
  qrExpiresAt: payload.expire_at ?? null,
}
```

- [ ] **Step 3: 重新运行 provider 单测**

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
git commit -m "Implement LianLian WeChat createPayment"
```

---

### Task 3: 锁定并实现连连 webhook 严格验签

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.test.ts`

- [ ] **Step 1: 在 provider 测试里补充验签失败断言**

```ts
it('rejects LianLian webhook when signature is invalid', async () => {
  const provider = createAggregatedCnProvider({
    verifySignature: vi.fn().mockReturnValue(false),
  })

  const request = new Request('https://kids.example.com/api/payments/providers/aggregated_cn/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-ll-sign': 'invalid-signature',
    },
    body: JSON.stringify({
      order_no: 'll-001',
      trade_status: 'SUCCESS',
    }),
  })

  await expect(provider.parseWebhook(request)).rejects.toThrow('invalid-signature')
})
```

- [ ] **Step 2: 在 webhook 路由测试里补充“验签失败时不更新订单”**

```ts
it('does not update order when webhook verification fails', async () => {
  mocks.resolvePaymentProvider.mockReturnValue({
    createPayment: vi.fn(),
    parseWebhook: vi.fn().mockRejectedValue(new Error('invalid-signature')),
    queryPayment: vi.fn(),
  })

  const response = await POST(
    new Request('https://kids.example.com/api/payments/providers/aggregated_cn/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
    { params: Promise.resolve({ provider: 'aggregated_cn' }) },
  )

  expect(response.status).toBe(500)
})
```

- [ ] **Step 3: 运行 provider 与 webhook 路由测试确认先失败**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts src\app\api\payments\providers\[provider]\webhook\route.test.ts --maxWorkers=1
```

Expected:

```text
FAIL
```

- [ ] **Step 4: 按连连官方签名规则补验签实现**

```ts
async parseWebhook(request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-ll-sign') ?? ''

  if (!verifyLianLianSignature(rawBody, signature, env.webhookSecret)) {
    throw new Error('invalid-signature')
  }

  const payload = JSON.parse(rawBody) as {
    order_no?: string
    trade_status?: string
  }

  return {
    providerOrderId: payload.order_no ?? '',
    providerStatus: payload.trade_status ?? 'UNKNOWN',
    status: mapProviderStatus(payload.trade_status ?? 'failed'),
  }
}
```

- [ ] **Step 5: 重新运行 provider 与 webhook 路由测试**

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
git add apps/web/src/features/billing/providers/aggregated-cn-provider.ts apps/web/src/features/billing/providers/aggregated-cn-provider.test.ts apps/web/src/app/api/payments/providers/[provider]/webhook/route.test.ts
git commit -m "Implement strict LianLian webhook verification"
```

---

### Task 4: 锁定并实现真实连连查单

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts`

- [ ] **Step 1: 在 provider 测试里补 `SUCCESS` 查单映射**

```ts
it('maps LianLian query result SUCCESS to paid', async () => {
  const provider = createAggregatedCnProvider({
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

  expect(result.providerStatus).toBe('SUCCESS')
  expect(result.status).toBe('paid')
})
```

- [ ] **Step 2: 在管理员补偿测试里锁定已支付订单会被补发权益**

```ts
expect(entitlementUpsert).toHaveBeenCalledWith(
  {
    user_id: 'user-1',
    product_code: 'launch-story-pack',
    status: 'active',
  },
  { onConflict: 'user_id,product_code' },
)
```

- [ ] **Step 3: 运行 provider 与补偿测试确认先失败**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts --maxWorkers=1
```

Expected:

```text
FAIL
```

- [ ] **Step 4: 实现真实查单请求**

```ts
async queryPayment(input) {
  const response = await fetchImpl(
    `${env.baseUrl}/payments/${input.providerOrderId || input.orderId}`,
    {
      method: 'GET',
      headers: {
        'x-ll-app-id': env.appId,
      },
    },
  )

  if (!response.ok) {
    throw new Error('query-payment-failed')
  }

  const payload = (await response.json()) as {
    code?: string
    trade_status?: string
  }

  if (payload.code !== '0000') {
    throw new Error('query-payment-failed')
  }

  return {
    providerStatus: payload.trade_status ?? 'failed',
    status: mapProviderStatus(payload.trade_status ?? 'failed'),
  }
}
```

- [ ] **Step 5: 重新运行 provider 与补偿测试**

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
git add apps/web/src/features/billing/providers/aggregated-cn-provider.ts apps/web/src/features/billing/providers/aggregated-cn-provider.test.ts apps/web/src/app/api/admin/payments/orders/[orderId]/reconcile/route.test.ts
git commit -m "Implement LianLian WeChat query reconciliation"
```

---

### Task 5: 补齐环境模板和联调文档

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\lib\env.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\env-check-core.mjs`
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\env-check.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\.env.example`
- Modify: `D:\pyprograms\kidsCoding\apps\web\README.md`
- Test: `D:\pyprograms\kidsCoding\apps\web\scripts\env-check.test.ts`

- [ ] **Step 1: 在 env-check 测试里补生产缺项失败断言**

```ts
it('fails in production when LianLian WeChat webhook secret is missing', () => {
  const report = createEnvCheckReport({
    mode: 'production',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb-publishable',
      SUPABASE_SERVICE_ROLE_KEY: 'sb-service',
      NEXT_PUBLIC_APP_URL: 'https://kidscoding.example.com',
      PAYMENT_PROVIDER_DEFAULT: 'aggregated_cn',
      CN_PAYMENT_PROVIDER_BASE_URL: 'https://openapi.example.com',
      CN_PAYMENT_PROVIDER_APP_ID: 'll-app-id',
      CN_PAYMENT_PROVIDER_APP_SECRET: 'll-app-secret',
      CN_PAYMENT_PROVIDER_WEBHOOK_SECRET: '',
      AI_PROVIDER_MODE: 'openai_compatible',
      AI_PROVIDER_PRIMARY_NAME: 'OpenAI',
      AI_PROVIDER_PRIMARY_BASE_URL: 'https://api.openai.com/v1',
      AI_PROVIDER_PRIMARY_API_KEY: 'sk-primary',
      AI_PROVIDER_PRIMARY_MODELS: 'gpt-5-mini',
    },
  })

  expect(report.groups.find((group) => group.id === 'cn-payment')?.status).toBe('FAIL')
})
```

- [ ] **Step 2: 补 `.env.example` 与 README**

```env
PAYMENT_PROVIDER_DEFAULT=aggregated_cn
CN_PAYMENT_PROVIDER_BASE_URL=
CN_PAYMENT_PROVIDER_APP_ID=
CN_PAYMENT_PROVIDER_APP_SECRET=
CN_PAYMENT_PROVIDER_WEBHOOK_SECRET=
```

```md
### 连连微信扫码联调

当前真实中国大陆支付链路固定为连连 `WECHAT_NATIVE`：

1. 配置连连微信扫码参数
2. 确认 webhook 地址可被连连访问
3. 预发布环境完成一次真实微信扫码、回调、查单和管理员补偿联调
```

- [ ] **Step 3: 运行 env-check 测试**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run scripts\env-check.test.ts src\lib\env.test.ts --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/lib/env.ts apps/web/scripts/env-check-core.mjs apps/web/scripts/env-check.test.ts apps/web/.env.example apps/web/README.md
git commit -m "Document LianLian WeChat runtime requirements"
```

---

### Task 6: 全量验证与收口

**Files:**
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\providers\aggregated-cn-provider.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\api\payments\providers\[provider]\webhook\route.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\payment-success.spec.ts`

- [ ] **Step 1: 运行针对性的 provider 与接口测试**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\billing\providers\aggregated-cn-provider.test.ts src\app\api\payments\providers\[provider]\webhook\route.test.ts src\app\api\admin\payments\orders\[orderId]\reconcile\route.test.ts src\app\api\payments\orders\[orderId]\route.test.ts --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 2: 运行全量单测**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run --maxWorkers=1
```

Expected:

```text
PASS
```

- [ ] **Step 3: 运行 lint、build、env-check**

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

- [ ] **Step 4: 重启本地 3100 服务后跑支付相关 E2E**

Run:

```bash
Stop-Process -Id <existing-3100-pid> -Force
cmd /c node_modules\.bin\next.cmd start --hostname 127.0.0.1 --port 3100
cmd /c "set PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3100 && node_modules\.bin\playwright.cmd test tests/e2e/payment-success.spec.ts tests/e2e/trial-lock-purchase.spec.ts"
```

Expected:

```text
PASS
```

- [ ] **Step 5: 提交最终收口**

```bash
git add apps/web/src/features/billing/providers/aggregated-cn-provider.ts apps/web/src/features/billing/providers/aggregated-cn-provider.test.ts apps/web/src/app/api/payments/providers/[provider]/webhook/route.test.ts apps/web/src/app/api/admin/payments/orders/[orderId]/reconcile/route.test.ts apps/web/src/lib/env.ts apps/web/scripts/env-check-core.mjs apps/web/scripts/env-check.test.ts apps/web/.env.example apps/web/README.md
git commit -m "Integrate LianLian WeChat Native payments"
```

---

## 自检

- **Spec coverage:** 规格要求的 `WECHAT_NATIVE` 真实下单、严格验签、真实查单、二维码策略和联调文档都已对应到任务。
- **Placeholder scan:** 无 `TODO`、`TBD`、"implement later"、"similar to task N" 之类占位语句。
- **Type consistency:** 全计划统一使用 `aggregated_cn`、`WECHAT_NATIVE`、统一订单状态 `created / pending / paid / failed / expired`。
