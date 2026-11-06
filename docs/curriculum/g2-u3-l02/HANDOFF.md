# G2-U3-L02 交接说明（3 号 Kiro → 后续集成）

更新：2026-11-04。本文自包含：读完即可接手，不依赖任何会话记忆。
范围：课程 PR #470、CI PR #471、共享工作区 PR #469。**#470、#471 为 Draft、未合并；#469 已合并，main 为 `651ae7f3`（见下面“最新状态”）。第一节起为历史记录，以“最新状态”为准。**

## 正式接线（本节最新，优先于下面所有章节）

路由 `/learn/g2-u3-l02` 现在渲染共享 `LessonWorkspace`（`ui/lesson-page.tsx`）：契约 `L02_CONTRACT`、适配器 `LessonL02Adapter`、`createL02Slots` 的编辑 / 舞台 / 角色三个槽位。过渡课堂页 `classroom.tsx`、验证页 `/learn/g2-u3-l02/embed` 及其专用文件已删除。依赖 OPS-022（#480，含 D1 与 F2/F3 修复）已合并进 main。

| 项 | 内容 |
|---|---|
| 保留 | `LessonL02Adapter`、三个槽位、四关会话 `L02Session`、真实 Scratch VM、预测输入、三层判定、一课一键草稿。D2 保持 expected-fail（`shared-shell-defects.test.tsx` 里 2 条），本课不走那条路线。 |
| 手机布局（首席裁定：默认首屏必须看见可操作的积木编辑区；任务可折叠成简短任务栏，但任务、提示、操作控件不能丢；优先修课程内布局，不改共享工作区） | 编辑槽位内的任务内容在手机上折叠成一行任务栏（“现在要做：…”+“任务与提示 / 写预测”按钮），展开后是完整的任务说明、预测、三级提示、事后反思；第一关还没写预测时任务栏会提示“先写下你的预测”。工具栏五个控件（添加 / 上移 / 下移 / 删除 / 数字）压成一行，触控高度 40px。壳自己的粘性运行 / 保存行一直在视口顶部，槽位里重复的运行 / 保存副本在手机上隐藏（≥768px 才显示）。实测 375×812：改前积木编辑区从 y≈860 才开始，在首屏之外；改后工具栏 y≈522、编辑区 y≈570，位于底部导航之上。桌面、平板不折叠，布局不变。只改了课程目录里的组件和样式。 |
| 判定展示 | 壳只显示每层的 `detail` 和 `conclusion`，不显示 `label` 与 `methodEvidence`。所以课程把 `detail` 写成带“舞台结果：/任务结果：/知识证据：”前缀的完整一行，把固定的“理解情况…需要进一步解释或练习”并入 `conclusion`，学生看到的措辞与首席统一的一致，不写“已掌握”。 |
| 壳的文件菜单 | 本课不能新建（一课一份作品）；导出文件名由壳按课程编号命名；“恢复初始”让整份作品回到起点；导入的任意 JSON 由槽位校验，非法就保持原作品并如实提示。课程另有“重新开始本关”（只清当前关）在任务区。 |
| 测试 | Vitest `src/features/lessons/g2-u3-l02`：136 通过 + 2 个预期失败（D2）；加上 `workspace/`：16 个文件 238 通过 + 2 预期失败。Playwright desktop project：VM 矩阵 22 + 课堂 60 实例 + Gap A 14 = 96 个实例，86 通过 / 10 按设计跳过（拖放仅桌面 2、证据截图 3、手机首屏仅手机 2、草稿与适配器用例不跑平板 3）/ 0 失败。原有用例标题全部保留，旧页面的 `l2-*` 定位换成壳的 `ws-*`；壳语义不同、断言形式必须改变的地方在用例里用“壳语义：”注释说明：壳的运行按钮不会置灰而是点击后给出原因；壳不暴露 passed 属性，改为断言课程判定的固定措辞；导出文件名；不合法草稿时壳不提示“未能恢复”。 |
| CI | `.github/workflows` 没有改。#471（SYS-122）的命令列了 `g2-u3-l02-vm.spec.ts` 与 `g2-u3-l02-classroom.spec.ts`，所以正式路由下的课堂用例在 #471 的真实 Chrome 运行里会执行；**`g2-u3-l02-shell-gap-a.spec.ts` 是新文件，不在 #471 的命令里**，SYS-122 单独处理时要把它加进 `playwright test` 命令与 `paths`（一行）。#471 保持 Stacked、不改基；#470 接线落地后，把课程分支普通 merge 进 `kiro/ci-g2-u3-l02-coverage`（不强推）即可刷新证据，**这一步还没有做**，所以目前没有 GitHub Actions 证据证明正式路由下的用例。 |

## （较早记录）最新状态（#469 已合并进 main `651ae7f3` 之后；已被上面的“正式接线”取代）

**最终接线没有完成，也不能宣称完成。** 课程侧已经做到“槽位就绪”，被共享壳的缺陷 D1 挡住（详见 `SHARED-SHELL-DEFECTS.md`）。

| 项 | 状态 |
|---|---|
| 共享壳 | #469 已合并（main `651ae7f3`）。`StageSlotProps.stageState`（字典）、`RolesSlot`、`RunFrame.source/dx/dy` 都已经在 main，原先的缺口 B、C 已解决。**新缺陷 D1**：`scratch-vm` + `editorSlot` 时适配器不被 mount，壳的运行按钮点击不调用 `adapter.run`。首席已确认。 |
| 本课已完成（课程侧） | `session.ts`（唯一课堂状态）、`lesson-adapter.ts`（`LessonL02Adapter implements EngineAdapter`）、`stage-state.ts`、`ui/editor-slot.tsx` / `stage-slot.tsx` / `roles-slot.tsx` / `slots.tsx`（`createL02Slots`）、`ui/level-nav.tsx` / `task-panel.tsx` / `feedback-panel.tsx`。过渡页 `ui/classroom.tsx` 现在只是这些部件的组合，行为与原来一致（原有用例全部原样通过）。 |
| 验证页 | `/learn/g2-u3-l02/embed`（`ui/embed-classroom.tsx`）：按共享壳的调用方式使用适配器、三个槽位和共享 `workspace-draft`。**不是产品页，也不是 `LessonWorkspace`。** 共享壳修好后由 `LessonWorkspace` 替代，届时删除该页与 `classroom.tsx`。 |
| 保留不变 | 真实 Scratch VM、四关、预测输入、三层判定与措辞（舞台结果/任务结果/知识证据 + “理解情况…需要进一步解释或练习”，不写“已掌握”）、手机上移/下移/删除/改数字（A1，工具栏在 `EditorSlot` 内）、一课一键草稿 `kidscoding-draft:G2-U3-L02`（四关在同一份草稿里）。 |
| 测试（本地真实运行） | Vitest `src/features/lessons/g2-u3-l02`：**131 通过 + 4 个预期失败（`it.fails`，共享壳缺陷复现）**（原 66 + 会话 32 + 适配器 32 + 缺陷复现 5）。Playwright desktop project：**76 个实例，71 通过 / 5 按设计跳过 / 0 失败**（VM 矩阵 22 = 原 21 + 1 个共享轨迹等价；课堂 54 = 原 48 + 槽位验证页 6）。原有测试一行未删（对 `tests/` 的 diff 只有新增）。 |
| 下一步（共享壳修复进入 main 后） | 1) 去掉 `shared-shell-defects.test.tsx` 里 D1 两条 `it.fails` 的标记，应直接通过；2) 页面 `app/learn/g2-u3-l02/page.tsx` 改为渲染 `LessonWorkspace`（契约 `L02_CONTRACT`，`editorSlot/stageSlot/rolesSlot` 来自 `createL02Slots(adapter, {embedLevelNav:true, embedTaskPanel:true, embedEngineStatus:true})`）；3) 课堂 spec 的 `l2-*` 定位换成 `ws-*`，不放宽断言、不删用例；4) 删除 `classroom.tsx` 和验证页；5) 重跑完整 CI，并按第六节刷新 #471 证据。 |

### 新发现：#471 改基到新 main 时台账尾部冲突

main 现在包含 OPS-020（`docs/roadmap/task-register.json` 尾部追加）。把 #471 的提交 cherry-pick 到新 main 时，`SYS-122` 与 `OPS-020` 都追加在文件尾部，产生冲突（冲突标记在尾部）。这是 AGENTS.md 第 9 节说的“台账尾部追加是串行瓶颈”：需要以新 main 为基重建 #471，**保留两个条目**，不得以解决冲突为名覆盖他人条目。我只做了模拟，没有改动 #471，也没有测试解决后门禁是否通过。这是 #471 自己的合并动作，需首席授权后再做。

### #470 / #471 的 CI 关系（不变）

新增的 E2E 都放进了 SYS-122 已经执行的两个 spec 文件，新增的 Vitest 都在 `src/features/lessons/g2-u3-l02/` 下，所以 #471 的 workflow 命令不用改就能覆盖它们。#471 的证据对应的是旧候选 HEAD，**#470 最终合并前必须按第六节刷新一次**；本次没有刷新。

---

## 一、一页纸状态

| 项 | 状态 |
|---|---|
| 课程 #470 | Draft。分支 `kiro/p0-g2-u3-l02`。教学参数 `pilot-approved`（试点运行参数，**不代表儿童教学效果已验证**）。本地真实 `scratch-vm` + Chromium：单测 66、VM 矩阵 21、课堂 15 个行为用例 × 3 视口。 |
| CI #471 | Draft，Stacked on #470（base=`kiro/p0-g2-u3-l02`）。分支 `kiro/ci-g2-u3-l02-coverage`，HEAD `add3161`，台账 `SYS-122` 为 `in_review`。GitHub Actions 已真实执行本课测试并通过（单测 66；浏览器 Job 69 个用例 = 64 passed / 5 skipped / 0 failed；约 5.2 分钟）。失败演练已做（trace / junit / error-context 会上传）。 |
| 共享 #469 | Draft。head `d3e3ad06`。有 `editorSlot` / `stageSlot` / 通用 `RunTrace`，但**对本课仍不足**（见第三节）。 |
| 过渡课堂 | `ui/classroom.tsx` 是**临时承载页**，不再继续开发；等 #469 稳定后整体迁入共享工作区。 |

## 二、首席裁定记录（2026-11-04，必须遵守）

1. **PR 保持独立**：#470 只负责 G2-U3-L02；#471 只负责 SYS-122。**不授权 #471 合入 #470 分支**；**不在 #470 正文声明 SYS-122**；**不为绕过任务门禁修改既有校验逻辑**。
2. **SYS-122 `mergeCommit`**：仅在 #471 真正合入 main 后，使用它实际的合并 SHA；`evidence.pr` 保留 #471；**不预填、不提前标 `completed`**。
3. **移动端编辑接口选 A1**：上移 / 下移 / 删除 / 参数修改由**课程自己的 `EditorSlot`** 实现；共享壳只负责挂载、布局、可见性切换、生命周期、状态同步；**不为单节课新增全局命令通道**。
4. **舞台状态**：共享 `StageSlot` 要支持**类型安全的课程专属对象状态**；不能用单个 `x/score` 描述所有课程；**不得把 `basketX`、`fruitX` 等本课字段写进共享核心**。
5. **RunTrace**：同意扩展通用轨迹，须保留：运行序号、帧号、事件类型、积木 / 事件来源、是否处于循环内、**有方向的位移增量**。课程自行计算位移贡献比例；**不得把本课教学阈值引入共享层**。
6. **#470 正式合并前必须具备有效的课程 CI 覆盖**：不能让没有执行本课测试的通用工作流充当完整验收依据。候选代码的 CI 证据可继续使用 #471 的 Stacked 运行；若需要变更合并顺序，**必须重新提交门禁兼容方案**，不得擅自合并。
7. 不再重复做故障注入；不修改共享 workflow；不合并任何 PR；不再开发第二套课堂 UI；不无目的增加测试。

## 三、#469 接口是否足以完成集成（截至 `d3e3ad06` 实际代码核对）

**结论：目前不足。** 已满足的不再重复提出：编辑槽存在与重置（壳以 `key={lessonId-slotResetKey}` 让槽位 remount）、判定不入草稿、`runId` 与指纹绑定、结论措辞归适配器、恢复提示不被自动保存覆盖、`JudgmentAdapter`。

仍缺（依据 2026-11-04 首席裁定）：

| 缺口 | 现状 | 需要 2 号落实 |
|---|---|---|
| 舞台状态 | `StageSlotProps.state` 固定 `{x, score, running, frames?}` | 泛型 / 类型安全的课程专属状态 |
| `RunTrace` | `RunFrame = {frame, inLoop?, event: string}`，无位移、无来源 | 加有方向的位移增量与积木 / 事件来源（结构化，**不要塞进 `event` 字符串**） |
| 移动端编辑 | 无外部驱动通道 | **不需要共享层改动**：按 A1，工具栏由本课 `EditorSlot` 自带。只需壳给槽位足够空间，运行按钮与槽位同区可达 |

分析细节与代码位置见 `SHARED-WORKSPACE-INTERFACE.md`。**2 号落实前不要开始集成**；如果 2 号已经解决，不要重复提出。

## 四、#470 的集成修改清单（共享接口稳定之后再做）

课程目录 `apps/web/src/features/lessons/g2-u3-l02/`（13 个文件，约 2749 行）。

| 文件 | 集成时的处理 |
|---|---|
| `ui/classroom.tsx`（571 行） | **删除**。布局、顶栏、文件菜单、任务抽屉、反馈区、角色列、三端切换全部交给共享壳。其中的**工具栏**（添加积木 / 上移 / 下移 / 删除 / 数字框）迁入 `script-editor.tsx`（A1）。 |
| `ui/classroom.module.css` | 仅保留编辑器 / 舞台内部需要的样式，不得新增全局 token。其余删除。 |
| `ui/script-editor.tsx` | 改成符合 `EditorSlotProps`：从 `initial` 重建脚本；每次编辑 `onChange(program)`；内含移动端工具栏；remount 时完整还原。保留“选中状态按 ID 自管”（Blockly 12 的选中随键盘焦点丢失）。 |
| `ui/stage-view.tsx` | 改成 `StageSlot` 组件，状态类型 `S = { basket:{x,y}, fruit:{x,y}, assets }` **放在课程目录里**，不进共享核心。 |
| `vm-adapter.ts` | 改为接受壳分配的 `runId`；通用 `RunTrace` 映射：`frames[i] = {frame, inLoop, event:'move', 位移增量, 来源}`、`landingFrame`；落地时篮子 x / 水果 x 保留在适配器自己的 trace 里。 |
| `judge.ts` | 实现 `JudgmentAdapter`：输出 `layers = [stage, task, knowledge]` + “理解情况”；循环位移占比由本课自己从轨迹计算。**阈值只在 `params.ts`。** |
| `state.ts` / `contract.ts` / `params.ts` / `program.ts` / `compile.ts` / `reference.ts` | 基本不动（纯逻辑）。草稿信封与 `kidscoding-draft:G2-U3-L02` 已与共享一致。 |
| `app/learn/g2-u3-l02/page.tsx` | 改为渲染共享壳 + 本课的 `editorSlot` / `stageSlot` / 适配器 / 契约；或下线并改用共享路由，需首席定。 |
| `public/scratch-g2-u3-l02-sandbox.html` | **不动**（真实 VM 沙箱，已有 8 类拒绝测试和 6 个变异检验）。 |

## 五、必须保留的测试（禁止因 UI 集成删除或弱化）

| 套件 | 数量 | 集成时的变化 |
|---|---|---|
| `g2-u3-l02.test.ts`（Vitest） | 66 | 不变（纯逻辑）；若适配 `JudgmentAdapter` 改了 `judge` 的签名，只改调用方式，**不改期望值**。 |
| `g2-u3-l02-vm.spec.ts`（真实 VM 矩阵） | 21 | **不变**（只依赖沙箱与 `compile` / `judge`，不依赖页面）。 |
| `g2-u3-l02-classroom.spec.ts` | 15 个行为用例 + 1 个按 `L02_SHOT_DIR` 启用的截图用例；× [desktop / tablet / phone] 三视口 = 48 个实例，其中 5 个按设计跳过 | 用到 **51 个不同的 `l2-*` testid（外加 3 个动态拼接）**，需要映射到共享壳的定位。**只换定位，不放宽断言，不删用例。** |

用例清单（15 个行为用例）：首屏五要素；答案不提前 + 提示逐级；第一层预测；第二层（空 / 只有绿旗 / 错 / 对 / 改后失效）；舞台读 VM 状态且重跑不叠加；保存与刷新恢复；保存失败显示“未能保存”；迁移左边；迁移更快；切关不污染；运行中停止；文件菜单与导入拒绝；角色管理；溢出与遮挡；桌面真实指针拖放。

集成后必须重新验证：Scratch VM 行为、Blockly 编辑、`RunTrace` 判定、移动端积木操作、保存与恢复、运行结果失效、三端真实浏览器 E2E、**完整 GitHub Actions（且必须是执行了本课测试的那一套）**。

## 六、CI 与 Task-ID 的合并顺序（实测结论，详见 `CI-COVERAGE-PLAN.md` 第四节）

1. **#471 不能在 #470 之前单独合入 main**：main 上没有本课文件，#471 新增的 `vitest run src/features/lessons/g2-u3-l02` 与 `playwright test tests/e2e/g2-u3-l02-*.spec.ts` 都会 exit 1。不得用“文件不存在就跳过”规避。
2. 顺序只能是：候选证据（#471 Stacked 运行）→ #470 合入 main → #471 改基到 main 并合入。
3. #470 合入 main 的方式决定 #471 是否要改写历史：**merge commit** → 直接 retarget，门禁通过；**squash / rebase-merge** → `unknown task ID SYS-122`，需把 #471 的 3 个提交 cherry-pick 到新 main（实测无冲突、门禁通过），这需要**强制推送**（须首席授权）或**另开新分支 + 新 PR** 并关闭 #471。
4. **#470 的 CI 不覆盖本课测试**（base 是 main，main 的 workflow 不含本课 Job）。本课测试证据只存在于 #471 的运行里。
5. **刷新规程**（让 #471 的证据对应 #470 的最新候选 HEAD）：#470 每次出现可执行代码变化后，把课程分支**普通 merge** 进 `kiro/ci-g2-u3-l02-coverage`（不强推），等 #471 的 CI 跑完。实测：#471 相对课程分支的 diff 仍是 2 个文件 / +64，门禁通过。**当前**：#470 在 `21dbf83`，#471 的基线是 `429f2f6`，差异仅一个纯文档提交，已有证据仍有效；**#470 最终合并前必须刷新一次**。
6. 如果 2 号 / 首席要求改变这个顺序，**重新提交门禁兼容方案**，不要擅自合并。已知的门禁约束：`scripts/check-task-ledger.py` 要求声明的 Task-ID 集合与实际改动的台账条目集合完全一致；合并 #471 进 #470 会使 #470 的改动集合多出 `SYS-122`。

## 七、环境与复现（本地证据怎么来的）

- 本沙箱环境访问不到 jsDelivr 和 Playwright 浏览器下载域。本地用 npm 同版本包（`scratch-vm@5.0.300`、`scratch-storage@4.0.0`）经 `SCRATCH_VM_LOCAL_CDN=1` 覆盖，浏览器是 npm 的 Chromium 153（不是 CI 的 Chrome 稳定版）。
- 该 Chromium 没有中文字体；用 `L02_CJK_FONT_FILE` 指向 woff2 字体注入（仅测试用，CI 不设置）。
- 本机 Node 22.23 与 Playwright 1.58 / Next 的 PostCSS 加载有兼容问题，用 `NODE_OPTIONS=--no-experimental-require-module` 绕过。
- 这些只影响本地复现，**权威证据是 GitHub Actions**（#471 的运行）。

## 八、已知限制与未验证（不得宣称）

- 真实手机 / 平板触摸、Safari、Firefox、Chrome 稳定版、手机上的真实触摸拖放均未验证；独立人工教研、儿童试学均未做。
- CI 上 Chrome 渲染的中文字体效果没有人工看过。
- 系统只能证明“这一次运行的行为”，**不能证明学生理解**；界面固定写“需要进一步解释或练习”，任何结果都不写“已掌握”。
- 课程目录 JSON（`full-catalog-v1.json`、`track-g2-detailed-lessons-v1.json`、`priority-asset-requirements-v1.json`）仍写“侦测 / 鼠标跟随 / 触碰计分”，与批准的“坐标读取与位置对准”矛盾；这些是首席受控文件，**未改**。清单见 `TEACHING-PLAN.md` 第八节。L02（读取坐标、计算位移、对准落点）与 L04（碰撞与计分）的边界也写在那里，供课程架构负责人修订。
- 既有全局缺口（非本课特有）：`apps/web/package.json`、`playwright.config.ts`、`next.config.ts` 的变更不会触发 `curriculum-content.yml`。
- 观察到的既有偶发失败：`scratch-real-vm-shard-s4`（G3-U1-L02 云端保存恢复用例）在近 30 次运行里有 3 次失败；与本课无关，推断为 CDN 偶发，未证明根因。

## 九、未解决的阻塞

| 阻塞 | 负责 |
|---|---|
| `StageSlot` 课程专属类型安全状态；`RunTrace` 位移增量与来源 | 2 号（#469） |
| #470 合入 main 的方式（merge commit / squash / rebase）与是否授权强制推送 #471 | 首席 |
| 目录 JSON 与 `LESSON-CONTRACT.md` 示例里与新定位矛盾的文字 | 首席 / 课程架构负责人 |
| 独立审核、儿童试学、真实设备验证 | 首席 / 教研 |
