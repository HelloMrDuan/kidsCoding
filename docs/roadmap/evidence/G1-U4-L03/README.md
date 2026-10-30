# G1-U4-L03《给人物分配任务》证据（第一阶段）

- 执行器：examples/blockly/g1/assign_executor.py
- 测试：examples/blockly/g1/test_assign_executor.py，本地 6 个测试全部通过。
  命令：python3 -m unittest test_assign_executor -v
  结果：6 tests, OK。包括正确分工、两人同控失败、任务互换失败、
  缺少兔子任务失败、拓展第三记录员通过、缺少开始事件失败。
  首版 both_drive 用例曾失败（报错信息顺序问题），已修复，见 LESSON-DESIGN.md。
- 尚缺：网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
