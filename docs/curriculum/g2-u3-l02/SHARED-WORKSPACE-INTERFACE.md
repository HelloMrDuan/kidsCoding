# G2-U3-L02 对共享 LessonWorkspace 的最小接口需求

状态：**需求，提交给 2 号（负责 #469）与首席。** 本文件不修改任何共享文件。
**2026-11-04 更新：已按 #469 `d3e3ad06` 的实际代码重新核对，见下面“最新对照”一节；第一节“现状”是基于旧 head `dc7157b9` 的历史记录，已过期。**
对象：PR #469（Draft）。**当前核对的 head：`d3e3ad06d89f4557b267f772cd90e6751886275b`**（"three-engine shared slots + R1-R8 regression hardening"）；此前版本基于 `dc7157b9`，已过期。
依据：#469 当前代码的真实结构（`workspace-adapters.ts`、`workspace-judging.ts`、`scratch-adapter.ts`、`lesson-workspace.tsx`）。按 AGENTS.md，#469 未合并，本文只是**对接口的需求**，不把它当已生效的规范，也不依赖它的代码。

## 最新对照（2026-11-04，#469 head `d3e3ad06d89f4557b267f772cd90e6751886275b`，以实际代码为准）

#469 在 `d3e3ad06`（"three-engine shared slots + R1-R8 regression hardening"）新增了 `workspace-slots.ts`，提供 `editorSlot` / `stageSlot` 两个可选插槽、通用 `RunTrace`、`JudgmentAdapter`。该提交没有改动 `.github/` 或任何台账。以下逐项对照本课需求（代码位置以该 head 为准）：

| 需求 | #469 现状（代码证据） | 结论 |
|---|---|---|
| R1 脚本编辑槽 | `EditorSlotProps = {lessonId, initial, onChange, onSelectionChange?, editable}`，壳在 `lesson-workspace.tsx` 以 `<EditorSlotView key={`${lessonId}-${slotResetKey}`} …/>` 挂载 | **基本解决。** 重置由壳递增 `slotResetKey` 让槽位重新挂载实现，本课**不再需要** `resetKey` prop（本文早先版本提出的 `resetKey` 需求撤回）。 |
| R1 移动端编辑控制 | `EditorSlotProps` 无 `ref` / `handleRef` / 命令接口；`onSelectionChange` 只能“向外报告选中”，不能“从外部驱动编辑” | **仍缺（缺口 A）。** |
| R2 自定义舞台 | `StageSlotProps = {lessonId, state, running}`，`state: {x:number; score:number; running:boolean; frames?:number}`，壳传入 `engineState` | **仍缺（缺口 B）。** 只有一个 `x`，表达不了篮子与水果各自的 x / y。 |
| R3 判定扩展 | `JudgmentAdapter.judge(trace, script): JudgmentResult`；`JudgmentResult` 的结论措辞归适配器，壳“不得写已掌握” | **方向正确，已采纳。** |
| R3 运行轨迹字段 | `RunFrame = {frame, inLoop?, event: string}`；`RunTrace = {runId, lessonId, levelId?, landingFrame?, frames}`；全文无任何位移量字段 | **仍缺（缺口 C）。** 本课“循环贡献的位移占比 ≥ 50%”必须用每一步的 `dx`。 |
| R4 失效 | 壳分配递增 `runId`；稳定指纹；判定不写入草稿；恢复后重新判定 | **已采纳。** |
| R5 适配器扩展 | 采用“壳分配 `runId`”；没有 `runLevel / currentRunId` | **可适配，无需 2 号再改。** 本课适配器需改为接受壳给的 `runId`。 |
| R6 草稿 | 判定不入草稿；“恢复提示不被自动保存覆盖”（`shouldAutosavePreservePrompt`） | **已采纳，与本课一致。** |

### 三个仍需 2 号确认的缺口（精确描述）

**缺口 A：移动端编辑控制。** 本课在手机上用“添加积木 / 上移 / 下移 / 删除 / 数字框”工具栏操作槽位内的 Blockly（Blockly 12 的选中会随键盘焦点丢失，所以选中状态必须由编辑器自管）。`EditorSlotProps` 没有从槽位外部驱动编辑的途径。两个可选方向，**由 2 号 / 首席择一**：
- A1（推荐，不改共享契约）：工具栏由课程的 `editorSlot` 组件**自带**（渲染在槽位内部）。这要求壳给槽位足够的纵向空间，并且手机的“脚本”工作区里运行按钮仍与槽位同区可达。
- A2：在 `EditorSlotProps` 增加一个可选的命令通道（例如 `register?: (api: EditorApi) => void`，`EditorApi = {addBlock, moveSelected, deleteSelected, setSelectedNumber}`），壳可以把这些命令放进共享的素材抽屉。

**缺口 B：舞台状态不够。** 需要 `StageSlotProps.state` 可以携带课程自定义字段。建议最小改动：把 `state` 的类型改成可扩展（例如 `state: EngineState & { custom?: unknown }`），或增加 `stageData?: unknown` 由适配器填写。本课需要：`{basket:{x,y}, fruit:{x,y}}` 与素材（`assets`）。

**缺口 C：`RunFrame` 缺位移量。** 需要每个“真实移动”帧携带数值位移，且仍保持通用。建议最小改动：给 `RunFrame` 增加可选的 `delta?: number`（通用含义：本帧让主角色 x 方向变化的量），本课映射为篮子的 `dx`。不要把 `dx` 编码进 `event: string`——那会让判定去解析文本。`landingFrame` 已有，足够表达“落地帧”。

### 本课这一侧在集成时要做的适配

1. 编辑器改为符合 `EditorSlotProps`：从 `initial` 重建脚本；每次编辑 `onChange(program)`。
2. 适配器接受壳分配的 `runId`；`RunTrace` 映射：`frames[i] = {frame, inLoop, event:'move', delta: dx}`、`landingFrame`、再加课程自有字段（落地时的篮子 x / 水果 x）放在适配器自己的 trace 里，由本课 `judge` 使用。
3. `judge.ts` 实现 `JudgmentAdapter`，输出 `JudgmentResult.layers = [stage, task, knowledge]`，并保留“理解情况：需要进一步解释或练习”（放入 `conclusion` 或 `methodEvidence`）。
4. 删除 `ui/classroom.tsx`；保留 `script-editor.tsx`、`stage-view.tsx`、`vm-adapter.ts`、`judge.ts`、`state.ts`、`contract.ts`。
5. **保留 SYS-122 覆盖的全部测试**：VM 矩阵 21 项、课堂 spec 16 个用例 × 三视口、单测 66 项。课堂 spec 的 `data-testid` 前缀会从 `l2-*` 换成共享壳的 `ws-*`，只换定位，不放宽断言、不删用例。

---

## 一（历史记录，已过期）、现状：为什么现在接不进去

> 以下基于旧 head `dc7157b9`。其中“壳没有任何扩展槽”“判定入口只有 `{didMove, usedRepeat, finalX}`”等描述**已不再成立**。保留以便追溯需求的来由。


| 事实（#469 head `dc7157b`） | 影响 |
|---|---|
| `LessonWorkspaceProps` 只有 `contract / adapter / initialScript / onLessonSwitch / testFailSave`。壳按 `contract.engine` 分支：`'blockly'` 用自带的 Blockly 注入与 `DemoBlock[]` 列表编辑；`'scratch-vm'` 只渲染一个 iframe 挂载点 + 运行按钮。 | `scratch-vm` 没有脚本编辑区，课程无法把自己的 Blockly 编辑器放进去。 |
| 舞台区在壳内写死狐狸 + 水果目标（演示），Scratch 模式只有 iframe。 | 课程的篮子 / 水果无法按 VM 真实坐标绘制。 |
| `buildJudgment(contract, finalState, trace)` 的 `trace` 是 `{ didMove, usedRepeat, finalX }`。 | 表达不了“循环里的移动真实执行了几次、循环贡献多少位移、水果落地帧”。 |
| 编辑后清除判定由壳在“它自己的脚本变化回调”里完成（`setJudgment(null); setJudgmentStale(true)`）。 | 课程自带编辑器的变化，壳收不到。 |
| `EngineAdapter.run(onEvent)` 的事件是 `{kind, state:{x, score, running, frames}}`。 | 没有运行轨迹，也没有“本次运行编号”，旧运行的结果无法被识别并丢弃。 |
| 壳按钮文字用 `■ 停止` / `▶ 运行作品`。 | 在没有这些字形的设备上显示为方框（本课在测试中已遇到同类问题，见证据文档）。建议改为纯文字。 |

## 二、需求清单（最小集，按优先级）

### R1 脚本编辑槽（必须）

课程提供编辑器组件，壳只负责摆放位置与三端布局、并在槽位内挂载。

```ts
type ScriptSlotProps<Program> = {
  program: Program                         // 壳持有的当前脚本（单一事实来源）
  editable: boolean
  resetKey: number                         // 切关 / 导入 / 恢复初始时递增：槽位整体重载脚本
  onChange: (next: Program) => void        // 任何编辑都回调；壳据此清除判定、写草稿
  onSelect?: (s: unknown) => void          // 可选：选中状态（移动端工具条用）
  handleRef?: Ref<ScriptEditorHandle>      // 可选：移动端“添加积木 / 上移 / 下移 / 删除 / 改数字”
}
type LessonWorkspaceExtensions<Program> = {
  renderScriptEditor?: (p: ScriptSlotProps<Program>) => ReactNode
}
```

- 壳必须在**手机的“脚本”工作区**内放置该槽，并保证运行按钮在同一工作区内可达（`WORKSPACE-API.md` §三 / `ACCEPTANCE.md` A）。
- 切换工作区、折叠抽屉、缩放舞台只改可见性，**不卸载槽位**（现有课程实现靠 ResizeObserver 在可见时重新量尺寸）。
- 参考实现：`apps/web/src/features/lessons/g2-u3-l02/ui/script-editor.tsx`（Blockly 12；选中状态按 ID 自管，因为 Blockly 12 的选中会随键盘焦点丢失）。

### R2 自定义舞台渲染槽（必须）

```ts
type StageSlotProps = {
  state: unknown                           // 适配器 getState() 的课程专属状态（见 R5）
  assets: unknown                          // 适配器给出的素材（本课：沙箱内置的 data: SVG）
  testId: string
}
type LessonWorkspaceExtensions<Program> = { renderStage?: (p: StageSlotProps) => ReactNode }
```

- 壳保留舞台头（运行 / 停止单按钮、缩放）；舞台内容由课程渲染。
- 参考实现：`.../ui/stage-view.tsx`（按 VM 回传的真实坐标定位，不在页面里自己算位置）。

### R3 RunTrace 判定扩展（必须）

壳的判定入口要能接受课程提供的纯函数，而不是写死 `buildJudgment`：

```ts
type LessonWorkspaceExtensions<Program> = {
  /** 课程提供：由真实 VM 轨迹产生三层结果；壳只负责展示三行与结论。 */
  judge?: (trace: unknown, ctx: { levelId: string }) => ThreeLayerResult | { status: 'not-judged'; reason: string }
}
type ThreeLayerResult = {
  stage: { passed: boolean; line: string }
  task: { passed: boolean; line: string }
  knowledge: { passed: boolean; line: string }
  understanding?: string                   // 课程固定提供的“理解情况”说明（本课：需要进一步解释或练习）
  passed: boolean
  conclusion: string
}
```

- 壳**不得**用 `trace.passed` 之外的自己的规则改写课程措辞（本课的统一措辞：舞台结果 / 任务结果 / 知识证据）。
- “已完成 / 已掌握”之类的字眼由课程措辞决定；本课明确**不使用“已掌握”**。
- 参考实现：`.../judge.ts`（纯函数，输入 `RunTrace`，输出上面的结构）。

### R4 编辑后判定失效通知（必须）

- 壳订阅 R1 的 `onChange`：任何脚本变化立即清除当前判定，并显示“旧结果已清除”。
- 另外在以下事件同样清除并**丢弃迟到的结果**：切换关卡 / 课节、停止、重新运行、导入、恢复初始。
- 判定与以下三项绑定，缺一不可：**程序指纹、关卡 ID、运行序号**。迟到的运行结果（运行序号对不上）直接丢弃，不得写入状态。
- 参考实现：`.../judge.ts` 的 `isTraceCurrent`、`.../state.ts` 的 `recordRun`（对不上指纹的轨迹被丢弃）。

### R5 适配器状态与生命周期（必须）

在现有 `EngineAdapter` 之上，**加法扩展**（不改现有方法）：

```ts
type EngineAdapterV2<Program, Trace, State> = EngineAdapter & {
  runLevel?: (levelId: string, program: Program) => Promise<Trace>   // 返回真实 VM 轨迹；每次运行舞台复位
  currentRunId?: () => number                                         // 当前运行序号，供 R4 对账
  getStatus?: () => { ready: boolean; error: string | null; assets: unknown }
  subscribe?: (h: { ready?: () => void; frame?: (f: unknown) => void }) => void
}
```

- `getState()` 的类型要允许课程专属字段（本课需要篮子与水果的 x / y，而不只是首个角色的 x）。
- `mount` / `unmount` 后不得残留监听与定时器（现有适配器已满足，参考 `.../vm-adapter.ts`）。
- 沙箱握手超时 / VM 加载失败必须如实显示“引擎未就绪：原因”，不得假装可运行。

### R6 草稿（一致性）

- 键 `kidscoding-draft:G2-U3-L02`，外层信封 `{ lessonId, savedAt, script }`，与 #469 的 `workspace-draft.ts` 一致；64KB 上限、损坏 / 错课节 / 非法内容拒绝恢复且不覆盖好草稿；保存失败显示“未能保存”。
- 本课草稿**只存脚本、当前关卡、预测**。**不存“通过”状态**：通过只能由真实运行产生，刷新后重新运行一次即可恢复，因此草稿里无法伪造通过。壳不得把判定写进草稿。
- 参考实现：`.../state.ts` 的 `saveDraft / loadDraft / fromDraft`。

### R7 任务抽屉与进度（建议）

- 抽屉内容来自课程契约（本课已有 `goal5`、三级提示、预测、事后“你的做法 / 别的做法”）。
- “别的做法”属于**事后节点**：壳不得在本关未通过之前渲染它。
- 每关的“通过”由课程的 `isLevelPassed` 提供给壳显示（编辑后自动变回未通过）。

## 三、课程这一侧已具备、可直接迁入的部分

| 槽位 / 能力 | 本课文件 | 是否依赖 #469 |
|---|---|---|
| 脚本编辑槽内容 | `ui/script-editor.tsx` | 否（只依赖 `blockly`） |
| 舞台槽内容 | `ui/stage-view.tsx` | 否 |
| 适配器 | `vm-adapter.ts`（`mount/unmount/loadScript/getScript/run/stop/getState` + `runLevel/currentRunId/getStatus/subscribe`） | 否（用结构相同的本地类型；合并后换成共享类型，字段不变） |
| 判定（纯函数） | `judge.ts` | 否 |
| 课程契约 | `contract.ts`（字段对齐 `LESSON-CONTRACT.md`） | 否 |
| 草稿与状态 | `state.ts` | 否 |
| 过渡容器 | `ui/classroom.tsx` | **过渡**：#469 提供 R1–R5 后删除，只留槽位内容 |

迁入时 `classroom.tsx` 里**不会**再有布局、顶栏、文件菜单、任务抽屉、反馈区的实现，这些全部由共享壳提供。

## 四、验收（接入后我方会重新跑）

1. 真实 `scratch-vm` 行为矩阵（21 项）原样通过，不改期望值。
2. 课堂 spec 的 14 项 × [desktop / tablet / phone] 在共享壳下通过：用例里的 `data-testid` 前缀会从 `l2-*` 换成共享壳的 `ws-*`（仅换定位，不放宽断言）。
3. 桌面真实指针拖放、手机点击插入 / 上移 / 下移 / 删除 / 改数字、编辑后判定失效、迟到结果被丢弃、保存失败显示“未能保存”。
4. 在 GitHub Actions 里实际执行（见 `CI-COVERAGE-PLAN.md`），不以本地结果代替。

## 五、仍需 2 号 / 首席确认的问题（仅列未解决项）

以下原先提出的问题已被 `d3e3ad06` 解决，**不再重复提出**：编辑槽的存在与重置（`slotResetKey` remount）、判定不入草稿、`runId` 与指纹绑定、结论措辞归适配器、恢复提示不被自动保存覆盖、判定适配器接口。

仍未解决：

1. **缺口 A**（移动端编辑控制）：选 A1（工具栏由课程的 `editorSlot` 自带）还是 A2（`EditorSlotProps` 增加命令通道）。我方两种都能接，倾向 A1（不改共享契约），但需要壳在手机“脚本”工作区里给槽位足够空间，并保证运行按钮同区可达。
2. **缺口 B**（舞台状态）：`StageSlotProps.state` 需要能承载课程自定义字段。
3. **缺口 C**（轨迹位移量）：`RunFrame` 需要一个通用的可选 `delta?: number`。
4. 壳按钮文字 `▶ 运行作品` / `■ 停止` 仍可能在缺字形的设备上显示为方框（本课在测试中已遇到并改为纯文字）；是否改为纯文字，由 2 号决定。
5. 壳是否计划提供 Kitten 风格“积木分类图标条 + 搜索框”？本课用 Blockly 自带分类工具箱（事件 / 运动 / 控制三类），如果壳也提供分类条，请说明与 Blockly flyout 的关系，避免出现两套分类。

以上均不阻塞 #471 的合并准备；它们只阻塞 G2-U3-L02 接入共享工作区。
