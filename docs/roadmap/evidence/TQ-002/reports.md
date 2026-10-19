# TQ-002 逐课审核报告（renderReviewMarkdown 生成）

> AI 参考评分，不能认定优质；审计不等于修复，9 课保持 L3。

## 课程质量审核：lesson-01-forest-hello

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`；审核日期：2026-10-19
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（约 5～7 岁）；先修：无（启蒙第一课）；新知识：开始事件“开始时”、向右移动
- 成熟度：L3；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 11/20 | apps/web/src/content/curriculum/launch-lessons.ts lesson-01：新概念只有“开始时”+“向右移动”，适合 5～7 岁第一课<br>apps/web/tests/e2e/blockly-first-run.spec.ts 第 4 步后断言小狐狸 transform=100 | step-1/2/3 的 requiredBlockTypes 完全相同（都只要 when_start），step-4/5 也相同：五步里只有两个不同目标<br>没有说明“开始时”为什么需要（不放会怎样），概念只是被告知 |
| 教学故事与思维激活 | 6/15 | apps/web/src/content/curriculum/launch-lessons.ts goal“让小狐狸从舞台一边走到另一边，完成第一次出场”；foundation-voiceovers.ts 每步一句配音 | 没有预测环节（不会先问“运行后小狐狸会怎样”）<br>每一步都直接告诉孩子放哪块积木，孩子不决定下一步 |
| 实际操作与能力形成 | 8/25 | apps/web/tests/e2e/blockly-first-run.spec.ts “first forest Blockly lesson requires actual execution before each step”：真实添加积木、真实运行、未运行不能完成<br>apps/web/src/app/learn/lesson/[lessonId]/page.tsx needsRun：必须舞台运行成功才能完成本步 | 真正的搭建动作只有一次（step-4 加上移动）；step-1～3 是同一程序运行三次，step-5 再运行一次<br>没有改变参数/角色/距离的第二种练习，不满足“两项目标不同的动手练习” |
| 纠错与个性化反馈 | 4/15 | apps/web/src/content/curriculum/launch-lessons.ts lesson-01 hintLayers 三层文案<br>apps/web/tests/e2e/blockly-first-run.spec.ts “bad Blockly program cannot be passed off as actual execution” | 运行出错时舞台只显示通用文案“积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。”：apps/web/src/features/lessons/playable-stage/playable-stage.tsx 没有取用 useBlockExecutor 返回的 errorMessage，observable-run 已算出的具体差异原因（如“说话的时机不对”）孩子看不到；“和任务要求的积木一样”还与 SYS-103 等价方案判定相矛盾<br>apps/web/src/features/lessons/build-hint-state.ts 以 failedAttempts 作下标（min(failedAttempts, 2)），第一次失败直接显示第 2 层，第 1 层 repeat_goal 在失败后永远不会出现；失败次数只在点“完成这一步”时增加，运行出错本身不计<br>第 3 层补救统一跳到 remedial-click-trigger（“先学会点击触发”，apps/web/src/content/curriculum/remedial-lessons.ts 中 steps 为空，/learn/remedial 页面是三张静态卡），与本课的开始事件/场景知识点不对应；已存在的 remedial-scene-switch 没有被使用<br>没有设计好的错误案例让孩子观察并修正 |
| 创造/迁移/项目成果 | 1/15 | apps/web/src/app/project/[projectId]/complete/page.tsx 保存本课积木快照并显示静态预览 | 没有任何自由改造或选择<br>作品只能看静态预览，不能重开运行或修改<br>目标唯一（只能走 100 步，多走一步会被判“目标：一共走 100 步；实际 200 步”） |
| 评价、复盘与可信度 | 3/10 | apps/web/src/content/curriculum/launch-lessons.ts lesson-01-forest-hello.parentAdvice 请孩子向家长演示/讲述<br>apps/web/src/app/project/[projectId]/complete/page.tsx 完成页显示保存的积木快照（apps/web/src/features/lessons/blockly/preview-stage.tsx 静态预览） | 家长端 apps/web/src/features/parent/build-parent-overview.ts describeProjectResult 按课程 ID 返回固定文案，不基于孩子真实的运行、错误或用时数据<br>课堂没有记录孩子自己的解释或反思，只有完成与否 |
| **总计** | **33/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | PlayableStage 读取 Blockly 实际连接顺序逐块解释执行（apps/web/src/features/lessons/playable-stage/use-block-executor.ts 非双角色分支 + apps/web/src/features/lessons/blockly/observable-run.ts simulateProgram），按位置/场景/对白判定（SYS-103），不是预制动画；属于教学解释器而非完整 Scratch VM。对白内容由引擎写死（say_line 积木无文本字段，apps/web/src/features/lessons/blockly/register-kids-blocks.ts）。 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | pass | 孩子亲手点积木面板添加积木并运行；但多步只是重新运行同一程序（见“实际操作”维度）。 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 课程五步都只有“搭对→运行成功”的路径，没有任何一步要求孩子先遇到真实错误、看到预期与实际的差异再修好（对照 lesson-10 step-4 的 observedMistake 门槛）。引擎层的反例只存在于单元测试/工程 E2E，不构成本课的纠错教学。（工程负例：apps/web/tests/e2e/blockly-first-run.spec.ts 空程序运行被拒。） |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | pass | 没有宣称自由创作；判定按可观察结果（evaluateObservable），等价程序可以通过（observable-run.test.ts “accepts a reasonable equivalent”）。 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 完成页标题是“你完成了《课名》”，展示的是本课真实运行通过后保存的积木快照（apps/web/src/app/project/[projectId]/complete/page.tsx），没有虚构作品；但预览是 apps/web/src/features/lessons/blockly/preview-stage.tsx 按积木种类拼出的静态文案，不能重新运行或修改。 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 角色与场景是 apps/web/src/features/lessons/playable-stage/character-art.tsx 中代码绘制的内联 SVG；配音为文本稿（foundation-voiceovers.ts），未发现外部商用素材。 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | unchecked | 完成课时会调用 syncGuestSnapshot 向 /api/guest 上传进度与作品快照（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext）；本次审计没有审查云端隔离与儿童隐私，lesson-maturity 也把“儿童隐私、输入和沙箱安全完成审核”列为未完成。 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | pass | 完成时 writeGuestProgress 失败会提示“本机存储失败”，不跳转、不发奖励；云同步失败显示失败并可重试（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext；local-progress-storage.test.ts、sync-guest-snapshot.test.ts）。草稿保存按返回值显示已保存/失败。 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 计算为 L3 实验可试玩（审计时用 vitest 探针调用 getLessonMaturity 确认 9 课均为 L3，blockers 首条“发布验收未完成”），没有标成正式发布。 |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 | 开始时→向右移动→运行：小狐狸移动到 100，舞台显示“运行成功”，五步完成后跳完成页（apps/web/tests/e2e/blockly-first-run.spec.ts） |
| 错误/边界 | 工程负例：未放积木直接运行→舞台“积木好像不太对”，点“完成这一步”仍停在第 1 步（apps/web/tests/e2e/blockly-first-run.spec.ts “bad Blockly program…”）。课堂流程本身不安排孩子经历和修复此错误。 |
| 三层提示 | apps/web/src/content/curriculum/launch-lessons.ts lesson-01-forest-hello.hintLayers[0] repeat_goal（失败后实际不会显示，见 build-hint-state.ts） → apps/web/src/content/curriculum/launch-lessons.ts lesson-01-forest-hello.hintLayers[1] show_block → apps/web/src/content/curriculum/launch-lessons.ts lesson-01-forest-hello.hintLayers[2] offer_remedial → remedial-click-trigger |
| 练习 A / B | 拼“开始时→向右移动”并运行，小狐狸走上舞台（100） / 缺 |
| 不同正确方案 | 缺 |
| 保存重开 | 缺 |
| E2E | apps/web/tests/e2e/blockly-first-run.spec.ts |

**结论**：不是优质候选 — 总分 33，低于 80 退回重做；触发硬否决：no-failure-test；硬否决未核查：minor-privacy-risk；AI 评分只能作参考，不能认定优质；运行证据缺少：两项目标不同的亲手练习、两种不同的正确方案、保存重开验证

**阻塞**：五步只有两个不同目标，需要重新设计第二项不同目标的动手练习（如改变距离/换角色）；缺少“先看到错误再修好”的步骤（如漏放开始积木）；舞台需显示具体错误原因；补救跳转需对应开始事件

---

## 课程质量审核：lesson-02-forest-greeting

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`；审核日期：2026-10-19
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（约 5～7 岁）；先修：lesson-01：开始时、向右移动；新知识：说一句话、动作与对白的先后顺序
- 成熟度：L3；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 11/20 | apps/web/src/content/curriculum/launch-lessons.ts lesson-02：在上一课程序后加“说一句话”，引出顺序<br>apps/web/src/features/lessons/blockly/observable-run.test.ts 反例“先说话后移动”判为“说话的时机”不对 | step-1/2 目标相同（开始+移动），step-3/4/5 目标相同（开始+移动+说话）：五步只有两个目标<br>step-4“调整顺序更自然”并没有给出错误顺序让孩子调整，程序已经是对的 |
| 教学故事与思维激活 | 6/15 | apps/web/src/content/curriculum/launch-lessons.ts goal“让小狐狸出场后说一句欢迎的话” | 没有预测（先说还是先走会有什么不同）<br>step-5 承诺“换一句自己的话”，实际做不到，故事表达落空 |
| 实际操作与能力形成 | 9/25 | apps/web/tests/e2e/blockly-forest-sequence.spec.ts “forest greeting lesson really moves then speaks before completion”：断言 100 步与“你好！”<br>apps/web/tests/e2e/lesson-draft-persistence.spec.ts（LESSON_ID=lesson-02）刷新后恢复积木草稿 | 新的搭建动作只有一次（step-3 加说话），其余为重复运行<br>step-5“选一句你喜欢的话”在引擎中不存在，不能算第二项练习 |
| 纠错与个性化反馈 | 4/15 | apps/web/src/content/curriculum/launch-lessons.ts lesson-02 hintLayers 三层文案<br>apps/web/src/features/lessons/playable-stage/use-block-executor.test.ts “executes a three-block forest greeting and produces the visible speech bubble” | 运行出错时舞台只显示通用文案“积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。”：apps/web/src/features/lessons/playable-stage/playable-stage.tsx 没有取用 useBlockExecutor 返回的 errorMessage，observable-run 已算出的具体差异原因（如“说话的时机不对”）孩子看不到；“和任务要求的积木一样”还与 SYS-103 等价方案判定相矛盾<br>apps/web/src/features/lessons/build-hint-state.ts 以 failedAttempts 作下标（min(failedAttempts, 2)），第一次失败直接显示第 2 层，第 1 层 repeat_goal 在失败后永远不会出现；失败次数只在点“完成这一步”时增加，运行出错本身不计<br>第 3 层补救统一跳到 remedial-click-trigger（“先学会点击触发”，apps/web/src/content/curriculum/remedial-lessons.ts 中 steps 为空，/learn/remedial 页面是三张静态卡），与本课的开始事件/场景知识点不对应；已存在的 remedial-scene-switch 没有被使用 |
| 创造/迁移/项目成果 | 1/15 | apps/web/src/app/project/[projectId]/complete/page.tsx 保存积木快照 | step-5 与配音声称可“从预设对白里选一句”，但 say_line 没有文本/下拉字段（apps/web/src/features/lessons/blockly/register-kids-blocks.ts），森林对白在 apps/web/src/features/lessons/blockly/observable-run.ts 与 apps/web/src/features/lessons/playable-stage/use-block-executor.ts 中写死为“你好！”<br>作品不能重开运行或修改 |
| 评价、复盘与可信度 | 3/10 | apps/web/src/content/curriculum/launch-lessons.ts lesson-02-forest-greeting.parentAdvice 请孩子向家长演示/讲述<br>apps/web/src/app/project/[projectId]/complete/page.tsx 完成页显示保存的积木快照（apps/web/src/features/lessons/blockly/preview-stage.tsx 静态预览） | 家长端 apps/web/src/features/parent/build-parent-overview.ts describeProjectResult 按课程 ID 返回固定文案，不基于孩子真实的运行、错误或用时数据<br>课堂没有记录孩子自己的解释或反思，只有完成与否<br>parentAdvice 让家长“一起换一句对白”，产品不支持，会误导家长 |
| **总计** | **34/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | PlayableStage 读取 Blockly 实际连接顺序逐块解释执行（apps/web/src/features/lessons/playable-stage/use-block-executor.ts 非双角色分支 + apps/web/src/features/lessons/blockly/observable-run.ts simulateProgram），按位置/场景/对白判定（SYS-103），不是预制动画；属于教学解释器而非完整 Scratch VM。对白内容由引擎写死（say_line 积木无文本字段，apps/web/src/features/lessons/blockly/register-kids-blocks.ts）。 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | pass | 孩子亲手点积木面板添加积木并运行；但多步只是重新运行同一程序（见“实际操作”维度）。 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 课程五步都只有“搭对→运行成功”的路径，没有任何一步要求孩子先遇到真实错误、看到预期与实际的差异再修好（对照 lesson-10 step-4 的 observedMistake 门槛）。引擎层的反例只存在于单元测试/工程 E2E，不构成本课的纠错教学。（apps/web/src/features/lessons/blockly/observable-run.test.ts 有“先说后走”反例单测，但课堂未用。） |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | fail | step-5“换一句自己的话：从预设对白里选一句你喜欢的话”（配音“选一句你喜欢的话”，parentAdvice“再一起换一句对白”）声称有自主选择，但 say_line 积木只有图标字段（apps/web/src/features/lessons/blockly/register-kids-blocks.ts），对白由引擎写死为“你好！”（apps/web/src/features/lessons/blockly/observable-run.ts、apps/web/src/features/lessons/playable-stage/use-block-executor.ts），apps/web/tests/e2e/blockly-forest-sequence.spec.ts 也只断言“你好！”。只有唯一答案却宣称可自选。 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 完成页标题是“你完成了《课名》”，展示的是本课真实运行通过后保存的积木快照（apps/web/src/app/project/[projectId]/complete/page.tsx），没有虚构作品；但预览是 apps/web/src/features/lessons/blockly/preview-stage.tsx 按积木种类拼出的静态文案，不能重新运行或修改。 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 角色与场景是 apps/web/src/features/lessons/playable-stage/character-art.tsx 中代码绘制的内联 SVG；配音为文本稿（foundation-voiceovers.ts），未发现外部商用素材。 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | unchecked | 完成课时会调用 syncGuestSnapshot 向 /api/guest 上传进度与作品快照（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext）；本次审计没有审查云端隔离与儿童隐私，lesson-maturity 也把“儿童隐私、输入和沙箱安全完成审核”列为未完成。 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | pass | 完成时 writeGuestProgress 失败会提示“本机存储失败”，不跳转、不发奖励；云同步失败显示失败并可重试（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext；local-progress-storage.test.ts、sync-guest-snapshot.test.ts）。草稿保存按返回值显示已保存/失败。 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 计算为 L3 实验可试玩（审计时用 vitest 探针调用 getLessonMaturity 确认 9 课均为 L3，blockers 首条“发布验收未完成”），没有标成正式发布。 |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 | 开始时→向右移动→说一句话：小狐狸走到 100 后头上出现“你好！”（apps/web/tests/e2e/blockly-forest-sequence.spec.ts） |
| 错误/边界 | 单测反例：开始时→说一句话→向右移动，evaluateObservable 判“说话的时机不对”（apps/web/src/features/lessons/blockly/observable-run.test.ts）；课堂 UI 只显示通用错误，课程流程未安排该错误。 |
| 三层提示 | apps/web/src/content/curriculum/launch-lessons.ts lesson-02-forest-greeting.hintLayers[0] repeat_goal（失败后实际不会显示，见 build-hint-state.ts） → apps/web/src/content/curriculum/launch-lessons.ts lesson-02-forest-greeting.hintLayers[1] show_block → apps/web/src/content/curriculum/launch-lessons.ts lesson-02-forest-greeting.hintLayers[2] offer_remedial → remedial-click-trigger |
| 练习 A / B | 在移动后接“说一句话”，小狐狸先出场再打招呼 / 缺 |
| 不同正确方案 | 缺 |
| 保存重开 | 缺 |
| E2E | apps/web/tests/e2e/blockly-forest-sequence.spec.ts、apps/web/tests/e2e/lesson-draft-persistence.spec.ts |

**结论**：不是优质候选 — 总分 34，低于 80 退回重做；触发硬否决：no-failure-test、rigid-answer；硬否决未核查：minor-privacy-risk；AI 评分只能作参考，不能认定优质；运行证据缺少：两项目标不同的亲手练习、两种不同的正确方案、保存重开验证

**阻塞**：say_line 需要可选对白（引擎字段 + 判定），否则删掉 step-5 的“自选对白”说法；补一个“先说后走”的真实错误观察与修复步骤；舞台显示具体错误原因；补救跳转对应本课

---

## 课程质量审核：lesson-03-forest-story

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`；审核日期：2026-10-19
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（约 5～7 岁）；先修：lesson-01、lesson-02：开始时、向右移动、说一句话；新知识：（无新概念）把动作与对白连成“完整小故事”
- 成熟度：L3；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 6/20 | apps/web/src/content/curriculum/launch-lessons.ts lesson-03 最终目标 [when_start, move_right, say_line] | 最终程序与 lesson-02 完全相同（同积木、同对白“你好！”、同场景），没有新知识点或新能力，属于 09 所说“同一种动作讲三遍”<br>step-3/4/5 目标相同 |
| 教学故事与思维激活 | 5/15 | apps/web/src/content/curriculum/launch-lessons.ts goal“完成第一个完整小故事”；build-project-completion-copy.ts 单元作品文案 | “故事”只是一句固定的“你好！”，没有情节、没有第二个角色互动（模板里的小兔子从不参与）<br>孩子不做任何故事决定 |
| 实际操作与能力形成 | 6/25 | apps/web/tests/e2e/blockly-forest-sequence.spec.ts “forest first story progresses from start to move to speech through real Blockly execution” | 操作与上一课逐块重复，没有新的动手目标<br>没有第二项不同练习 |
| 纠错与个性化反馈 | 4/15 | apps/web/src/content/curriculum/launch-lessons.ts lesson-03 hintLayers<br>apps/web/tests/e2e/blockly-forest-sequence.spec.ts 断言未运行不能完成（“请先点击舞台”） | 运行出错时舞台只显示通用文案“积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。”：apps/web/src/features/lessons/playable-stage/playable-stage.tsx 没有取用 useBlockExecutor 返回的 errorMessage，observable-run 已算出的具体差异原因（如“说话的时机不对”）孩子看不到；“和任务要求的积木一样”还与 SYS-103 等价方案判定相矛盾<br>apps/web/src/features/lessons/build-hint-state.ts 以 failedAttempts 作下标（min(failedAttempts, 2)），第一次失败直接显示第 2 层，第 1 层 repeat_goal 在失败后永远不会出现；失败次数只在点“完成这一步”时增加，运行出错本身不计<br>第 3 层补救统一跳到 remedial-click-trigger（“先学会点击触发”，apps/web/src/content/curriculum/remedial-lessons.ts 中 steps 为空，/learn/remedial 页面是三张静态卡），与本课的开始事件/场景知识点不对应；已存在的 remedial-scene-switch 没有被使用 |
| 创造/迁移/项目成果 | 3/15 | build-project-completion-copy.ts lesson-03 “第一个完整作品”<br>apps/web/src/app/project/[projectId]/complete/page.tsx 保存积木快照 + 静态预览 | 单元作品与第 2 课相同，孩子没有任何个人选择<br>作品不能重开、运行、修改 |
| 评价、复盘与可信度 | 3/10 | apps/web/src/content/curriculum/launch-lessons.ts lesson-03-forest-story.parentAdvice 请孩子向家长演示/讲述<br>apps/web/src/app/project/[projectId]/complete/page.tsx 完成页显示保存的积木快照（apps/web/src/features/lessons/blockly/preview-stage.tsx 静态预览） | 家长端 apps/web/src/features/parent/build-parent-overview.ts describeProjectResult 按课程 ID 返回固定文案，不基于孩子真实的运行、错误或用时数据<br>课堂没有记录孩子自己的解释或反思，只有完成与否 |
| **总计** | **27/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | PlayableStage 读取 Blockly 实际连接顺序逐块解释执行（apps/web/src/features/lessons/playable-stage/use-block-executor.ts 非双角色分支 + apps/web/src/features/lessons/blockly/observable-run.ts simulateProgram），按位置/场景/对白判定（SYS-103），不是预制动画；属于教学解释器而非完整 Scratch VM。对白内容由引擎写死（say_line 积木无文本字段，apps/web/src/features/lessons/blockly/register-kids-blocks.ts）。 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | pass | 孩子亲手点积木面板添加积木并运行；但多步只是重新运行同一程序（见“实际操作”维度）。 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 课程五步都只有“搭对→运行成功”的路径，没有任何一步要求孩子先遇到真实错误、看到预期与实际的差异再修好（对照 lesson-10 step-4 的 observedMistake 门槛）。引擎层的反例只存在于单元测试/工程 E2E，不构成本课的纠错教学。 |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | pass | 没有宣称自由创作；判定按可观察结果（evaluateObservable），等价程序可以通过（observable-run.test.ts “accepts a reasonable equivalent”）。 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 完成页写“你做出了一个完整作品”（build-project-completion-copy.ts），背后有本课真实运行通过后保存的积木快照，所以不算伪造；但作品只能看静态预览（apps/web/src/features/lessons/blockly/preview-stage.tsx），不能重开、运行、修改，作品质量很弱（见“创造”维度）。 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 角色与场景是 apps/web/src/features/lessons/playable-stage/character-art.tsx 中代码绘制的内联 SVG；配音为文本稿（foundation-voiceovers.ts），未发现外部商用素材。 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | unchecked | 完成课时会调用 syncGuestSnapshot 向 /api/guest 上传进度与作品快照（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext）；本次审计没有审查云端隔离与儿童隐私，lesson-maturity 也把“儿童隐私、输入和沙箱安全完成审核”列为未完成。 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | pass | 完成时 writeGuestProgress 失败会提示“本机存储失败”，不跳转、不发奖励；云同步失败显示失败并可重试（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext；local-progress-storage.test.ts、sync-guest-snapshot.test.ts）。草稿保存按返回值显示已保存/失败。 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 计算为 L3 实验可试玩（审计时用 vitest 探针调用 getLessonMaturity 确认 9 课均为 L3，blockers 首条“发布验收未完成”），没有标成正式发布。 |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 | 开始时→向右移动→说一句话：100 步 + “你好！”，跳完成页（apps/web/tests/e2e/blockly-forest-sequence.spec.ts） |
| 错误/边界 | 单测反例同 lesson-02（apps/web/src/features/lessons/blockly/observable-run.test.ts “先说后走”）；本课未安排错误。 |
| 三层提示 | apps/web/src/content/curriculum/launch-lessons.ts lesson-03-forest-story.hintLayers[0] repeat_goal（失败后实际不会显示，见 build-hint-state.ts） → apps/web/src/content/curriculum/launch-lessons.ts lesson-03-forest-story.hintLayers[1] show_block → apps/web/src/content/curriculum/launch-lessons.ts lesson-03-forest-story.hintLayers[2] offer_remedial → remedial-click-trigger |
| 练习 A / B | 重复 lesson-02 的“开始→移动→说话” / 缺 |
| 不同正确方案 | 缺 |
| 保存重开 | 缺 |
| E2E | apps/web/tests/e2e/blockly-forest-sequence.spec.ts |

**结论**：不是优质候选 — 总分 27，低于 80 退回重做；触发硬否决：no-failure-test；硬否决未核查：minor-privacy-risk；AI 评分只能作参考，不能认定优质；运行证据缺少：两项目标不同的亲手练习、两种不同的正确方案、保存重开验证

**阻塞**：与 lesson-02 内容重复，需要重新定位为单元项目课（加入第二角色/自选对白/孩子决定的情节）；单元作品需能重开运行和修改；缺纠错步骤

---

## 课程质量审核：lesson-04-meadow-scene

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`；审核日期：2026-10-19
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（约 5～7 岁）；先修：lesson-01～03：开始时、向右移动；新知识：切换场景
- 成熟度：L3；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 12/20 | apps/web/src/content/curriculum/launch-lessons.ts lesson-04 新概念“切换场景”<br>apps/web/tests/e2e/blockly-meadow-journey.spec.ts “lesson 4 switches real stage background”：断言 stage-current-scene 由森林变草地 | step-2/3 目标相同，step-4/5 目标相同<br>本单元的模板角色是小狐狸+草地小鸟，小鸟从不参与 |
| 教学故事与思维激活 | 6/15 | apps/web/src/content/curriculum/launch-lessons.ts step-1“先认识森林和草地两个画面” | 没有预测（不切换会怎样/先切换会怎样）<br>指令逐块告诉孩子放什么 |
| 实际操作与能力形成 | 9/25 | apps/web/tests/e2e/blockly-meadow-journey.spec.ts 第 4 课用例<br>apps/web/src/features/lessons/playable-stage/use-block-executor.ts switch_scene 真实改变舞台背景 | 只有一次新的搭建（加切换场景），其余为重复运行<br>没有第二项不同目标的练习 |
| 纠错与个性化反馈 | 4/15 | apps/web/src/content/curriculum/launch-lessons.ts lesson-04 hintLayers<br>apps/web/src/features/lessons/blockly/observable-run.test.ts 反例“先切换后移动”→“先在森林走 100 步，再换到草地” | 运行出错时舞台只显示通用文案“积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。”：apps/web/src/features/lessons/playable-stage/playable-stage.tsx 没有取用 useBlockExecutor 返回的 errorMessage，observable-run 已算出的具体差异原因（如“说话的时机不对”）孩子看不到；“和任务要求的积木一样”还与 SYS-103 等价方案判定相矛盾<br>apps/web/src/features/lessons/build-hint-state.ts 以 failedAttempts 作下标（min(failedAttempts, 2)），第一次失败直接显示第 2 层，第 1 层 repeat_goal 在失败后永远不会出现；失败次数只在点“完成这一步”时增加，运行出错本身不计<br>第 3 层补救统一跳到 remedial-click-trigger（“先学会点击触发”，apps/web/src/content/curriculum/remedial-lessons.ts 中 steps 为空，/learn/remedial 页面是三张静态卡），与本课的开始事件/场景知识点不对应；已存在的 remedial-scene-switch 没有被使用 |
| 创造/迁移/项目成果 | 1/15 | apps/web/src/app/project/[projectId]/complete/page.tsx 保存积木快照 | 没有任何创作选择<br>作品不能重开运行 |
| 评价、复盘与可信度 | 3/10 | apps/web/src/content/curriculum/launch-lessons.ts lesson-04-meadow-scene.parentAdvice 请孩子向家长演示/讲述<br>apps/web/src/app/project/[projectId]/complete/page.tsx 完成页显示保存的积木快照（apps/web/src/features/lessons/blockly/preview-stage.tsx 静态预览） | 家长端 apps/web/src/features/parent/build-parent-overview.ts describeProjectResult 按课程 ID 返回固定文案，不基于孩子真实的运行、错误或用时数据<br>课堂没有记录孩子自己的解释或反思，只有完成与否 |
| **总计** | **35/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | PlayableStage 读取 Blockly 实际连接顺序逐块解释执行（apps/web/src/features/lessons/playable-stage/use-block-executor.ts 非双角色分支 + apps/web/src/features/lessons/blockly/observable-run.ts simulateProgram），按位置/场景/对白判定（SYS-103），不是预制动画；属于教学解释器而非完整 Scratch VM。对白内容由引擎写死（say_line 积木无文本字段，apps/web/src/features/lessons/blockly/register-kids-blocks.ts）。 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | pass | 孩子亲手点积木面板添加积木并运行；但多步只是重新运行同一程序（见“实际操作”维度）。 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 课程五步都只有“搭对→运行成功”的路径，没有任何一步要求孩子先遇到真实错误、看到预期与实际的差异再修好（对照 lesson-10 step-4 的 observedMistake 门槛）。引擎层的反例只存在于单元测试/工程 E2E，不构成本课的纠错教学。（“先切换后移动”只在 apps/web/src/features/lessons/blockly/observable-run.test.ts 单测中出现。） |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | pass | 没有宣称自由创作；判定按可观察结果（evaluateObservable），等价程序可以通过（observable-run.test.ts “accepts a reasonable equivalent”）。 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 完成页标题是“你完成了《课名》”，展示的是本课真实运行通过后保存的积木快照（apps/web/src/app/project/[projectId]/complete/page.tsx），没有虚构作品；但预览是 apps/web/src/features/lessons/blockly/preview-stage.tsx 按积木种类拼出的静态文案，不能重新运行或修改。 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 角色与场景是 apps/web/src/features/lessons/playable-stage/character-art.tsx 中代码绘制的内联 SVG；配音为文本稿（foundation-voiceovers.ts），未发现外部商用素材。 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | unchecked | 完成课时会调用 syncGuestSnapshot 向 /api/guest 上传进度与作品快照（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext）；本次审计没有审查云端隔离与儿童隐私，lesson-maturity 也把“儿童隐私、输入和沙箱安全完成审核”列为未完成。 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | pass | 完成时 writeGuestProgress 失败会提示“本机存储失败”，不跳转、不发奖励；云同步失败显示失败并可重试（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext；local-progress-storage.test.ts、sync-guest-snapshot.test.ts）。草稿保存按返回值显示已保存/失败。 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 计算为 L3 实验可试玩（审计时用 vitest 探针调用 getLessonMaturity 确认 9 课均为 L3，blockers 首条“发布验收未完成”），没有标成正式发布。 |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 | 开始时→向右移动→切换场景：走 100 后舞台变草地（apps/web/tests/e2e/blockly-meadow-journey.spec.ts） |
| 错误/边界 | 单测反例：开始时→切换场景→向右移动，判“先在森林走 100 步，再换到草地；实际走了 0 步才换”（apps/web/src/features/lessons/blockly/observable-run.test.ts）；课堂未安排。 |
| 三层提示 | apps/web/src/content/curriculum/launch-lessons.ts lesson-04-meadow-scene.hintLayers[0] repeat_goal（失败后实际不会显示，见 build-hint-state.ts） → apps/web/src/content/curriculum/launch-lessons.ts lesson-04-meadow-scene.hintLayers[1] show_block → apps/web/src/content/curriculum/launch-lessons.ts lesson-04-meadow-scene.hintLayers[2] offer_remedial → remedial-click-trigger |
| 练习 A / B | 在移动后接“切换场景”，故事从森林来到草地 / 缺 |
| 不同正确方案 | 缺 |
| 保存重开 | 缺 |
| E2E | apps/web/tests/e2e/blockly-meadow-journey.spec.ts |

**结论**：不是优质候选 — 总分 35，低于 80 退回重做；触发硬否决：no-failure-test；硬否决未核查：minor-privacy-risk；AI 评分只能作参考，不能认定优质；运行证据缺少：两项目标不同的亲手练习、两种不同的正确方案、保存重开验证

**阻塞**：补第二项不同练习（如比较先切换/后切换的不同结果）；缺纠错步骤；补救跳转应用 remedial-scene-switch 并做成可操作内容

---

## 课程质量审核：lesson-05-meadow-order

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`；审核日期：2026-10-19
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（约 5～7 岁）；先修：lesson-04：切换场景；新知识：再做一次（重复移动）、事件顺序
- 成熟度：L3；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 9/20 | apps/web/src/content/curriculum/launch-lessons.ts lesson-05 新概念“再做一次”<br>apps/web/tests/e2e/blockly-meadow-journey.spec.ts “lesson 5 visibly repeats the prior movement”：断言 200 步 | “再做一次”接在“切换场景”后面，实际重复的是更早的移动（apps/web/src/features/lessons/blockly/observable-run.ts repeat_twice 只检查之前有没有移动），与积木名“再做一次（上一个动作）”的字面意思不一致，容易形成错误心智模型<br>课名“旅行要按顺序发生”，但顺序在第 4 课已经教过，本课没有让孩子比较不同顺序<br>step-4/5 目标相同；allowedBlocks 放出 say_line，但本课任何一步都不能用（加了会被判“还不用说话”） |
| 教学故事与思维激活 | 6/15 | apps/web/src/content/curriculum/launch-lessons.ts goal“先出发、再到达” | 没有预测、没有孩子的决定 |
| 实际操作与能力形成 | 10/25 | apps/web/tests/e2e/blockly-meadow-journey.spec.ts 第 5 课用例<br>apps/web/src/features/lessons/playable-stage/use-block-executor.test.ts “runs real meadow transition, repeat move and travel speech” | 新搭建只有一次（加再做一次），其余为重复运行<br>没有第二项不同目标的练习 |
| 纠错与个性化反馈 | 4/15 | apps/web/src/content/curriculum/launch-lessons.ts lesson-05 hintLayers<br>apps/web/src/features/lessons/playable-stage/use-block-executor.test.ts “refuses to repeat a movement that does not exist” | 运行出错时舞台只显示通用文案“积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。”：apps/web/src/features/lessons/playable-stage/playable-stage.tsx 没有取用 useBlockExecutor 返回的 errorMessage，observable-run 已算出的具体差异原因（如“说话的时机不对”）孩子看不到；“和任务要求的积木一样”还与 SYS-103 等价方案判定相矛盾<br>apps/web/src/features/lessons/build-hint-state.ts 以 failedAttempts 作下标（min(failedAttempts, 2)），第一次失败直接显示第 2 层，第 1 层 repeat_goal 在失败后永远不会出现；失败次数只在点“完成这一步”时增加，运行出错本身不计<br>第 3 层补救统一跳到 remedial-click-trigger（“先学会点击触发”，apps/web/src/content/curriculum/remedial-lessons.ts 中 steps 为空，/learn/remedial 页面是三张静态卡），与本课的开始事件/场景知识点不对应；已存在的 remedial-scene-switch 没有被使用 |
| 创造/迁移/项目成果 | 2/15 | apps/web/src/features/lessons/blockly/observable-run.test.ts “accepts a reasonable equivalent: two moves == move + repeat”：用第二块移动代替再做一次也能通过 | 等价方案孩子并不知道，没有被设计成选择<br>作品不能重开运行 |
| 评价、复盘与可信度 | 3/10 | apps/web/src/content/curriculum/launch-lessons.ts lesson-05-meadow-order.parentAdvice 请孩子向家长演示/讲述<br>apps/web/src/app/project/[projectId]/complete/page.tsx 完成页显示保存的积木快照（apps/web/src/features/lessons/blockly/preview-stage.tsx 静态预览） | 家长端 apps/web/src/features/parent/build-parent-overview.ts describeProjectResult 按课程 ID 返回固定文案，不基于孩子真实的运行、错误或用时数据<br>课堂没有记录孩子自己的解释或反思，只有完成与否 |
| **总计** | **34/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | PlayableStage 读取 Blockly 实际连接顺序逐块解释执行（apps/web/src/features/lessons/playable-stage/use-block-executor.ts 非双角色分支 + apps/web/src/features/lessons/blockly/observable-run.ts simulateProgram），按位置/场景/对白判定（SYS-103），不是预制动画；属于教学解释器而非完整 Scratch VM。对白内容由引擎写死（say_line 积木无文本字段，apps/web/src/features/lessons/blockly/register-kids-blocks.ts）。 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | pass | 孩子亲手点积木面板添加积木并运行；但多步只是重新运行同一程序（见“实际操作”维度）。 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 课程五步都只有“搭对→运行成功”的路径，没有任何一步要求孩子先遇到真实错误、看到预期与实际的差异再修好（对照 lesson-10 step-4 的 observedMistake 门槛）。引擎层的反例只存在于单元测试/工程 E2E，不构成本课的纠错教学。（“再做一次放在移动前”只在 apps/web/src/features/lessons/playable-stage/use-block-executor.test.ts 单测中出现。） |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | pass | 没有宣称自由创作；判定按可观察结果（evaluateObservable），等价程序可以通过（observable-run.test.ts “accepts a reasonable equivalent”）。 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 完成页标题是“你完成了《课名》”，展示的是本课真实运行通过后保存的积木快照（apps/web/src/app/project/[projectId]/complete/page.tsx），没有虚构作品；但预览是 apps/web/src/features/lessons/blockly/preview-stage.tsx 按积木种类拼出的静态文案，不能重新运行或修改。 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 角色与场景是 apps/web/src/features/lessons/playable-stage/character-art.tsx 中代码绘制的内联 SVG；配音为文本稿（foundation-voiceovers.ts），未发现外部商用素材。 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | unchecked | 完成课时会调用 syncGuestSnapshot 向 /api/guest 上传进度与作品快照（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext）；本次审计没有审查云端隔离与儿童隐私，lesson-maturity 也把“儿童隐私、输入和沙箱安全完成审核”列为未完成。 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | pass | 完成时 writeGuestProgress 失败会提示“本机存储失败”，不跳转、不发奖励；云同步失败显示失败并可重试（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext；local-progress-storage.test.ts、sync-guest-snapshot.test.ts）。草稿保存按返回值显示已保存/失败。 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 计算为 L3 实验可试玩（审计时用 vitest 探针调用 getLessonMaturity 确认 9 课均为 L3，blockers 首条“发布验收未完成”），没有标成正式发布。 |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 | 开始时→向右移动→切换场景→再做一次：草地上共 200 步（apps/web/tests/e2e/blockly-meadow-journey.spec.ts） |
| 错误/边界 | 单测：再做一次前没有移动→执行报错（apps/web/src/features/lessons/playable-stage/use-block-executor.test.ts “refuses to repeat a movement that does not exist”）；课堂未安排。 |
| 三层提示 | apps/web/src/content/curriculum/launch-lessons.ts lesson-05-meadow-order.hintLayers[0] repeat_goal（失败后实际不会显示，见 build-hint-state.ts） → apps/web/src/content/curriculum/launch-lessons.ts lesson-05-meadow-order.hintLayers[1] show_block → apps/web/src/content/curriculum/launch-lessons.ts lesson-05-meadow-order.hintLayers[2] offer_remedial → remedial-click-trigger |
| 练习 A / B | 在草地后接“再做一次”，再往前走 100 / 缺 |
| 不同正确方案 | 开始时→向右移动→切换场景→再做一次；开始时→向右移动→切换场景→向右移动（evaluateObservable 通过，AI 探针复现；同类等价见 apps/web/src/features/lessons/blockly/observable-run.test.ts） |
| 保存重开 | 缺 |
| E2E | apps/web/tests/e2e/blockly-meadow-journey.spec.ts |

**结论**：不是优质候选 — 总分 34，低于 80 退回重做；触发硬否决：no-failure-test；硬否决未核查：minor-privacy-risk；AI 评分只能作参考，不能认定优质；运行证据缺少：两项目标不同的亲手练习、保存重开验证

**阻塞**：“再做一次”语义需重新定义或改名（重复的是移动，不是上一块）；补第二项不同练习和纠错步骤

---

## 课程质量审核：lesson-06-meadow-story

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`；审核日期：2026-10-19
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（约 5～7 岁）；先修：lesson-04、05：切换场景、再做一次；lesson-02：说一句话；新知识：（无新概念）组合移动、转场、重复、对白
- 成熟度：L3；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 7/20 | apps/web/src/content/curriculum/launch-lessons.ts lesson-06 最终目标 = lesson-05 + say_line<br>apps/web/tests/e2e/blockly-meadow-journey.spec.ts “lesson 6 executes movement, scene change, repetition and speech in order” | 最终程序只是第 5 课再加一块说话，没有新能力；结构与 lesson-03 相同（单元末课=前两课拼接）<br>“再做一次”语义问题同 lesson-05<br>step-4/5 目标相同 |
| 教学故事与思维激活 | 6/15 | apps/web/src/content/curriculum/launch-lessons.ts goal“完成第二个完整小故事”；草地对白“我到草地啦！” | “旅行感受”是写死的一句话，孩子不能表达自己的感受<br>没有预测、没有孩子的决定 |
| 实际操作与能力形成 | 8/25 | apps/web/tests/e2e/blockly-meadow-journey.spec.ts 第 6 课用例断言草地、200 步、“我到草地啦！” | 操作是前两课的重复<br>没有第二项不同练习 |
| 纠错与个性化反馈 | 4/15 | apps/web/src/content/curriculum/launch-lessons.ts lesson-06 hintLayers<br>apps/web/src/features/lessons/playable-stage/use-block-executor.test.ts “SYS-103: a runnable counter-example plays out but ends in an explained error” | 运行出错时舞台只显示通用文案“积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。”：apps/web/src/features/lessons/playable-stage/playable-stage.tsx 没有取用 useBlockExecutor 返回的 errorMessage，observable-run 已算出的具体差异原因（如“说话的时机不对”）孩子看不到；“和任务要求的积木一样”还与 SYS-103 等价方案判定相矛盾<br>apps/web/src/features/lessons/build-hint-state.ts 以 failedAttempts 作下标（min(failedAttempts, 2)），第一次失败直接显示第 2 层，第 1 层 repeat_goal 在失败后永远不会出现；失败次数只在点“完成这一步”时增加，运行出错本身不计<br>第 3 层补救统一跳到 remedial-click-trigger（“先学会点击触发”，apps/web/src/content/curriculum/remedial-lessons.ts 中 steps 为空，/learn/remedial 页面是三张静态卡），与本课的开始事件/场景知识点不对应；已存在的 remedial-scene-switch 没有被使用 |
| 创造/迁移/项目成果 | 3/15 | build-project-completion-copy.ts lesson-06“第二个完整作品”<br>apps/web/src/features/lessons/blockly/observable-run.test.ts 等价方案：移动→切换→移动→说话 也能通过 | 孩子没有任何创作选择（对白、距离、场景都固定）<br>单元作品不能重开、运行、修改 |
| 评价、复盘与可信度 | 3/10 | apps/web/src/content/curriculum/launch-lessons.ts lesson-06-meadow-story.parentAdvice 请孩子向家长演示/讲述<br>apps/web/src/app/project/[projectId]/complete/page.tsx 完成页显示保存的积木快照（apps/web/src/features/lessons/blockly/preview-stage.tsx 静态预览） | 家长端 apps/web/src/features/parent/build-parent-overview.ts describeProjectResult 按课程 ID 返回固定文案，不基于孩子真实的运行、错误或用时数据<br>课堂没有记录孩子自己的解释或反思，只有完成与否 |
| **总计** | **31/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | PlayableStage 读取 Blockly 实际连接顺序逐块解释执行（apps/web/src/features/lessons/playable-stage/use-block-executor.ts 非双角色分支 + apps/web/src/features/lessons/blockly/observable-run.ts simulateProgram），按位置/场景/对白判定（SYS-103），不是预制动画；属于教学解释器而非完整 Scratch VM。对白内容由引擎写死（say_line 积木无文本字段，apps/web/src/features/lessons/blockly/register-kids-blocks.ts）。 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | pass | 孩子亲手点积木面板添加积木并运行；但多步只是重新运行同一程序（见“实际操作”维度）。 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 课程五步都只有“搭对→运行成功”的路径，没有任何一步要求孩子先遇到真实错误、看到预期与实际的差异再修好（对照 lesson-10 step-4 的 observedMistake 门槛）。引擎层的反例只存在于单元测试/工程 E2E，不构成本课的纠错教学。 |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | pass | 没有宣称自由创作；判定按可观察结果（evaluateObservable），等价程序可以通过（observable-run.test.ts “accepts a reasonable equivalent”）。 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 完成页写“你做出了一个完整作品”（build-project-completion-copy.ts），背后有本课真实运行通过后保存的积木快照，所以不算伪造；但作品只能看静态预览（apps/web/src/features/lessons/blockly/preview-stage.tsx），不能重开、运行、修改，作品质量很弱（见“创造”维度）。 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 角色与场景是 apps/web/src/features/lessons/playable-stage/character-art.tsx 中代码绘制的内联 SVG；配音为文本稿（foundation-voiceovers.ts），未发现外部商用素材。 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | unchecked | 完成课时会调用 syncGuestSnapshot 向 /api/guest 上传进度与作品快照（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext）；本次审计没有审查云端隔离与儿童隐私，lesson-maturity 也把“儿童隐私、输入和沙箱安全完成审核”列为未完成。 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | pass | 完成时 writeGuestProgress 失败会提示“本机存储失败”，不跳转、不发奖励；云同步失败显示失败并可重试（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext；local-progress-storage.test.ts、sync-guest-snapshot.test.ts）。草稿保存按返回值显示已保存/失败。 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 计算为 L3 实验可试玩（审计时用 vitest 探针调用 getLessonMaturity 确认 9 课均为 L3，blockers 首条“发布验收未完成”），没有标成正式发布。 |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 | 开始时→移动→切换场景→再做一次→说一句话：草地 200 步 + “我到草地啦！”（apps/web/tests/e2e/blockly-meadow-journey.spec.ts） |
| 错误/边界 | 单测反例：说话放在再做一次之前→“说话的时机不对：要在走完 200 步时说，实际是在 100 步时说”（AI 探针调用 evaluateObservable 复现；同类反例见 apps/web/src/features/lessons/blockly/observable-run.test.ts）；课堂未安排。 |
| 三层提示 | apps/web/src/content/curriculum/launch-lessons.ts lesson-06-meadow-story.hintLayers[0] repeat_goal（失败后实际不会显示，见 build-hint-state.ts） → apps/web/src/content/curriculum/launch-lessons.ts lesson-06-meadow-story.hintLayers[1] show_block → apps/web/src/content/curriculum/launch-lessons.ts lesson-06-meadow-story.hintLayers[2] offer_remedial → remedial-click-trigger |
| 练习 A / B | 在第 5 课程序后加一句旅行感受 / 缺 |
| 不同正确方案 | 开始时→向右移动→切换场景→再做一次→说一句话；开始时→向右移动→切换场景→向右移动→说一句话（apps/web/src/features/lessons/blockly/observable-run.test.ts “accepts a reasonable equivalent”） |
| 保存重开 | 缺 |
| E2E | apps/web/tests/e2e/blockly-meadow-journey.spec.ts |

**结论**：不是优质候选 — 总分 31，低于 80 退回重做；触发硬否决：no-failure-test；硬否决未核查：minor-privacy-risk；AI 评分只能作参考，不能认定优质；运行证据缺少：两项目标不同的亲手练习、保存重开验证

**阻塞**：单元项目需要孩子自己的选择（对白/距离/目的地）并可重开修改；缺纠错步骤；与 lesson-05 几乎重复

---

## 课程质量审核：lesson-07-garden-click

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`；审核日期：2026-10-19
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（约 5～7 岁）；先修：lesson-01～06：开始时、向右移动；新知识：点击事件“被点击时”、事件触发与“开始时”的区别
- 成熟度：L3；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 13/20 | apps/web/src/content/curriculum/launch-lessons.ts lesson-07 新概念“被点击时”<br>apps/web/src/features/lessons/playable-stage/use-block-executor.ts when_clicked 程序先进入 armed，只有真实点击角色才执行<br>apps/web/src/features/lessons/playable-stage/use-block-executor.test.ts “arms a real clicked-event program but does not move until the child clicks the sprite” | step-2～5 的目标完全相同（被点击时+移动），五步只有两个目标<br>没有让孩子对比“开始时”与“被点击时”两个程序的不同结果 |
| 教学故事与思维激活 | 9/15 | apps/web/src/features/lessons/playable-stage/playable-stage.tsx garden-prediction：每步先预测“只点运行不点蝴蝶，它会自己飞吗”，运行后给出 garden-reflection | 同一道预测题每一步都重复，第 7～9 课共 15 次<br>孩子仍不决定程序内容 |
| 实际操作与能力形成 | 11/25 | apps/web/tests/e2e/blockly-garden-click.spec.ts “lesson 7 teaches real click event: start alone never moves the butterfly”：未点击不移动、不计分，点击后移动 100 | 真正的搭建只有一次；其余是重复“预测→启动→点击”<br>没有第二项不同目标的练习（如换一个被点击的角色、点击触发不同动作） |
| 纠错与个性化反馈 | 5/15 | apps/web/src/app/learn/lesson/[lessonId]/page.tsx 未点击就完成时提示“请先在舞台启动程序，再亲自点击蝴蝶”<br>apps/web/src/features/lessons/playable-stage/playable-stage.tsx 预测对/错的不同反思文案 | 运行出错时舞台只显示通用文案“积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。”：apps/web/src/features/lessons/playable-stage/playable-stage.tsx 没有取用 useBlockExecutor 返回的 errorMessage，observable-run 已算出的具体差异原因（如“说话的时机不对”）孩子看不到；“和任务要求的积木一样”还与 SYS-103 等价方案判定相矛盾<br>apps/web/src/features/lessons/build-hint-state.ts 以 failedAttempts 作下标（min(failedAttempts, 2)），第一次失败直接显示第 2 层，第 1 层 repeat_goal 在失败后永远不会出现；失败次数只在点“完成这一步”时增加，运行出错本身不计<br>第 3 层补救 remedial-click-trigger 主题对应点击事件，但补救页只有三张静态说明卡（apps/web/src/content/curriculum/remedial-lessons.ts steps 为空），没有可操作的补救练习 |
| 创造/迁移/项目成果 | 1/15 | apps/web/src/app/project/[projectId]/complete/page.tsx 保存积木快照 | 没有任何创作选择<br>作品不能重开运行 |
| 评价、复盘与可信度 | 4/10 | apps/web/src/content/curriculum/launch-lessons.ts lesson-07-garden-click.parentAdvice 请孩子向家长演示/讲述<br>apps/web/src/app/project/[projectId]/complete/page.tsx 完成页显示保存的积木快照（apps/web/src/features/lessons/blockly/preview-stage.tsx 静态预览）<br>apps/web/src/features/lessons/playable-stage/playable-stage.tsx garden-reflection 根据预测给反馈 | 家长端 apps/web/src/features/parent/build-parent-overview.ts describeProjectResult 按课程 ID 返回固定文案，不基于孩子真实的运行、错误或用时数据<br>课堂没有记录孩子自己的解释或反思，只有完成与否<br>预测结果不保存、不进入家长报告 |
| **总计** | **43/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | PlayableStage 读取 Blockly 实际连接顺序逐块解释执行（apps/web/src/features/lessons/playable-stage/use-block-executor.ts 非双角色分支 + apps/web/src/features/lessons/blockly/observable-run.ts simulateProgram），按位置/场景/对白判定（SYS-103），不是预制动画；属于教学解释器而非完整 Scratch VM。对白内容由引擎写死（say_line 积木无文本字段，apps/web/src/features/lessons/blockly/register-kids-blocks.ts）。 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | pass | 孩子亲手点积木面板添加积木并运行；但多步只是重新运行同一程序（见“实际操作”维度）。 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 课程五步都只有“搭对→运行成功”的路径，没有任何一步要求孩子先遇到真实错误、看到预期与实际的差异再修好（对照 lesson-10 step-4 的 observedMistake 门槛）。引擎层的反例只存在于单元测试/工程 E2E，不构成本课的纠错教学。（apps/web/tests/e2e/blockly-garden-click.spec.ts 有“未点击不执行”边界与“错误首事件不能绕过”工程负例，但不是孩子经历的错误→修复。） |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | pass | 没有宣称自由创作；判定按可观察结果（evaluateObservable），等价程序可以通过（observable-run.test.ts “accepts a reasonable equivalent”）。 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 完成页标题是“你完成了《课名》”，展示的是本课真实运行通过后保存的积木快照（apps/web/src/app/project/[projectId]/complete/page.tsx），没有虚构作品；但预览是 apps/web/src/features/lessons/blockly/preview-stage.tsx 按积木种类拼出的静态文案，不能重新运行或修改。 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 角色与场景是 apps/web/src/features/lessons/playable-stage/character-art.tsx 中代码绘制的内联 SVG；配音为文本稿（foundation-voiceovers.ts），未发现外部商用素材。 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | unchecked | 完成课时会调用 syncGuestSnapshot 向 /api/guest 上传进度与作品快照（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext）；本次审计没有审查云端隔离与儿童隐私，lesson-maturity 也把“儿童隐私、输入和沙箱安全完成审核”列为未完成。 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | pass | 完成时 writeGuestProgress 失败会提示“本机存储失败”，不跳转、不发奖励；云同步失败显示失败并可重试（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext；local-progress-storage.test.ts、sync-guest-snapshot.test.ts）。草稿保存按返回值显示已保存/失败。 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 计算为 L3 实验可试玩（审计时用 vitest 探针调用 getLessonMaturity 确认 9 课均为 L3，blockers 首条“发布验收未完成”），没有标成正式发布。 |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 | 被点击时→向右移动→启动→点击蝴蝶：蝴蝶移动 100，显示“运行成功”与反思（apps/web/tests/e2e/blockly-garden-click.spec.ts） |
| 错误/边界 | 边界：程序正确但未点击蝴蝶→蝴蝶停在 0、无“运行成功”，点完成被拦（apps/web/tests/e2e/blockly-garden-click.spec.ts performClickStep）；工程负例“an incorrect first event cannot be used to bypass the click lesson”。 |
| 三层提示 | apps/web/src/content/curriculum/launch-lessons.ts lesson-07-garden-click.hintLayers[0] repeat_goal（失败后实际不会显示，见 build-hint-state.ts） → apps/web/src/content/curriculum/launch-lessons.ts lesson-07-garden-click.hintLayers[1] show_block → apps/web/src/content/curriculum/launch-lessons.ts lesson-07-garden-click.hintLayers[2] offer_remedial → remedial-click-trigger |
| 练习 A / B | 被点击时→向右移动，亲自点击蝴蝶触发 / 缺 |
| 不同正确方案 | 缺 |
| 保存重开 | 缺 |
| E2E | apps/web/tests/e2e/blockly-garden-click.spec.ts |

**结论**：不是优质候选 — 总分 43，低于 80 退回重做；触发硬否决：no-failure-test；硬否决未核查：minor-privacy-risk；AI 评分只能作参考，不能认定优质；运行证据缺少：两项目标不同的亲手练习、两种不同的正确方案、保存重开验证

**阻塞**：补第二项不同练习（对比开始时/被点击时，或点击触发不同动作）；缺纠错步骤（如误用“开始时”导致不点也动，再修好）；补救内容需可操作

---

## 课程质量审核：lesson-08-garden-dialogue

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`；审核日期：2026-10-19
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（约 5～7 岁）；先修：lesson-07：被点击时；lesson-02：说一句话；新知识：（弱）点击后先动再说
- 成熟度：L3；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 10/20 | apps/web/src/content/curriculum/launch-lessons.ts lesson-08 目标 [when_clicked, move_right, say_line]<br>apps/web/tests/e2e/blockly-garden-click.spec.ts “lesson 8 uses clicked event to move and then speak” | 只是把 lesson-02 的“移动→说话”搬到点击事件下，几乎没有新概念<br>step-1/2 目标相同，step-4/5 目标相同 |
| 教学故事与思维激活 | 8/15 | apps/web/src/features/lessons/playable-stage/playable-stage.tsx 重复的点击预测与反思 | 预测题与第 7 课完全相同，没有针对“说话”的新预测<br>对白固定为“蝴蝶收到你的点击啦！” |
| 实际操作与能力形成 | 9/25 | apps/web/tests/e2e/blockly-garden-click.spec.ts 第 8 课用例：断言 100 步与“蝴蝶收到你的点击啦！” | 新搭建只有一次（加说话）<br>没有第二项不同练习 |
| 纠错与个性化反馈 | 5/15 | apps/web/src/content/curriculum/launch-lessons.ts lesson-08 hintLayers<br>apps/web/src/app/learn/lesson/[lessonId]/page.tsx 未点击提示 | 运行出错时舞台只显示通用文案“积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。”：apps/web/src/features/lessons/playable-stage/playable-stage.tsx 没有取用 useBlockExecutor 返回的 errorMessage，observable-run 已算出的具体差异原因（如“说话的时机不对”）孩子看不到；“和任务要求的积木一样”还与 SYS-103 等价方案判定相矛盾<br>apps/web/src/features/lessons/build-hint-state.ts 以 failedAttempts 作下标（min(failedAttempts, 2)），第一次失败直接显示第 2 层，第 1 层 repeat_goal 在失败后永远不会出现；失败次数只在点“完成这一步”时增加，运行出错本身不计<br>第 3 层补救 remedial-click-trigger 主题对应点击事件，但补救页只有三张静态说明卡（apps/web/src/content/curriculum/remedial-lessons.ts steps 为空），没有可操作的补救练习 |
| 创造/迁移/项目成果 | 1/15 | apps/web/src/app/project/[projectId]/complete/page.tsx 保存积木快照 | parentAdvice“试试不同的点法”，但只有一种点法和一种反应，没有创作空间<br>作品不能重开运行 |
| 评价、复盘与可信度 | 4/10 | apps/web/src/content/curriculum/launch-lessons.ts lesson-08-garden-dialogue.parentAdvice 请孩子向家长演示/讲述<br>apps/web/src/app/project/[projectId]/complete/page.tsx 完成页显示保存的积木快照（apps/web/src/features/lessons/blockly/preview-stage.tsx 静态预览）<br>apps/web/src/features/lessons/playable-stage/playable-stage.tsx garden-reflection | 家长端 apps/web/src/features/parent/build-parent-overview.ts describeProjectResult 按课程 ID 返回固定文案，不基于孩子真实的运行、错误或用时数据<br>课堂没有记录孩子自己的解释或反思，只有完成与否 |
| **总计** | **37/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | PlayableStage 读取 Blockly 实际连接顺序逐块解释执行（apps/web/src/features/lessons/playable-stage/use-block-executor.ts 非双角色分支 + apps/web/src/features/lessons/blockly/observable-run.ts simulateProgram），按位置/场景/对白判定（SYS-103），不是预制动画；属于教学解释器而非完整 Scratch VM。对白内容由引擎写死（say_line 积木无文本字段，apps/web/src/features/lessons/blockly/register-kids-blocks.ts）。 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | pass | 孩子亲手点积木面板添加积木并运行；但多步只是重新运行同一程序（见“实际操作”维度）。 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 课程五步都只有“搭对→运行成功”的路径，没有任何一步要求孩子先遇到真实错误、看到预期与实际的差异再修好（对照 lesson-10 step-4 的 observedMistake 门槛）。引擎层的反例只存在于单元测试/工程 E2E，不构成本课的纠错教学。（apps/web/tests/e2e/blockly-garden-click.spec.ts 每步都验证“未点击不执行”边界，但不是错误→修复。） |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | pass | 没有宣称自由创作；判定按可观察结果（evaluateObservable），等价程序可以通过（observable-run.test.ts “accepts a reasonable equivalent”）。 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 完成页标题是“你完成了《课名》”，展示的是本课真实运行通过后保存的积木快照（apps/web/src/app/project/[projectId]/complete/page.tsx），没有虚构作品；但预览是 apps/web/src/features/lessons/blockly/preview-stage.tsx 按积木种类拼出的静态文案，不能重新运行或修改。 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 角色与场景是 apps/web/src/features/lessons/playable-stage/character-art.tsx 中代码绘制的内联 SVG；配音为文本稿（foundation-voiceovers.ts），未发现外部商用素材。 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | unchecked | 完成课时会调用 syncGuestSnapshot 向 /api/guest 上传进度与作品快照（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext）；本次审计没有审查云端隔离与儿童隐私，lesson-maturity 也把“儿童隐私、输入和沙箱安全完成审核”列为未完成。 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | pass | 完成时 writeGuestProgress 失败会提示“本机存储失败”，不跳转、不发奖励；云同步失败显示失败并可重试（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext；local-progress-storage.test.ts、sync-guest-snapshot.test.ts）。草稿保存按返回值显示已保存/失败。 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 计算为 L3 实验可试玩（审计时用 vitest 探针调用 getLessonMaturity 确认 9 课均为 L3，blockers 首条“发布验收未完成”），没有标成正式发布。 |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 | 被点击时→移动→说一句话→点击蝴蝶：100 步 + “蝴蝶收到你的点击啦！”（apps/web/tests/e2e/blockly-garden-click.spec.ts） |
| 错误/边界 | 边界：未点击蝴蝶时不执行、不计分（apps/web/tests/e2e/blockly-garden-click.spec.ts performClickStep）；课堂未安排错误→修复。 |
| 三层提示 | apps/web/src/content/curriculum/launch-lessons.ts lesson-08-garden-dialogue.hintLayers[0] repeat_goal（失败后实际不会显示，见 build-hint-state.ts） → apps/web/src/content/curriculum/launch-lessons.ts lesson-08-garden-dialogue.hintLayers[1] show_block → apps/web/src/content/curriculum/launch-lessons.ts lesson-08-garden-dialogue.hintLayers[2] offer_remedial → remedial-click-trigger |
| 练习 A / B | 点击后先移动再说一句话 / 缺 |
| 不同正确方案 | 缺 |
| 保存重开 | 缺 |
| E2E | apps/web/tests/e2e/blockly-garden-click.spec.ts |

**结论**：不是优质候选 — 总分 37，低于 80 退回重做；触发硬否决：no-failure-test；硬否决未核查：minor-privacy-risk；AI 评分只能作参考，不能认定优质；运行证据缺少：两项目标不同的亲手练习、两种不同的正确方案、保存重开验证

**阻塞**：与 lesson-02 结构重复，需要新的学习目标；补第二项不同练习与纠错步骤

---

## 课程质量审核：lesson-09-garden-story

- 被审 commit：`632c3a4dabd3eab258063ef663f2b88402c2a343`；审核日期：2026-10-19
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（约 5～7 岁）；先修：lesson-07、08：被点击时、说一句话；lesson-05：再做一次；新知识：（无新概念）点击+移动+对白+再做一次
- 成熟度：L3；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 7/20 | apps/web/src/content/curriculum/launch-lessons.ts lesson-09 目标 [when_clicked, move_right, say_line, repeat_twice]<br>apps/web/src/features/lessons/playable-stage/use-block-executor.test.ts “runs the original four-block garden story…only after a click” | “再做一次”接在“说一句话”后面，却重复移动而不是说话（apps/web/src/features/lessons/blockly/observable-run.ts），与积木名矛盾<br>step-5 文字“连着动两次，再回一句话”与参考程序“动→说→再动”相反（见硬否决 rigid-answer）<br>最终程序 = lesson-08 + 再做一次，没有新能力 |
| 教学故事与思维激活 | 7/15 | apps/web/src/content/curriculum/launch-lessons.ts goal“完成一个点一下就会有反应的互动故事”<br>apps/web/src/features/lessons/playable-stage/playable-stage.tsx 点击预测 | “互动表演”只有一种固定反应<br>孩子不做任何故事决定 |
| 实际操作与能力形成 | 9/25 | apps/web/tests/e2e/blockly-garden-click.spec.ts “lesson 9 has a distinct garden ending…”：断言 step-5 移动 200 | 操作是 lesson-08 加一块<br>没有第二项不同练习 |
| 纠错与个性化反馈 | 3/15 | apps/web/src/content/curriculum/launch-lessons.ts lesson-09 hintLayers（第 2 层写明顺序“被点击时 → 向右移动 → 说一句话 → 再做一次”） | 运行出错时舞台只显示通用文案“积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。”：apps/web/src/features/lessons/playable-stage/playable-stage.tsx 没有取用 useBlockExecutor 返回的 errorMessage，observable-run 已算出的具体差异原因（如“说话的时机不对”）孩子看不到；“和任务要求的积木一样”还与 SYS-103 等价方案判定相矛盾<br>apps/web/src/features/lessons/build-hint-state.ts 以 failedAttempts 作下标（min(failedAttempts, 2)），第一次失败直接显示第 2 层，第 1 层 repeat_goal 在失败后永远不会出现；失败次数只在点“完成这一步”时增加，运行出错本身不计<br>第 3 层补救 remedial-click-trigger 主题对应点击事件，但补救页只有三张静态说明卡（apps/web/src/content/curriculum/remedial-lessons.ts steps 为空），没有可操作的补救练习<br>按 step-5 文字搭出“移动→再做一次→说话”会失败，而舞台只显示通用错误，孩子不知道错在“说话时机”，提示第 2 层又和指令文字矛盾 |
| 创造/迁移/项目成果 | 3/15 | build-project-completion-copy.ts lesson-09“第三个完整作品”<br>等价方案：被点击时→移动→说话→移动 也能通过（AI 探针调用 evaluateObservable 复现） | 单元作品没有孩子的选择<br>作品不能重开、运行、修改 |
| 评价、复盘与可信度 | 4/10 | apps/web/src/content/curriculum/launch-lessons.ts lesson-09-garden-story.parentAdvice 请孩子向家长演示/讲述<br>apps/web/src/app/project/[projectId]/complete/page.tsx 完成页显示保存的积木快照（apps/web/src/features/lessons/blockly/preview-stage.tsx 静态预览）<br>apps/web/src/features/lessons/playable-stage/playable-stage.tsx garden-reflection | 家长端 apps/web/src/features/parent/build-parent-overview.ts describeProjectResult 按课程 ID 返回固定文案，不基于孩子真实的运行、错误或用时数据<br>课堂没有记录孩子自己的解释或反思，只有完成与否<br>apps/web/src/features/lessons/blockly/preview-stage.tsx 完成预览文案写“连着动两次，再用一句话回应你”，与实际程序顺序（动→说→再动）不符 |
| **总计** | **33/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | PlayableStage 读取 Blockly 实际连接顺序逐块解释执行（apps/web/src/features/lessons/playable-stage/use-block-executor.ts 非双角色分支 + apps/web/src/features/lessons/blockly/observable-run.ts simulateProgram），按位置/场景/对白判定（SYS-103），不是预制动画；属于教学解释器而非完整 Scratch VM。对白内容由引擎写死（say_line 积木无文本字段，apps/web/src/features/lessons/blockly/register-kids-blocks.ts）。 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | pass | 孩子亲手点积木面板添加积木并运行；但多步只是重新运行同一程序（见“实际操作”维度）。 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 课程五步都只有“搭对→运行成功”的路径，没有任何一步要求孩子先遇到真实错误、看到预期与实际的差异再修好（对照 lesson-10 step-4 的 observedMistake 门槛）。引擎层的反例只存在于单元测试/工程 E2E，不构成本课的纠错教学。 |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | fail | step-5 指令“在最后接上再做一次，让角色点一下后会连着动两次，再回一句话”。按这句话搭出 被点击时→向右移动→再做一次→说一句话，evaluateObservable 判失败：“说话的时机不对：要在走完 100 步时说，实际是在 200 步时说”（审计时 vitest 探针复现）；唯一能过的顺序是 移动→说话→再做一次（参考答案与 apps/web/tests/e2e/blockly-garden-click.spec.ts）。任务文字描述的合理程序不能通过，且舞台只显示通用错误。 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 完成页写“你做出了一个完整作品”（build-project-completion-copy.ts），背后有本课真实运行通过后保存的积木快照，所以不算伪造；但作品只能看静态预览（apps/web/src/features/lessons/blockly/preview-stage.tsx），不能重开、运行、修改，作品质量很弱（见“创造”维度）。 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 角色与场景是 apps/web/src/features/lessons/playable-stage/character-art.tsx 中代码绘制的内联 SVG；配音为文本稿（foundation-voiceovers.ts），未发现外部商用素材。 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | unchecked | 完成课时会调用 syncGuestSnapshot 向 /api/guest 上传进度与作品快照（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext）；本次审计没有审查云端隔离与儿童隐私，lesson-maturity 也把“儿童隐私、输入和沙箱安全完成审核”列为未完成。 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | pass | 完成时 writeGuestProgress 失败会提示“本机存储失败”，不跳转、不发奖励；云同步失败显示失败并可重试（apps/web/src/app/learn/lesson/[lessonId]/page.tsx handleNext；local-progress-storage.test.ts、sync-guest-snapshot.test.ts）。草稿保存按返回值显示已保存/失败。 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 计算为 L3 实验可试玩（审计时用 vitest 探针调用 getLessonMaturity 确认 9 课均为 L3，blockers 首条“发布验收未完成”），没有标成正式发布。 |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 | 被点击时→移动→说一句话→再做一次→点击蝴蝶：200 步 + “蝴蝶收到你的点击啦！”（apps/web/tests/e2e/blockly-garden-click.spec.ts） |
| 错误/边界 | 按 step-5 文字搭“移动→再做一次→说话”→判“说话的时机不对”（AI 探针复现）；这是指令与判定矛盾造成的错误，不是设计好的纠错环节。 |
| 三层提示 | apps/web/src/content/curriculum/launch-lessons.ts lesson-09-garden-story.hintLayers[0] repeat_goal（失败后实际不会显示，见 build-hint-state.ts） → apps/web/src/content/curriculum/launch-lessons.ts lesson-09-garden-story.hintLayers[1] show_block → apps/web/src/content/curriculum/launch-lessons.ts lesson-09-garden-story.hintLayers[2] offer_remedial → remedial-click-trigger |
| 练习 A / B | 在第 8 课程序后接“再做一次” / 缺 |
| 不同正确方案 | 被点击时→向右移动→说一句话→再做一次；被点击时→向右移动→说一句话→向右移动（AI 探针：evaluateObservable 通过；尚无提交的测试） |
| 保存重开 | 缺 |
| E2E | apps/web/tests/e2e/blockly-garden-click.spec.ts |

**结论**：不是优质候选 — 总分 33，低于 80 退回重做；触发硬否决：no-failure-test、rigid-answer；硬否决未核查：minor-privacy-risk；AI 评分只能作参考，不能认定优质；运行证据缺少：两项目标不同的亲手练习、保存重开验证

**阻塞**：修正 step-5 指令/parentAdvice/预览文案与判定顺序的矛盾（或改判定）；“再做一次”语义需重新定义；单元作品需孩子选择并可重开修改；缺纠错步骤
