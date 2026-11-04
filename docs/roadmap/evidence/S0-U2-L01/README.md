# S0-U2-L01《为账号创建口令》证据（第一阶段）

- 执行器：examples/blockly/s0/password_executor.py（本地源：~/workspace/s0-u2-l01/password_executor.py）
- 测试：examples/blockly/s0/test_password_executor.py，本地 11 个测试全部通过。
  命令：python3 -m unittest test_password_executor -v
  结果：11 tests, OK。包括正确口令、练习 B 不同账号、太短失败、
  只有字母失败、只有数字失败、常见弱口令失败、口令与账号名相同失败、
  两次不一致失败、拓展带符号长口令通过、保存重开重跑一致、缺少开始事件失败。
- 安全说明：所有口令均为课堂示例，绝不是真实口令；执行器不保存、不发送、
  不校验任何真实账号（见 LESSON-DESIGN.md）。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
