# S0-U3-L02《标注图片素材来源》证据（第一阶段）

- 执行器：examples/blockly/s0/source_label_executor.py（本地源：~/workspace/s0-u3-l02/source_label_executor.py）
- 测试：examples/blockly/s0/test_source_label_executor.py，本地 11 个测试全部通过。
  命令：python3 -m unittest test_source_label_executor -v
  结果：11 tests, OK。包括正确标注、练习 B 不同图片、缺少作者失败、
  缺少来源失败、许可未知失败、许可不允许失败、编号重复失败、
  只有 2 张图片失败、拓展第 4 张图片通过、保存重开重跑一致、缺少开始事件失败。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择；
  本课不使用、不复制任何真实图片。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、
  PR CI 全绿。task-ledger 通过不代表课程验收通过。
