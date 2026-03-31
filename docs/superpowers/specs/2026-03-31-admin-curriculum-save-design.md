# Admin Curriculum Save Design

## Goal

把当前 `apps/web` 里的后台从“只读课程校验页”升级为“可编辑、可保存草稿、可单节发布、可回退上一发布版本”的正式运营工具。

本轮只覆盖 `15` 节主线课程，不包含补课小课、语音资源编辑、卡片奖励编辑和多语言管理。

## Scope

### In Scope

- `Supabase` 课程表作为主数据源
- 后台编辑 `15` 节主线课程的：
  - 课程标题
  - 课程目标
  - 每一步标题
  - 每一步说明文案
- 整节课整体保存草稿
- 单节课发布
- 保留最近一次已发布版本并支持一键回退
- 前台优先读取已发布版本，没有发布数据时回退到代码种子
- `/admin` 使用 `Supabase` 自定义 `role/claim` 做管理员鉴权
- 发布前字符安全和必填字段校验

### Out of Scope

- 补课小课编辑
- 语音资源上传或编辑
- 卡片奖励编辑
- 多人协作、审批流、完整版本历史
- 批量整套课程发布
- 直接在线编辑 Blockly 结构或步骤排序

## Data Model

第一版采用双层版本表，避免把草稿和线上状态混在一张表里。

### Draft Table

`lesson_configs`

- `id`
- `phase`
- `mode`
- `sort_order`
- `title`
- `goal`
- `payload`
- `updated_at`
- `updated_by`

用途：

- 存当前草稿
- 后台编辑时优先读取和写入
- 前台不直接读取

### Published Table

新增 `lesson_publications`

- `lesson_id`
- `phase`
- `mode`
- `sort_order`
- `title`
- `goal`
- `payload`
- `published_at`
- `published_by`

用途：

- 存当前线上生效版本
- 孩子端优先读取

### Backup Table

新增 `lesson_publication_backups`

- `lesson_id`
- `title`
- `goal`
- `payload`
- `source_published_at`
- `backed_up_at`
- `backed_up_by`

用途：

- 只保留最近一次已发布版本
- 用于一键回退

### Payload Shape

`payload` 第一版继续保持整节课级别，不拆步骤表：

- `steps`
  - `id`
  - `title`
  - `instruction`
  - `allowedBlocks`
  - `requiredBlockTypes`
- `hintLayers`
- `templateId`

后台首版只允许修改：

- `title`
- `goal`
- `steps[].title`
- `steps[].instruction`

其他字段继续保留并透传，不开放编辑。

## Save, Publish, Rollback Flow

### Load Order

单课编辑页加载时按这条顺序取数据：

1. 先读 `lesson_configs` 草稿
2. 没有草稿时读 `lesson_publications`
3. 还没有发布数据时回退到代码种子 `launchLessons`

### Save Draft

点击“保存草稿”时：

1. 校验结构是否完整
2. 写入 `lesson_configs`
3. 更新 `updated_at` 和 `updated_by`
4. 不影响线上孩子端

### Publish

点击“发布本课”时：

1. 读取当前草稿
2. 对草稿执行发布前校验
3. 读取当前 `lesson_publications`
4. 如果存在已发布版本，先覆盖到 `lesson_publication_backups`
5. 再用当前草稿覆盖 `lesson_publications`
6. 记录 `published_at` 和 `published_by`

### Rollback

点击“回退上一发布版”时：

1. 读取该课最近一次 `lesson_publication_backups`
2. 用备份覆盖 `lesson_publications`
3. 记录新的 `published_at` 和 `published_by`
4. 不自动覆盖当前草稿

原则：

- 草稿和线上始终分离
- 发布影响线上
- 保存草稿不影响线上
- 回退只影响线上

## Admin UI

第一版后台采用 `课程列表页 + 单课编辑页`。

### Course List Page

显示每一节主线课程：

- 编号
- 标题
- 试听课 / 正式课
- 草稿更新时间
- 发布时间
- 是否有未发布改动
- 编辑入口

### Lesson Editor Page

布局分三块：

- 左侧：课程基本信息和当前状态
- 中间：步骤标题与步骤说明编辑区
- 右侧：草稿状态、发布时间、回退入口

核心按钮：

- `保存草稿`
- `发布本课`
- `回退上一发布版`

第一版不做：

- 步骤拖拽排序
- 字段级自动保存
- 多节课批量操作

## Access Control

`/admin` 使用 `Supabase` 自定义 `role/claim` 控制访问。

规则：

- 未登录：跳转登录或绑定页
- 已登录但非管理员：直接拒绝访问
- 管理员：允许进入后台、保存草稿、发布和回退

不使用：

- 邮箱白名单
- 单独 `admin_users` 表

## Frontend Read Strategy

孩子端课程读取顺序：

1. 优先读 `lesson_publications`
2. 如果该课没有发布数据，回退到代码种子 `launchLessons`
3. 前台永远不读取 `lesson_configs`

这样可以保证：

- 线上只消费发布内容
- 草稿改错不会污染线上
- 首发阶段后台未录入完全时仍可用种子内容兜底

## Validation and Safety

### Draft Save Validation

保存草稿时做基础结构校验：

- 标题存在
- 目标存在
- 步骤数组存在
- 每步至少有 `id`

允许草稿存在未发布问题，方便运营分批录入。

### Publish Validation

发布时做硬校验，不通过则拒绝发布：

- 标题不能为空
- 目标不能为空
- 每一步标题不能为空
- 每一步说明不能为空
- 检查异常编码片段
- 检查替换字符和可疑乱码字符

### Chinese Safety

为“上线不乱码”建立三层防线：

1. 后台发布前校验
2. 前台读取时做 payload 结构校验
3. 上线前手动验收主链路：
   - 学习地图
   - 第 1 节试听课
   - 第 3 节试听课
   - 第 4 节正式课锁定
   - 家长查看页
   - 后台课程编辑页

## API and Service Layer

新增或调整的服务层职责：

- `loadLaunchCurriculum`
  - 读取草稿 / 已发布 / 种子回退
- `saveLaunchCurriculumDraft`
  - 保存整节课草稿
- `publishLaunchLesson`
  - 单节课发布
- `rollbackLaunchLessonPublication`
  - 回退到最近一次发布版本
- `validateCourseContent`
  - 发布前校验

路由建议：

- `GET /api/admin/lessons/:id`
- `POST /api/admin/lessons/:id/draft`
- `POST /api/admin/lessons/:id/publish`
- `POST /api/admin/lessons/:id/rollback`

## Testing

### Unit Tests

- 发布校验器
- 课程读取优先级
- 草稿保存 helper
- 发布 helper
- 回退 helper
- 管理员 claim 校验 helper

### Integration Tests

- 保存草稿不影响前台读取
- 发布后前台读取新版本
- 回退后前台恢复上一版

### E2E

- 管理员进入课程列表和单课编辑页
- 修改标题并保存草稿
- 前台仍看到旧线上版本
- 发布后前台显示新标题
- 回退后前台恢复旧标题

## Recommended Implementation Order

1. 增加发布表和备份表迁移
2. 抽出课程仓储层和读取优先级
3. 实现草稿保存 API
4. 实现单节发布和回退 API
5. 接后台课程列表页和单课编辑页
6. 接前台已发布版本读取
7. 补单测、集成测试和 E2E

## Acceptance Criteria

- 管理员可以编辑任意一节主线课程的标题、目标和步骤文案
- 点击“保存草稿”后，后台重新打开仍能看到草稿
- 保存草稿后，孩子端仍显示当前已发布内容
- 点击“发布本课”后，孩子端读取到新版本
- 点击“回退上一发布版”后，孩子端恢复上一版
- 非管理员不能访问 `/admin`
- 无已发布版本时，前台能正确回退到代码种子
- 发布流程能够拦截乱码和空字段
