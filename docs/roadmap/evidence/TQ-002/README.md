# TQ-002 前 9 节 Blockly 教学质量审计（lesson-01～09）

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`（分支 tq-002，基于最新 main）；审计日期：2026-10-19
- 工具：TQ-001 `apps/web/src/features/curriculum/teaching-review.ts`；逐课记录 `docs/roadmap/teaching-reviews/lesson-0{1..9}-*.json`；报告全文见 [reports.md](./reports.md)（由 `renderReviewMarkdown` 生成）
- **评分性质：AI 参考分**（reviewerKind=ai，independent=true，与 lesson-10～12 同一约定）。这是按实现代码逐行核对的审计，属于实现者视角的评审，**不是独立人工教研复核，也没有任何儿童试学**。按 09，AI 评分不能认定优质。
- **审计 ≠ 修复**：本任务没有改动任何课程代码或内容，9 节课**保持 L3 实验可试玩**（lesson-maturity.ts 计算结果，审计时已核对），不因本审计升级或降级。
- 所有结论只依据代码实际行为：课程数据 `apps/web/src/content/curriculum/launch-lessons.ts`，舞台/执行器 `apps/web/src/features/lessons/playable-stage/`、`apps/web/src/features/lessons/blockly/observable-run.ts`，课堂路由 `apps/web/src/app/learn/lesson/[lessonId]/page.tsx`，E2E `blockly-first-run / blockly-forest-sequence / blockly-meadow-journey / blockly-garden-click.spec.ts`。没有截图或录屏证据。

## 汇总

判定口径（对 5～7 岁从严）：
- **两次不同动手**：至少两项**目标不同**的亲手搭建；同一程序反复点“运行”、或在同一程序上只多接一块，不算第二项。
- **纠错**：课程流程里孩子必须真的遇到一次失败、看到预期与实际的差异、再修好（参照 lesson-10 step-4）。单元测试/工程 E2E 里的反例不算。
- **开放创作**：孩子有真实可选、引擎也支持的自主选择。
- **作品**：可运行、可保存重开、可修改的成果。完成页只有静态预览的记为“弱”。

| 课程 | AI 参考分 | 分段 | 两次不同动手 | 纠错 | 开放创作 | 作品 | 主要缺口 | 阻塞 / 硬否决 |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| lesson-01-forest-hello | 33 | <80 退回重做 | 无 | 无 | 无 | 无（只有课时快照） | 5 步里 step-1～3 目标完全相同、step-4～5 相同；实际只搭了一次“开始→移动” | 否决：no-failure-test |
| lesson-02-forest-greeting | 34 | <80 退回重做 | 无 | 无 | 无（声称有，实际没有） | 无（只有课时快照） | step-5“从预设对白里选一句”不存在：say_line 没有文本字段，对白写死“你好！” | 否决：no-failure-test、**rigid-answer** |
| lesson-03-forest-story | 27 | <80 退回重做 | 无 | 无 | 无 | 弱（单元作品，只能静态预览） | 最终程序与第 2 课完全相同，没有新知识 | 否决：no-failure-test |
| lesson-04-meadow-scene | 35 | <80 退回重做 | 无 | 无 | 无 | 无（只有课时快照） | 只新增“切换场景”一块；没有先后顺序对比 | 否决：no-failure-test |
| lesson-05-meadow-order | 34 | <80 退回重做 | 无 | 无 | 无 | 无（只有课时快照） | “再做一次”接在“切换场景”后，实际重复的是移动，和积木名字面意思冲突 | 否决：no-failure-test |
| lesson-06-meadow-story | 31 | <80 退回重做 | 无 | 无 | 无 | 弱（单元作品，只能静态预览） | = 第 5 课 + 一句写死的“我到草地啦！” | 否决：no-failure-test |
| lesson-07-garden-click | 43 | <80 退回重做 | 无 | 无（只有“未点击不执行”的边界） | 无 | 无（只有课时快照） | 点击事件真实、有预测，但 step-2～5 目标完全相同 | 否决：no-failure-test |
| lesson-08-garden-dialogue | 37 | <80 退回重做 | 无 | 无（只有边界） | 无 | 无（只有课时快照） | 只是把第 2 课“动→说”搬到点击事件下；预测题与第 7 课相同 | 否决：no-failure-test |
| lesson-09-garden-story | 33 | <80 退回重做 | 无 | 无 | 无 | 弱（单元作品，只能静态预览） | step-5 写“连着动两次，再回一句话”，照做会被判“说话的时机不对”，只能“动→说→再动”才通过 | 否决：no-failure-test、**rigid-answer** |

9 节课全部 <80，**全部不是优质候选**。共性：每课只有一条“照指令逐块搭→运行成功”的路径，5 步里有 2～3 步是同一目标重复运行。执行是真实的（SYS-103 可观察结果判定，等价程序可以通过），但缺少第二项不同练习、设计好的纠错、开放创作和可重开的作品。

### 9 条差距记录（gap）
1. **lesson-01**：一次搭建 + 四次重复运行；没有第二项练习、没有纠错；补救跳到“点击触发”。
2. **lesson-02**：宣称“自选对白”但引擎不支持（硬否决 rigid-answer）；parentAdvice 让家长“一起换一句对白”，会误导家长。
3. **lesson-03**：与 lesson-02 的最终程序逐块相同；所谓“第一个完整作品”没有任何孩子的选择。
4. **lesson-04**：只新增 switch_scene；“先切换后移动”的错误只在单测里出现，课堂不用。
5. **lesson-05**：“再做一次”语义与名字冲突；allowedBlocks 放出 say_line，但本课任何一步加上它都会被判错。
6. **lesson-06**：= lesson-05 + 写死的说话；单元作品不能重开或修改。
7. **lesson-07**：概念最清楚（armed→真实点击），但 4 步重复同一目标，同一道预测题每步都问。
8. **lesson-08**：概念重复（第 2 课搬到点击）；“试试不同的点法”在产品里没有对应能力。
9. **lesson-09**：指令/预览文案与判定顺序矛盾（硬否决 rigid-answer）；“再做一次”接在说话后却重复移动。

### 9 条阻塞证据（blocker evidence）
| 课程 | 证据 |
| --- | --- |
| 共性（9 课） | `playable-stage.tsx` 没有取用 `useBlockExecutor().errorMessage`，出错时只显示“积木好像不太对…需要和任务要求的积木一样哦”；`build-hint-state.ts` 首次失败直接跳第 2 层，第 1 层永不显示；第 3 层统一 `remedial-click-trigger`（`remedial-lessons.ts` steps 为空）；完成页 `project/[projectId]/complete/page.tsx` 对 1～9 课只渲染 `PreviewStage` 静态文案（只有 10～12 课有可运行的 `DuoProject`）；家长端 `build-parent-overview.ts` 按课程 ID 返回固定文案 |
| lesson-01 | `launch-lessons.ts` step-1/2/3 requiredBlockTypes 都是 `['when_start']`；`blockly-first-run.spec.ts` 循环里 5 步中只在 step 3 加一块积木 |
| lesson-02 | `register-kids-blocks.ts` say_line 只有 field_image；`observable-run.ts`/`use-block-executor.ts` 森林对白写死“你好！”；`blockly-forest-sequence.spec.ts` 只断言“你好！” |
| lesson-03 | 最终 requiredBlockTypes 与 lesson-02 相同 `[when_start, move_right, say_line]` |
| lesson-04 | step-2/3、step-4/5 目标相同；`observable-run.test.ts` 的“先切换后移动”反例未进入课堂 |
| lesson-05 | `observable-run.ts` simulateProgram：repeat_twice 只检查之前是否移动过，接在 switch_scene 后仍 +100 |
| lesson-06 | 最终程序 = lesson-05 + say_line；对白写死“我到草地啦！” |
| lesson-07 | step-2～5 requiredBlockTypes 都是 `[when_clicked, move_right]`；`blockly-garden-click.spec.ts` performClickStep 每步相同 |
| lesson-08 | 最终程序 = lesson-07 + say_line；预测题与第 7 课相同 |
| lesson-09 | 审计时用 vitest 探针调用 `evaluateObservable(['when_clicked','move_right','say_line','repeat_twice'], 被点击时→移动→再做一次→说话)`，结果 passed=false，reason“说话的时机不对：要在走完 100 步时说，实际是在 200 步时说”；`preview-stage.tsx` 文案“连着动两次，再用一句话回应你” |

## 建议修复任务（分组，未在本任务执行）
1. **TQ-002a 课堂反馈管线（9 课共性，先做）**：PlayableStage 显示 observable-run 的具体差异原因（目标 vs 实际），删掉“需要和任务要求的积木一样”；修正 build-hint-state 下标，让三层提示按 1→2→3 出现，运行失败也计入；按单元配置补救（开始事件 / 场景切换 / 点击），补救页要有可操作的内容。
2. **TQ-002b 指令与判定矛盾（硬否决，优先）**：lesson-09 step-5 指令、预览文案和判定顺序统一；lesson-02 step-5 与配音、parentAdvice 删掉“自选对白”，或改为引擎真实支持的对白选择（同时满足 TQ-003 的开放创作需求）；lesson-08 parentAdvice 的“不同点法”同样处理。
3. **TQ-002c “再做一次”语义**：重新定义为“重复上一个移动”并改名/改说明，或改成真正的“重复上一块”；同步 lesson-05/06/09 文案与执行器。
4. **TQ-002d 每课纠错步骤**：参照 lesson-10 的 observedMistake 门槛，每课加一个设计好的真实错误→观察→修复：L01 漏开始积木、L02/L03 先说后走、L04 先切换后移动、L05 再做一次放在移动前、L07 误用“开始时”导致不点也动、L08/L09 说话时机。
5. **TQ-002e 第二项不同练习 + 去重**：压缩重复运行的步骤，每课补一项目标不同的练习（改距离、换角色、对比两个事件/两种顺序的结果）；重新定位 lesson-03/06/08 这几课与前课逐块重复的内容。
6. **TQ-002f 单元作品（L03/L06/L09）**：完成页给 1～9 课提供与 DuoProject 同等的可运行、可本机保存、可重开修改的作品；加入孩子的选择（对白/距离/目的地），允许两种正确方案；补 E2E 保存→重开→修改。
7. **TQ-002g 评价与证据**：记录孩子的预测/反思，家长报告改为基于真实运行与错误数据；补三端截图/录屏；儿童隐私与云同步审查（硬否决 minor-privacy-risk 目前为 unchecked）；之后再请独立人工复核。
