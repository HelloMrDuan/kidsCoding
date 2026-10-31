# S0-U1-L05《识别可靠网址》证据（第一阶段）

- 执行器：examples/blockly/s0/url_executor.py（本地源：~/workspace/s0-u1-l05/url_executor.py）
- 测试：examples/blockly/s0/test_url_executor.py，本地 10 个测试全部通过。
  命令：python3 -m unittest test_url_executor -v
  结果：10 tests, OK。包括正确判断、练习 B 不同网址、判断错误失败、
  http 域名误判可靠失败、只判断可靠失败、重复网址失败、检查过少失败、
  拓展未知网址通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择；
  判断规则仅为课堂启发式，不是真实安全保证。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
