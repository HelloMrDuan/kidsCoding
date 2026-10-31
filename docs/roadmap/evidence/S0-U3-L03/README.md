# S0-U3-L03《尊重创作者授权》证据（第一阶段）

- 执行器：examples/blockly/s0/license_executor.py（本地源：~/workspace/s0-u3-l03/license_executor.py）
- 测试：examples/blockly/s0/test_license_executor.py，本地 10 个测试全部通过。
  命令：python3 -m unittest test_license_executor -v
  结果：10 tests, OK。包括正确处理、练习 B 不同作品、须先获许可直接用失败、
  不可用却用失败、署名可用未署名失败、作品重复失败、只有 3 件作品失败、
  拓展第 5 件作品通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择；
  本课不使用任何真实作品。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
