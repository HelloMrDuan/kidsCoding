# 课程页创作工作台视觉重构实施计划

## 目标

把课程学习页收成一套真正可用的儿童创作工作台：

- 左侧轻任务卡
- 中间大舞台
- 舞台下方 Blockly 创作区
- 反馈卡和微补课卡与主界面风格统一

本次不扩到首页、地图、家长页和支付。

## 实施顺序

### 任务 1：重构学习页整体布局

范围：

- 调整学习页主布局，收成“轻左栏 + 大中栏”
- 减弱旧的三栏后台感
- 明确舞台优先级

落点：

- `apps/web/src/app/learn/lesson/[lessonId]/page.tsx`
- 相关壳层布局组件

验收：

- 页面第一眼视觉中心是舞台，不是说明区
- 预览区在上，创作区在下

### 任务 2：重构 GuidedLessonShell

范围：

- 把当前步骤表达收成任务卡
- 把当前结果反馈收成任务区下方的小结果卡
- 把微补课卡统一成支持性提示卡

落点：

- `apps/web/src/features/lessons/guided-lesson-shell.tsx`

验收：

- 当前任务清楚可见
- 轻反馈不再像普通提示块
- 微补课不再像系统警告

### 任务 3：升级 PreviewStage 视觉

范围：

- 提升舞台容器的展示感
- 让舞台和完成页的视觉语言一致
- 强化“作品正在这里发生”的感觉

落点：

- `apps/web/src/features/lessons/blockly/preview-stage.tsx`

验收：

- 舞台比周围区域更亮、更清楚、更像展示台
- 页面整体更像儿童创作产品，而不是管理工具

### 任务 4：收敛 BlocklyWorkspace 视觉

范围：

- 让 Blockly 区域更像创作桌面
- 弱化工具面板感
- 与舞台形成同一页面家族

落点：

- `apps/web/src/features/lessons/blockly/blockly-workspace.tsx`

验收：

- Blockly 区域和舞台上下衔接自然
- 不再显得像独立技术工具块

### 任务 5：测试与验证

组件测试：

- `GuidedLessonShell` 任务卡、反馈卡、微补课卡展示
- `PreviewStage` 容器和关键状态展示
- 必要时补 `BlocklyWorkspace` 壳层测试

整体验证：

- `npm run test:run -- --maxWorkers=1`
- `npm run lint`
- `npm run build`
- `npm run test:e2e -- tests/e2e/guest-story.spec.ts --workers=1`

## 执行边界

本轮不做：

- 首页继续改版
- 学习地图继续改版
- 家长页整体视觉重做
- 新奖励逻辑
- 新支付流程
- 新数据库字段

本轮只解决：

“孩子上课时看到的主界面，是否像正式高品质儿童创作工作台。”
