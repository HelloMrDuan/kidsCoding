# S0-U2-L03《保护个人隐私信息》证据（第一阶段）

- 执行器：examples/blockly/s0/privacy_executor.py（本地源：~/workspace/s0-u2-l03/privacy_executor.py）
- 测试：examples/blockly/s0/test_privacy_executor.py，本地 10 个测试全部通过。
  命令：python3 -m unittest test_privacy_executor -v
  结果：10 tests, OK。包括正确保护、练习 B 不同项目、隐私被分享失败、
  可分享类型标错失败、表外项目失败、只列隐私失败、重复项目失败、
  拓展第 5 项通过、保存重开重跑一致、缺少开始事件失败。
- 隐私说明：本课只出现信息类别名称，绝无任何真实个人信息值；
  share 仅表示“这一类不是隐私”，不是真的发出去（见 LESSON-DESIGN.md）。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
