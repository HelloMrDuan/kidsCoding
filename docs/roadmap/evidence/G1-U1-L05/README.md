# G1-U1-L05《字幕与旁白》证据（第一阶段）

- 执行器：examples/blockly/g1/subtitle_executor.py
- 测试：examples/blockly/g1/test_subtitle_executor.py，本地 7 个测试全部通过。
  命令：python3 -m unittest test_subtitle_executor -v
  结果：7 tests, OK。包括正确顺序、对白在标题隐藏前失败、
  标题从不隐藏失败、旁白过长失败、缺少标题失败、
  拓展无障碍字幕通过、缺少开始事件失败。
- 尚缺：网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
