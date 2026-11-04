# S0-U1-L03《理解互联网如何通信》证据（第一阶段）

- 执行器：examples/blockly/s0/internet_executor.py（本地源：~/workspace/s0-u1-l03/internet_executor.py）
- 测试：examples/blockly/s0/test_internet_executor.py，本地 10 个测试全部通过。
  命令：python3 -m unittest test_internet_executor -v
  结果：10 tests, OK。包括正确传输、练习 B 不同消息、缺步骤失败、
  顺序错失败、重复步骤失败、到达内容被改失败、缺少结束内容失败、
  拓展数据包通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
