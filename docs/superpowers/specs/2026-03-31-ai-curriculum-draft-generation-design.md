# AI Curriculum Draft Generation Design

## Goal

为当前 `kidsCoding` 首发课程增加一套 `AI 生成课程草稿` 的能力，用于一次性生成 `15` 节主线课程的文案草稿，并直接写入 `Supabase` 草稿表，供后台管理员逐节审核和发布。

这套能力的核心目标不是“自动上线课程”，而是把内容生产从纯人工撰写升级为：

- AI 负责生成高质量初稿
- 后台管理员负责逐节审核
- 前台只读取已发布版本

## Scope

### In Scope

- 只覆盖现有 `15` 节主线课程
- 先生成整套课程骨架，再逐节生成详情草稿
- AI 只生成文案字段：
  - `title`
  - `goal`
  - `steps[].title`
  - `steps[].instruction`
  - `hintLayers[].copy`
  - `parentAdvice`
- 生成结果直接写入 `lesson_configs` 草稿表
- 后台管理员逐节全文审核
- 管理员人工修改后再发布

### Out of Scope

- 补课小课自动生成
- 卡片文案自动生成
- 测评题自动生成
- 语音脚本自动生成
- 自由创建全新课程结构
- 直接自动发布到线上
- 运营随时输入主题并生成新课程

## Core Principle

第一版必须遵守四条硬约束：

1. AI 只写草稿，不直接发布
2. AI 只改文案字段，不改结构字段
3. 先生成整套课程骨架，再逐节生成详情
4. 后台管理员逐节看全文后才能发布

这四条是“正式上线可用”的前提。

## Data Ownership

### Source of Truth

主数据源仍然是 `Supabase`：

- `lesson_configs`：草稿
- `lesson_publications`：线上已发布版本
- `lesson_publication_backups`：最近一次已发布备份

AI 生成流程只写入 `lesson_configs`。

### Editable vs Locked Fields

#### AI Can Write

- `title`
- `goal`
- `payload.steps[].title`
- `payload.steps[].instruction`
- `payload.hintLayers[].copy`
- `payload.parentAdvice`

#### AI Cannot Write

- `id`
- `phase`
- `mode`
- `sort_order`
- `allowedBlocks`
- `requiredBlockTypes`
- `templateId`
- 步骤数量和步骤顺序
- 其他运行逻辑字段

也就是说，课程结构由产品和开发定义，AI 只填充教学文案。

## Generation Workflow

### Stage 1: Curriculum Skeleton

第一步先生成整套 `15` 节课的骨架，不直接写线上课程字段。

每节课骨架至少包含：

- `lessonId`
- `stage`
- `lessonObjective`
- `newConcepts`
- `dependsOn`
- `childOutcome`
- `difficultyLevel`

用途：

- 约束 15 节课的前后递进
- 避免逐节独立生成导致知识点跳跃
- 给管理员提供“这节课在整套课里的位置”上下文

### Stage 2: Lesson Draft Generation

第二步按骨架逐节生成详细草稿：

- 课程标题
- 课程目标
- 每一步标题
- 每一步说明
- 提示语
- 家长建议

生成时必须同时输入：

- 当前课结构字段
- 当前课骨架约束
- 上一节课骨架摘要
- 下一节课骨架摘要

这样 AI 生成不会只看单节，而是知道整套课上下文。

## Knowledge Progression Rules

AI 生成必须遵守固定递进，不允许自由发散。

### Stage Boundaries

- `第 1-3 节`
  - 试听起步
  - 顺序、动作、对白
  - 完成第一个小故事

- `第 4-8 节`
  - 正式主线前半段
  - 双角色、场景、顺序、简单触发

- `第 9-12 节`
  - 正式主线中后段
  - 互动、节奏、简单分支、故事完整度

- `第 13-15 节`
  - 模板创作阶段
  - 把前面能力组合成独立作品

### Difficulty Control

每节课必须满足：

- 最多只引入 `1` 个新核心点
- 依赖的能力必须已在前课出现
- 文案表达必须符合 `6-8 岁` 理解水平

这三条是生成前和审核时都要检查的规则。

## Admin Review Flow

AI 生成能力作为后台中的一个草稿生产工具，而不是单独的内容工厂。

### Admin Entry Points

后台建议提供两个入口：

- `生成整套课程骨架`
- `生成本课草稿`

第一版不做：

- 一键覆盖生成全部课程详情
- 自动生成后直接批量发布

### Admin Flow

管理员操作流固定为：

1. 生成整套课程骨架
2. 系统保存骨架结果
3. 进入某一节课编辑页
4. 点击“生成本课草稿”
5. AI 覆盖该课草稿中的可写文案字段
6. 管理员逐节阅读全文
7. 必要时人工修改
8. 保存草稿
9. 点击发布本课

### Review UI Requirements

单课审核页需要清楚显示：

- 本课在 `15` 节里的位置
- 本节新增知识点
- 本节依赖前课什么能力
- AI 生成的标题、目标、步骤说明
- 提示语
- 家长建议

管理员审核不是只看文案顺不顺，而是同时判断：

- 知识点位置是否正确
- 难度是否跳跃
- 文案是否适合 `6-8 岁`

## Write Strategy

第一版采用 `单课草稿覆盖写入`：

1. 读取当前 `lesson_configs`
2. 保留所有结构字段
3. 只替换 AI 可写字段
4. 写回 `lesson_configs`

这样做的好处：

- 不会破坏课程运行结构
- 管理员可以逐节重生成
- 某节课生成不好时，只需重做该课

## Validation

### Generation Validation

AI 生成完成后，写库前做基础检查：

- 生成字段完整
- 步骤数量与原结构一致
- 没有写入锁定字段
- 提示语数量与原结构一致

### Publish Validation

草稿生成成功不等于允许发布。

发布时仍沿用后台硬校验：

- 标题不能为空
- 目标不能为空
- 步骤标题不能为空
- 步骤说明不能为空
- 拦截异常编码片段
- 拦截可疑乱码字符

### Review Validation

管理员审核时要重点确认：

- 本节新增知识点是否准确
- 是否重复讲了前面已经掌握的核心点
- 是否提前引入未教过的能力
- 家长建议是否具体、可执行

## Service Layer

建议新增以下能力：

- `generateLaunchCurriculumSkeleton`
  - 生成 15 节课骨架

- `generateLaunchLessonDraft`
  - 生成单节课详细草稿

- `applyGeneratedLessonDraft`
  - 按可写字段规则覆盖 `lesson_configs`

- `validateGeneratedLessonDraft`
  - 确认 AI 输出未越界

### Suggested Routes

- `POST /api/admin/ai/curriculum-skeleton`
- `POST /api/admin/ai/lessons/:id/generate-draft`

这两个路由都要求管理员权限。

## Storage

建议新增一份骨架存储，供后台长期查看和后续重生成使用。

可选方案：

- `launch_curriculum_skeletons`
  - `lesson_id`
  - `stage`
  - `lesson_objective`
  - `new_concepts`
  - `depends_on`
  - `child_outcome`
  - `difficulty_level`
  - `generated_at`

第一版不做复杂版本管理，只保留当前有效骨架。

## Testing

### Unit Tests

- AI 输出字段白名单过滤
- 结构字段锁定校验
- 骨架递进规则校验
- 单课草稿覆盖写入 helper

### Integration Tests

- 生成单课草稿后写入 `lesson_configs`
- 结构字段未被改动
- 管理员可查看生成草稿并人工再保存

### E2E

- 管理员生成课程骨架
- 管理员生成某一节草稿
- 后台看到生成结果
- 保存草稿后前台仍显示旧已发布版本
- 发布后前台读取新文案

## Acceptance Criteria

- 能为现有 `15` 节主线课程生成整套骨架
- 能按骨架逐节生成详细文案草稿
- AI 生成只改文案字段，不改结构字段
- 生成结果直接写入 `lesson_configs`
- 管理员可以逐节阅读全文审核
- 前台不会读取未发布 AI 草稿
- 发布后前台正确读取新版本
- 生成和发布流程都能拦截异常字符和越界写入

## Recommended Next Step

这份规格通过后，下一步进入 implementation plan，按下面顺序展开：

1. 骨架表与 API 设计
2. 单课 AI 草稿生成服务
3. 草稿覆盖写入规则
4. 后台生成入口和审核页
5. 单测、集成测试和 E2E
