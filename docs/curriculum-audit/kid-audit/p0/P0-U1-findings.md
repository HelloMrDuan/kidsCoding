# P0-U1 审定实查记录（kid小宝，基线 main 679895e0，详案 track-p0-detailed-lessons-v1.json）

## P0-U1-L01 运行第一行代码 — 实查 2026-10-30
- 正向真实运行通过：python3.12.3 执行 print('你好，编程世界')，输出 exactly “你好，编程世界”。
- 内容缺陷（已实测，非推测）：第 5 步与 feedback commonMistakes 称“忘记引号产生 NameError”。
  实测：去掉引号得 print(你好，编程世界)，实际报 SyntaxError: invalid character '，' (U+FF0C)，
  因为全角逗号先于名字解析触发词法错误；只有纯 ASCII 名字（如 print(hello)）才会报 NameError。
  结论：该课错误类型表述不准确，须修正为 SyntaxError，或把边界示例改为不含全角标点的情形。
  分类待定（P1 内容准确性），不擅自改课节文件；样板整改时一并处理。
- 其余结构：5 步（观察→拆解→编码→运行→边界）完整，目标可观察；assessment 含 passCases。
- 台账状态：lesson-task-register.json 中 P0-U1 6 节全 todo；详案 courseState 全 detailed_not_published，
  runtimeVerified 全 False，published 全 False。

## P0-U1-L02 让程序自我介绍 — 实查 2026-10-30
- 正向真实运行通过：变量存名字/爱好并 print 拼接，输出“小明喜欢画画”，含两段变量值且顺序正确。
- 边界 claim 属实：第 5 步比较 print(name) 与 print('name')：实测前者输出变量值“小明”，后者原样输出“name”，
  与 feedback“把变量名写进引号导致原样打印”一致，未发现表述缺陷。

## P0-U1-L03 文字拼接小助手 — 实查 2026-10-30
- 正向真实运行通过：f-string 组合 city=北京、weather=晴，输出 exactly“北京今天晴”。
- 边界 claim 属实：直接用 + 拼接整数温度实测报 TypeError（can only concatenate str (not "int") to str），
  改 f-string 后输出正常，与 feedback“直接用+拼接整数温度出现 TypeError”一致，未发现表述缺陷。
- 前置依赖 P0-U1-L02 合理（变量概念递进）。

## P0-U1-L04 数字和字符串 — 实查 2026-10-30
- 正向真实运行通过：1+1=2，'1'+'1'='11'，type 检查 int/str 区分正确。
- 边界 claim 属实：'12'+3 实测报 TypeError，str(3) 转换后得 '123'，与 feedback 一致，未发现表述缺陷。
- 前置依赖 P0-U1-L03 合理（f-string/类型概念递进）。

## P0-U1-L05 输入你的名字 — 实查 2026-10-30
- 正向真实运行通过：stdin 输入“ 小明 ”，strip 后输出 exactly“你好，小明”。
- 边界 claim 属实：全空白输入 strip 后为空，分支输出重新输入提示，与 feedback“空白输入导致姓名为空”及第 5 步一致，未发现表述缺陷。
- 前置依赖 P0-U1-L04 合理（类型概念递进）。

## P0-U1-L06 制作个人名片生成器 — 实查 2026-10-30
- 正向真实运行通过：输入小雨/画画/蓝，输出三行卡片（姓名/爱好/喜欢的颜色）格式正确，综合运用了输入、strip、变量、拼接。
- 边界 claim 属实：空昵称分支输出“昵称不能为空，请重新输入”，提示清楚，与 feedback 一致，未发现表述缺陷。
- 前置依赖 P0-U1-L05 合理；本课为单元综合项目，符合六课递进收口。

## P0-U1 单元小结（样板候选，尚未推广）
- 6/6 真实运行验证通过；概念递进 输入输出→变量→类型，前置链 L01→L02→L03→L04→L05→L06 线性合理。
- 唯一内容缺陷：L01 第 5 步与 feedback 称忘记引号产生 NameError，实测为 SyntaxError（全角逗号），须整改。
- 按总指令：样板须经工程验证（已完成 6/6）+ 独立教研（未做，AI 自评不代）后才可推广；
  课节文件暂不动，L01 整改进样板整改计划；真实儿童试学与发布审批须真实参与者完成，AI 不得伪造。
- 台账与详案现状：lesson-task-register.json 中 P0-U1 6 节仍 todo；详案 runtimeVerified 全 False、published 全 False，
  在整改与独立教研完成前不改台账状态、不升正式课。
