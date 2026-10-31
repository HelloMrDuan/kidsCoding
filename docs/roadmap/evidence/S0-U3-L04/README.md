# S0-U3-L04《友善的网络表达》证据（第一阶段）

- 执行器：examples/blockly/s0/kind_message_executor.py（本地源：~/workspace/s0-u3-l04/kind_message_executor.py）
- 测试：examples/blockly/s0/test_kind_message_executor.py，本地 10 个测试全部通过。
  命令：python3 -m unittest test_kind_message_executor -v
  结果：10 tests, OK。包括正确留言、练习 B 不同留言、不友善留言无改写失败、
  改写仍含不友善词语失败、给友善留言加改写失败、编号重复失败、
  只有 3 条留言失败、拓展第 5 条留言通过、保存重开重跑一致、缺少开始事件失败。
- 说明：留言示例均为虚构教学示例，示例中的不友善说法只用于识别与改写，
  绝不对真实的人说（见 LESSON-DESIGN.md）。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
