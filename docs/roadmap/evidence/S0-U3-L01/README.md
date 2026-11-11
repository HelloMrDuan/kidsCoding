# S0-U3-L01《如何判断一条消息》证据（第一阶段）

- 执行器：examples/blockly/s0/message_judge_executor.py（本地源：~/workspace/s0-u3-l01/message_judge_executor.py）
- 测试：examples/blockly/s0/test_message_judge_executor.py，本地 10 个测试全部通过。
  命令：python3 -m unittest test_message_judge_executor -v
  结果：10 tests, OK。包括正确判断、练习 B 不同消息、判断错误失败、
  未经许可抄袭判可信失败、只判可信失败、编号重复失败、消息过少失败、
  拓展第 5 条可信通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择；
  判断规则仅为课堂启发式，不是法律判断。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
