# 12 节启蒙课主语音文案落地实现计划

## 目标

把 `12` 节启蒙课每个步骤的主语音文案正式落到课程数据结构里，并打通课程页当前步骤的读取通路。

本次实现只完成：

- 课程步骤 `voiceover` 字段落地
- `12` 节课全部步骤补齐主语音文案
- 课程运行时可以读到当前步骤的 `voiceover`
- 内容完整性测试和运行时消费者测试

本次不做：

- 真人配音音频
- AI 语音合成
- 自动播放和播放控件
- 提示语音和完成反馈语音

## 任务拆分

### 任务 1：补齐课程类型和 `12` 节语音数据

修改范围：

- `apps/web/src/features/domain/types.ts`
- `apps/web/src/content/curriculum/launch-lessons.ts`

工作内容：

- 给课程步骤类型新增 `voiceover?: string`
- 为 `12` 节启蒙课所有步骤补齐 `voiceover`
- 保持 `instruction` 更完整、`voiceover` 更短
- 确保四个单元语气和词汇统一

完成标准：

- `12` 节所有 `step` 都有非空 `voiceover`
- 不改变现有步骤顺序和教学逻辑

### 任务 2：打通课程页运行时读取

修改范围：

- `apps/web/src/app/learn/lesson/[lessonId]/page.tsx`
- `apps/web/src/features/lessons/guided-lesson-shell.tsx`
- 相关步骤消费者组件

工作内容：

- 让当前步骤的 `voiceover` 能进入课程页运行时数据
- 至少保证当前步骤切换时可以读取新的 `voiceover`
- 如有必要，在 UI 上预留轻量展示位，但不做播放控件

完成标准：

- 当前步骤数据链路包含 `voiceover`
- 课程页不会因为新增字段出现运行时回归

### 任务 3：补测试并验证完整性

修改范围：

- `apps/web/src/content/curriculum/foundation-units.test.ts`
- 新增或更新课程步骤数据测试
- 新增或更新课程页消费者测试

工作内容：

- 增加测试确保 `12` 节所有步骤都有 `voiceover`
- 增加测试确保课程页消费者能读取当前步骤 `voiceover`
- 如现有测试依赖步骤对象快照，补齐对应断言

完成标准：

- 内容完整性测试能拦住漏写 `voiceover`
- 运行时消费者测试能拦住数据链路断开

## 执行顺序

1. 先改类型和课程数据
2. 再接课程页运行时读取
3. 最后补测试并跑完整验证

## 验证命令

在 `apps/web` 下执行：

- `npm run test:run -- --maxWorkers=1`
- `npm run lint`
- `npm run build`

如课程页 E2E 受影响，再补跑：

- `npm run test:e2e -- tests/e2e/guest-story.spec.ts --workers=1`

## 风险与控制

### 风险 1：字段加了但课程页没接上

控制：

- 明确增加运行时消费者测试

### 风险 2：语音文案和文字说明重复过重

控制：

- 严格遵守“`instruction` 更完整、`voiceover` 更短”的规则

### 风险 3：后续播放系统需要重构

控制：

- 本次直接把 `voiceover` 放在 `step` 上，后续播放系统只消费，不再改数据结构
