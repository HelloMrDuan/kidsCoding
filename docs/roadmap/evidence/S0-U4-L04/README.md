# S0-U4-L04《模拟误删恢复》证据说明（第一阶段）

- 台账：S0-U4-L04，知识点 备份，前置 S0-U4-L03，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 S0 详细稿，全部作品名、内容与备份地点为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/s0/recovery_executor.py`
  - `examples/blockly/s0/test_recovery_executor.py`
  - `docs/roadmap/evidence/S0-U4-L04/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/S0-U4-L04/README.md`
- 本地测试：`python3 -m unittest test_recovery_executor -v`，10 个测试首跑全部通过（正确恢复、练习 B 换作品、无备份删除失败、无删除恢复失败、恢复内容不一致失败、检查内容不一致失败、删了未恢复失败、拓展两份作品通过、保存重开一致、缺开始事件失败）。
- 安全说明：课堂模拟，绝不故意删除真实文件；真实恢复须请老师或监护人一起做并打开核对。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；S0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
