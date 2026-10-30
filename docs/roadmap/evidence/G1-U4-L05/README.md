# G1-U4-L05《邀请朋友试玩》证据（第一阶段）

- 执行器：examples/blockly/g1/playtest_executor.py
- 测试：examples/blockly/g1/test_playtest_executor.py，本地 7 个测试全部通过。
  命令：python3 -m unittest test_playtest_executor -v
  结果：7 tests, OK。包括正确试玩、反馈少于3条失败、反馈缺少三列失败、
  缺少检查项失败、无对应反馈的修复失败、拓展第二朋友复测通过、缺少开始事件失败。
- 尚缺：网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
