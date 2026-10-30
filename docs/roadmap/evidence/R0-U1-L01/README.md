# R0-U1-L01《认识开发板与供电》证据（第一阶段）

- 执行器：examples/blockly/r0/board_executor.py
- 测试：examples/blockly/r0/test_board_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_board_executor -v
  结果：8 tests, OK。包括正确接通、练习 B 不同读数、未接通电源失败、
  读数超范围失败、缺少部件失败、拓展第二传感器通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 硬件缺口：本执行器是模拟模型，不是物理开发板实测。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
