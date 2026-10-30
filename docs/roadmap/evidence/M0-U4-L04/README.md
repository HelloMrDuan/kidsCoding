# M0-U4-L04《模拟排队等待》证据（第一阶段）

- 执行器：examples/blockly/m0/queue_executor.py
- 测试：examples/blockly/m0/test_queue_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_queue_executor -v
  结果：8 tests, OK。包括正确排队、练习 B 短队、等待算错失败、
  顺序不一致检查、单人失败、拓展第 4 人通过、保存重开重跑一致、缺少开始事件失败。
- 注意：顺序测试验证的是逆序队伍与原定顺序不同，执行器本身按先到先服务
  计算等待；顺序一致性由课程设计（原定队伍 A、B、C）保证，见 LESSON-DESIGN.md。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
