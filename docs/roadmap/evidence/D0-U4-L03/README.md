# D0-U4-L03《制作博物馆导览》证据（第一阶段）

- 执行器：examples/blockly/d0/museum_executor.py
- 测试：examples/blockly/d0/test_museum_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_museum_executor -v
  结果：8 tests, OK。包括正确导览、练习 B 其他展品、年份顺序错误失败、
  缺少讲解失败、最早展品说错失败、拓展第 4 个展品通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
