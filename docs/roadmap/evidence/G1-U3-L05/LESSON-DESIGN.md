# G1-U3-L05《按钮切换白天黑夜》教学设计（第一阶段）

来源：track-g1-detailed-lessons-v1.json 中 G1-U3-L05，年龄 6-9 岁，引擎 blockly。
故事：森林剧院有白天和夜晚按钮，点击后切换灯光。

## 目标
- 用sceneMode在day/night之间切换并选择对应背景。
- 验证：连续点击两次后回到白天。

## 找错
- 模式变量切换了但背景没有更新：观察变量值与舞台背景是否同步。

## 拓展
- 增加黄昏第三种模式：循环为 day→night→dusk→day，点击三次回到白天。

## 说明
- 执行器文件名为 scene_mode_executor.py，避免与 G1-U1-L03 的
  scene_executor.py 在同一 examples/blockly/g1 目录下重名。

## 明确不是什么
- 不是网页课堂可玩课程，未接入任何 lab 页面，未改 web 代码。
- 不是独立教研，不是儿童试学，不得标 completed。
- 前置课 G1-U3-L04 尚在 PR #291 待审核未合并，本课台账登记不写
  对未合并任务的依赖，前置关系仅在本设计与 PR 描述中说明。
