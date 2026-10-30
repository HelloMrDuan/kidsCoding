# D0-U3-L01《纸桥承重模拟》证据（第一阶段）

- 执行器：examples/blockly/d0/bridge_executor.py
- 测试：examples/blockly/d0/test_bridge_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_bridge_executor -v
  结果：8 tests, OK。包括正确纸桥、练习 B 正好承重、承重算错失败、
  超载压垮失败、缺少支撑失败、拓展更强纸桥通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
