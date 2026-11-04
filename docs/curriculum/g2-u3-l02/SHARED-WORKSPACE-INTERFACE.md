# G2-U3-L02 对共享 LessonWorkspace 的最小接口需求

状态：**需求，提交给 2 号（负责 #469）与首席。** 本文件不修改任何共享文件。
对象：PR #469（Draft），审阅时的 head `dc7157b99f00295d4dedf7f1140f6bdd24859317`（"Kitten-grade LessonWorkspace UI refactor"）。
依据：#469 当前代码的真实结构（`workspace-adapters.ts`、`workspace-judging.ts`、`scratch-adapter.ts`、`lesson-workspace.tsx`）。按 AGENTS.md，#469 未合并，本文只是**对接口的需求**，不把它当已生效的规范，也不依赖它的代码。

## 一、现状：为什么现在接不进去

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

## 五、需要 2 号确认的问题

1. R1–R5 采用“扩展 prop”还是“新增 `engine: 'scratch-vm-editor'` 的第四种引擎”？我方都能接，倾向前者（不改契约字段）。
2. 壳按钮文字是否改为纯文字（见第一节最后一行）？
3. 壳是否计划提供 Kitten 风格的“积木分类图标条 + 搜索框”？本课用 Blockly 自带的分类工具箱（事件 / 运动 / 控制三类），如果壳提供分类条，需要说明与 Blockly flyout 的关系，避免出现两套分类。
