## 课程质量审核：G0-U1-L01

- 被审 commit：`ac9a4bab5ccda461de85503928b3c727766f4435`；审核日期：2026-10-18
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（5～7 岁）；先修：无；新知识：事件入口与一条动作顺序
- 成熟度：L1；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 12/20 | apps/web/src/content/curriculum/track-g0-detailed-lessons-v1.json G0-U1-L01<br>教案 focusConcept 事件入口与一条动作顺序；第5步删掉开始牌再运行比较 | 标题“认识按钮”与内容（开始事件+移动）不符<br>学习目标是模板句 |
| 教学故事与思维激活 | 9/15 | 树屋情境：“先启动再前进才能走出树屋” | 缺少让孩子先预测的问题 |
| 实际操作与能力形成 | 4/25 | teachingSteps 五步有观察/操作/运行/比较的设计 | 产品内不可操作；步骤含“地面/网格纸”等线下动作，未转成线上舞台操作 |
| 纠错与个性化反馈 | 3/15 | 有 3 条 commonMistakes + 3 条 hints | commonMistakes.diagnosis 是模板句（“检查「X」的输入条件与对象”），没有针对本课的现象描述<br>三条 hints 不是“现象→概念→具体做法”三层 |
| 创造/迁移/项目成果 | 2/15 | extension：给动作换一个方向，解释不同结局 | 没有可保存作品 |
| 评价、复盘与可信度 | 3/10 | 有 rubric、mustPass、negativeCases、parentConversation | observableCheck 五步都是同一句模板“学生能展示第N步操作结果…”<br>rubric 证据句由模板生成，automatedAssessmentReady=false |
| **总计** | **33/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | 教案标 blockly_conceptual_not_executable、playable=false，没有假执行；但也没有任何真实执行 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | fail | 产品里没有本课可操作的课堂：playable=false、codeReady=false，孩子无法亲手拼块运行 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 没有正常执行，也没有真实错误/边界运行；negativeCases 只是文字 |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | unchecked | 没有判定器，无法核查合理程序是否能通过 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 目录未展示“项目已完成”，artifact 只是教案要求 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 无美术/音频素材（assetsReady=false），文字为自写教案 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | pass | 无作品保存或上传入口 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | unchecked | 没有课堂可运行，无法核查 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 记为 L1 详案，目录不显示可玩（SYS-102） |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 |  |
| 错误/边界 |  |
| 三层提示 | 缺 |
| 练习 A / B |  /  |
| 不同正确方案 | 缺 |
| 保存重开 |  |
| E2E | 缺 |

**结论**：不是优质候选 — 总分 33，低于 80 退回重做；触发硬否决：no-hands-on、no-failure-test；硬否决未核查：rigid-answer、broken-or-false-success；AI 评分只能作参考，不能认定优质；运行证据缺少：正常执行、真实错误或边界测试、三层提示、两项目标不同的亲手练习、两种不同的正确方案、保存重开验证、真实浏览器 E2E

**阻塞**：引擎缺少本课所需能力（方向/网格移动/障碍碰撞），requiredEngineCapabilities 未满足；需要按 TQ-001 重写：本课专属现象诊断、三层提示、可判定的两项练习和两种正确方案；需要可保存重开的作品与 E2E

---

## 课程质量审核：G0-U1-L02

- 被审 commit：`ac9a4bab5ccda461de85503928b3c727766f4435`；审核日期：2026-10-18
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（5～7 岁）；先修：G0-U1-L01；新知识：方位辨认与路线排列
- 成熟度：L1；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 12/20 | apps/web/src/content/curriculum/track-g0-detailed-lessons-v1.json G0-U1-L02<br>方位辨认与路线排列，接 L01 的事件+动作 | “先向右再向上”需要方向积木，引擎没有 |
| 教学故事与思维激活 | 9/15 | 邮差送明信片到小兔子树屋，不能绕到河边 | “河边”约束没有对应判定 |
| 实际操作与能力形成 | 4/25 | teachingSteps 五步有观察/操作/运行/比较的设计 | 产品内不可操作；步骤含“地面/网格纸”等线下动作，未转成线上舞台操作 |
| 纠错与个性化反馈 | 3/15 | 有 3 条 commonMistakes + 3 条 hints | commonMistakes.diagnosis 是模板句（“检查「X」的输入条件与对象”），没有针对本课的现象描述<br>三条 hints 不是“现象→概念→具体做法”三层 |
| 创造/迁移/项目成果 | 3/15 | extension：规划另一条同样可达的路线（天然两种正确方案） | 没有可保存作品 |
| 评价、复盘与可信度 | 3/10 | 有 rubric、mustPass、negativeCases、parentConversation | observableCheck 五步都是同一句模板“学生能展示第N步操作结果…”<br>rubric 证据句由模板生成，automatedAssessmentReady=false |
| **总计** | **34/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | 教案标 blockly_conceptual_not_executable、playable=false，没有假执行；但也没有任何真实执行 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | fail | 产品里没有本课可操作的课堂：playable=false、codeReady=false，孩子无法亲手拼块运行 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 没有正常执行，也没有真实错误/边界运行；negativeCases 只是文字 |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | unchecked | 没有判定器，无法核查合理程序是否能通过 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 目录未展示“项目已完成”，artifact 只是教案要求 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 无美术/音频素材（assetsReady=false），文字为自写教案 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | pass | 无作品保存或上传入口 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | unchecked | 没有课堂可运行，无法核查 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 记为 L1 详案，目录不显示可玩（SYS-102） |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 |  |
| 错误/边界 |  |
| 三层提示 | 缺 |
| 练习 A / B |  /  |
| 不同正确方案 | 缺 |
| 保存重开 |  |
| E2E | 缺 |

**结论**：不是优质候选 — 总分 34，低于 80 退回重做；触发硬否决：no-hands-on、no-failure-test；硬否决未核查：rigid-answer、broken-or-false-success；AI 评分只能作参考，不能认定优质；运行证据缺少：正常执行、真实错误或边界测试、三层提示、两项目标不同的亲手练习、两种不同的正确方案、保存重开验证、真实浏览器 E2E

**阻塞**：引擎缺少本课所需能力（方向/网格移动/障碍碰撞），requiredEngineCapabilities 未满足；需要按 TQ-001 重写：本课专属现象诊断、三层提示、可判定的两项练习和两种正确方案；需要可保存重开的作品与 E2E

---

## 课程质量审核：G0-U1-L03

- 被审 commit：`ac9a4bab5ccda461de85503928b3c727766f4435`；审核日期：2026-10-18
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（5～7 岁）；先修：G0-U1-L02；新知识：步数与顺序计数
- 成熟度：L1；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 13/20 | apps/web/src/content/curriculum/track-g0-detailed-lessons-v1.json G0-U1-L03<br>步数计数，两格/四格都是错误路线（边界清楚） | extension 用“次数参数”提前引入循环，超出本单元 |
| 教学故事与思维激活 | 9/15 | 三格到蘑菇屋，多一步撞石头 | 情境只有一句 |
| 实际操作与能力形成 | 5/25 | teachingSteps 五步有观察/操作/运行/比较的设计 | 产品内不可操作；步骤含“地面/网格纸”等线下动作，未转成线上舞台操作 |
| 纠错与个性化反馈 | 3/15 | 有 3 条 commonMistakes + 3 条 hints | commonMistakes.diagnosis 是模板句（“检查「X」的输入条件与对象”），没有针对本课的现象描述<br>三条 hints 不是“现象→概念→具体做法”三层 |
| 创造/迁移/项目成果 | 2/15 | extension：次数参数替代三块指令 | 没有可保存作品 |
| 评价、复盘与可信度 | 3/10 | 有 rubric、mustPass、negativeCases、parentConversation | observableCheck 五步都是同一句模板“学生能展示第N步操作结果…”<br>rubric 证据句由模板生成，automatedAssessmentReady=false |
| **总计** | **35/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | 教案标 blockly_conceptual_not_executable、playable=false，没有假执行；但也没有任何真实执行 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | fail | 产品里没有本课可操作的课堂：playable=false、codeReady=false，孩子无法亲手拼块运行 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 没有正常执行，也没有真实错误/边界运行；negativeCases 只是文字 |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | unchecked | 没有判定器，无法核查合理程序是否能通过 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 目录未展示“项目已完成”，artifact 只是教案要求 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 无美术/音频素材（assetsReady=false），文字为自写教案 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | pass | 无作品保存或上传入口 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | unchecked | 没有课堂可运行，无法核查 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 记为 L1 详案，目录不显示可玩（SYS-102） |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 |  |
| 错误/边界 |  |
| 三层提示 | 缺 |
| 练习 A / B |  /  |
| 不同正确方案 | 缺 |
| 保存重开 |  |
| E2E | 缺 |

**结论**：不是优质候选 — 总分 35，低于 80 退回重做；触发硬否决：no-hands-on、no-failure-test；硬否决未核查：rigid-answer、broken-or-false-success；AI 评分只能作参考，不能认定优质；运行证据缺少：正常执行、真实错误或边界测试、三层提示、两项目标不同的亲手练习、两种不同的正确方案、保存重开验证、真实浏览器 E2E

**阻塞**：引擎缺少本课所需能力（方向/网格移动/障碍碰撞），requiredEngineCapabilities 未满足；需要按 TQ-001 重写：本课专属现象诊断、三层提示、可判定的两项练习和两种正确方案；需要可保存重开的作品与 E2E

---

## 课程质量审核：G0-U1-L04

- 被审 commit：`ac9a4bab5ccda461de85503928b3c727766f4435`；审核日期：2026-10-18
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（5～7 岁）；先修：G0-U1-L03；新知识：转向与路径分解
- 成熟度：L1；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 12/20 | apps/web/src/content/curriculum/track-g0-detailed-lessons-v1.json G0-U1-L04<br>转向与路径分解；第5步“发现碰撞就修改转向位置” | 需要转向+障碍碰撞，引擎没有 |
| 教学故事与思维激活 | 9/15 | 大石头挡路，必须转弯过小桥 | 缺预测环节 |
| 实际操作与能力形成 | 4/25 | teachingSteps 五步有观察/操作/运行/比较的设计 | 产品内不可操作；步骤含“地面/网格纸”等线下动作，未转成线上舞台操作 |
| 纠错与个性化反馈 | 3/15 | 有 3 条 commonMistakes + 3 条 hints | commonMistakes.diagnosis 是模板句（“检查「X」的输入条件与对象”），没有针对本课的现象描述<br>三条 hints 不是“现象→概念→具体做法”三层 |
| 创造/迁移/项目成果 | 3/15 | extension：再加一块石头设计新路线 | 没有可保存作品 |
| 评价、复盘与可信度 | 3/10 | 有 rubric、mustPass、negativeCases、parentConversation | observableCheck 五步都是同一句模板“学生能展示第N步操作结果…”<br>rubric 证据句由模板生成，automatedAssessmentReady=false |
| **总计** | **34/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | 教案标 blockly_conceptual_not_executable、playable=false，没有假执行；但也没有任何真实执行 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | fail | 产品里没有本课可操作的课堂：playable=false、codeReady=false，孩子无法亲手拼块运行 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 没有正常执行，也没有真实错误/边界运行；negativeCases 只是文字 |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | unchecked | 没有判定器，无法核查合理程序是否能通过 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 目录未展示“项目已完成”，artifact 只是教案要求 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 无美术/音频素材（assetsReady=false），文字为自写教案 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | pass | 无作品保存或上传入口 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | unchecked | 没有课堂可运行，无法核查 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 记为 L1 详案，目录不显示可玩（SYS-102） |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 |  |
| 错误/边界 |  |
| 三层提示 | 缺 |
| 练习 A / B |  /  |
| 不同正确方案 | 缺 |
| 保存重开 |  |
| E2E | 缺 |

**结论**：不是优质候选 — 总分 34，低于 80 退回重做；触发硬否决：no-hands-on、no-failure-test；硬否决未核查：rigid-answer、broken-or-false-success；AI 评分只能作参考，不能认定优质；运行证据缺少：正常执行、真实错误或边界测试、三层提示、两项目标不同的亲手练习、两种不同的正确方案、保存重开验证、真实浏览器 E2E

**阻塞**：引擎缺少本课所需能力（方向/网格移动/障碍碰撞），requiredEngineCapabilities 未满足；需要按 TQ-001 重写：本课专属现象诊断、三层提示、可判定的两项练习和两种正确方案；需要可保存重开的作品与 E2E

---

## 课程质量审核：G0-U1-L05

- 被审 commit：`ac9a4bab5ccda461de85503928b3c727766f4435`；审核日期：2026-10-18
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（5～7 岁）；先修：G0-U1-L04；新知识：前置条件与动作依赖
- 成熟度：L1；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 11/20 | apps/web/src/content/curriculum/track-g0-detailed-lessons-v1.json G0-U1-L05<br>前置条件：先拿钥匙再开门 | 学习目标写成“方位操作”，与本课“前置条件”不符<br>需要拾取/开门积木，引擎没有 |
| 教学故事与思维激活 | 10/15 | 金钥匙和树洞门，顺序颠倒门保持关闭 | — |
| 实际操作与能力形成 | 4/25 | teachingSteps 五步有观察/操作/运行/比较的设计 | 产品内不可操作；步骤含“地面/网格纸”等线下动作，未转成线上舞台操作 |
| 纠错与个性化反馈 | 3/15 | 有 3 条 commonMistakes + 3 条 hints | commonMistakes.diagnosis 是模板句（“检查「X」的输入条件与对象”），没有针对本课的现象描述<br>三条 hints 不是“现象→概念→具体做法”三层 |
| 创造/迁移/项目成果 | 2/15 | extension：两道门复用同一把钥匙 | 没有可保存作品 |
| 评价、复盘与可信度 | 3/10 | 有 rubric、mustPass、negativeCases、parentConversation | observableCheck 五步都是同一句模板“学生能展示第N步操作结果…”<br>rubric 证据句由模板生成，automatedAssessmentReady=false |
| **总计** | **33/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | 教案标 blockly_conceptual_not_executable、playable=false，没有假执行；但也没有任何真实执行 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | fail | 产品里没有本课可操作的课堂：playable=false、codeReady=false，孩子无法亲手拼块运行 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 没有正常执行，也没有真实错误/边界运行；negativeCases 只是文字 |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | unchecked | 没有判定器，无法核查合理程序是否能通过 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 目录未展示“项目已完成”，artifact 只是教案要求 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 无美术/音频素材（assetsReady=false），文字为自写教案 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | pass | 无作品保存或上传入口 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | unchecked | 没有课堂可运行，无法核查 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 记为 L1 详案，目录不显示可玩（SYS-102） |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 |  |
| 错误/边界 |  |
| 三层提示 | 缺 |
| 练习 A / B |  /  |
| 不同正确方案 | 缺 |
| 保存重开 |  |
| E2E | 缺 |

**结论**：不是优质候选 — 总分 33，低于 80 退回重做；触发硬否决：no-hands-on、no-failure-test；硬否决未核查：rigid-answer、broken-or-false-success；AI 评分只能作参考，不能认定优质；运行证据缺少：正常执行、真实错误或边界测试、三层提示、两项目标不同的亲手练习、两种不同的正确方案、保存重开验证、真实浏览器 E2E

**阻塞**：引擎缺少本课所需能力（方向/网格移动/障碍碰撞/拾取与开门），requiredEngineCapabilities 未满足；需要按 TQ-001 重写：本课专属现象诊断、三层提示、可判定的两项练习和两种正确方案；需要可保存重开的作品与 E2E

---

## 课程质量审核：G0-U1-L06

- 被审 commit：`ac9a4bab5ccda461de85503928b3c727766f4435`；审核日期：2026-10-18
- 审核人：Hark（AI 参考评分）（AI 参考，独立）
- 年龄段：G0 启蒙（5～7 岁）；先修：G0-U1-L05；新知识：方向、顺序、调试综合
- 成熟度：L1；儿童试学：none

| 维度 | 得分 | 证据 | 缺陷 |
| --- | ---: | --- | --- |
| 知识设计与递进 | 12/20 | apps/web/src/content/curriculum/track-g0-detailed-lessons-v1.json G0-U1-L06<br>单元综合：方向、顺序、调试 | “让同伴先预测”假设有同伴，单人在家学习时做不了 |
| 教学故事与思维激活 | 8/15 | 森林向导请你设计寻路卡 | 情境较弱 |
| 实际操作与能力形成 | 4/25 | teachingSteps 五步有观察/操作/运行/比较的设计 | 产品内不可操作；步骤含“地面/网格纸”等线下动作，未转成线上舞台操作 |
| 纠错与个性化反馈 | 3/15 | 有 3 条 commonMistakes + 3 条 hints | commonMistakes.diagnosis 是模板句（“检查「X」的输入条件与对象”），没有针对本课的现象描述<br>三条 hints 不是“现象→概念→具体做法”三层 |
| 创造/迁移/项目成果 | 4/15 | 单元作品：可演示路线 + 解释一个修正；extension 隐藏捷径比较路径 | 没有可保存/重开的单元作品 |
| 评价、复盘与可信度 | 3/10 | 有 rubric、mustPass、negativeCases、parentConversation | observableCheck 五步都是同一句模板“学生能展示第N步操作结果…”<br>rubric 证据句由模板生成，automatedAssessmentReady=false |
| **总计** | **34/100** | <80 退回重做 | |

| 硬否决项 | 结果 | 说明 |
| --- | --- | --- |
| 使用假的 Blockly/Scratch/Python 执行或已知错误教学知识 | pass | 教案标 blockly_conceptual_not_executable、playable=false，没有假执行；但也没有任何真实执行 |
| 没有学生本人可操作的活动，全部是一键播放/选择题 | fail | 产品里没有本课可操作的课堂：playable=false、codeReady=false，孩子无法亲手拼块运行 |
| 缺失正常执行与至少一个真实错误或边界测试 | fail | 没有正常执行，也没有真实错误/边界运行；negativeCases 只是文字 |
| 只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过 | unchecked | 没有判定器，无法核查合理程序是否能通过 |
| 不存在项目成果，却展示“课程项目已完成” | pass | 目录未展示“项目已完成”，artifact 只是教案要求 |
| 未经授权搬运商用课程/角色/课件/肖像/音频 | pass | 无美术/音频素材（assetsReady=false），文字为自写教案 |
| 未成年人隐私、认证、云端隔离或公开作品存在未解决高风险 | pass | 无作品保存或上传入口 |
| 关键按钮无响应、断线假成功、保存失败却提示已保存 | unchecked | 没有课堂可运行，无法核查 |
| 课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布 | pass | lesson-maturity.ts 记为 L1 详案，目录不显示可玩（SYS-102） |

| 运行证据 | 记录 |
| --- | --- |
| 正常执行 |  |
| 错误/边界 |  |
| 三层提示 | 缺 |
| 练习 A / B |  /  |
| 不同正确方案 | 缺 |
| 保存重开 |  |
| E2E | 缺 |

**结论**：不是优质候选 — 总分 34，低于 80 退回重做；触发硬否决：no-hands-on、no-failure-test；硬否决未核查：rigid-answer、broken-or-false-success；AI 评分只能作参考，不能认定优质；运行证据缺少：正常执行、真实错误或边界测试、三层提示、两项目标不同的亲手练习、两种不同的正确方案、保存重开验证、真实浏览器 E2E

**阻塞**：引擎缺少本课所需能力（方向/网格移动/障碍碰撞），requiredEngineCapabilities 未满足；需要按 TQ-001 重写：本课专属现象诊断、三层提示、可判定的两项练习和两种正确方案；需要可保存重开的作品与 E2E
