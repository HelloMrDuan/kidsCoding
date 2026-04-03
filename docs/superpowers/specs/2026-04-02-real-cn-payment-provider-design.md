# 首个真实中国大陆聚合支付 Provider 接入设计规格

## 1. 背景与目标

当前项目已经完成中国大陆支付硬化的骨架能力：

- 统一 `PaymentProvider` 抽象
- 统一订单状态 `created / pending / paid / failed / expired`
- 独立支付确认页 `/parent/purchase/success`
- 前端轮询订单状态
- 管理员按订单号手动重试同步支付结果

但当前 `aggregated_cn` 仍然只是占位实现，不能真实发起支付、验证回调或查单。要让首发版本具备真实收款能力，下一步必须接入第一家真实中国大陆聚合支付服务商。

本规格定义首个真实 provider 的接入方案，目标是：

- 保持现有 `PaymentProvider` 架构不变
- 第一家真实 provider 先接 `连连支付`
- 代码继续保持 provider-agnostic，不把平台逻辑写死到连连
- 打通真实下单、二维码支付、webhook 验签、主动查单和管理员补偿链路
- 不把退款、分账、订阅、多商品等能力拉进本次范围

成功标准：

1. 家长在 `PC/平板` 上可以看到真实二维码并完成扫码支付。
2. 支付成功后，服务端可以通过 webhook 或手动重试同步把订单推进到 `paid`。
3. 订单进入 `paid` 后，课程权益由服务端统一发放。
4. 前端页面无需理解连连原始状态，只读取平台统一订单状态。
5. 后续如果更换中国大陆聚合支付服务商，主要变更应集中在 provider 实现层。

---

## 2. 范围

### 2.1 本次纳入范围

- 将 `aggregated_cn` 从占位实现替换为真实的连连支付实现
- 接入真实下单接口
- 接入真实 webhook 验签与状态解析
- 接入真实主动查单接口
- 将连连原始状态映射到平台统一订单状态
- 扩展环境变量与文档，使测试环境和生产环境都能配置真实连连参数
- 为管理员“按订单号重试同步”接入真实查单结果

### 2.2 本次不纳入范围

- 退款
- 分账
- 订阅制会员
- 多商品、多课程包
- 优惠券、促销、折扣码
- 自动对账任务
- 财务报表
- 多 provider 后台切换
- 后台录入支付渠道配置
- 切换为其他中国大陆聚合支付服务商

---

## 3. 服务商选择结论

首个真实 provider 选择 `连连支付`，原因如下：

- 面向中国大陆家庭用户，覆盖方向与首发目标一致
- 官方产品体系适合继续承接课程平台后续的订单、结算与账户扩展
- 相比继续把系统绑死在 `Stripe`，更符合当前首发场景
- 相比完全重写支付流程，复用现有 `PaymentProvider` 骨架成本更低

这里的关键原则不是“平台永久绑定连连”，而是“第一家真实 provider 先用连连验证首发收款闭环”。

---

## 4. 架构原则

### 4.1 保留平台支付骨架

以下能力保持不变：

- `PaymentProvider` 接口
- `orders` 为平台订单真相来源
- `entitlements` 由订单服务统一发放
- `/parent/purchase/success` 作为支付确认页
- `/api/payments/orders/[orderId]` 作为统一订单状态查询接口
- `/api/admin/payments/orders/[orderId]/reconcile` 作为管理员补偿入口

### 4.2 替换真实 provider 实现

本次只替换 `aggregated-cn-provider.ts` 的真实实现，并补必要的环境配置与测试。

前端不直接感知“连连支付”这个概念，仍然只读取：

- 创建订单结果
- 二维码信息
- 平台统一订单状态

### 4.3 保持 provider-agnostic

即使第一家接入的是连连，代码层也不改成：

- `LianLianProvider` 成为平台默认抽象
- 前端页面直接依赖连连字段
- 数据库订单状态直接使用连连原始状态

所有平台层仍然保持：

- 统一 provider 名称：`aggregated_cn`
- 统一订单状态模型
- 连连原始状态只保存在 provider 侧字段中

---

## 5. 真实接入的能力边界

### 5.1 createPayment

`aggregated_cn.createPayment` 必须替换为真实连连下单逻辑。

输入保持现有统一结构：

- `orderId`
- `userId`
- `productCode`
- `title`
- `amountCny`
- `successUrl`

输出仍然返回平台统一结构：

- `provider: 'aggregated_cn'`
- `providerOrderId`
- `status`
- `qrCodeValue`
- `qrExpiresAt`

要求：

- 下单成功时返回真实二维码内容或二维码链接
- 平台状态映射为 `pending`
- 记录 provider 订单号，供 webhook 与查单使用

### 5.2 parseWebhook

`aggregated_cn.parseWebhook` 必须替换为真实连连回调解析。

要求：

- 读取原始回调请求体
- 验签
- 解析 provider 订单号
- 提取 provider 原始状态
- 映射为平台统一状态

只有验签通过，才允许推进订单状态更新。

### 5.3 queryPayment

`aggregated_cn.queryPayment` 必须替换为真实连连查单逻辑。

用途：

- 管理员按订单号手动重试同步
- webhook 延迟或丢失时的补偿
- 后续支付问题排查

返回值仍然保持平台统一结构，不向上层泄露连连原始字段细节。

---

## 6. 状态映射规则

平台内部只保留以下订单状态：

- `created`
- `pending`
- `paid`
- `failed`
- `expired`

连连原始状态映射规则：

- 成功拿到二维码、等待支付
  - 映射为 `pending`
- 明确支付成功
  - 映射为 `paid`
- 明确支付失败
  - 映射为 `failed`
- 二维码或订单过期
  - 映射为 `expired`

如果连连存在更多细分状态，平台也不直接透传到前端，而是：

- 将原始值写入 `provider_status`
- 必要时把关键摘要写入 `last_error_message` 或 provider 结果摘要字段

这样可以保证前端状态模型稳定，不被第三方服务商状态爆炸拖乱。

---

## 7. 安全边界

### 7.1 webhook 必须验签

首发 webhook 必须严格验签，规则如下：

- 验签失败直接拒绝
- 验签失败不得更新订单状态
- 验签失败不得发放课程权益

### 7.2 主动查单不依赖 webhook

管理员“重试同步”走 `queryPayment` 主动查单逻辑，不依赖原始回调请求。

两条链路分工如下：

- `webhook`
  - 被动接收
  - 必须验签
- `queryPayment`
  - 主动查询
  - 用于补偿和排错

### 7.3 权益发放规则不变

只有订单被服务端确认进入 `paid`，才允许写入或激活 `entitlements`。

任何页面跳转、二维码展示或第三方前端提示，都不能直接触发权益发放。

---

## 8. 环境配置策略

### 8.1 保持抽象前缀

即使首个 provider 是连连，环境变量仍继续使用抽象前缀，避免未来切换服务商时大面积重命名：

- `CN_PAYMENT_PROVIDER_BASE_URL`
- `CN_PAYMENT_PROVIDER_APP_ID`
- `CN_PAYMENT_PROVIDER_APP_SECRET`
- `CN_PAYMENT_PROVIDER_WEBHOOK_SECRET`

### 8.2 按真实接入需要补充字段

如果连连真实接口需要额外参数，可以新增少量必要字段，但必须满足：

- 为真实接入所必需
- 名称仍保持 provider-agnostic 风格
- 不提前为未来所有可能需求堆字段

### 8.3 env check 要求

`env:check` 和 `env:check:prod` 必须继续按以下原则工作：

- 当默认 provider 为 `aggregated_cn` 时，连连所需关键配置缺失则报错
- 开发环境允许缺失并提示功能降级
- 生产环境缺失关键配置时必须失败

---

## 9. 对现有代码的改动边界

### 9.1 保持不动的部分

- `/parent/purchase`
- `/parent/purchase/success`
- `/api/payments/orders/[orderId]`
- `createPaymentOrderService`
- `entitlements` 发放流程
- 管理员重试同步的使用方式

### 9.2 重点修改的部分

- `apps/web/src/features/billing/providers/aggregated-cn-provider.ts`
- 支付 provider 相关测试
- webhook 路由对真实结果的接入
- 环境配置与 README

### 9.3 Stripe 的地位

`Stripe` 继续保留为一个 provider 实现，用于：

- 兼容现有代码
- 测试环境回退
- 后续并存扩展

但首发真实中国大陆支付路径默认走 `aggregated_cn`。

---

## 10. 测试策略

### 10.1 单元测试

至少覆盖：

- 连连原始状态到平台状态的映射
- 验签通过与失败的分支
- 下单结果到统一支付结果的转换
- 查单结果到统一订单状态的转换

### 10.2 接口测试

至少覆盖：

- webhook 命中后订单状态正确更新
- 验签失败时订单不会被更新
- 管理员重试同步可以把已支付订单补成 `paid`
- 管理员重试同步在未支付时只刷新状态不发权益

### 10.3 前端 E2E

前端 E2E 继续保持 mock 统一订单状态，不直接绑真实连连接口。

首发 E2E 关注点仍然是：

- 购买页进入支付确认流
- 成功确认页轮询到 `paid`
- 正式课程被解锁

### 10.4 预发布联调

真实连连接入后的联调策略：

- 本地和测试环境可继续用 mock 或沙箱能力
- 预发布环境验证真实下单、真实回调和真实查单
- 线上前至少人工验证一次：
  - 下单
  - 回调
  - 查单
  - 解锁
  - 管理员重试同步

---

## 11. 上线验收标准

上线前必须满足：

1. 家长可以在购买页看到真实二维码。
2. 扫码支付后，订单可通过 webhook 或管理员重试同步推进到 `paid`。
3. 订单 `paid` 后，`entitlements` 正确写入并解锁课程。
4. 成功确认页不需要理解连连原始状态，也能正确显示结果。
5. webhook 验签失败时，系统不会错误发放权益。
6. 当前代码仍保留 provider-agnostic 结构，不被连连专有逻辑污染平台层。

---

## 12. 实施顺序建议

建议按以下顺序实现：

1. 明确连连真实接口需要的请求与签名规则
2. 替换 `aggregated_cn.createPayment`
3. 替换 `aggregated_cn.parseWebhook`
4. 替换 `aggregated_cn.queryPayment`
5. 补齐状态映射测试与接口测试
6. 更新环境检查、`.env.example` 和 README
7. 在预发布环境完成真实联调

---

## 13. 自检结论

本规格已完成自检，结论如下：

- 无 `TODO`、`TBD` 或“实现时再决定”占位语句
- 范围只收首个真实 provider 接入，没有把退款、分账、订阅等后续能力混入
- 与现有中国大陆支付硬化规格保持一致，没有改动既有订单状态模型
- 已明确哪些层保持不动，哪些层替换为真实实现，避免实施时误伤前端流程
