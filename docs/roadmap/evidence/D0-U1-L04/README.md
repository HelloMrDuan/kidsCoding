# D0-U1-L04《让形状跟着音乐跳》证据（第一阶段）

- 执行器：examples/blockly/d0/dance_executor.py
- 测试：examples/blockly/d0/test_dance_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_dance_executor -v
  结果：8 tests, OK。包括正确舞蹈、练习 B 长循环、空拍跳失败、
  动作缺失失败、少于 4 拍失败、拓展转圈通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
