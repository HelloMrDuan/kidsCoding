# S0-U2-L05《设置应用权限》证据（第一阶段）

- 执行器：examples/blockly/s0/permission_executor.py（本地源：~/workspace/s0-u2-l05/permission_executor.py）
- 测试：examples/blockly/s0/test_permission_executor.py，本地 10 个测试全部通过。
  命令：python3 -m unittest test_permission_executor -v
  结果：10 tests, OK。包括正确设置、练习 B 不同应用、必需权限被拒绝失败、
  非必需权限被允许失败、未知应用失败、只允许失败、重复设置失败、
  拓展第 5 项通过、保存重开重跑一致、缺少开始事件失败。
- 安全说明：本课是模拟练习，课堂上不改动真实设备权限；真实改动须经
  监护人同意（见 LESSON-DESIGN.md）。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
