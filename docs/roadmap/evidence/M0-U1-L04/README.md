# M0-U1-L04《画出规则多边形》证据（第一阶段）

- 执行器：examples/blockly/m0/polygon_executor.py
- 测试：examples/blockly/m0/test_polygon_executor.py，本地 7 个测试全部通过。
  命令：python3 -m unittest test_polygon_executor -v
  结果：7 tests, OK。包括正确五边形、练习 B 六边形、转角错误失败、
  边数不足失败、拓展第二多边形通过、保存重开重跑一致、缺少开始事件失败。
  首版 3 个测试因断言键名错误失败，已修正测试键名，执行器未改。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
