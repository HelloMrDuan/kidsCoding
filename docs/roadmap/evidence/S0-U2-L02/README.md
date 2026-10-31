# S0-U2-L02《体验双因素验证》证据（第一阶段）

- 执行器：examples/blockly/s0/two_factor_executor.py（本地源：~/workspace/s0-u2-l02/two_factor_executor.py）
- 测试：examples/blockly/s0/test_two_factor_executor.py，本地 10 个测试全部通过。
  命令：python3 -m unittest test_two_factor_executor -v
  结果：10 tests, OK。包括正确登录、练习 B 不同口令、缺少第二因素失败、
  验证码错误失败、验证码非 6 位失败、先输验证码失败、未请求验证码失败、
  拓展 app 方式通过、保存重开重跑一致、缺少开始事件失败。
- 安全说明：口令与验证码均为课堂示例，绝不是真实凭证；执行器不保存、
  不发送、不校验任何真实账号（见 LESSON-DESIGN.md）。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
