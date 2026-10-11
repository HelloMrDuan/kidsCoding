# KidsCoding 仓库执行约束

任何新 Codex / AI 会话在修改 UI 前必须先读取并遵守
[V2 视觉冻结规则](docs/design/kidscoding-v2/VISUAL-LOCK.md)、完整
[V2 原型](docs/design/kidscoding-v2/prototype.html) 和
[交接规范](docs/design/kidscoding-v2/DESIGN-SPEC.md)。

V2 是唯一已批准的全站视觉基线。未经项目负责人明确批准，禁止重新设计或改变布局、颜色、字体层级、组件视觉、分区顺序及响应式交互。旧 roadmap / CSS / V1 不能覆盖 V2；业务冲突先提交具体差异和最小方案，等待裁定，不能先改后报。

只推进 [任务台账](docs/roadmap/task-register.json) 中一个 Task-ID，遵守
[单任务制度](docs/roadmap/11-TASK-EXECUTION-POLICY.md)。真实执行与数据不能由原型演示代替。
UI 任务必须有真实 Chrome 三断点对比、功能正反与恢复测试、PR/main CI 和日志证据。未满足验收条件不得标记 completed；当前已记录的 V2 AA 缺口不得自行改色或伪报通过。
