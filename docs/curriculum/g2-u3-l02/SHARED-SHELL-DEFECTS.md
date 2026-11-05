# 共享 LessonWorkspace 的缺陷与 G2-U3-L02 需要 2 号落实的接口

对象：main `651ae7f39361484d35b88a6bcc91d3767e661ecb`（PR #469 已合并）里的
`apps/web/src/features/lessons/workspace/lesson-workspace.tsx`（行号以该提交为准）。
首席已确认缺陷成立。**本课不绕过它**：没有修改共享文件，没有改 engine 语义，没有借用演示积木，没有劫持 DOM 事件。
最小复现是仓库里的测试：`apps/web/src/features/lessons/g2-u3-l02/shared-shell-defects.test.tsx`
（真实 `LessonWorkspace` + 真实的本课适配器和三个槽位，只把 VM 端口换成假的）。

## D1（阻塞本课最终接线）：`scratch-vm` + `editorSlot` 时运行按钮是死的

| 现象 | 位置（main `651ae7f3`） |
|---|---|
| 给了 `editorSlot` 时，挂载 effect 在第 395–409 行直接 `return`：适配器**从不 mount**，`mountedAdapterRef.current` 一直是 `null` | `lesson-workspace.tsx` L395–409 |
| `handleRunToggle` 读取 `mountedAdapterRef.current`，为空就 `return`（第 576–578 行）：按钮 `ws-run-toggle` 渲染出来，点击却**不会调用 `adapter.run`** | L576–578 |
| 粘性运行行只在 `!EditorSlotView` 时渲染（第 1327 行），所以槽位课程在手机上也没有另一个运行入口 | L1327 |
| 槽位路径不调用 `adapter.validateDraft`：`validateDraft` 只在适配器路径（第 355 行）用到。槽位拿到的 `initial` 没有经过适配器校验（本课槽位自己兜底，不依赖这一点） | L355 |

后果：`editorSlot` 目前只能服务“没有运行概念的摘要课”（壳自己的测试名也是 "mounts a real React summary editor through the slot, with no stage or run button"）。
Scratch 课程需要“React 编辑槽 + 适配器挂载真实 VM + 壳的运行按钮”，现在做不到。

**复现测试**（`it.fails` 标记，缺陷存在时通过；壳修复后会变红，提醒删除标记并完成接线）：

| 测试 | 断言 | 现状 |
|---|---|---|
| 给了 editorSlot，壳仍然 mount 适配器 | `port.mounts === 1` | 0 |
| 点击壳的运行按钮，调用 `adapter.run` | `port.runs.length === 1` | 0（按钮存在，点击无效） |
| 对照（不带 fails）：同一个适配器走 `blockly` 引擎且没有 `editorSlot` | 壳 mount 适配器，点击后调用 run | 通过（说明测试装置没问题） |

**最小修改建议**（只是建议，由 2 号决定）：
1. 挂载 effect 里，`editorSlot` 存在且 `contract.engine !== 'summary'` 时，不要提前返回：照常 mount 适配器、登记 `mountedAdapterRef`、`addChangeListener`；编辑数据仍由槽位通过 `onChange` 交给壳（`editorDataRef`），草稿仍存槽位数据。
2. 粘性运行行与上方运行按钮的显示条件，从 `!EditorSlotView` 改为 `!isSummary`（有 `hasStage` 且有适配器的课程都显示）。
3. 槽位路径恢复草稿时，如果适配器提供 `validateDraft`，先校验再作为 `initial` 交给槽位；校验失败保持课程起点且不覆盖已存草稿。

## D2（只影响“blockly 引擎 + 命令式适配器”这条备选路线，本课不走）：壳泄漏演示内容

`engine: 'blockly'` 的课程如果脚本不是演示的 `DemoBlock[]`（本课的脚本是对象），壳仍然显示演示内容：

| 现象 | 位置 |
|---|---|
| 积木抽屉展开后显示演示芯片“向右走 50 步”“向左走 50 步”“重复 3 次（向右走 50 步）”，点击会调用课程适配器的 `loadScript([{type:'ws_move_right',steps:50}])` | L1040–1060 |
| 脚本列表面板对非数组脚本写“脚本为空：请从积木抽屉添加，或在编辑器中拖入积木。” | L1090–1092；`isDemoScript = Array.isArray`（L148） |

这条路线也没有地方放课程自己的工具栏。首席已禁止用修改 engine 语义或借用演示积木的方式绕过，所以本课**没有**走这条路。
修复 D1 后，本课使用 `scratch-vm + editorSlot`，D2 不再影响本课；仍列出来是因为其它命令式 Blockly 课程会遇到。
复现测试同样用 `it.fails`（断言：页面不含“向右走 50 步”、不含“脚本为空”）。

## 本课侧已完成、2 号可以直接使用的接口

| 接口 | 位置 | 说明 |
|---|---|---|
| `LessonL02Adapter implements EngineAdapter` | `lesson-adapter.ts` | `mount/unmount/loadScript/getScript/run/stop/getState`；可选：`validateDraft`、`getFileCapabilities`（不能新建，可保存/导出/导入/重置）、`getStageState`、`getJudgmentResult`、`addChangeListener/removeChangeListener`。没有声明的能力（分类栏、搜索、缩放、选中 id）一律不提供。 |
| `run(onEvent)` 前置条件 | 同上 | 没写预测 / 脚本不合法 / 引擎没准备好 / 已在运行：**同步抛错**（壳的 `handleRunToggle` 已经 try/catch 并显示 `runError`）。异步出错时，事件是 `stopped`，`getLastRunError()` 给出原因；学生主动停止时它返回 `null`，不会被显示成错误。 |
| `createL02Slots(adapter, options)` | `ui/slots.tsx` | 返回 `{EditorSlot, StageSlot, RolesSlot}`，分别符合 `EditorSlotProps` / `StageSlotProps` / `RolesSlotProps`，每个适配器创建一次、引用稳定。`options`：`embedLevelNav`、`embedTaskPanel`（壳不知道四关和预测输入，由编辑槽位自己带）、`embedEngineStatus`。 |
| 舞台状态 | `stage-state.ts` | `getStageState()` → `{basketX, basketY, fruitX, fruitY, running, levelId}`（扁平字典）。`parseStageState` 是类型守卫，字典缺字段或类型不对时舞台槽位退回本关起点。共享层里没有任何 `basketX/fruitX`（有测试守住）。 |
| 共享 `RunTrace` 映射 | `toSharedRunTrace` | 每次真实执行的“将 x 坐标增加”是一帧：`{frame, event:'move', source:'basket', inLoop, dx, dy:0}`；`landingFrame`。已发布的 `RunFrame.source/dx/dy` 够用，**不再需要共享层改动**。 |
| 共享判定 | `judgeSharedTrace` / `l02JudgmentAdapter: JudgmentAdapter` | 用关卡参数和 Σdx 还原落点，复用本课 `judgeRun`；阈值仍只在 `params.ts`。单测用合成轨迹，另有真实 VM 的 E2E 证明与直接判定一致，且还原的落点等于 VM 里篮子的真实 x。 |
| 草稿 | `getScript()` / `loadScript()` | 唯一一份：`{version:1, levelId, programs:{solve,transferLeft,transferFast}, predictions}`，键 `kidscoding-draft:G2-U3-L02`。**不含**通过记录、轨迹、位置。共享 `workspace-draft` 写的、课程自己写的，彼此都读得了（有测试）。 |
| 编辑通知 | `addChangeListener` | 只在作品被编辑时触发（脚本、预测、关卡），运行帧、结果、提示、角色切换都不触发。槽位的 `onChange` 同理，恢复草稿不回传。 |

## 对 2 号的请求（按优先级）

1. **修复 D1**（必需）。验收方式：把 `shared-shell-defects.test.tsx` 里 D1 的两条 `it.fails` 去掉标记，它们应当直接通过。
2. 槽位路径恢复草稿时调用 `adapter.validateDraft`（建议，见上）。
3. （确认项，不是缺陷）槽位路径修好后，请保持“每个 `run` 事件都 `setEngineState` 并重新渲染、渲染时取 `adapter.getStageState?.()`”这一行为（现状如此，`handleRunEvent` 与 L1225），本课舞台逐帧移动依赖它。
4. D2 由 2 号决定是否处理（不阻塞本课）。

## 本课不会做的事

不修改 `workspace/` 下的任何文件；不为通过测试而改 engine 语义；不借用演示积木；不劫持 DOM 事件；
不在共享壳修复进入 main 之前宣称“已集成”。
