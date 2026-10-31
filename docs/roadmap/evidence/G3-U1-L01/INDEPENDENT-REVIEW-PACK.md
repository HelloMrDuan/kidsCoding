# G3-U1-L01 独立教研审核材料包（材料清单，不是审核结论）

状态：**未审核**。本文件只列出独立教研员 / 儿童试学负责人需要检查的材料，
不包含任何审核评分、通过结论或签字记录。台账 lessonReview 仍为 null，
不得以本文件冒充审核通过。

## 课程基本信息
- 课号：G3-U1-L01《用自制积木画图》，方向 G3，单元 G3-U1，年龄 9-13
- 故事：机器人要用同样的五角星花纹装饰六面旗
- 学习目标：6 面旗均有星形，尺寸按输入参数变化；创意延伸：再加一个颜色参数
- 台账状态：in_review，catalogStatus：outline_not_playable，不得发布

## 供审核的材料（PR #260 内）
- 主课生成器：examples/scratch/g3/build_g3_u1_l01.py
- 主课结构测试：examples/scratch/g3/test_g3_u1_l01.py（本地 6 个结构测试通过）
- 变体生成器：examples/scratch/g3/build_g3_u1_l01_variants.py
- 变体 .sb3：主课、练习 A、练习 B（颜色参数）、找错用例（大小写死）
- 证据：docs/roadmap/evidence/G3-U1-L01/README.md、VM-RUN.md、LESSON-DESIGN.md
- AI 参考评审（非独立）：docs/roadmap/teaching-reviews/G3-U1-L01.json，
  总分 46 分，band redo，硬否决 fail：no-hands-on、no-failure-test，
  unchecked：rigid-answer、broken-or-false-success。AI 评分不得作为独立审核结论。

## 已验证的证据（按验证方式区分）
- 结构验证：.sb3 回读、pen 扩展、过程定义/调用、5 边 144 度、6 次循环、变量递增
- Node VM 运行验证：scratch-vm@5.0.300，主课 x=160、size=140、threads=0；
  练习 A x=160、size=90；练习 B x=160、size=140、color=180；
  找错用例 x=160、size 变量=140（结构证据：move 固定 20）
- 保存重开验证：Node VM 保存后重载，blocks 27 个不变，含 procedures_call 与 pen_down，
  重跑 x=160、size=140、threads=0。注意：这是 Node VM 保存重开，不是 Scratch GUI 或网页课堂保存重开。
- 视觉验证：**进行中**。Node VM 无渲染器，画笔轨迹未目视验证；
  已委托真实浏览器在 Scratch 编辑器中加载并运行主课与练习 B，截图结果待回传，
  在回传前不得声称视觉已验证。
- 网页课堂接入验证：**未接入**。apps/web/src/app/learn/scratch-lab/[lessonId]/page.tsx
  仅处理 G3-U1-L02（ScratchVMTrial）与 G2 课程（ScratchG2Lab），其余返回 notFound()，
  因此 G3-U1-L01 在网页课堂中返回 notFound，不是可玩课程。详细稿 delivery 亦为
  lessonCodeStatus=requires_individual_implementation、runtimeVerification=not_verified、
  materialsApproval=pending、releaseAllowed=false。

## 尚缺的验收项（审核员需逐项确认）
1. 独立人工教研评分（09 教学质量门禁，100 分制，六维度 + 九硬否决）
2. 儿童试学记录与监护人授权证据（目前为零，不得声称已试学）
3. 画笔轨迹视觉证据（真实浏览器截图，含环境信息）
4. 三端截图（Chrome 1440x900、768x1024、375x812）——本课为 .sb3 作品，
   三端指网页课堂接入后的页面，非 .sb3 本身；课堂未接入前此项无法完成
5. 网页课堂接入（需产品/架构决策：G3 过程与画笔积木路径）
6. CI 全绿：PR #260 当前有 e2e-blockly（mobile gate）failure，
   scratch-real-vm-browser 与 scratch-touch-browser 仍在跑，不得说 CI 已通过

## 审核员需要回答的问题
- 练习 A、练习 B 是否目标不同（尺寸序列 vs 颜色参数）？
- 找错用例是否真实可复现、可修复（从写死 20 改回参数）？
- 三层提示是否覆盖现象、原因、修复？
- 创意延伸（颜色参数）是否与主课目标一致且可评估？
- 家长反馈问题是否可操作？
