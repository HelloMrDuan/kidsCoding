# UX-003 证据 · 统一任务卡、进度与故事组件

## 三端视觉对比截图（夹具页，全页）

夹具路由 `/test-fixtures/ux-003`（生产默认 404，仅 `UX003_FIXTURE_ENABLED=1` 时开启），
挂载真实 React 组件 + 真实课程定义 + 受控测试进度。

- `ux-003-fixture-desktop.png` — 1440×900
- `ux-003-fixture-tablet.png` — 768×1024
- `ux-003-fixture-mobile.png` — 375×812

对照原型 `docs/design/kidscoding-v2/prototype.html`：

| 组件 | 原型基准 | 本实现 |
| --- | --- | --- |
| LessonCard | 地图页 `.step` 课节点（44px 节点、标题省略、done/current/locked） | 严格复用；locked/unreleased 仅展示，不由课程序号自动推导 |
| ProgressTrack | 课堂页 `.lesson-progress` + “步骤 X / Y” | 位置（当前第 3 步）与完成数（已完成 2 步）区分；填充 = 去重有效完成 id / 真实 steps.length |
| StoryDialog | 课堂页 `.pane-h` + `.task-content` + 舞台 `.speech` 气泡 | 内联故事引导，非弹窗；无 `<dialog>`、无 `role="dialog"`、无焦点陷阱、无 Esc 逻辑 |

## 两处有记录的适配（非自由设计）

1. `.kc-lesson-progress i` 在 CSS 中无宽度：填充只来自组件按真实进度计算的内联宽度，
   不使用原型 60% 演示值。
2. `.kc-story-line` 复用 `.speech` 气泡视觉（白底、9px 圆角、12px、同一阴影），改为常规流式布局：
   原型 `.speech` 为 `position:absolute + display:none`（舞台专用），无法内联渲染。

## 验证

- 单元测试 29/29（长标题、空数据、锁定/未开放、错误态、键盘、正反测试）
- 真实 Chrome E2E 6/6（desktop + mobile 项目 × 三断点），真实 React 组件挂载，
  含键盘回车真实跳转、无横向溢出、冻结样式断言
- 生产构建通过；无 flag 时夹具路由实测返回 404，地图仍 200
- Lint 0 错误（5 个既有警告，与 UX-002 一致）
