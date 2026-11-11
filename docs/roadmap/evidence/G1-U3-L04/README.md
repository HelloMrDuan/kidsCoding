# G1-U3-L04《碰到障碍停下来》证据（第一阶段）

- 执行器：examples/blockly/g1/obstacle_executor.py
- 测试：examples/blockly/g1/test_obstacle_executor.py，本地 6 个测试全部通过。
  命令：python3 -m unittest test_obstacle_executor -v
  结果：6 tests, OK。包括碰撞停下（终点100、速度0、警告）、未碰撞可移动、
  缺少处理失败、恰好到达障碍停下、拓展绕障通过、缺少开始事件失败。
- 尚缺：网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
