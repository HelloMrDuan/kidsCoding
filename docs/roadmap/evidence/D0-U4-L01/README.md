# D0-U4-L01《写一段科普剧情》证据（第一阶段）

- 执行器：examples/blockly/d0/story_executor.py
- 测试：examples/blockly/d0/test_story_executor.py，本地 8 个测试全部通过。
  命令：python3 -m unittest test_story_executor -v
  结果：8 tests, OK。包括正确剧情、练习 B 叶子剧情、缺少科普点失败、
  科普点重复失败、无结论失败、拓展应用场景通过、保存重开重跑一致、缺少开始事件失败。
- 修正记录：首版“全部科普点不重复”与“结论复述”矛盾，首次运行失败，
  已修正为仅非结论场景不重复；另有两个测试索引错误已修正，见 LESSON-DESIGN.md。
- 来源缺口：本课无详细稿文件（见 LESSON-DESIGN.md），所有数值为实现选择。
- 尚缺：详细稿、网页课堂接入、三端截图、独立人工教研、儿童试学与监护人授权、PR CI 全绿。
  task-ledger 通过不代表课程验收通过。
