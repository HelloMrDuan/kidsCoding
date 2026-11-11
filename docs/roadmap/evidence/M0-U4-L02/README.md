# M0-U4-L02《选择最短寻路路线》证据（第一阶段）

- 执行器：examples/blockly/m0/path_executor.py
- 测试：examples/blockly/m0/test_path_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_path_executor -v
  结果：8 tests, OK。包括正确路线、练习 B 另一路线、撞障碍失败、
  绕远路失败、未到达失败、拓展第二地图通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
