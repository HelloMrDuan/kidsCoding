# G1-U4-L04《修复对白顺序》证据（第一阶段）

- 执行器：examples/blockly/g1/timeline_executor.py
- 测试：examples/blockly/g1/test_timeline_executor.py，本地 6 个测试全部通过。
  命令：python3 -m unittest test_timeline_executor -v
  结果：6 tests, OK。包括正确顺序无重叠、顺序颠倒失败、同时说话失败、
  负等待重叠失败、拓展点击触发通过、缺少开始事件失败。
- 尚缺：网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
