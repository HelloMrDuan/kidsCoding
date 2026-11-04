# S0-U2-L04《识别钓鱼消息》证据（第一阶段）

- 执行器：examples/blockly/s0/phishing_executor.py（本地源：~/workspace/s0-u2-l04/phishing_executor.py）
- 测试：examples/blockly/s0/test_phishing_executor.py，本地 10 个测试全部通过。
  命令：python3 -m unittest test_phishing_executor -v
  结果：10 tests, OK。包括正确判断、练习 B 不同消息、判断错误失败、
  陌生发件人判安全失败、只判安全失败、编号重复失败、消息过少失败、
  拓展陌生发件人单独判钓鱼通过、保存重开重跑一致、缺少开始事件失败。
- 安全说明：所有消息均为虚构示例；课堂上不点击可疑链接、不回复个人信息、
  遇可疑消息请老师或监护人核查（见 LESSON-DESIGN.md）；判断规则仅为课堂
  启发式，不是真实安全保证。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
