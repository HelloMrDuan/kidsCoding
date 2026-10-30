# M0-U3-L02《掷骰子统计》证据（第一阶段）

- 执行器：examples/blockly/m0/dice_executor.py
- 测试：examples/blockly/m0/test_dice_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_dice_executor -v
  结果：8 tests, OK。包括正确统计、练习 B 不均匀、无效点数失败、
  次数之和失败、某面统计失败、拓展第二次统计通过、保存重开重跑一致、缺少开始事件失败。
  首版 1 个测试因 JSON 键类型失败，已修正执行器键转换，测试未改。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
