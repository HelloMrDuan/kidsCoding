# M0-U4-L05《设计最省步数策略》证据（第一阶段）

- 执行器：examples/blockly/m0/strategy_executor.py
- 测试：examples/blockly/m0/test_strategy_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_strategy_executor -v
  结果：8 tests, OK。包括正确策略、练习 B 短目标、绕远路失败、
  撞障碍失败、未到达失败、拓展换顺序通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
