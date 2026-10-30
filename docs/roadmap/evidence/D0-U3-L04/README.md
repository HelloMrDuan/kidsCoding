# D0-U3-L04《制作智能导览》证据（第一阶段）

- 执行器：examples/blockly/d0/guide_executor.py
- 测试：examples/blockly/d0/test_guide_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_guide_executor -v
  结果：8 tests, OK。包括正确导览、练习 B 反向路线、缺少讲解失败、
  跳点顺序错误失败、展点不足失败、拓展第 4 个展点通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
